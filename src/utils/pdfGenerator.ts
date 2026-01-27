import jsPDF from "jspdf";
import { AppSettings } from "../services/dbService";

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
    <div style="margin-top: 6cm; text-align: center; page-break-inside: avoid; width: 100%;">
    <hr width="40%" />  
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

