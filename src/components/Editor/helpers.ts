export type Format =
  | "bold"
  | "italic"
  | "underline"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "code"
  | "bullet"
  | "line";

export type FormatButtonConfig = {
  label: string;
  format: Format;
  key: string;
};

export const formatOptions: FormatButtonConfig[] = [
  { label: "B", format: "bold", key: "b" },
  { label: "I", format: "italic", key: "i" },
  { label: "U", format: "underline", key: "u" },
  { label: "H1", format: "h1", key: "1" },
  { label: "H2", format: "h2", key: "2" },
  { label: "H3", format: "h3", key: "3" },
  { label: "H4", format: "h4", key: "4" },
  { label: "H5", format: "h5", key: "5" },
  { label: "H6", format: "h6", key: "6" },
  { label: "</>", format: "code", key: "m" },
  { label: "•", format: "bullet", key: "-" },
  { label: "⏎", format: "line", key: "enter" },
];

export const applyFormat = (
  textareaRef: HTMLTextAreaElement,
  content: string,
  format: Format
): string => {
  if (!textareaRef) return content;

  const start = textareaRef.selectionStart;
  const end = textareaRef.selectionEnd;

  const selectedText = content.substring(start, end);

  let markdown;
  switch (format) {
    case "bold":
      markdown = `**${selectedText}**`;
      break;
    case "italic":
      markdown = `*${selectedText}*`;
      break;
    case "h1":
      markdown = `# ${selectedText}`;
      break;
    case "h2":
      markdown = `## ${selectedText}`;
      break;
    case "h3":
      markdown = `### ${selectedText}`;
      break;
    case "h4":
      markdown = `#### ${selectedText}`;
      break;
    case "h5":
      markdown = `##### ${selectedText}`;
      break;
    case "h6":
      markdown = `###### ${selectedText}`;
      break;
    case "underline":
      markdown = `_${selectedText}_`;
      break;
    case "code":
      markdown = `\`${selectedText}\``;
      break;
    case "bullet":
      markdown = `- ${selectedText};`;
      break;
    case "line":
      markdown = `--\n${selectedText}`;
      break;
    default:
      markdown = selectedText;
      break;
  }

  // Set cursor position after the formatted text
  setTimeout(() => {
    textareaRef.selectionStart = start + markdown.length;
    textareaRef.selectionEnd = start + markdown.length;
    textareaRef.focus();
  }, 0);

  const newContent =
    content.substring(0, start) + markdown + content.substring(end);

  return newContent.replace(/^\n/, "");
};
