import { createSignal, For, Show } from "solid-js";
import { Report, isReportComplete } from "../../services/dbService";
import { getSortableFields, getFieldConfig } from "../../config/fields";

const sortableFields = getSortableFields();
type SortField = typeof sortableFields[number]['key'];
type SortDirection = 'asc' | 'desc';

type Props = {
  reports: Report[];
  totalCount: number;
  onReportClick: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onExportCSV: () => void;
  onExportPDFs: () => void;
  onClearAll: () => void;
};

export default function ReportsTable(props: Props) {
  const [sortField, setSortField] = createSignal<SortField | 'id'>('id');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const itemsPerPage = 20;

  const handleSort = (field: SortField | 'id') => {
    if (sortField() === field) {
      setSortDirection(sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedReports = () => {
    const reports = [...props.reports];
    const field = sortField();
    const direction = sortDirection();
    
    // Special case for ID sorting
    if (field === 'id') {
      reports.sort((a, b) => {
        const aId = typeof a.id === 'string' ? parseInt(a.id) : (a.id || 0);
        const bId = typeof b.id === 'string' ? parseInt(b.id) : (b.id || 0);
        return direction === 'asc' ? aId - bId : bId - aId;
      });
      return reports;
    }
    
    const fieldConfig = getFieldConfig(field);

    reports.sort((a, b) => {
      let aVal: any = a.identification[field as keyof typeof a.identification];
      let bVal: any = b.identification[field as keyof typeof b.identification];

      // Sort based on field type from config
      if (fieldConfig?.type === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (fieldConfig?.type === 'text') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      // number type needs no special handling

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return reports;
  };

  const paginatedReports = () => {
    const sorted = sortedReports();
    const start = (currentPage() - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sorted.slice(start, end);
  };

  const totalPages = () => Math.ceil(props.reports.length / itemsPerPage);

  const getSortIcon = (field: SortField | 'id') => {
    if (sortField() !== field) return '↕️';
    return sortDirection() === 'asc' ? '↑' : '↓';
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages()) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const total = totalPages();
    const current = currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (current > 3) pages.push(-1); // Ellipsis
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (current < total - 2) pages.push(-1); // Ellipsis
      
      pages.push(total);
    }

    return pages;
  };

  return (
    <div class="reports-table-wrapper">
      <Show when={props.reports.length === 0}>
        <div class="empty-state">
          <p>Nenhum relatório encontrado</p>
          <p class="hint">Importe um arquivo CSV para começar</p>
        </div>
      </Show>

      <Show when={props.reports.length > 0}>
        <div class="table-header">
          <span class="table-count">Total: {props.totalCount} relatório(s)</span>
          <div class="table-actions">
            <button 
              type="button" 
              class="btn-export-csv" 
              onClick={props.onExportCSV}
              title="Exportar todos os relatórios para CSV"
            >
              📥 Exportar CSV
            </button>
            <button 
              type="button" 
              class="btn-export-pdf" 
              onClick={props.onExportPDFs}
              title="Exportar todos os relatórios como PDF"
            >
              📄 Exportar PDFs
            </button>
            <button 
              type="button" 
              class="btn-clear-all" 
              onClick={props.onClearAll}
              title="Limpar todos os dados"
            >
              × Limpar Tudo
            </button>
          </div>
        </div>
        
        <div class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} class="sortable">
                  ID {getSortIcon('id')}
                </th>
                <th>Examinador</th>
                <For each={sortableFields}>
                  {(field) => (
                    <th onClick={() => handleSort(field.key as SortField)} class="sortable">
                      {field.label} {getSortIcon(field.key as SortField)}
                    </th>
                  )}
                </For>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <For each={paginatedReports()}>
                {(report, index) => (
                  <tr onClick={() => props.onReportClick(String(report.id))}>
                    <td>{report.id}</td>
                    <td>{report.examiner?.name || '-'}</td>
                    <For each={sortableFields}>
                      {(field) => {
                        const value = report.identification[field.key as keyof typeof report.identification];
                        const isNameField = field.key === 'name';
                        return (
                          <td 
                            onClick={isNameField ? (e) => e.stopPropagation() : undefined}
                            style={isNameField ? { cursor: 'text' } : undefined}
                          >
                            {field.type === 'date' 
                              ? new Date(value as Date).toLocaleDateString('pt-BR')
                              : String(value)
                            }
                          </td>
                        );
                      }}
                    </For>
                    <td>
                      {isReportComplete(report) ? (
                        <span class="status-badge completed">Completo</span>
                      ) : (
                        <span class="status-badge pending">Incompleto</span>
                      )}
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onReportClick(String(report.id));
                          }}
                          class="action-btn btn-edit"
                          title="Editar relatório"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onDeleteReport(String(report.id));
                          }}
                          class="action-btn btn-delete"
                          title="Deletar relatório"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <div class="pagination-info">
            Mostrando {((currentPage() - 1) * itemsPerPage) + 1} - {Math.min(currentPage() * itemsPerPage, props.reports.length)} de {props.reports.length} relatórios
          </div>
          
          <div class="pagination-controls">
            <button
              onClick={() => goToPage(currentPage() - 1)}
              disabled={currentPage() === 1}
              type="button"
            >
              Anterior
            </button>

            <For each={getPageNumbers()}>
              {(page) => (
                <Show
                  when={page !== -1}
                  fallback={<span class="ellipsis">...</span>}
                >
                  <button
                    onClick={() => goToPage(page)}
                    classList={{ active: page === currentPage() }}
                    type="button"
                  >
                    {page}
                  </button>
                </Show>
              )}
            </For>

            <button
              onClick={() => goToPage(currentPage() + 1)}
              disabled={currentPage() === totalPages()}
              type="button"
            >
              Próxima
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

