// ============================================
// Quotation Excel Exporter
// Professional styled Excel export for quotations
// — Rebuilt on the shared excelExporterBase (no duplicated styling loop).
// ============================================

import {
  loadXLSX,
  buildStyledSheet,
  appendSheetToWorkbook,
  saveWorkbookToFile,
  workbookToBlob,
} from './excelExporterBase';
import type { ExcelMergeRange, XlsxWorkbook } from './excelExporterBase';

interface QuotationExcelData {
  companyName: string;
  companyAddress?: string;
  taxNumber?: string;
  quotationNumber: string;
  issueDate: string;
  validUntil?: string;
  customerName: string;
  issuedBy: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  totalAmount: number;
  notes?: string;
}

const hasNotes = (notes: string | undefined): boolean => notes !== undefined && notes !== '';

const buildQuotationRows = (
  data: QuotationExcelData
): { rows: unknown[][]; summaryStartRow: number } => {
  const rows: unknown[][] = [];

  // --- Header Section ---
  rows.push([data.companyName]);
  rows.push([data.companyAddress ?? '']);
  rows.push([`الرقم الضريبي: ${data.taxNumber ?? '---'}`]);
  rows.push([]);
  rows.push([`عرض سعر رقم: ${data.quotationNumber}`]);
  rows.push([]);

  // --- Meta Info Section ---
  rows.push(['العميل:', data.customerName, '', 'رقم عرض السعر:', data.quotationNumber]);
  rows.push(['التاريخ:', data.issueDate, '', 'صالح حتى:', data.validUntil ?? '---']);
  rows.push(['صدر بواسطة:', data.issuedBy, '', '', '']);
  rows.push([]);

  // --- Table Header ---
  rows.push(['#', 'وصف السلعة / الخدمة', 'الكمية', 'سعر الوحدة', 'الإجمالي']);

  // --- Data Rows ---
  data.items.forEach((item, i) => {
    rows.push([i + 1, item.name, item.quantity || 0, item.unitPrice || 0, item.total || 0]);
  });

  // --- Footer Summary ---
  rows.push([]);
  const summaryStartRow = rows.length;
  rows.push(['', '', '', 'المجموع الفرعي:', data.subtotal || 0]);
  rows.push(['', '', '', 'الإجمالي المستحق:', data.totalAmount || 0]);

  if (hasNotes(data.notes)) {
    rows.push([]);
    rows.push(['ملاحظات:', data.notes]);
  }

  return { rows, summaryStartRow };
};

export const generateQuotationWorkbook = async (
  data: QuotationExcelData
): Promise<XlsxWorkbook> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const { rows, summaryStartRow } = buildQuotationRows(data);

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company Name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Address
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Tax
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Title
  ];
  if (hasNotes(data.notes)) {
    merges.push({ s: { r: rows.length - 1, c: 1 }, e: { r: rows.length - 1, c: 4 } });
  }

  const ws = buildStyledSheet(XLSX, rows, {
    colWidths: [8, 45, 15, 20, 20],
    merges,
    styling: {
      companyRow: 0,
      subHeaderRows: [1, 4],
      metaKeyColumns: [0, 3],
      metaRows: [6, 8],
      tableHeaderRow: 10,
      summaryRows: [summaryStartRow, summaryStartRow + 1],
      alternate: { startRow: 10, parity: 'odd' },
      ...(hasNotes(data.notes) ? { notesRow: rows.length - 1 } : {}),
      columnCount: 5,
    },
  });

  appendSheetToWorkbook(XLSX, wb, ws, 'عرض سعر');
  return wb;
};

export const exportQuotationToExcel = async (data: QuotationExcelData): Promise<void> => {
  const wb = await generateQuotationWorkbook(data);
  await saveWorkbookToFile(wb, `عرض_سعر_${data.quotationNumber}.xlsx`);
};

export const generateQuotationExcelBlob = async (data: QuotationExcelData): Promise<Blob> => {
  const wb = await generateQuotationWorkbook(data);
  return workbookToBlob(wb);
};
