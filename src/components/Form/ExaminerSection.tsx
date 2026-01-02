import { Accessor } from "solid-js";

type ExaminerData = {
    name: string;
    crfa: string;
};

type Props = {
    examiner: Accessor<ExaminerData>;
    onUpdate: (field: keyof ExaminerData, value: string) => void;
};

export default function ExaminerSection(props: Props) {
    return (
        <div class="form-section">
            <h3>Examinador</h3>
            <div class="form-row">
                <div class="form-field">
                    <label for="examiner-name">Nome do Examinador</label>
                    <input 
                      id="examiner-name" 
                      type="text"
                      value={props.examiner().name}
                      onInput={(e) => props.onUpdate('name', e.currentTarget.value)}
                      placeholder="Ex: Maria Silva Santos"
                    />
                </div>
                <div class="form-field">
                    <label for="examiner-crfa">Registro CRFa</label>
                    <input 
                      id="examiner-crfa" 
                      type="text"
                      value={props.examiner().crfa}
                      onInput={(e) => props.onUpdate('crfa', e.currentTarget.value)}
                      placeholder="Ex: CRFa3 - 15.432"
                    />
                </div>
            </div>
        </div>
    );
}

