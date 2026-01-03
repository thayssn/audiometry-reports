import { createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import toast from "solid-toast";
import { dbService, Report, isReportComplete, AppSettings, DEFAULT_SETTINGS } from "../../services/dbService";
import { getCSVFields } from "../../config/fields";
import { generateMultiplePDFs } from "../../utils/pdfGenerator";
import CSVUpload from "./CSVUpload";
import FilterBar, { FilterCriteria } from "./FilterBar";
import ReportsTable from "./ReportsTable";
import "./Reports.scss";

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = createSignal<Report[]>([]);
  const [filteredReports, setFilteredReports] = createSignal<Report[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [settings, setSettings] = createSignal<AppSettings>(DEFAULT_SETTINGS);

  onMount(async () => {
    await loadReports();
    const loadedSettings = await dbService.getSettings();
    setSettings(loadedSettings);
  });

  const loadReports = async () => {
    setIsLoading(true);
    try {
      await dbService.init();
      const allReports = await dbService.getAllReports();
      setReports(allReports);
      setFilteredReports(allReports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportComplete = async () => {
    await loadReports();
  };

  const handleFilterChange = (filters: FilterCriteria) => {
    let filtered = [...reports()];

    // Search by name
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.identification.name.toLowerCase().includes(term));
    }

    // Filter by position
    if (filters.position) {
      const term = filters.position.toLowerCase();
      filtered = filtered.filter(r => r.identification.position.toLowerCase().includes(term));
    }

    // Filter by department
    if (filters.department) {
      const term = filters.department.toLowerCase();
      filtered = filtered.filter(r => r.identification.department.toLowerCase().includes(term));
    }

    // Filter by examiner name
    if (filters.examinerName) {
      const term = filters.examinerName.toLowerCase();
      filtered = filtered.filter(r => r.examiner?.name?.toLowerCase().includes(term));
    }

    // Status filter (complete vs incomplete reports)
    if (filters.status === 'complete') {
      // Complete reports (all fields filled)
      filtered = filtered.filter(r => isReportComplete(r));
    } else if (filters.status === 'incomplete') {
      // Incomplete reports
      filtered = filtered.filter(r => !isReportComplete(r));
    }

    setFilteredReports(filtered);
  };

  const handleReportClick = (reportId: string) => {
    navigate(`/form?reportId=${reportId}`);
  };

  const handleDeleteReport = async (reportId: string) => {
    const report = reports().find(r => String(r.id) === reportId);
    const reportName = report?.identification.name || `ID ${reportId}`;
    
    const confirmed = window.confirm(
      `Deseja realmente deletar o relatório?\n\n${reportName}\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      await dbService.deleteReport(reportId);
      toast.success("Relatório deletado com sucesso!");
      await loadReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Erro ao deletar relatório!");
    }
  };

  const handleClearAllData = async () => {
    // First show what's in the database
    const allReports = reports();
    const reportIds = allReports.map(r => r.id).sort((a, b) => {
      const aNum = typeof a === 'string' ? parseInt(a) : (a || 0);
      const bNum = typeof b === 'string' ? parseInt(b) : (b || 0);
      return aNum - bNum;
    });
    
    console.log('Current report IDs in database:', reportIds);
    
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO!\n\nEsta ação irá apagar TODOS os relatórios do sistema.\n\nTotal de relatórios: ${reports().length}\nIDs: ${reportIds.slice(0, 10).join(', ')}${reportIds.length > 10 ? '...' : ''}\n\nDeseja realmente continuar?`
    );

    if (!confirmed) return;

    // Segunda confirmação para ações destrutivas
    const doubleConfirmed = window.confirm(
      "Esta é uma ação irreversível!\n\nTem certeza absoluta?"
    );

    if (!doubleConfirmed) return;

    try {
      setIsLoading(true);
      await dbService.clearAllData();
      setReports([]);
      setFilteredReports([]);
      toast.success("Todos os dados foram removidos com sucesso! Próximos IDs começarão de 1.");
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Erro ao limpar dados!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const allReports = reports();
      
      if (allReports.length === 0) {
        toast.error("Nenhum relatório para exportar");
        return;
      }

      // Get CSV fields configuration for identification
      const csvFields = getCSVFields();
      
      // Create CSV header - examiner + identification fields + report fields
      const headers = [
        'examiner_name',
        'examiner_crfa',
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
      
      // Create CSV rows
      const csvRows = allReports.map(report => {
        // Examiner information
        const examinerName = escapeCSV(report.examiner?.name || '');
        const examinerCrfa = escapeCSV(report.examiner?.crfa || '');
        
        // Identification fields
        const identificationValues = csvFields.map(field => {
          const value = report.identification[field.key as keyof typeof report.identification];
          
          // Format dates as DD/MM/YYYY
          if (field.type === 'date' && value) {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
          
          return escapeCSV(String(value || ''));
        });
        
        // History - join with semicolon
        const history = report.history ? report.history.join('; ') : '';
        
        // Results - join with semicolon (now simple strings)
        const results = report.results ? report.results.join('; ') : '';
        
        // Conclusion
        const conclusion = report.conclusion || '';
        
        // Recommendations - join with semicolon
        const recommendations = report.recommendations ? report.recommendations.join('; ') : '';
        
        return [
          examinerName,
          examinerCrfa,
          ...identificationValues,
          escapeCSV(history),
          escapeCSV(results),
          escapeCSV(conclusion),
          escapeCSV(recommendations)
        ].join(',');
      });
      
      // Combine header and rows
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Relatórios Audiométricos - Todos.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${allReports.length} relatórios exportados com sucesso!`);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Erro ao exportar CSV!");
    }
  };

  const handleExportPDFs = async () => {
    const allReports = reports();
    
    if (allReports.length === 0) {
      toast.error("Nenhum relatório para exportar");
      return;
    }

    // Filtrar apenas relatórios completos (com conclusão)
    const completeReports = allReports.filter(r => isReportComplete(r));
    
    if (completeReports.length === 0) {
      toast.error("Nenhum relatório completo para exportar");
      return;
    }

    const confirmed = window.confirm(
      `Encontrados ${completeReports.length} relatórios completos (de ${allReports.length} totais).\n\nDeseja exportar os ${completeReports.length} relatórios completos como PDF?\n\nEsta operação pode levar alguns minutos.`
    );

    if (!confirmed) return;

    try {
      toast.success(`Iniciando exportação de ${completeReports.length} PDFs...`);

      // Helper to format report content as markdown
      const formatReportContent = (report: Report): string => {
        const formatDate = (date: Date) => {
          const d = new Date(date);
          return d instanceof Date && !isNaN(d.getTime())
            ? d.toLocaleDateString('pt-BR')
            : '';
        };

        const sections = [
          '# Relatório Evolutivo Audiométrico\n',
          `## 1. Identificação\n\n` +
          `**Nome:** ${report.identification.name}\n` +
          `**Idade:** ${report.identification.age} anos\n` +
          `**Data de Nascimento:** ${formatDate(report.identification.birth_date)}\n` +
          `**Data de Admissão:** ${formatDate(report.identification.admission_date)}\n` +
          `**Data do Último Exame Sequencial:** ${formatDate(report.identification.last_sequential_exam_date)}\n` +
          `**Cargo:** ${report.identification.position}\n` +
          `**Setor:** ${report.identification.department}\n` +
          (report.examiner && (report.examiner.name || report.examiner.crfa)
            ? `**Examinador:** ${report.examiner.name}${report.examiner.crfa ? ` - ${report.examiner.crfa}` : ''}\n`
            : ''),
          
          report.history && report.history.length > 0
            ? `## 2. Histórico\n\n${report.history.map(h => `- ${h}`).join('\n')}\n`
            : '',
          
          report.results && report.results.length > 0
            ? `## 3. Resultados\n\n${report.results.map(r => {
                // Make year (before " - ") bold
                const dashIndex = r.indexOf(' - ');
                if (dashIndex > 0) {
                  const year = r.substring(0, dashIndex);
                  const text = r.substring(dashIndex + 3);
                  return `**${year}** - ${text}`;
                }
                return r;
              }).join('\n\n')}\n`
            : '',
          
          report.conclusion
            ? `## 4. Conclusão\n\n${report.conclusion}\n`
            : '',
          
          report.recommendations && report.recommendations.length > 0
            ? `## 5. Recomendações\n\n${report.recommendations.map(r => `- ${r}`).join('\n')}\n`
            : ''
        ];

        return sections.filter(s => s).join('\n');
      };

      // Prepare markdown contents and filenames
      const markdownContents = completeReports.map(report => formatReportContent(report));
      const filenames = completeReports.map(report => {
        const patientName = report.identification.name || 'Paciente';
        return `Relatório Audiométrico - ${patientName}.pdf`;
      });

      // Use shared PDF generator utility for batch export
      await generateMultiplePDFs(
        markdownContents,
        settings(),
        filenames,
        (current, total) => {
          // Optional: Could show progress toast here if needed
          console.log(`Generated ${current}/${total} PDFs`);
        }
      );

      toast.success(`${completeReports.length} PDFs exportados com sucesso!`);
      
    } catch (error) {
      console.error("Error exporting PDFs:", error);
      toast.error("Erro ao exportar PDFs!");
    }
  };

  return (
    <div class="reports-page">
      <div class="reports-header">
        <h1>Gerenciamento de Relatórios</h1>
        <p class="subtitle">Importe e gerencie relatórios audiométricos</p>
      </div>

      <Show when={!settings().examinerName || !settings().examinerCRFa}>
        <div class="warning-box">
          <div class="warning-icon">⚠️</div>
          <div class="warning-content">
            <h3>Atenção: Configuração Incompleta</h3>
            <p>
              As informações do examinador não foram configuradas. 
              Por favor, acesse as <a href="/settings">Configurações</a> e preencha 
              o nome e CRFa do examinador para que os relatórios sejam gerados corretamente.
            </p>
          </div>
        </div>
      </Show>

      <CSVUpload onImportComplete={handleImportComplete} />

      {!isLoading() && reports().length > 0 && (
        <>
          <FilterBar onFilterChange={handleFilterChange} />
          <ReportsTable
            reports={filteredReports()}
            totalCount={reports().length}
            onReportClick={handleReportClick}
            onDeleteReport={handleDeleteReport}
            onExportCSV={handleExportCSV}
            onExportPDFs={handleExportPDFs}
            onClearAll={handleClearAllData}
          />
        </>
      )}

      {isLoading() && (
        <div class="loading-state">
          <p>Carregando relatórios...</p>
        </div>
      )}
    </div>
  );
}

