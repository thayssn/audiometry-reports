import { createSignal, onMount, createEffect, Show } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import toast from "solid-toast";
import RenderMarkdown from "../RenderMarkdown";
import IdentificationSection from "./IdentificationSection";
import HistorySection from "./HistorySection";
import ResultsSection from "./ResultsSection";
import ConclusionSection from "./ConclusionSection";
import RecommendationsSection from "./RecommendationsSection";
import { dbService, Report, isReportComplete, AppSettings, DEFAULT_SETTINGS } from "../../services/dbService";
import { getCSVFields } from "../../config/fields";
import { generatePDF } from "../../utils/pdfGenerator";
import { formatReportContent } from "../../utils/formatContent";
import { generateReportHTML } from "../../utils/generateReportHTML";
import { formatDateUTC } from "../../utils/dateUtils";

// IMPORTANT: When adding identification fields, update src/config/fields.ts first
// Then sync this identification structure with the config
type ResultEntry = {
  year: string;
  text: string;
};

type FormData = {
  identification: {
    name: string;
    age: number;
    birth_date: Date | null;
    admission_date: Date | null;
    last_sequential_exam_date: Date | null;
    position: string;
    department: string;
    base: string;
  };
  history: string[];
  results: ResultEntry[]; // Structured internally, converted to string[] on save
  conclusion: string;
  recommendations: string[]
}

// Predefined options for each field
const HISTORY_OPTIONS = [
  "Paciente trabalha em ambiente com ruído ocupacional",
  "Histórico familiar de perda auditiva",
  "Paciente relata exposição a ruído extra-laboral frequente",
  "Episódios de otite na infância",
  "Não há informações adicionais relevantes nos exames analisados",
];

const RESULTS_OPTIONS = [
  "Perda auditiva Neurossensorial com configuração em entalhe, sugestivo de PAINPSE estável",
  "Perda auditiva Neurossensorial com configuração em entalhe, sugestivo de desencadeamento de PAINPSE",
  "Perda auditiva Neurossensorial com configuração em entalhe, sugestivo de agravamento de PAINPSE",
  "Perda auditiva Neurossensorial com configuração descendente, sugestivo de perda auditiva NÃO induzida por NPSE",
  "Perda auditiva Neurossensorial com configuração não sugestiva de PAINPSE",
  "Perda auditiva com componente condutivo sugestivo de perda auditiva NÃO induzida por NPSE",
  "Limiares auditivos dentro dos padrões da normalidade",
  "Limiares auditivos dentro dos padrões da normalidade estáveis",
  "Exame não realizado"
];

const RECOMMENDATIONS_OPTIONS = [
  "Uso contínuo e adequado de EPI auricular nas atividades laborais",
  "Acompanhamento audiométrico anual para monitoramento da evolução",
  "Orientação quanto à exposição a ruído laboral e extra-laboral, incluindo hábitos recreativos (uso de fones de ouvido)",
  "Encaminhamento ao otorrinolaringologista"
];

import "./Form.scss";

export default function Editor() {

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = createSignal<FormData>({
    identification: {
      name: "",
      age: 0,
      birth_date: null,
      admission_date: null,
      last_sequential_exam_date: null,
      position: "",
      department: "",
      base: ""
    },
    history: [],
    results: [],
    conclusion: "",
    recommendations: []
  });
  const [content, setContent] = createSignal("");

  // Start with false to match SSR, then load from localStorage on client
  const [showPreview, setShowPreview] = createSignal(false);
  const [currentReportId, setCurrentReportId] = createSignal<string | number | null>(null);
  const [isLoadingReport, setIsLoadingReport] = createSignal(!!searchParams.reportId);
  const [totalReports, setTotalReports] = createSignal(0);
  const [allReportIds, setAllReportIds] = createSignal<number[]>([]);
  const [isSaved, setIsSaved] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [previewLoaded, setPreviewLoaded] = createSignal(false);
  const [settings, setSettings] = createSignal<AppSettings>(DEFAULT_SETTINGS);

  // Load preview preference and total reports count on mount
  onMount(async () => {
    try {
      await dbService.init();

      // Load settings
      const loadedSettings = await dbService.getSettings();
      setSettings(loadedSettings);

      // Load total reports count and IDs
      const count = await dbService.getReportsCount();
      setTotalReports(count);

      const ids = await dbService.getAllReportIds();
      setAllReportIds(ids);
      console.log('All report IDs:', ids);

      // Load preview preference from localStorage (client-side only)
      try {
        const saved = localStorage.getItem('audiometry-preview-visible');
        if (saved !== null) {
          setShowPreview(saved === 'true');
        }
        setPreviewLoaded(true);
      } catch (error) {
        console.error('Failed to load preview preference:', error);
        setPreviewLoaded(true);
      }
    } catch (error) {
      console.error('Error initializing:', error);
    }

    // Add keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const modifier = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + N: New report
      if (modifier && e.key === 'n') {
        e.preventDefault();
        navigate('/form');
        return;
      }

      // Ctrl/Cmd + S: Save
      if (modifier && e.key === 's') {
        e.preventDefault();
        // Prevent multiple saves if already saving
        if (!isSaving()) {
          handleSaveForm();
        }
        return;
      }

      // Ctrl/Cmd + Left Arrow: Previous report
      if (modifier && e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousReport();
        return;
      }

      // Ctrl/Cmd + Right Arrow: Next report
      if (modifier && e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextReport();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  // Load report data when reportId changes
  createEffect(async () => {
    const reportIdParam = searchParams.reportId;
    const reportId = Array.isArray(reportIdParam) ? reportIdParam[0] : reportIdParam;

    // Always reload total count and IDs when effect runs
    try {
      const count = await dbService.getReportsCount();
      setTotalReports(count);

      const ids = await dbService.getAllReportIds();
      setAllReportIds(ids);
    } catch (error) {
      console.error('Error loading reports count:', error);
    }

    if (!reportId) {
      // No report selected - reset form to empty state
      setCurrentReportId(null);
      setIsSaved(false);
      setForm({
        identification: {
          name: "",
          age: 0,
          birth_date: null,
          admission_date: null,
          last_sequential_exam_date: null,
          position: "",
          department: "",
          base: ""
        },
        history: [],
        results: [],
        conclusion: "",
        recommendations: []
      });
      return;
    }

    try {
      setIsLoadingReport(true);
      setCurrentReportId(reportId);

      console.log('Report ID from URL:', reportId);

      // Initialize DB if needed
      await dbService.init();

      // Load report data
      const report = await dbService.getReport(reportId);
      console.log('Loaded report:', report);

      if (report) {
        // Convert string[] results to structured format
        const structuredResults = (report.results || []).map(resultStr => {
          const dashIndex = resultStr.indexOf(' - ');
          if (dashIndex > 0) {
            const year = resultStr.substring(0, dashIndex);
            const text = resultStr.substring(dashIndex + 3);
            return { year: year ?? '', text: text ?? '' };
          }
          return { year: '', text: resultStr };
        });

        setForm({
          identification: {
            ...report.identification,
            base: report.identification.base || "",
            birth_date: report.identification.birth_date ? new Date(report.identification.birth_date) : null,
            admission_date: report.identification.admission_date ? new Date(report.identification.admission_date) : null,
            last_sequential_exam_date: report.identification.last_sequential_exam_date ? new Date(report.identification.last_sequential_exam_date) : null
          },
          history: report.history || [],
          results: structuredResults,
          conclusion: report.conclusion || "",
          recommendations: report.recommendations || []
        });

        setIsSaved(true);
        console.log('Form updated with report data');
      } else {
        toast.error('Relatório não encontrado');
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setIsLoadingReport(false);
    }
  });

  // Auto-render template when form changes
  createEffect(() => {
    renderTemplate();
  });

  // Save preview visibility to localStorage when it changes (only after initial load)
  createEffect(() => {
    if (!previewLoaded()) return; // Don't save until we've loaded the initial preference

    try {
      localStorage.setItem('audiometry-preview-visible', String(showPreview()));
    } catch (error) {
      console.error('Failed to save preview visibility:', error);
    }
  });

  const handleSaveForm = async () => {
    // Prevent duplicate saves
    if (isSaving()) {
      console.log('Save already in progress, skipping...');
      return;
    }

    const formData = form();

    // Validate required field: name
    if (!formData.identification.name || formData.identification.name.trim() === '') {
      toast.error('Nome é obrigatório para salvar o relatório');
      return;
    }

    setIsSaving(true);

    const reportId = currentReportId();

    // Save complete report to IndexedDB
    // Convert structured results to string[] for storage
    const resultsAsStrings = formData.results
      .map(r => `${r.year.trim()} - ${r.text.trim()}`.trim())
      .filter(s => s && s !== '-'); // Remove empty or lone hyphens

    const report: Report = {
      id: reportId || undefined,
      identification: formData.identification,
      history: formData.history,
      results: resultsAsStrings,
      conclusion: formData.conclusion,
      recommendations: formData.recommendations,
      updated_at: new Date().toISOString()
    };

    try {
      const savedReportId = await dbService.saveReport(report);

      // If this was a new report, update URL, state, and count
      if (!reportId) {
        setCurrentReportId(savedReportId);
        navigate(`/form?reportId=${savedReportId}`, { replace: true });

        // Update total count and IDs
        const count = await dbService.getReportsCount();
        setTotalReports(count);

        const ids = await dbService.getAllReportIds();
        setAllReportIds(ids);
      }

      setIsSaved(true);
      toast.success("Relatório salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar relatório");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };


  // Helper function to calculate age from birth date
  const calculateAge = (birthDate: Date | null): number => {
    if (!birthDate) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Update form field handlers
  const handleUpdateIdentification = (field: keyof FormData['identification'], value: string | number | Date | null) => {
    setForm((prev) => {
      const updates: Partial<FormData['identification']> = {
        [field]: value
      };

      // If birth_date is being updated, automatically calculate age
      if (field === 'birth_date' && value instanceof Date) {
        updates.age = calculateAge(value);
      }

      return {
        ...prev,
        identification: {
          ...prev.identification,
          ...updates
        }
      };
    });
    setIsSaved(false); // Mark as unsaved when data changes
  };

  const handleUpdateField = (field: keyof FormData, value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false); // Mark as unsaved when data changes
  };

  const handleUpdateArrayField = (field: 'history' | 'results' | 'recommendations', value: string) => {
    const items = value.split('\n').filter(item => item.trim());
    setForm((prev) => ({
      ...prev,
      [field]: items
    }));
    setIsSaved(false); // Mark as unsaved when data changes
  };

  // Handle checkbox selection for array fields
  const handleToggleOption = (field: 'history' | 'recommendations', option: string) => {
    setForm((prev) => {
      const currentArray = prev[field] || [];
      const exists = currentArray.includes(option);

      return {
        ...prev,
        [field]: exists
          ? currentArray.filter(item => item !== option)
          : [...currentArray, option]
      };
    });
    setIsSaved(false); // Mark as unsaved when data changes
  };

  // Handle custom text input for "Other" option
  const handleAddCustomOption = (field: 'history' | 'recommendations', value: string) => {
    if (!value.trim()) return;

    setForm((prev) => {
      const currentArray = prev[field] || [];
      return {
        ...prev,
        [field]: [...currentArray, value.trim()]
      };
    });
    setIsSaved(false); // Mark as unsaved when data changes
  };

  // Remove custom option
  const handleRemoveCustomOption = (field: 'history' | 'recommendations', option: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter(item => item !== option)
    }));
    setIsSaved(false); // Mark as unsaved when data changes
  };

  // Check if option is selected
  const isOptionSelected = (field: 'history' | 'recommendations', option: string) => {
    return form()[field]?.includes(option) || false;
  };

  // Get custom options (not in predefined list)
  const getCustomOptions = (field: 'history' | 'recommendations', predefinedOptions: string[]) => {
    return form()[field]?.filter(item => !predefinedOptions.includes(item)) || [];
  };

  // Year results handlers - works with structured format internally
  const handleAddYearResult = () => {
    setForm((prev) => ({
      ...prev,
      results: [...prev.results, { year: '', text: '' }]
    }));
    setIsSaved(false);
  };

  const handleRemoveYearResult = (index: number) => {
    setForm((prev) => ({
      ...prev,
      results: prev.results.filter((_, i) => i !== index)
    }));
    setIsSaved(false);
  };

  const handleUpdateYearResult = (index: number, year: string, text: string) => {
    setForm((prev) => ({
      ...prev,
      results: prev.results.map((item, i) =>
        i === index ? { year, text } : item
      )
    }));
    setIsSaved(false);
  };



  // Main function to render form into template
  const renderTemplate = () => {
    const reportData = formAsReport();
    const formattedContent = formatReportContent(reportData as Report);
    setContent(formattedContent);
    return formattedContent;
  };

  const handleFormatForm = () => {
    renderTemplate();
    toast.success("Template rendered successfully!");
  };


  // Navigation between reports - using actual report IDs from database
  const canGoPrevious = () => {
    const currentId = currentReportId();
    if (!currentId) return false;

    const idNum = typeof currentId === 'string' ? parseInt(currentId) : currentId;
    const ids = allReportIds();
    const currentIndex = ids.indexOf(idNum);

    return currentIndex > 0;
  };

  const canGoNext = () => {
    const currentId = currentReportId();
    if (!currentId) return false;

    const idNum = typeof currentId === 'string' ? parseInt(currentId) : currentId;
    const ids = allReportIds();
    const currentIndex = ids.indexOf(idNum);

    return currentIndex >= 0 && currentIndex < ids.length - 1;
  };

  const goToPreviousReport = () => {
    if (!canGoPrevious()) {
      console.log('Cannot go to previous report (already at first)');
      return;
    }

    const currentId = currentReportId();
    const idNum = typeof currentId === 'string' ? parseInt(currentId as string) : currentId!;
    const ids = allReportIds();
    const currentIndex = ids.indexOf(idNum);
    const previousId = ids[currentIndex - 1];

    console.log(`Navigating from report ${idNum} (index ${currentIndex}) to ${previousId} (index ${currentIndex - 1})`);
    navigate(`/form?reportId=${previousId}`);
  };

  const goToNextReport = () => {
    if (!canGoNext()) {
      console.log(`Cannot go to next report (already at last, total: ${totalReports()})`);
      return;
    }

    const currentId = currentReportId();
    const idNum = typeof currentId === 'string' ? parseInt(currentId as string) : currentId!;
    const ids = allReportIds();
    const currentIndex = ids.indexOf(idNum);
    const nextId = ids[currentIndex + 1];

    console.log(`Navigating from report ${idNum} (index ${currentIndex}) to ${nextId} (index ${currentIndex + 1})`);
    navigate(`/form?reportId=${nextId}`);
  };

  // Helper to convert FormData to Report format for checking completeness
  const formAsReport = (): Partial<Report> => {
    const formData = form();
    const resultsAsStrings = formData.results
      .map(r => `${r.year.trim()} - ${r.text.trim()}`.trim())
      .filter(s => s && s !== '-');

    return {
      identification: formData.identification,
      history: formData.history,
      results: resultsAsStrings,
      conclusion: formData.conclusion,
      recommendations: formData.recommendations,
      updated_at: new Date().toISOString()
    };
  };

  // Download functions for PDF and CSV
  const handleDownloadPDF = async () => {
    if (!currentReportId()) {
      toast.error('Nenhum relatório carregado');
      return;
    }

    try {
      toast.loading("Gerando PDF...", { id: 'pdf-download' });

      const currentSettings = settings();
      // Generate HTML directly for PDF
      const htmlContent = generateReportHTML(formAsReport() as Report);
      const patientName = form().identification.name || 'Paciente';
      const filename = `Relatório Audiométrico - ${patientName}.pdf`;

      await generatePDF(htmlContent, currentSettings, filename);

      toast.success("PDF baixado com sucesso!", { id: 'pdf-download' });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF", { id: 'pdf-download' });
    }
  };

  const handleDownloadCSV = () => {
    if (!currentReportId()) {
      toast.error('Nenhum relatório carregado');
      return;
    }

    try {
      const formData = form();

      // Convert structured results to string[] for CSV export
      const resultsAsStrings = formData.results
        .map(r => `${r.year.trim()} - ${r.text.trim()}`.trim())
        .filter(s => s && s !== '-');

      const report: Partial<Report> = {
        identification: formData.identification,
        history: formData.history,
        results: resultsAsStrings,
        conclusion: formData.conclusion,
        recommendations: formData.recommendations
      };

      // Get CSV fields configuration for identification
      const csvFields = getCSVFields();

      // Create CSV header - identification fields + report fields
      const headers = [
        ...csvFields.map(field => field.csvColumns[0]),
        'history',
        'results',
        'conclusion',
        'recommendations'
      ];
      const csvHeader = headers.join(',');

      // Helper to escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      // Identification fields
      const identificationValues = csvFields.map(field => {
        const value = report.identification?.[field.key as keyof typeof report.identification];

        // Format dates as DD/MM/YYYY
        if (field.type === 'date' && value) {
          return formatDateUTC(value as Date);
        }

        return escapeCSV(String(value || ''));
      });

      // History - join with semicolon
      const history = report.history ? report.history.join('; ') : '';

      // Results - join with semicolon
      const results = report.results ? report.results.join('; ') : '';

      // Conclusion
      const conclusion = report.conclusion || '';

      // Recommendations - join with semicolon
      const recommendations = report.recommendations ? report.recommendations.join('; ') : '';

      // Create CSV row
      const csvRow = [
        ...identificationValues,
        escapeCSV(history),
        escapeCSV(results),
        escapeCSV(conclusion),
        escapeCSV(recommendations)
      ].join(',');

      // Combine header and row
      const csvContent = [csvHeader, csvRow].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const patientName = report.identification?.name || 'Paciente';
      link.setAttribute('href', url);
      link.setAttribute('download', `Relatório Audiométrico - ${patientName}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV baixado com sucesso!");
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Erro ao gerar CSV");
    }
  };

  return (
    <div class="form-wrapper" classList={{ "preview-hidden": !showPreview() }}>
      <Show when={isLoadingReport()}>
        <div class="loading-indicator">
          <div class="spinner"></div>
        </div>
      </Show>

      <Show when={!isLoadingReport()}>
        <div class="form-header">
          <div class="header-top">
            <div class="header-title">
              <Show when={currentReportId()}><p class="id">{currentReportId()}</p></Show>
              <h2>{form().identification.name || "Novo Relatório"}</h2>
              <div class="status-badges">
                <Show when={currentReportId()}>
                  <span class="save-status" classList={{
                    "status-saved": isSaved(),
                    "status-pending": !isSaved(),
                    "status-saving": isSaving()
                  }}>
                    {isSaving() ? "⏳ Salvando..." : isSaved() ? "✓ Salvo" : "● Não salvo"}
                  </span>
                </Show>
                <Show when={currentReportId()}>
                  <span class="completion-status" classList={{
                    "status-complete": !!isReportComplete(formAsReport() as Report),
                    "status-incomplete": !isReportComplete(formAsReport() as Report)
                  }}>
                    {isReportComplete(formAsReport() as Report) ? "📋 Completo" : "📝 Incompleto"}
                  </span>
                </Show>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" onClick={() => setShowPreview(!showPreview())} title="Toggle Preview">
                {showPreview() ? "👁️ Ocultar Preview" : "👁️ Mostrar Preview"}
              </button>
              <Show when={currentReportId()}>
                <button type="button" onClick={handleDownloadPDF} title="Download PDF">
                  📄 PDF
                </button>
                <button type="button" onClick={handleDownloadCSV} title="Download CSV">
                  📥 CSV
                </button>
              </Show>
              <button type="button" onClick={handleSaveForm} title="Salvar (Ctrl/Cmd + S)">
                💾 Salvar
              </button>
            </div>
          </div>
        </div>

        <div class="content-area">
          <div class="form-container">
            <form onSubmit={(e) => { e.preventDefault(); handleFormatForm(); }}>
              <div class="form-grid">
                {/* Item 1 */}
                <div class="form-grid-item">
                  <IdentificationSection
                    identification={() => form().identification}
                    onUpdate={handleUpdateIdentification}
                  />
                </div>

                {/* Item 2 */}
                <div class="form-grid-item">
                  <HistorySection
                    history={() => form().history}
                    predefinedOptions={HISTORY_OPTIONS}
                    isOptionSelected={(option) => isOptionSelected('history', option)}
                    onToggleOption={(option) => handleToggleOption('history', option)}
                    onRemoveCustomOption={(option) => handleRemoveCustomOption('history', option)}
                    getCustomOptions={() => getCustomOptions('history', HISTORY_OPTIONS)}
                    onAddCustomOption={(value) => handleAddCustomOption('history', value)}
                  />
                </div>

                {/* Item 3 */}
                <div class="form-grid-item">
                  <ResultsSection
                    results={() => form().results}
                    predefinedOptions={RESULTS_OPTIONS}
                    onAdd={handleAddYearResult}
                    onRemove={handleRemoveYearResult}
                    onUpdate={handleUpdateYearResult}
                  />
                </div>

                {/* Item 4 */}
                <div class="form-grid-item">
                  <ConclusionSection
                    conclusion={() => form().conclusion}
                    onUpdate={(value) => handleUpdateField('conclusion', value)}
                  />
                </div>

                {/* Item 5 */}
                <div class="form-grid-item">
                  <RecommendationsSection
                    recommendations={() => form().recommendations}
                    predefinedOptions={RECOMMENDATIONS_OPTIONS}
                    isOptionSelected={(option) => isOptionSelected('recommendations', option)}
                    onToggleOption={(option) => handleToggleOption('recommendations', option)}
                    onRemoveCustomOption={(option) => handleRemoveCustomOption('recommendations', option)}
                    getCustomOptions={() => getCustomOptions('recommendations', RECOMMENDATIONS_OPTIONS)}
                    onAddCustomOption={(value) => handleAddCustomOption('recommendations', value)}
                  />
                </div>
              </div>
            </form>
          </div>

          {showPreview() && (
            <div class="preview-container">
              <RenderMarkdown content={content} />
            </div>
          )}
        </div>

        <Show when={currentReportId()}>
          <div class="patient-navigation-bottom">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              class="btn-back-to-list"
              title="Voltar para lista de pacientes"
            >
              📋 Lista de Pacientes
            </button>
            <div class="navigation-controls">
              <button
                type="button"
                onClick={goToPreviousReport}
                disabled={!canGoPrevious()}
                title="Relatório Anterior (Ctrl/Cmd + ←)"
              >
                ⬅️ Anterior
              </button>
              <span class="patient-counter">
                {(() => {
                  const currentId = currentReportId();
                  if (!currentId) return '';
                  const idNum = typeof currentId === 'string' ? parseInt(currentId) : currentId;
                  const ids = allReportIds();
                  const currentIndex = ids.indexOf(idNum);
                  if (currentIndex === -1) return `ID ${currentId} de ${totalReports()}`;
                  return `${currentIndex + 1} de ${totalReports()}`;
                })()}
              </span>
              <button
                type="button"
                onClick={goToNextReport}
                disabled={!canGoNext()}
                title="Próximo Relatório (Ctrl/Cmd + →)"
              >
                Próximo ➡️
              </button>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
