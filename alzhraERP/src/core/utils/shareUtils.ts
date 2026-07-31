/**
 * shareUtils.ts
 * Shared utility for native file sharing via navigator.share with fallback
 */

/**
 * Share an Excel file using navigator.share API (mobile-first).
 * Falls back to direct download + WhatsApp link on unsupported browsers.
 *
 * @param blob - The Excel file Blob
 * @param filename - File name (e.g., "فاتورة_1001.xlsx")
 * @param title - Share title
 * @param text - Share body text
 */
export const shareExcelFile = async (
    blob: Blob,
    filename: string,
    title: string,
    text: string
): Promise<void> => {
    const file = new File([blob], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
    } else {
        // Fallback: trigger download + open WhatsApp web
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
};
