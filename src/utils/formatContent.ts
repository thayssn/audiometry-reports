import { Report } from "../services/dbService";

// Helper to format report content as markdown
export const formatReportContent = (report: Report): string => {
    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime())
            ? d.toLocaleDateString('pt-BR')
            : '';
    };

    const sections = [
        '# Relatório Evolutivo Audiométrico\n',
        `## 1. Identificação\n\n` +
        `**Nome:** ${report.identification.name}\n` +
        `**Idade:** ${report.identification.age} anos\n` +
        `**Data de Nascimento:** ${formatDate(report.identification.birth_date)}\n` +
        `**Data de Admissão:** ${formatDate(report.identification.admission_date)}\n` +
        `**Data do Último Exame Sequencial:** ${formatDate(report.identification.last_sequential_exam_date)}\n` +
        `**Cargo:** ${report.identification.position}\n` +
        `**Setor:** ${report.identification.department}\n`,

        report.history && report.history.length > 0
            ? `## 2. Histórico\n\n${report.history.map(h => `- ${h}`).join('\n')}\n`
            : '',

        report.results && report.results.length > 0
            ? `## 3. Resultados / Evolutivo Audiométrico (Referencial / Sequencial)\n\n${report.results.map(r => {
                // Make year (before " - ") bold
                const dashIndex = r.indexOf(' - ');
                if (dashIndex > 0) {
                    const year = r.substring(0, dashIndex);
                    const text = r.substring(dashIndex + 3);
                    return `**${year}** - ${text}`;
                }
                return r;
            }).join('\n\n')}\n`
            : '',

        report.conclusion
            ? `## 4. Conclusão\n\n${report.conclusion}\n`
            : '',

        report.recommendations && report.recommendations.length > 0
            ? `## 5. Recomendações\n\n${report.recommendations.map(r => `- ${r}`).join('\n')}\n`
            : ''
    ];

    return sections.filter(s => s).join('\n');
};