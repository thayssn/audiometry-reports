import { createSignal, createEffect } from "solid-js";

export type FilterCriteria = {
  searchTerm: string;
  position: string;
  department: string;
  status: 'all' | 'complete' | 'incomplete';
  base: string;
  year: string;
};

type Props = {
  onFilterChange: (filters: FilterCriteria) => void;
};

export default function FilterBar(props: Props) {
  const [searchTerm, setSearchTerm] = createSignal("");
  const [position, setPosition] = createSignal("");
  const [department, setDepartment] = createSignal("");
  const [base, setBase] = createSignal("");
  const [year, setYear] = createSignal("");
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
    status();
    base();
    year();
    applyFilters();
  });

  const applyFilters = () => {
    props.onFilterChange({
      searchTerm: searchTerm(),
      position: position(),
      department: department(),
      status: status(),
      base: base(),
      year: year()
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setPosition("");
    setDepartment("");
    setBase("");
    setYear("");
    setStatus('all');
  };

  const hasActiveFilters = () => {
    return searchTerm() || position() || department() || base() || year() || status() !== 'all';
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
          <label for="base">Base</label>
          <input
            id="base"
            type="text"
            placeholder="Filtrar por base..."
            value={base()}
            onInput={(e) => setBase(e.currentTarget.value)}
          />
        </div>

        <div class="filter-group">
          <label for="year">Ano (Exame Seq.)</label>
          <input
            id="year"
            type="text"
            placeholder="AAAA"
            value={year()}
            onInput={(e) => setYear(e.currentTarget.value)}
            maxLength={4}
            style="width: 80px;"
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
          <label for="status">Status</label>
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

