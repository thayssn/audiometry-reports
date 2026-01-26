/**
 * Formats a Date object as DD/MM/YYYY using UTC components.
 * This prevents timezone shifts when displaying dates that represent
 * a specific calendar day (stored as UTC midnight).
 */
export const formatDateUTC = (date: Date | null | undefined | string): string => {
    if (!date) return '';

    // Handle string dates (YYYY-MM-DD or ISO) directly
    if (typeof date === 'string') {
        const cleanDate = date.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            // YYYY-MM-DD -> DD/MM/YYYY
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }

    // Fallback for legacy Date objects
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    return '';
};
