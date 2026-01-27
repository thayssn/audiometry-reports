import { Accessor, JSX } from "solid-js";
import { getFieldLabel } from "../../config/fields";

// IMPORTANT: When adding identification fields, update src/config/fields.ts first
// Then sync this type definition with the config
type IdentificationData = {
    name: string;
    age: number;
    birth_date: string | null; // YYYY-MM-DD
    admission_date: string | null;
    last_sequential_exam_date: string | null;
    position: string;
    department: string;
    base?: string;
};

type Props = {
    identification: Accessor<IdentificationData>;
    onUpdate: (field: keyof IdentificationData, value: string | number | null) => void;
    children?: JSX.Element;
};

export default function IdentificationSection(props: Props) {
    const getDateValue = (dateField: keyof IdentificationData) => {
        const val = props.identification()[dateField];
        if (typeof val === 'string') return val.split('T')[0];
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
                        readonly
                        disabled
                        style="background-color: var(--color-lightest); cursor: not-allowed;"
                        title="A idade é calculada automaticamente a partir da data de nascimento"
                    />
                </div>
                <div class="form-field">
                    <label for="birth_date">{getFieldLabel('birth_date')}</label>
                    <input
                        id="birth_date"
                        type="date"
                        value={getDateValue('birth_date')}
                        onInput={(e) => {
                            props.onUpdate('birth_date', e.currentTarget.value || null);
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
                            props.onUpdate('admission_date', e.currentTarget.value || null);
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
                            props.onUpdate('last_sequential_exam_date', e.currentTarget.value || null);
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
            <div class="form-row">
                <div class="form-field-full">
                    <label for="base">{getFieldLabel('base')} (controle interno)</label>
                    <input
                        id="base"
                        type="text"
                        value={props.identification().base || ''}
                        onInput={(e) => props.onUpdate('base', e.currentTarget.value)}
                    />
                </div>
            </div>
            {props.children}
        </div>
    );
}


