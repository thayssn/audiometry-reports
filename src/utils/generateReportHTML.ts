import { Report } from "../services/dbService";
import { formatDateUTC } from "./dateUtils";

const STYLES = {
    h1: 'font-size: 19pt; font-weight: 700; margin: 1.4cm 0 0.5cm 0; text-align: center; page-break-after: avoid;',
    h2: 'font-size: 14pt; font-weight: 700; margin: 0.6cm 0 0.25cm 1cm; page-break-after: avoid;',
    h3: 'font-size: 12pt; font-weight: 700; margin: 0.4cm 0 0.2cm 1cm; page-break-after: avoid;',
    p: 'margin: 0.2cm 0; page-break-inside: avoid;',
    strong: 'font-weight: 700;',
    ul: 'margin: 0.3cm 0 0 -1cm; padding-bottom: 0;',
    li: 'line-height: 1.8; page-break-inside: avoid;',
    section: 'margin-bottom: 1cm; page-break-inside: avoid;',
    noBreak: 'page-break-inside: avoid; break-inside: avoid;'
};

export const generateReportHTML = (report: Report): string => {
    let html = '';

    // Title
    html += `<div style="${STYLES.section}">`;
    html += `<h1 style="${STYLES.h1}">Relatório Evolutivo Audiométrico</h1>`;
    html += `</div>`;

    // 1. Identificação
    html += `<div style="${STYLES.section}">`;
    html += `<h2 style="${STYLES.h2}">1. Identificação</h2>`;

    // Format each field like results section
    const identificationFields = [
        { label: 'Nome', value: report.identification.name },
        { label: 'Idade', value: `${report.identification.age} anos` },
        { label: 'Data de Nascimento', value: formatDateUTC(report.identification.birth_date) },
        { label: 'Data de Admissão', value: formatDateUTC(report.identification.admission_date) },
        { label: 'Data do Último Exame Sequencial', value: formatDateUTC(report.identification.last_sequential_exam_date) },
        { label: 'Cargo', value: report.identification.position },
        { label: 'Setor', value: report.identification.department }
    ];

    identificationFields.forEach(field => {
        html += `<div style="${STYLES.noBreak}">`;
        html += `<p style="${STYLES.p} display: flex; align-items: baseline;">`;
        html += `<strong style="${STYLES.strong} min-width: 0.5cm; flex-shrink: 0;">${field.label}</strong>`;
        html += `<span style="margin-left: 0.1cm;">- ${field.value}</span>`;
        html += `</p>`;
        html += `</div>`;
    });

    html += `</div>`;

    // 2. Histórico
    if (report.history && report.history.length > 0) {
        html += `<div style="${STYLES.section}">`;
        html += `<h2 style="${STYLES.h2}">2. Histórico</h2>`;
        html += `<ul style="${STYLES.ul}">`;
        report.history.forEach(h => {
            html += `<li style="${STYLES.li}">${h}</li>`;
        });
        html += `</ul>`;
        html += `</div>`;
    }

    // 3. Resultados
    if (report.results && report.results.length > 0) {
        html += `<div style="${STYLES.section}">`;
        html += `<h2 style="${STYLES.h2}">3. Resultados / Evolutivo Audiométrico (Referencial / Sequencial)</h2>`;

        // Results often have a year bolded effectively in markdown.
        // Format: "YYYY - Text"
        report.results.forEach(r => {
            html += `<div style="${STYLES.noBreak}">`;
            const dashIndex = r.indexOf(' - ');
            if (dashIndex > 0) {
                const year = r.substring(0, dashIndex);
                const text = r.substring(dashIndex + 3);
                // Use a table-like structure for better alignment
                html += `<p style="${STYLES.p} display: flex; align-items: baseline;">`;
                html += `<strong style="${STYLES.strong} min-width: 0.5cm; flex-shrink: 0;">${year}</strong>`;
                html += `<span style="margin-left: 0.1cm;">- ${text}</span>`;
                html += `</p>`;
            } else {
                html += `<p style="${STYLES.p}">${r}</p>`;
            }
            html += `</div>`;
        });
        html += `</div>`;
    }

    // 4. Conclusão
    if (report.conclusion) {
        html += `<div style="${STYLES.section}">`;
        html += `<h2 style="${STYLES.h2}">4. Conclusão</h2>`;
        // Handle potential multiline strings if necessary, though <p> handles wrapping.
        // If conclusion has newlines, replace with <br> or multiple <p>
        const paragraphs = report.conclusion.split('\n').filter(p => p.trim());
        paragraphs.forEach(p => {
            html += `<div style="${STYLES.noBreak}">`;
            html += `<p style="${STYLES.p}">${p}</p>`;
            html += `</div>`;
        });
        html += `</div>`;
    }

    // 5. Recomendações
    if (report.recommendations && report.recommendations.length > 0) {
        html += `<div style="${STYLES.section}">`;
        html += `<h2 style="${STYLES.h2}">5. Recomendações</h2>`;
        html += `<ul style="${STYLES.ul}">`;
        report.recommendations.forEach(r => {
            html += `<li style="${STYLES.li}">${r}</li>`;
        });
        html += `</ul>`;
        html += `</div>`;
    }

    return html;
};
