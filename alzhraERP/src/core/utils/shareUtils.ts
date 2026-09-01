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
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    window.open(`https://wa.me/?text=${encodedText}`, '_blank', 'noopener,noreferrer');
  }
};

export interface ShareSpreadsheetOptions {
  /** The generated workbook blob (e.g. from `generateInvoiceExcelBlob`). */
  blob: Blob;
  /** Download/share filename, e.g. `فاتورة_100.xlsx`. */
  fileName: string;
  /** `navigator.share` title (native share sheet only). */
  shareTitle: string;
  /** `navigator.share` text (native share sheet only). */
  shareText: string;
  /** WhatsApp prefilled message used in the non-native fallback path. */
  fallbackText: string;
  /** Downloads the workbook when the native share sheet is unavailable. */
  onDownloadFallback: () => Promise<void>;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Shares an Excel workbook via the native share sheet when available;
 * otherwise downloads it and falls back to WhatsApp deep-link sharing.
 *
 * Unlike `shareExcelFile`, the fallback path can reuse the document's real
 * exporter (e.g. `exportInvoiceToExcel`) and carry a dedicated WhatsApp
 * message distinct from the native share sheet text.
 */
export const shareSpreadsheet = async ({
  blob,
  fileName,
  shareTitle,
  shareText,
  fallbackText,
  onDownloadFallback,
}: ShareSpreadsheetOptions): Promise<void> => {
  const file = new File([blob], fileName, { type: XLSX_MIME });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: shareTitle,
      text: shareText,
    });
    return;
  }

  // Fallback: download the workbook via the real exporter, then open WhatsApp.
  await onDownloadFallback();
  const text = encodeURIComponent(fallbackText);
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
};
