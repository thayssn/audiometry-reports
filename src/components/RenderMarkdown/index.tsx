import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show,
} from "solid-js";
import "./RenderMarkdown.scss";

export default function RenderMarkdown({
  content,
}: {
  content: Accessor<string>;
}) {
  // Directly use the HTML content without markdown processing
  const newContent = createMemo(() => content());

  let ref: HTMLDivElement | undefined;

  createEffect(() => {
    if (ref) {
      ref.innerHTML = newContent();

      // Add page break indicators after content is rendered
      setTimeout(() => {
        addPageBreakIndicators(ref);
      }, 100);
    }
  });

  // Function to add visual page break indicators
  const addPageBreakIndicators = (container: HTMLDivElement) => {
    // Remove existing indicators
    const existingIndicators = container.querySelectorAll('.page-break-indicator');
    existingIndicators.forEach(el => el.remove());

    // A4 dimensions: 21cm x 29.7cm
    // With padding (1cm top, 1.5cm sides, 2cm bottom), usable height is ~26.7cm
    const A4_HEIGHT_CM = 29.7;
    const PADDING_TOP_CM = 1;
    const PADDING_BOTTOM_CM = 1.5;
    const USABLE_HEIGHT_CM = A4_HEIGHT_CM - PADDING_TOP_CM + PADDING_BOTTOM_CM;

    // Convert cm to pixels (assuming 96 DPI, 1cm ≈ 37.8px)
    const CM_TO_PX = 37.8;
    const pageHeight = USABLE_HEIGHT_CM * CM_TO_PX;

    const contentHeight = container.scrollHeight;
    const numberOfPages = Math.ceil(contentHeight / pageHeight);

    // Add indicators for each page break
    for (let i = 1; i < numberOfPages; i++) {
      const indicator = document.createElement('div');
      indicator.className = 'page-break-indicator';
      indicator.style.cssText = `
        position: absolute;
        left: -1.5cm;
        right: -1.5cm;
        top: ${USABLE_HEIGHT_CM * i}cm;
        height: 0;
        border-top: 2px dashed rgba(255, 50, 50, 0.5);
        pointer-events: none;
        z-index: 1000;
      `;

      // Add page number label
      const label = document.createElement('span');
      label.textContent = `Page ${i} / ${i + 1}`;
      label.style.cssText = `
        position: absolute;
        right: 0.5cm;
        top: -0.6cm;
        background: rgba(255, 50, 50, 0.8);
        color: white;
        padding: 0.1cm 0.3cm;
        font-size: 0.3cm;
        border-radius: 0.1cm;
        font-weight: bold;
      `;
      indicator.appendChild(label);

      container.appendChild(indicator);
    }
  };

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
          <div class="print-page-content" ref={ref}></div>
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
