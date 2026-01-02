import { Accessor } from "solid-js";

type Props = {
    conclusion: Accessor<string>;
    onUpdate: (value: string) => void;
};

export default function ConclusionSection(props: Props) {
    return (
        <div class="form-section">
            <h3>4. Conclusão</h3>
            <div>
                <label for="conclusion">Conclusão</label>
                <textarea 
                  id="conclusion" 
                  rows={3}
                  value={props.conclusion()}
                  onInput={(e) => props.onUpdate(e.currentTarget.value)}
                />
            </div>
        </div>
    );
}

