import { For, Accessor, JSX } from "solid-js";

type Props = {
  history: Accessor<string[]>;
  predefinedOptions: string[];
  isOptionSelected: (option: string) => boolean;
  onToggleOption: (option: string) => void;
  onRemoveCustomOption: (option: string) => void;
  getCustomOptions: () => string[];
  onAddCustomOption: (value: string) => void;
  children?: JSX.Element;
};

export default function HistorySection(props: Props) {
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
      <h3>2. Histórico</h3>
      <div>
        <label for="history">Histórico</label>
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

          {/* Custom options that were added */}
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

          {/* Add custom option */}
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
      {props.children}
    </div>
  );
}

