// ============================================
// Invoice Excel Exporter
// Professional styled Excel export for invoices
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

interface InvoiceExcelData {
  companyName: string;
  companyAddress?: string;
  taxNumber?: string;
  invoiceNumber: string;
  issueDate: string;
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
}

const buildInvoiceRows = (data: InvoiceExcelData): unknown[][] => {
  const rows: unknown[][] = [];

  // --- Header Section ---
  rows.push([data.companyName]);
  rows.push([data.companyAddress ?? '']);
  rows.push([`الرقم الضريبي: ${data.taxNumber ?? '---'}`]);
  rows.push([]);
  rows.push([`فاتورة بيع رقم: ${data.invoiceNumber}`]);
  rows.push([]);

  // --- Meta Info Section ---
  rows.push(['العميل:', data.customerName, '', 'رقم الفاتورة:', data.invoiceNumber]);
  rows.push(['التاريخ:', data.issueDate, '', 'صدرت بواسطة:', data.issuedBy]);
  rows.push([]);

  // --- Table Header ---
  rows.push(['#', 'وصف السلعة / الخدمة', 'الكمية', 'سعر الوحدة', 'الإجمالي']);

  // --- Data Rows ---
  data.items.forEach((item, i) => {
    rows.push([i + 1, item.name, item.quantity || 0, item.unitPrice || 0, item.total || 0]);
  });

  // --- Footer Summary ---
  rows.push([]);
  rows.push(['', '', '', 'المجموع الفرعي:', data.subtotal || 0]);
  rows.push(['', '', '', 'الإجمالي المستحق:', data.totalAmount || 0]);

  return rows;
};

export const generateInvoiceWorkbook = async (data: InvoiceExcelData): Promise<XlsxWorkbook> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const rows = buildInvoiceRows(data);

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company Name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Address
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Tax
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Title
  ];

  const ws = buildStyledSheet(XLSX, rows, {
    colWidths: [8, 45, 15, 20, 20],
    merges,
    styling: {
      companyRow: 0,
      subHeaderRows: [1, 4],
      metaKeyColumns: [0, 3],
      metaRows: [6, 7],
      tableHeaderRow: 9,
      summaryRows: [rows.length - 2, rows.length - 1],
      alternate: { startRow: 9, parity: 'odd' },
      columnCount: 5,
    },
  });

  appendSheetToWorkbook(XLSX, wb, ws, 'فاتورة');
  return wb;
};

export const exportInvoiceToExcel = async (data: InvoiceExcelData): Promise<void> => {
  const wb = await generateInvoiceWorkbook(data);
  await saveWorkbookToFile(wb, `فاتورة_${data.invoiceNumber}.xlsx`);
};

export const generateInvoiceExcelBlob = async (data: InvoiceExcelData): Promise<Blob> => {
  const wb = await generateInvoiceWorkbook(data);
  return workbookToBlob(wb);
};
