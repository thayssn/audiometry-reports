import { Format, formatOptions } from "../Editor/helpers";
import "./EditorHeader.scss";

export default function EditorHeader({
  onClickToFormat,
  onClickToSave,
}: {
  onClickToFormat: (format: Format) => void;
  onClickToSave: () => void;
}) {
  return (
    <div class="editor-header">
      <div class="format-buttons">
        {formatOptions.map((option) => (
          <button
            onClick={() => {
              onClickToFormat(option.format);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div class="action-buttons">
        <button onClick={onClickToSave}>Save</button>
      </div>
    </div>
  );
}
