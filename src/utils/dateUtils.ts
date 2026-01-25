/**
 * Formats a Date object as DD/MM/YYYY using UTC components.
 * This prevents timezone shifts when displaying dates that represent
 * a specific calendar day (stored as UTC midnight).
 */
export const formatDateUTC = (date: Date | null | undefined | string): string => {
    if (!date) return '';
    const d = new Date(date);
    if (d instanceof Date && !isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    return '';
};
