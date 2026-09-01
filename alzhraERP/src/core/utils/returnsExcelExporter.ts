// ============================================
// Returns Excel Exporter
// Export returns data to Excel with professional styling
// — Rebuilt on the shared excelExporterBase (no duplicated styling loop).
// ============================================

import {
  loadXLSX,
  buildStyledSheet,
  appendSheetToWorkbook,
  saveWorkbookToFile,
} from './excelExporterBase';
import type { ExcelMergeRange } from './excelExporterBase';

interface ReturnExcelData {
  companyName: string;
  returns: Array<{
    invoiceNumber: string;
    issueDate: string;
    customerName: string;
    supplierName?: string;
    referenceInvoice?: string;
    returnReason?: string;
    items: number;
    totalAmount: number;
    status: string;
    notes?: string;
  }>;
  summary: {
    totalReturns: number;
    totalAmount: number;
    averageAmount: number;
    count: number;
  };
  type: 'sales' | 'purchase';
}

interface SingleReturnExcelData {
  companyName: string;
  companyAddress?: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  supplierName?: string;
  referenceInvoice?: string;
  returnReason?: string;
  issuedBy: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  notes?: string;
  type: 'sales' | 'purchase';
}

const hasText = (value: string | undefined): boolean => value !== undefined && value !== '';

// Helper to get Arabic status
const getStatusText = (status: string): string => {
  if (status === 'draft') return 'مسودة';
  if (status === 'posted') return 'معتمد';
  if (status === 'paid') return 'مدفوع';
  if (status === 'cancelled') return 'ملغي';
  return status;
};

// Helper to get Arabic return reason
const getReturnReasonText = (reason: string): string => {
  if (reason === 'defective') return 'منتج تالف';
  if (reason === 'not_as_described') return 'غير مطابق للمواصفات';
  if (reason === 'wrong_item') return 'صنف خاطئ';
  if (reason === 'quality_issue') return 'مشكلة في الجودة';
  if (reason === 'changed_mind') return 'تغيير رأي العميل';
  if (reason === 'expired') return 'منتج منتهي الصلاحية';
  if (reason === 'other') return 'أخرى';
  return reason || '-';
};

const buildReturnsListFullRows = (
  data: ReturnExcelData,
  title: string,
  partyTitle: string
): { rows: unknown[][]; summaryStartRow: number } => {
  const rows: unknown[][] = [];

  // Header section
  rows.push([data.companyName]);
  rows.push([title]);
  rows.push([]);
  rows.push(['تاريخ التقرير:', new Date().toLocaleDateString('en-GB')]);
  rows.push([]);

  // Table headers
  rows.push([
    '#',
    'رقم المرتجع',
    'التاريخ',
    partyTitle,
    'فاتورة مرجعية',
    'سبب الإرجاع',
    'عدد الأصناف',
    'المبلغ',
    'الحالة',
    'ملاحظات',
  ]);

  // Data rows
  data.returns.forEach((item, i) => {
    const partyLabel = item.customerName !== '' ? item.customerName : (item.supplierName ?? '-');
    rows.push([
      i + 1,
      item.invoiceNumber,
      item.issueDate,
      partyLabel,
      item.referenceInvoice ?? '-',
      getReturnReasonText(item.returnReason ?? ''),
      item.items || 0,
      item.totalAmount || 0,
      getStatusText(item.status),
      item.notes ?? '-',
    ]);
  });

  rows.push([]);

  // Summary section
  const summaryStartRow = rows.length;
  rows.push(['ملخص الإحصائيات']);
  rows.push(['إجمالي عدد المرتجعات:', data.summary.count || 0]);
  rows.push(['إجمالي المبالغ المرتجعة:', data.summary.totalAmount || 0]);
  rows.push(['متوسط قيمة المرتجع:', data.summary.averageAmount || 0]);

  return { rows, summaryStartRow };
};

export const exportReturnsToExcel = async (data: ReturnExcelData): Promise<void> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const isSales = data.type === 'sales';
  const title = isSales ? 'مرتجعات المبيعات' : 'مرتجعات المشتريات';
  const partyTitle = isSales ? 'العميل' : 'المورد';
  const { rows, summaryStartRow } = buildReturnsListFullRows(data, title, partyTitle);

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Company name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Title
    { s: { r: summaryStartRow, c: 0 }, e: { r: summaryStartRow, c: 9 } }, // Summary title
  ];

  const ws = buildStyledSheet(XLSX, rows, {
    colWidths: [6, 18, 15, 30, 18, 20, 12, 18, 15, 35],
    merges,
    styling: {
      companyRow: 0,
      listTitleRow: 1,
      metaKeyColumns: [0],
      metaRows: [3, 3],
      tableHeaderRow: 5,
      alternate: { startRow: 5, endRow: summaryStartRow - 1, parity: 'even' },
      summaryTitleRow: summaryStartRow,
      summaryKeys: { fromRow: summaryStartRow, col: 0 },
      integerColumns: [0, 6],
      integerFromRow: summaryStartRow + 1,
      columnCount: 10,
    },
  });

  const sheetName = isSales ? 'مرتجعات المبيعات' : 'مرتجعات المشتريات';
  appendSheetToWorkbook(XLSX, wb, ws, sheetName);
  await saveWorkbookToFile(wb, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const buildSingleReturnRows = (
  data: SingleReturnExcelData,
  title: string,
  partyTitle: string,
  partyName: string
): unknown[][] => {
  const rows: unknown[][] = [];

  // Header section
  rows.push([data.companyName]);
  rows.push([data.companyAddress ?? '']);
  rows.push([]);
  rows.push([`${title} رقم: ${data.invoiceNumber}`]);
  rows.push([]);

  // Meta info
  rows.push([`${partyTitle}:`, partyName, '', 'رقم المرتجع:', data.invoiceNumber]);
  rows.push(['التاريخ:', data.issueDate, '', 'الحالة:', getStatusText(data.status)]);
  if (hasText(data.referenceInvoice)) {
    rows.push([
      'الفاتورة المرجعية:',
      data.referenceInvoice,
      '',
      'سبب الإرجاع:',
      getReturnReasonText(data.returnReason ?? ''),
    ]);
  } else if (hasText(data.returnReason)) {
    rows.push(['', '', '', 'سبب الإرجاع:', getReturnReasonText(data.returnReason ?? '')]);
  }
  rows.push(['صدرت بواسطة:', data.issuedBy]);
  rows.push([]);

  // Table header
  rows.push(['#', 'وصف الصنف', 'الكمية', 'سعر الوحدة', 'الإجمالي']);

  // Items
  data.items.forEach((item, i) => {
    rows.push([i + 1, item.name, item.quantity || 0, item.unitPrice || 0, item.total || 0]);
  });

  rows.push([]);

  // Totals
  rows.push(['', '', '', 'المجموع:', data.subtotal || 0]);

  if (hasText(data.notes)) {
    rows.push(['ملاحظات:', data.notes]);
  }

  return rows;
};

// Export single return to Excel (detailed)
export const exportSingleReturnToExcel = async (data: SingleReturnExcelData): Promise<void> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const isSales = data.type === 'sales';
  const title = isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
  const partyTitle = isSales ? 'العميل' : 'المورد';
  const partyName = isSales ? data.customerName : (data.supplierName ?? '');

  const rows = buildSingleReturnRows(data, title, partyTitle, partyName);
  const notesStartRow = rows.length + 1;

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Address
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, // Title
  ];

  const ws = buildStyledSheet(XLSX, rows, {
    colWidths: [8, 45, 15, 20, 20],
    merges,
    styling: {
      companyRow: 0,
      subHeaderRows: [1, 3],
      metaKeyColumns: [0, 3],
      metaRows: [5, 8],
      tableHeaderRow: 10,
      summaryRows: [notesStartRow - 1, notesStartRow - 1],
      summaryKeyCol: 3,
      summaryValueCol: 4,
      alternate: {
        startRow: 10,
        endRow: rows.length - (hasText(data.notes) ? 3 : 2),
        parity: 'odd',
      },
      ...(hasText(data.notes) ? { notesRow: rows.length - 1 } : {}),
      columnCount: 5,
    },
  });

  const sheetName = isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
  appendSheetToWorkbook(XLSX, wb, ws, sheetName);
  await saveWorkbookToFile(wb, `${title}_${data.invoiceNumber}.xlsx`);
};
