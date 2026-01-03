import { createSignal, createEffect } from "solid-js";

export type FilterCriteria = {
  searchTerm: string;
  position: string;
  department: string;
  examinerName: string;
  status: 'all' | 'complete' | 'incomplete';
};

type Props = {
  onFilterChange: (filters: FilterCriteria) => void;
};

export default function FilterBar(props: Props) {
  const [searchTerm, setSearchTerm] = createSignal("");
  const [position, setPosition] = createSignal("");
  const [department, setDepartment] = createSignal("");
  const [examinerName, setExaminerName] = createSignal("");
  const [status, setStatus] = createSignal<'all' | 'complete' | 'incomplete'>('all');
  
  let debounceTimeout: number | undefined;

  // Debounced search
  createEffect(() => {
    const term = searchTerm();
    
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      applyFilters();
    }, 300) as unknown as number;
  });

  // Other filters apply immediately
  createEffect(() => {
    position();
    department();
    examinerName();
    status();
    applyFilters();
  });

  const applyFilters = () => {
    props.onFilterChange({
      searchTerm: searchTerm(),
      position: position(),
      department: department(),
      examinerName: examinerName(),
      status: status()
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setPosition("");
    setDepartment("");
    setExaminerName("");
    setStatus('all');
  };

  const hasActiveFilters = () => {
    return searchTerm() || position() || department() || examinerName() || status() !== 'all';
  };

  return (
    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-group search-group">
          <label for="search">Buscar por nome</label>
          <input
            id="search"
            type="text"
            placeholder="Digite o nome do paciente..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
          />
        </div>

        <div class="filter-group">
          <label for="position">Cargo</label>
          <input
            id="position"
            type="text"
            placeholder="Filtrar por cargo..."
            value={position()}
            onInput={(e) => setPosition(e.currentTarget.value)}
          />
        </div>

        <div class="filter-group">
          <label for="department">Setor</label>
          <input
            id="department"
            type="text"
            placeholder="Filtrar por setor..."
            value={department()}
            onInput={(e) => setDepartment(e.currentTarget.value)}
          />
        </div>

        <div class="filter-group">
          <label for="examiner">Examinador</label>
          <input
            id="examiner"
            type="text"
            placeholder="Filtrar por examinador..."
            value={examinerName()}
            onInput={(e) => setExaminerName(e.currentTarget.value)}
          />
        </div>

        <div class="filter-group">
          <label for="status">Status do Relatório</label>
          <select
            id="status"
            value={status()}
            onChange={(e) => setStatus(e.currentTarget.value as 'all' | 'complete' | 'incomplete')}
          >
            <option value="all">Todos</option>
            <option value="complete">Completo</option>
            <option value="incomplete">Incompleto</option>
          </select>
        </div>

        <div class="filter-actions">
          {hasActiveFilters() && (
            <button
              type="button"
              onClick={handleClearFilters}
              class="clear-btn"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

