# Fields Reference Guide

This document shows the consistency between CSV import and the application data structures.

## CSV Import Fields

The CSV file must contain these columns (order doesn't matter):

```csv
name,age,birth_date,admission_date,position,department
```

| CSV Column       | Alternative Names            | Type   | Format         | Example              |
|------------------|------------------------------|--------|----------------|----------------------|
| `name`           | `nome`                       | string | -              | João da Silva        |
| `age`            | `idade`                      | number | -              | 45                   |
| `birth_date`     | `data_nascimento`, `data de nascimento` | date   | YYYY-MM-DD or DD/MM/YYYY | 1973-01-15 |
| `admission_date` | `data_admissao`, `data de admissão` | date   | YYYY-MM-DD or DD/MM/YYYY | 2018-03-15 |
| `position`       | `cargo`                      | string | -              | Operador de Máquinas |
| `department`     | `setor`                      | string | -              | Produção             |

## Data Flow

```
CSV Import → Patient (IndexedDB) → Select Patient → Report Form
```

### 1. Patient Type (from CSV)
Stored in IndexedDB `patients` store:

```typescript
type Patient = {
  id: string;                    // Auto-generated UUID
  name: string;                  // From CSV
  age: number;                   // From CSV
  birth_date: string;            // From CSV (converted to ISO)
  admission_date: string;        // From CSV (converted to ISO)
  position: string;              // From CSV
  department: string;            // From CSV
  imported_at: string;           // Auto-generated timestamp
}
```

### 2. IdentificationData (in Report)
Used in report forms with additional field:

```typescript
type IdentificationData = {
  name: string;                  // From Patient
  age: number;                   // From Patient
  birth_date: Date;              // From Patient (converted to Date)
  admission_date: Date;          // From Patient (converted to Date)
  last_sequential_exam_date: Date; // User fills in form (not in CSV)
  position: string;              // From Patient
  department: string;            // From Patient
}
```

## Adding New Fields - Simplified Checklist

When you need to add a new identification field (e.g., "employee_id"):

### Required Changes (Only 2 files!):

1. **Field Configuration** (`src/config/fields.ts`)
   - Add new field to `IDENTIFICATION_FIELDS` array with all metadata:
     - `key`: English field name (e.g., "employee_id")
     - `type`: 'text', 'number', or 'date'
     - `label`: Portuguese label (e.g., "ID do Funcionário")
     - `csvColumns`: Alternative column names for CSV import
     - `inCSV`: true if imported from CSV, false if form-only
     - `sortable`: true if should appear as sortable in patient table
     - `filterable`: true if should have filter in filter bar
     - `reportLabel`: (optional) Custom label for report output

2. **CSV Example** (`exemplo-pacientes.csv`)
   - Add new column header
   - Add data for all rows

### Semi-Automatic Updates (Manual Sync Required):

3. **Type Definitions** (3 files - just add the field)
   - `src/services/dbService.ts` - Add to `Patient` type
   - `src/services/dbService.ts` - Add to `Report.identification` structure
   - `src/components/Form/IdentificationSection.tsx` - Add to `IdentificationData` type
   - `src/components/Form/index.tsx` - Add to `FormData.identification` structure

4. **Form UI** (1 file - add input field)
   - `src/components/Form/IdentificationSection.tsx` - Add input field
   - Labels will be auto-populated from config using `getFieldLabel()`

5. **Form Initialization** (1 file - add to default values)
   - `src/components/Form/index.tsx` - Add to initial state in 3 places:
     - Initial form state
     - Empty state when no patient selected
     - When loading patient data

### Automatic (No Changes Needed!):

- **CSV Parser** - Auto-configured from field metadata
- **CSV Preview Table** - Auto-shows column with Portuguese label
- **Patient Table Columns** - Auto-generates columns from config (if `sortable: true`)
- **Patient Table Sorting** - Auto-configures sorting logic based on field type
- **Report Markdown Output** - Auto-generates from config with proper labels
- **Filters** - Auto-configured if `filterable: true`

### Example: Adding "employee_id" Field

**Step 1:** Add to `src/config/fields.ts`:
```typescript
{
  key: 'employee_id',
  type: 'text',
  label: 'ID do Funcionário',
  csvColumns: ['employee_id', 'id_funcionario', 'matricula'],
  inCSV: true,
  sortable: true,
  filterable: true
}
```

**Step 2:** Update `exemplo-pacientes.csv` header and add data

**Step 3:** Add `employee_id: string;` to type definitions in 4 locations

**Step 4:** Add input field to IdentificationSection.tsx:
```typescript
<label for="employee_id">{getFieldLabel('employee_id')}</label>
<input id="employee_id" type="text" value={props.identification().employee_id} />
```

**Step 5:** Add `employee_id: ""` to form initialization in 3 places

**Done!** Everything else works automatically.

## Current Field Count

- **CSV fields**: 6 (all imported)
- **Patient fields**: 6 + 2 metadata (id, imported_at)
- **IdentificationData fields**: 7 (6 from CSV + 1 form-only field)

All CSV fields are consistently imported and available throughout the application.

