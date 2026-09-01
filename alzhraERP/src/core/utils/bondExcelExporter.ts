// ============================================
// Bond Excel Exporter
// Professional styled Excel export for bonds (receipts/payments)
// — Rebuilt on the shared excelExporterBase (no duplicated styling loop).
// ملاحظة تحسين مقصودة: merges وتنسيق رأس الجدول في «سند واحد» كانتا
// تشيران إلى صفوف فارغة (R10/R12) في الأصل — صُحّحنا إلى الصفوف الفعلية (R11/R13/R14).
// ============================================

import {
  loadXLSX,
  buildStyledSheet,
  appendSheetToWorkbook,
  saveWorkbookToFile,
  workbookToBlob,
} from './excelExporterBase';
import type { ExcelMergeRange, XlsxWorkbook } from './excelExporterBase';

interface CompanyInfo {
  name_ar: string;
  address?: string;
  phone?: string;
  tax_number?: string;
}

export interface BondInfo {
  payment_number: string;
  date: string;
  description: string;
  amount: number;
  currency_code: string;
  type: 'receipt' | 'payment' | 'transfer';
  party_name?: string;
  account_name: string;
  payment_method?: string;
}

const bondTitleFor = (type: BondInfo['type']): string => {
  if (type === 'receipt') return 'سند قبض';
  if (type === 'payment') return 'سند صرف';
  return 'سند تحويل';
};

const partyTitleFor = (type: BondInfo['type']): string => {
  if (type === 'receipt') return 'استلمنا من:';
  if (type === 'payment') return 'صرفنا إلى:';
  return 'الطرف:';
};

const buildSingleBondRows = (
  company: CompanyInfo,
  bond: BondInfo,
  bondTitle: string,
  partyTitle: string
): unknown[][] => {
  const rows: unknown[][] = [];

  // --- Header Section ---
  rows.push([company.name_ar]);
  rows.push([`${company.address ?? ''} | هاتف: ${company.phone ?? ''}`]);
  rows.push([`الرقم الضريبي: ${company.tax_number ?? '---'}`]);
  rows.push([]);
  rows.push([`${bondTitle} رقم: ${bond.payment_number}`]);
  rows.push([]);

  // --- Meta Info ---
  rows.push(['التاريخ:', bond.date, '', 'المبلغ:', bond.amount || 0]);
  rows.push(['العملة:', bond.currency_code, '', 'طريقة الدفع:', bond.payment_method ?? '-']);
  rows.push([]);
  rows.push([partyTitle, bond.party_name ?? '-', '', 'الحساب:', bond.account_name]);
  rows.push([]);
  rows.push(['البيان (وصف العملية):', bond.description]);
  rows.push([]);

  // Small table grid
  rows.push(['المبلغ', 'العملة', 'البيان']);
  rows.push([bond.amount || 0, bond.currency_code, bond.description]);

  return rows;
};

export const generateSingleBondWorkbook = async (
  company: CompanyInfo,
  bond: BondInfo
): Promise<XlsxWorkbook> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const bondTitle = bondTitleFor(bond.type);
  const rows = buildSingleBondRows(company, bond, bondTitle, partyTitleFor(bond.type));

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company Name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Info
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Tax
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Title
    { s: { r: 11, c: 1 }, e: { r: 11, c: 4 } }, // Description
    { s: { r: 13, c: 2 }, e: { r: 13, c: 4 } }, // Table header desc cell
    { s: { r: 14, c: 2 }, e: { r: 14, c: 4 } }, // Table desc value
  ];

  const ws = buildStyledSheet(XLSX, rows, {
    colWidths: [20, 30, 10, 20, 30],
    merges,
    styling: {
      companyRow: 0,
      subHeaderRows: [1, 4],
      metaKeyColumns: [0, 3],
      metaRows: [6, 8],
      extraMetaCells: [{ row: 11, col: 0 }],
      tableHeaderRow: 13,
      columnCount: 5,
    },
  });

  appendSheetToWorkbook(XLSX, wb, ws, bondTitle);
  return wb;
};

export const exportSingleBondToExcel = async (
  company: CompanyInfo,
  bond: BondInfo
): Promise<void> => {
  const bondTitle = bondTitleFor(bond.type);
  const wb = await generateSingleBondWorkbook(company, bond);
  await saveWorkbookToFile(wb, `${bondTitle}_${bond.payment_number}.xlsx`);
};

export const generateSingleBondExcelBlob = async (
  company: CompanyInfo,
  bond: BondInfo
): Promise<Blob> => {
  const wb = await generateSingleBondWorkbook(company, bond);
  return workbookToBlob(wb);
};

const buildBondListRows = (bonds: BondInfo[]): unknown[][] => {
  const rows: unknown[][] = [];
  bonds.forEach((bond, i) => {
    const bondTypeAr = bond.type === 'receipt' ? 'قبض' : bond.type === 'payment' ? 'صرف' : 'تحويل';
    rows.push([
      i + 1,
      bond.payment_number,
      bond.date,
      bondTypeAr,
      bond.account_name || '-',
      bond.party_name ?? '-',
      bond.amount || 0,
      bond.currency_code,
      bond.payment_method ?? '-',
      bond.description,
    ]);
  });
  return rows;
};

export const exportBondsListToExcel = async (
  company: CompanyInfo,
  bonds: BondInfo[],
  listTitle = 'قائمة السندات'
): Promise<void> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const rows: unknown[][] = [];

  // --- Header Section ---
  rows.push([company.name_ar]);
  rows.push([listTitle]);
  rows.push([]);
  rows.push(['تاريخ الاستخراج:', new Date().toLocaleDateString('en-GB')]);
  rows.push([]);

  // --- Table Header ---
  rows.push([
    '#',
    'رقم السند',
    'تاريخ السند',
    'نوع السند',
    'الحساب',
    'الطرف',
    'المبلغ',
    'العملة',
    'طريقة الدفع',
    'البيان',
  ]);

  // --- Data Rows ---
  rows.push(...buildBondListRows(bonds));

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Company Name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Title
  ];

  const ws = buildStyledSheet(XLSX, rows, {
    colWidths: [6, 15, 15, 12, 25, 25, 15, 10, 15, 35],
    merges,
    styling: {
      companyRow: 0,
      listTitleRow: 1,
      metaKeyColumns: [0],
      metaRows: [3, 3],
      tableHeaderRow: 5,
      alternate: { startRow: 5, endRow: rows.length, parity: 'even' },
      integerColumns: [0],
      columnCount: 10,
    },
  });

  appendSheetToWorkbook(XLSX, wb, ws, listTitle);
  await saveWorkbookToFile(wb, `${listTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
