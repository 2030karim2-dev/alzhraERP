import { logger } from '../../core/utils/logger';

/** A vertical window of the captured document that is rendered on its own PDF page. */
export interface PageSlice {
  /** Offset from the top of the captured document, in millimetres. */
  sourceY: number;
  /** Height of the window, in millimetres. */
  sourceHeight: number;
}

export interface PDFExportOptions {
  pageSize?: 'a4' | 'a5' | 'letter';
  orientation?: 'p' | 'l';
  /** Margin kept around the printable area, in millimetres. */
  marginMm?: number;
  /** html2canvas drawing scale for the capture. */
  scale?: number;
  /** Explicit page-break candidates (element bottoms) in millimetres. */
  breakpointsMm?: number[];
  /** Selector used to collect natural page-break boundaries from the DOM. */
  breakSelector?: string;
}

/** Minimum height a slice must gain before snapping to a breakpoint, to guarantee progress. */
const MIN_SLICE_MM = 1;

/**
 * Splits content of `totalHeight` into page-sized slices.
 * Breaks snap to the last candidate boundary that still fits, so a table row is never cut in half.
 */
export const computePageSlices = (
  totalHeight: number,
  pageHeight: number,
  breakpoints: number[] = []
): PageSlice[] => {
  if (!Number.isFinite(totalHeight) || !Number.isFinite(pageHeight)) return [];
  if (totalHeight <= 0 || pageHeight <= 0) return [];

  const candidates = breakpoints
    .filter(point => Number.isFinite(point) && point > 0 && point < totalHeight)
    .sort((a, b) => a - b);

  const slices: PageSlice[] = [];
  let start = 0;

  while (start < totalHeight - 1e-6) {
    const target = Math.min(start + pageHeight, totalHeight);
    let end = target;
    if (target < totalHeight - 1e-6) {
      const fitting = candidates.filter(point => point > start + MIN_SLICE_MM && point <= target);
      if (fitting.length > 0) end = fitting[fitting.length - 1]!;
    }
    slices.push({ sourceY: start, sourceHeight: end - start });
    start = end;
  }

  return slices;
};

/** Collects the bottom edge of table rows (and explicit markers) as page-break candidates. */
const collectBreakpointsMm = (
  element: HTMLElement,
  ratio: number,
  selector = 'tr, [data-pdf-break]'
): number[] => {
  if (typeof element.getBoundingClientRect !== 'function') return [];
  const rootRect = element.getBoundingClientRect();
  if (!Number.isFinite(rootRect.height) || rootRect.height <= 0) return [];

  const boundaries: number[] = [];
  element.querySelectorAll<HTMLElement>(selector).forEach(node => {
    const rect = node.getBoundingClientRect();
    if (!Number.isFinite(rect.bottom) || rect.bottom <= rootRect.top) return;
    boundaries.push((rect.bottom - rootRect.top) * ratio);
  });
  return boundaries;
};

export const exportToPDF = async (
  element: HTMLElement,
  fileName: string,
  options: PDFExportOptions = {}
) => {
  if (!element) {
    logger.error('pdfExporter', `Export element not provided`);
    return;
  }

  try {
    // Dynamic Import: Load heavy libraries ONLY when function is called
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const { scale = 2 } = options;

    // 1. Capture the element as a high-res canvas
    const canvas = await html2canvas(element, {
      scale, // Higher scale keeps text crisp when printed
      useCORS: true, // Allow loading cross-origin images
      logging: false,
      backgroundColor: '#ffffff', // Ensure white background
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    // 2. Initialize a standard PDF page (A4 by default)
    const { pageSize = 'a4', orientation = 'p', marginMm = 0 } = options;
    const pdf = new jsPDF(orientation, 'mm', pageSize);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 3. Fit the capture to the printable width; heights stay in millimetres.
    const contentWidth = Math.max(pdfWidth - marginMm * 2, 1);
    const contentHeight = Math.max(pdfHeight - marginMm * 2, 1);
    const ratio = contentWidth / canvas.width;
    const scaledHeight = canvas.height * ratio;

    // 4. Break long documents into standard pages instead of one overflowing page.
    const breakpoints =
      options.breakpointsMm ?? collectBreakpointsMm(element, ratio, options.breakSelector);
    const slices = computePageSlices(scaledHeight, contentHeight, breakpoints);
    if (slices.length === 0) {
      // A display:none or unmounted capture source produces an empty canvas:
      // fail loudly instead of downloading a misleading blank document.
      throw new Error('PDF export aborted: the captured element is empty');
    }

    slices.forEach((slice, index) => {
      if (index > 0) pdf.addPage();
      // The same image is reused on every page, shifted up, so each page shows its own window.
      pdf.addImage(imgData, 'PNG', marginMm, marginMm - slice.sourceY, contentWidth, scaledHeight);
    });

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    logger.error('pdfExporter', 'PDF Export Failed:', error);
    throw error;
  }
};
