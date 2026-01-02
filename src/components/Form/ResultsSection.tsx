import { For, Accessor, createSignal } from "solid-js";

type Props = {
    results: Accessor<string[]>; // Simplified: ["2023 - Texto", "2024 - Outro texto"]
    predefinedOptions: string[];
    onAddYearResult: (year: string, result: string) => void;
    onRemoveYearResult: (index: number) => void;
    onUpdateYearResult: (index: number, year: string, result: string) => void;
};

export default function ResultsSection(props: Props) {
    const [newYear, setNewYear] = createSignal('');
    const [newResult, setNewResult] = createSignal('');
    const [customResult, setCustomResult] = createSignal('');
    
    const handleAdd = () => {
        const year = newYear().trim();
        const selected = newResult();
        const custom = customResult().trim();
        
        const result = custom || (selected !== '__custom__' ? selected : '');
        
        if (year && result) {
            props.onAddYearResult(year, result);
            setNewYear('');
            setNewResult('');
            setCustomResult('');
        }
    };
    
    // Parse existing result string to extract year and text
    const parseResult = (resultStr: string): { year: string, result: string } => {
        const parts = resultStr.split(' - ');
        if (parts.length >= 2) {
            return {
                year: parts[0],
                result: parts.slice(1).join(' - ') // In case there are multiple " - " in the text
            };
        }
        return { year: '', result: resultStr };
    };
    
    return (
        <div class="form-section">
            <h3>3. Resultados</h3>
            <div>
                <label for="results">Resultados por Ano</label>
                <div class="year-results-list">
                  {/* Existing year results */}
                  <For each={props.results()}>
                    {(resultStr, index) => {
                      const parsed = parseResult(resultStr);
                      return (
                        <div class="year-result-item">
                          <input 
                            type="text"
                            class="year-input"
                            placeholder="Ano"
                            value={parsed.year}
                            onInput={(e) => props.onUpdateYearResult(index(), e.currentTarget.value, parsed.result)}
                          />
                          <select 
                            class="result-select"
                            value={parsed.result}
                            onChange={(e) => props.onUpdateYearResult(index(), parsed.year, e.currentTarget.value)}
                          >
                            <option value="">Selecione...</option>
                            <For each={props.predefinedOptions}>
                              {(option) => <option value={option}>{option}</option>}
                            </For>
                            {!props.predefinedOptions.includes(parsed.result) && parsed.result && (
                              <option value={parsed.result}>{parsed.result}</option>
                            )}
                          </select>
                          <button 
                            type="button"
                            class="remove-year-btn"
                            onClick={() => props.onRemoveYearResult(index())}
                          >×</button>
                        </div>
                      );
                    }}
                  </For>
                  
                  {/* Add new year result */}
                  <div class="add-year-result">
                    <input 
                      type="text"
                      class="year-input"
                      placeholder="Ano (ex: 2023)"
                      value={newYear()}
                      onInput={(e) => setNewYear(e.currentTarget.value)}
                    />
                    <select 
                      class="result-select"
                      value={newResult()}
                      onChange={(e) => setNewResult(e.currentTarget.value)}
                    >
                      <option value="">Selecione o resultado...</option>
                      <For each={props.predefinedOptions}>
                        {(option) => <option value={option}>{option}</option>}
                      </For>
                      <option value="__custom__">Outro (digite abaixo)</option>
                    </select>
                    <input 
                      type="text"
                      class="custom-result-input"
                      placeholder="Ou digite resultado personalizado"
                      value={customResult()}
                      onInput={(e) => setCustomResult(e.currentTarget.value)}
                    />
                    <button 
                      type="button"
                      class="add-btn"
                      onClick={handleAdd}
                    >+ Adicionar</button>
                  </div>
                </div>
            </div>
        </div>
    );
}
