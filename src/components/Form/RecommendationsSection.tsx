import { For, Accessor } from "solid-js";

type Props = {
    recommendations: Accessor<string[]>;
    predefinedOptions: string[];
    isOptionSelected: (option: string) => boolean;
    onToggleOption: (option: string) => void;
    onRemoveCustomOption: (option: string) => void;
    getCustomOptions: () => string[];
    onAddCustomOption: (value: string) => void;
};

export default function RecommendationsSection(props: Props) {
    let inputRef: HTMLInputElement | undefined;

    const handleAddCustom = () => {
      if (inputRef && inputRef.value.trim()) {
        props.onAddCustomOption(inputRef.value);
        inputRef.value = '';
        inputRef.focus();
      }
    };

    return (
        <div class="form-section">
            <h3>5. Recomendações</h3>
            <div>
                <label for="recommendations">Recomendações</label>
                <div class="checkbox-list">
                  <For each={props.predefinedOptions}>
                    {(option) => (
                      <label class="checkbox-item">
                        <input 
                          type="checkbox"
                          checked={props.isOptionSelected(option)}
                          onChange={() => props.onToggleOption(option)}
                        />
                        <span>{option}</span>
                      </label>
                    )}
                  </For>
                  
                  {/* Custom options */}
                  <For each={props.getCustomOptions()}>
                    {(option) => (
                      <label class="checkbox-item custom-option">
                        <input 
                          type="checkbox"
                          checked={true}
                          onChange={() => props.onRemoveCustomOption(option)}
                        />
                        <span>{option}</span>
                      </label>
                    )}
                  </For>
                  
                  <div class="custom-input">
                    <input 
                      ref={inputRef}
                      type="text"
                      placeholder="Outro - Pressione Enter ou clique +"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustom();
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      class="add-custom-btn"
                      onClick={handleAddCustom}
                      title="Adicionar opção customizada"
                    >
                      +
                    </button>
                  </div>
                </div>
            </div>
        </div>
    );
}

