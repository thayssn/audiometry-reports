import { createSignal, onMount } from "solid-js";

import { applyFormat, Format, formatOptions } from "./helpers";
import EditorHeader from "../EditorHeader";
import toast from "solid-toast";

import "./Editor.scss";
import RenderMarkdown from "../RenderMarkdown";

export default function Editor() {
  const [content, setContent] = createSignal("");

  let textareaRef: HTMLTextAreaElement | undefined;

  onMount(() => {
    const contentToLoad = localStorage.getItem("editor-content");
    if (contentToLoad) {
      setContent(contentToLoad);
    }
  });

  const handleFormat = (format: Format) => {
    const formattedContent = applyFormat(textareaRef!, content(), format);
    setContent(formattedContent);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey) {
      const option = formatOptions.find((option) => option.key === e.key);
      if (option) {
        e.preventDefault();
        handleFormat(option.format);
      } else if (e.key === "s") {
        e.preventDefault();
        handleSaveContent();
      }
    }
  };

  const handleSaveContent = () => {
    const contentToSave = content();
    localStorage.setItem("editor-content", contentToSave);
    toast.success("Content saved locally!");
  };

  return (
    <div class="editor-wrapper">
      <div class="editor-container">
        <EditorHeader
          onClickToFormat={handleFormat}
          onClickToSave={handleSaveContent}
        />
        <textarea
          onKeyDown={onKeyDown}
          ref={textareaRef}
          class="editor-textarea"
          onInput={(e) => setContent(e.target.value)}
          value={content()}
          placeholder="Digite aqui..."
        />
      </div>
      <RenderMarkdown content={content} />
    </div>
  );
}
