import jsPDF from "jspdf";
import { AppSettings } from "../services/dbService";

/**
 * Converts markdown content to simple HTML
 */
export function markdownToHTML(markdown: string): string {
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+?);$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> items in <ul> tags
  html = html.replace(/(<li>.*?<\/li>(?:<br>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  return html;
}

/**
 * Applies inline styles to HTML content for PDF rendering
 */
export function applyPDFStyles(htmlContent: string): string {
  return htmlContent
    .replace(/<h1>/g, '<h1 style="font-size: 19pt; font-weight: 700; margin: 1.4cm 0 0.5cm 0; text-align: center; page-break-after: avoid;">')
    .replace(/<h2>/g, '<h2 style="font-size: 14pt; font-weight: 700; margin: 0.6cm 0 0.25cm 1cm; page-break-after: avoid;">')
    .replace(/<h3>/g, '<h3 style="font-size: 12pt; font-weight: 700; margin: 0.4cm 0 0.2cm 1cm; page-break-after: avoid;">')
    .replace(/<strong>/g, '<strong style="font-weight: 700;">')
    .replace(/<li>/g, '<li style="line-height: 1.8;">')
    .replace(/<ul>/g, '<ul style="margin: 0.3cm 0 -0.7cm -1cm; padding-bottom: 0;">')
    .replace(/<br><br>/g, '<p style="margin: 0.2cm 0;"></p>');
}

/**
 * Creates a PDF container element with logo, content, and signature
 */
export function createPDFContainer(
  htmlContent: string,
  settings: AppSettings
): HTMLDivElement {
  const tempContainer = document.createElement('div');
  tempContainer.style.width = '170mm'; // Content width
  tempContainer.style.fontFamily = 'Arial, sans-serif';
  tempContainer.style.fontSize = '11pt';
  tempContainer.style.lineHeight = '1.4';
  tempContainer.style.color = '#000000';

  // Styles are now applied directly in the HTML generator, but we can wrap it if needed.
  // We insert the content directly.

  tempContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 0.5cm; page-break-inside: avoid;">
      <img src="${settings.logoUrl}" style="max-width: 50mm; height: auto;" />
    </div>
    <div>
      ${htmlContent}
    </div>
    <div style="margin-top: 4cm; text-align: center; page-break-inside: avoid; width: 100%;">
      <p style="margin: 0 auto 0.3cm auto; font-family: monospace; letter-spacing: -2px;">------------------------------------------------------------</p>
      <p style="margin: 0; font-size: 11pt; font-weight: 700;">${settings.signatureName}</p>
      <p style="margin: 0; font-size: 10pt;">${settings.signatureCRFa}</p>
    </div>
  `;

  return tempContainer;
}

/**
 * Generates and downloads a PDF from HTML content
 * @param htmlContent - The HTML content to render
 * @param settings - App settings containing logo and signature info
 * @param filename - The filename for the downloaded PDF
 * @returns Promise that resolves when PDF is generated
 */
export async function generatePDF(
  htmlContent: string,
  settings: AppSettings,
  filename: string
): Promise<void> {
  const tempContainer = createPDFContainer(htmlContent, settings);

  const pdf = new jsPDF('p', 'mm', 'a4');

  return new Promise((resolve, reject) => {
    pdf.html(tempContainer, {
      callback: function (doc) {
        doc.save(filename);
        resolve();
      },
      x: 20,
      y: 10,
      width: 170, // Content width (210mm - 40mm margins)
      windowWidth: 800, // Reference width for scaling
      margin: [10, 20, 15, 20], // top, right, bottom, left in mm
      autoPaging: 'text', // Fix for duplication on page breaks
    }).catch(reject);
  });
}

/**
 * Generates a PDF for multiple reports (batch export)
 * @param htmlContents - Array of HTML content strings
 * @param settings - App settings containing logo and signature info
 * @param filenames - Array of filenames for each PDF
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when all PDFs are generated
 */
export async function generateMultiplePDFs(
  htmlContents: string[],
  settings: AppSettings,
  filenames: string[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < htmlContents.length; i++) {
    const content = htmlContents[i];
    const filename = filenames[i];

    await generatePDF(content, settings, filename);

    if (onProgress) {
      onProgress(i + 1, htmlContents.length);
    }

    // Small delay between downloads to prevent browser blocking
    if (i < htmlContents.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

