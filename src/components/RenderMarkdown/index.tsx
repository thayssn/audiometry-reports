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
  getPrintableContent,
  renderCode,
  renderCSV,
} from "./helpers";
import { toast } from "solid-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Gerando PDF...", { id: 'pdf-download' });

      // Get the current markdown content
      const markdownContent = content();

      // Simple markdown to HTML conversion
      let htmlContent = markdownContent
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+?);$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');

      // Create a container optimized for pdf.html()
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '170mm'; // Content width
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '11pt';
      tempContainer.style.lineHeight = '1.4';
      tempContainer.style.color = '#000000';
      
      tempContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 1cm; page-break-inside: avoid;">
          <img src="${settings().logoUrl}" style="max-width: 50mm; height: auto;" />
        </div>
        <div>
          ${htmlContent
            .replace(/<h1>/g, '<h1 style="font-size: 16pt; font-weight: 700; margin: 0.8cm 0 0.3cm 0; page-break-after: avoid;">')
            .replace(/<h2>/g, '<h2 style="font-size: 14pt; font-weight: 700; margin: 0.6cm 0 0.25cm 0; page-break-after: avoid;">')
            .replace(/<h3>/g, '<h3 style="font-size: 12pt; font-weight: 700; margin: 0.4cm 0 0.2cm 0; page-break-after: avoid;">')
            .replace(/<strong>/g, '<strong style="font-weight: 700;">')
            .replace(/<li>/g, '<li style="margin-bottom: 0.1cm; line-height: 1.4;">')
            .replace(/<ul>/g, '<ul style="margin: 0.2cm 0; padding-left: 1cm;">')
            .replace(/<br><br>/g, '<p style="margin: 0.2cm 0;"></p>')
          }
        </div>
        <div style="margin-top: 2cm; text-align: center; page-break-inside: avoid;">
          <div style="border-top: 1px solid #000000; width: 150px; margin: 0 auto 0.3cm auto;"></div>
          <p style="margin: 0; font-size: 11pt; font-weight: 700;">${settings().signatureName}</p>
          <p style="margin: 0; font-size: 10pt;">${settings().signatureCRFa}</p>
        </div>
      `;

      // Use jsPDF's html method for proper pagination
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      await pdf.html(tempContainer, {
        callback: function (doc) {
          const timestamp = new Date().toISOString().split('T')[0];
          doc.save(`relatorio-${timestamp}.pdf`);
          toast.success("PDF baixado com sucesso!", { id: 'pdf-download' });
        },
        x: 20,
        y: 15,
        width: 170, // Content width (210mm - 40mm margins)
        windowWidth: 800, // Reference width for scaling
        margin: [15, 20, 15, 20], // top, right, bottom, left in mm
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF", { id: 'pdf-download' });
    }
  };

  const handleDownloadCSV = () => {
    try {
      // Get the markdown content
      const markdownContent = content();
      
      // Simple CSV export with the markdown content
      const csvContent = `"Relatório"\n"${markdownContent.replace(/"/g, '""')}"`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV baixado com sucesso!");
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Erro ao gerar CSV");
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

    // Listen for download events from parent component
    const handleDownloadPDFEvent = () => handleDownloadPDF();
    const handleDownloadCSVEvent = () => handleDownloadCSV();
    
    window.addEventListener('downloadPDF', handleDownloadPDFEvent);
    window.addEventListener('downloadCSV', handleDownloadCSVEvent);

    // Cleanup
    return () => {
      window.removeEventListener('downloadPDF', handleDownloadPDFEvent);
      window.removeEventListener('downloadCSV', handleDownloadCSVEvent);
    };
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
