import { Accessor } from "solid-js";
import { getFieldLabel } from "../../config/fields";

// IMPORTANT: When adding identification fields, update src/config/fields.ts first
// Then sync this type definition with the config
type IdentificationData = {
    name: string;
    age: number;
    birth_date: Date;
    admission_date: Date;
    last_sequential_exam_date: Date;
    position: string;
    department: string;
};

type Props = {
    identification: Accessor<IdentificationData>;
    onUpdate: (field: keyof IdentificationData, value: string | number | Date) => void;
};

export default function IdentificationSection(props: Props) {
    const getDateValue = (dateField: keyof IdentificationData) => {
        const date = props.identification()[dateField] as Date;
        if (!date) return '';
        
        try {
            if (date instanceof Date && !isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error('Invalid date:', e);
        }
        
        return '';
    };

    return (
        <div class="form-section">
            <h3>1. Identificação</h3>
            <div class="form-field-full">
                <label for="name">{getFieldLabel('name')}</label>
                <input 
                  id="name" 
                  type="text"
                  value={props.identification().name}
                  onInput={(e) => props.onUpdate('name', e.currentTarget.value)}
                />
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label for="age">{getFieldLabel('age')}</label>
                    <input 
                      id="age" 
                      type="number"
                      value={props.identification().age}
                      onInput={(e) => props.onUpdate('age', parseInt(e.currentTarget.value) || 0)}
                    />
                </div>
                <div class="form-field">
                    <label for="birth_date">{getFieldLabel('birth_date')}</label>
                    <input 
                      id="birth_date" 
                      type="date"  
                      value={getDateValue('birth_date')}
                      onInput={(e) => {
                        const value = e.currentTarget.value;
                        if (value) {
                            props.onUpdate('birth_date', new Date(value));
                        }
                      }}
                    />
                </div>
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label for="admission">{getFieldLabel('admission_date')}</label>
                    <input 
                      id="admission" 
                      type="date"  
                      value={getDateValue('admission_date')}
                      onInput={(e) => {
                        const value = e.currentTarget.value;
                        if (value) {
                            props.onUpdate('admission_date', new Date(value));
                        }
                      }}
                    />
                </div>
                <div class="form-field">
                    <label for="last_exam">{getFieldLabel('last_sequential_exam_date')}</label>
                    <input 
                      id="last_exam" 
                      type="date"  
                      value={getDateValue('last_sequential_exam_date')}
                      onInput={(e) => {
                        const value = e.currentTarget.value;
                        if (value) {
                            props.onUpdate('last_sequential_exam_date', new Date(value));
                        }
                      }}
                    />
                </div>
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label for="position">{getFieldLabel('position')}</label>
                    <input 
                      id="position" 
                      type="text"
                      value={props.identification().position}
                      onInput={(e) => props.onUpdate('position', e.currentTarget.value)}
                    />
                </div>
                <div class="form-field">
                    <label for="department">{getFieldLabel('department')}</label>
                    <input 
                      id="department" 
                      type="text"
                      value={props.identification().department}
                      onInput={(e) => props.onUpdate('department', e.currentTarget.value)}
                    />
                </div>
            </div>
        </div>
    );
}

