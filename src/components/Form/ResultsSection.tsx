import { Index, Accessor, createEffect, on } from "solid-js";

type ResultEntry = {
    year: string;
    text: string;
};

type Props = {
    results: Accessor<ResultEntry[]>;
    predefinedOptions: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, year: string, text: string) => void;
};

export default function ResultsSection(props: Props) {
    let lastYearInputRef: HTMLInputElement | undefined;

    // Focus on the last year input when a new entry is added
    createEffect(on(
        () => props.results().length,
        (newLength, prevLength) => {
            if (prevLength !== undefined && newLength > prevLength && lastYearInputRef) {
                setTimeout(() => lastYearInputRef?.focus(), 0);
            }
        },
        { defer: true }
    ));

    return (
        <div class="form-section">
            <h3>3. Resultados</h3>
            <div>
                <label>Resultados por Ano</label>
                
                <div class="history-list">
                  <Index each={props.results()}>
                    {(entry, index) => {
                      const isLast = () => index === props.results().length - 1;
                      return (
                      <div class="history-entry">
                        <input 
                          ref={(el) => { if (isLast()) lastYearInputRef = el; }}
                          type="text"
                          class="year-input"
                          placeholder="Ano"
                          value={entry().year}
                          onInput={(e) => props.onUpdate(index, e.currentTarget.value, entry().text)}
                        />
                        
                        <input 
                          type="text"
                          class="text-input"
                          placeholder="Digite texto livre ou selecione..."
                          list={`results-options-${index}`}
                          value={entry().text}
                          onInput={(e) => props.onUpdate(index, entry().year, e.currentTarget.value)}
                          autocomplete="off"
                        />
                        
                        <datalist id={`results-options-${index}`}>
                          <Index each={props.predefinedOptions}>
                            {(option) => <option value={option()} />}
                          </Index>
                        </datalist>
                        
                        <button 
                          type="button" 
                          class="remove-btn"
                          onClick={() => props.onRemove(index)}
                          title="Remover"
                        >
                          ×
                        </button>
                      </div>
                    )}}
                  </Index>
                </div>
                
                <button 
                  type="button" 
                  class="add-row-btn"
                  onClick={props.onAdd}
                >
                  + Adicionar Resultado
                </button>
            </div>
        </div>
    );
}
