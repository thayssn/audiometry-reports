import { createSignal, Show, For } from "solid-js";
import { dbService, Report } from "../../services/dbService";
import toast from "solid-toast";
import { getCSVFields, getFieldLabel } from "../../config/fields";

type Props = {
  onImportComplete: () => void;
};

export default function CSVUpload(props: Props) {
  const [file, setFile] = createSignal<File | null>(null);
  const [preview, setPreview] = createSignal<Report[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [showPreview, setShowPreview] = createSignal(false);
  const [clearExisting, setClearExisting] = createSignal(false);

  const parseCSV = (text: string): Report[] => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    // Assume first line is header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    console.log('CSV Headers found:', headers);
    
    // Helper to parse a CSV line respecting quotes
    const parseCSVLine = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote mode
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      values.push(current.trim());
      
      return values;
    };
    
    // Build column index map from config
    const csvFields = getCSVFields();
    const columnIndices = new Map<string, number>();
    
    csvFields.forEach(field => {
      const idx = headers.findIndex(h => field.csvColumns.includes(h));
      if (idx !== -1) {
        columnIndices.set(field.key, idx);
      }
    });

    console.log('Column indices:', Object.fromEntries(columnIndices));

    // Only check if name column exists (required field)
    if (!columnIndices.has('name')) {
      throw new Error(`Coluna obrigatória ausente: Nome (name/nome). Colunas encontradas: ${headers.join(', ')}`);
    }

    const reports: Report[] = [];
    
    // Helper to parse dates (returns current date if parsing fails)
    const parseDate = (dateStr: string, fieldLabel: string, lineNum: number): Date => {
      if (!dateStr || dateStr.trim() === '') {
        return new Date();
      }
      
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) return date;
        }
        console.warn(`Linha ${lineNum}: ${fieldLabel} inválida "${dateStr}". Usando data atual.`);
        return new Date();
      } else {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
        console.warn(`Linha ${lineNum}: ${fieldLabel} inválida "${dateStr}". Usando data atual.`);
        return new Date();
      }
    };
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      // Extract values using column indices from config (with fallbacks)
      const name = columnIndices.has('name') ? values[columnIndices.get('name')!] : '';
      const ageStr = columnIndices.has('age') ? values[columnIndices.get('age')!] : '';
      const birthDateStr = columnIndices.has('birth_date') ? values[columnIndices.get('birth_date')!] : '';
      const admissionDateStr = columnIndices.has('admission_date') ? values[columnIndices.get('admission_date')!] : '';
      const position = columnIndices.has('position') ? values[columnIndices.get('position')!] : '';
      const department = columnIndices.has('department') ? values[columnIndices.get('department')!] : '';
      
      // Check for additional report fields
      const historyIdx = headers.findIndex(h => h === 'history');
      const resultsIdx = headers.findIndex(h => h === 'results');
      const conclusionIdx = headers.findIndex(h => h === 'conclusion');
      const recommendationsIdx = headers.findIndex(h => h === 'recommendations');

      // Only validate name (required field)
      if (!name || name.trim() === '') {
        throw new Error(`Linha ${i + 1}: ${getFieldLabel('name')} é obrigatório`);
      }

      // Parse age if provided, otherwise use 0
      const age = ageStr ? parseInt(ageStr) : 0;
      if (ageStr && (isNaN(age) || age < 0 || age > 150)) {
        throw new Error(`Linha ${i + 1}: ${getFieldLabel('age')} inválida "${ageStr}"`);
      }

      // Parse dates if provided, otherwise use current date
      const birthDate = birthDateStr ? parseDate(birthDateStr, getFieldLabel('birth_date'), i + 1) : new Date();
      const admissionDate = admissionDateStr ? parseDate(admissionDateStr, getFieldLabel('admission_date'), i + 1) : new Date();
      
      // Parse additional report fields
      const history = historyIdx !== -1 && values[historyIdx] ? values[historyIdx].split(';').map(s => s.trim()).filter(s => s) : [];
      
      // Results are now simple strings like "2023 - Texto"
      let results: string[] = [];
      if (resultsIdx !== -1 && values[resultsIdx]) {
        try {
          // Try to parse as JSON first (for backward compatibility)
          const parsed = JSON.parse(values[resultsIdx]);
          if (Array.isArray(parsed)) {
            // Convert old format to new format
            results = parsed.map((r: any) => {
              if (typeof r === 'string') return r;
              if (r.year && r.result) return `${r.year} - ${r.result}`;
              return '';
            }).filter(Boolean);
          }
        } catch (e) {
          // If not JSON, treat as semicolon-separated strings
          results = values[resultsIdx].split(';').map(s => s.trim()).filter(s => s);
        }
      }
      
      const conclusion = conclusionIdx !== -1 ? values[conclusionIdx] : '';
      const recommendations = recommendationsIdx !== -1 && values[recommendationsIdx] ? values[recommendationsIdx].split(';').map(s => s.trim()).filter(s => s) : [];

      // Create report with empty fields
      reports.push({
        identification: {
          name,
          age,
          birth_date: birthDate,
          admission_date: admissionDate,
          last_sequential_exam_date: new Date(),
          position,
          department
        },
        examiner: {
          name: '',
          crfa: ''
        },
        history,
        results,
        conclusion,
        recommendations,
        updated_at: new Date().toISOString()
      });
    }

    return reports;
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    
    if (selectedFile) {
      setFile(selectedFile);
      setShowPreview(false);
      setPreview([]);
    }
  };

  const handlePreview = async () => {
    const currentFile = file();
    if (!currentFile) return;

    setIsLoading(true);
    
    try {
      const text = await currentFile.text();
      const reports = parseCSV(text);
      
      if (reports.length === 0) {
        toast.error('CSV está vazio');
        return;
      }

      setPreview(reports);
      setShowPreview(true);
      toast.success(`${reports.length} relatórios encontrados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar CSV');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const reports = preview();
    if (reports.length === 0) return;

    setIsLoading(true);

    try {
      if (clearExisting()) {
        console.log('Clearing existing data before import...');
        await dbService.clearAllData();
        console.log('Data cleared. Database reset complete.');
      }

      console.log(`Adding ${reports.length} new reports...`);
      await dbService.addReports(reports);
      
      toast.success(`${reports.length} relatórios importados com sucesso!`);
      
      // Reset
      setFile(null);
      setPreview([]);
      setShowPreview(false);
      
      props.onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao importar relatórios');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="csv-upload">
      <div class="upload-section">
        <h3>Importar Relatórios via CSV</h3>
        
        <div class="file-input-wrapper">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading()}
            id="csv-file-input"
          />
          <label for="csv-file-input" class="file-label">
            {file() ? file()!.name : 'Selecionar arquivo CSV'}
          </label>
        </div>

        <Show when={file()}>
          <div class="upload-options">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={clearExisting()}
                onChange={(e) => setClearExisting(e.currentTarget.checked)}
              />
              <span>Limpar dados existentes antes de importar</span>
            </label>
          </div>

          <div class="upload-actions">
            <button
              onClick={handlePreview}
              disabled={isLoading()}
              type="button"
            >
              {isLoading() ? 'Processando...' : 'Visualizar Preview'}
            </button>
          </div>
        </Show>
      </div>

      <Show when={showPreview()}>
        <div class="preview-section">
          <div class="preview-header">
            <h4>Preview - Primeiros 10 registros</h4>
            <p>{preview().length} relatórios no total</p>
          </div>

          <div class="preview-table-wrapper">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{getFieldLabel('name')}</th>
                  <th>{getFieldLabel('age')}</th>
                  <th>{getFieldLabel('birth_date')}</th>
                  <th>{getFieldLabel('position')}</th>
                  <th>{getFieldLabel('department')}</th>
                  <th>{getFieldLabel('admission_date')}</th>
                </tr>
              </thead>
              <tbody>
                <For each={preview().slice(0, 10)}>
                  {(report, index) => (
                    <tr>
                      <td>{index() + 1}</td>
                      <td>{report.identification.name}</td>
                      <td>{report.identification.age}</td>
                      <td>{new Date(report.identification.birth_date).toLocaleDateString('pt-BR')}</td>
                      <td>{report.identification.position}</td>
                      <td>{report.identification.department}</td>
                      <td>{new Date(report.identification.admission_date).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          <div class="preview-actions">
            <button
              onClick={handleImport}
              disabled={isLoading()}
              type="button"
              class="import-btn"
            >
              {isLoading() ? 'Importando...' : `Confirmar Importação (${preview().length} relatórios)`}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              disabled={isLoading()}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

