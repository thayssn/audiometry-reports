import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show,
} from "solid-js";
import {
  cleanMultiline,
  formatToHTML,
  renderCode,
  renderCSV,
} from "./helpers";
import { dbService, AppSettings, DEFAULT_SETTINGS } from "../../services/dbService";
import "./RenderMarkdown.scss";

export default function RenderMarkdown({
  content,
}: {
  content: Accessor<string>;
}) {
  const [settings, setSettings] = createSignal<AppSettings>(DEFAULT_SETTINGS);

  onMount(async () => {
    const loadedSettings = await dbService.getSettings();
    setSettings(loadedSettings);
  });
  const newContent = createMemo(() => {
    const renderedCSV = renderCSV(cleanMultiline(content()));
    const renderedCode = renderCode(renderedCSV);
    return formatToHTML(renderedCode);
  });

  let ref: HTMLDivElement | undefined;
  let src_ref: HTMLDivElement | undefined;

  createEffect(() => {
    if (ref) {
      const formattedHTMLContent = document.createElement("div");
      formattedHTMLContent.innerHTML = newContent();
      ref.replaceChildren(formattedHTMLContent);
    }

  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [hitBottom, setHitBottom] = createSignal(false);

  onMount(() => {
    window.addEventListener("scroll", () => {
      if (window.scrollY > window.innerHeight) {
        setHitBottom(true);
      } else {
        setHitBottom(false);
      }
    });
  });

  return (
    <div class="print-page-wrapper">
      <div class="print-page-container" id="printable-area">
        
        <div class="print-page">
          <img class="print-logo" src={settings().logoUrl} />
          <div class="print-page-content" ref={ref}></div>
          <div id="signature">
              <div>{settings().signatureName}</div>
              <div>{settings().signatureCRFa}</div>
          </div>
        </div>
      </div>
      <Show when={hitBottom()}>
        <button onClick={() => scrollToTop()} class="scroll-to-top">
          TOP
        </button>
      </Show>
    </div>
  );
}
