// Central Field Configuration
// This file is the single source of truth for all identification fields
// When adding a new field, add it here with all metadata, then sync type definitions

export type FieldType = 'text' | 'number' | 'date';

export type FieldConfig = {
  key: string;                    // English field name
  type: FieldType;                // Data type
  label: string;                  // Portuguese label
  csvColumns: string[];           // Alternative CSV column names (all lowercase)
  inCSV: boolean;                 // Is this field imported from CSV?
  sortable?: boolean;             // Should appear in table sort?
  filterable?: boolean;           // Should appear in filters?
  reportLabel?: string;           // Custom label for report output (defaults to label)
};

export const IDENTIFICATION_FIELDS: FieldConfig[] = [
  {
    key: 'name',
    type: 'text',
    label: 'Nome',
    csvColumns: ['name', 'nome'],
    inCSV: true,
    sortable: true,
    filterable: true
  },
  {
    key: 'age',
    type: 'number',
    label: 'Idade',
    csvColumns: ['age', 'idade'],
    inCSV: true,
    sortable: true,
    filterable: true
  },
  {
    key: 'birth_date',
    type: 'date',
    label: 'Data de Nascimento',
    csvColumns: ['birth_date', 'data_nascimento', 'data de nascimento'],
    inCSV: true,
    sortable: true
  },
  {
    key: 'admission_date',
    type: 'date',
    label: 'Data de Admissão',
    csvColumns: ['admission_date', 'data_admissao', 'data de admissão'],
    inCSV: true,
    sortable: true,
    filterable: true
  },
  {
    key: 'last_sequential_exam_date',
    type: 'date',
    label: 'Data do Último Exame Sequencial',
    csvColumns: [],
    inCSV: false,
    sortable: false
  },
  {
    key: 'position',
    type: 'text',
    label: 'Cargo',
    csvColumns: ['position', 'cargo'],
    inCSV: true,
    sortable: true,
    filterable: true,
    reportLabel: 'Cargo'
  },
  {
    key: 'department',
    type: 'text',
    label: 'Setor',
    csvColumns: ['department', 'setor'],
    inCSV: true,
    sortable: true,
    filterable: true,
    reportLabel: 'Setor'
  }
];

// Utility functions for easy access
export const getFieldLabel = (key: string): string => {
  return IDENTIFICATION_FIELDS.find(f => f.key === key)?.label || key;
};

export const getFieldConfig = (key: string): FieldConfig | undefined => {
  return IDENTIFICATION_FIELDS.find(f => f.key === key);
};

export const getCSVFields = () => IDENTIFICATION_FIELDS.filter(f => f.inCSV);
export const getSortableFields = () => IDENTIFICATION_FIELDS.filter(f => f.sortable);
export const getFilterableFields = () => IDENTIFICATION_FIELDS.filter(f => f.filterable);

