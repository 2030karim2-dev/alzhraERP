/**
 * excelExporterBase.ts — قاعدة موحدة لمُصدِّرات Excel (bond / returns / invoice / quotation / statement)
 * ---------------------------------------------------------------------------------------------------
 * يوحّد العناصر التي كانت مكررة حرفياً عبر عائلة المُصدِّرات:
 *   1. loadXLSX() — lazy-load موحّد لـ xlsx-js-style (يُبقي ~930KB خارج الحزمة الابتدائية)
 *      ويتضمّن إعادة محاولة عند فشل الاستيراد (أمان إضافي مقابل النسخ القديمة).
 *   2. buildStyledSheet() — بناء ورقة + أعمدة + دمج + حلقة التنسيق القياسية
 *      (حدود D3D3D3، خط Arial، رأس أزرق 1F4E78، مفاتيح وصفية F2F2F2،
 *       ملخص EBF1DE، صفوف متناوبة FAFAFA، أرقام إنجليزية #,##0.00).
 *   3. saveWorkbookToFile() / workbookToBlob() — الحفظ أو التحويل لـ Blob.
 *
 * قاعدة صارمة للمستخدمين: لا يُستورد xlsx-js-style مباشرة خارج هذا الملف.
 */

// ── أنواع محلية لـ xlsx-js-style (شحيحة التعريف) ──────────────────────────────

export interface ExcelCellAddress {
  r: number;
  c: number;
}

export interface ExcelMergeRange {
  s: ExcelCellAddress;
  e: ExcelCellAddress;
}

export interface XlsxCell {
  v?: unknown;
  z?: string;
  s?: Record<string, unknown>;
}

export interface XlsxSheet {
  '!ref'?: string;
  '!cols'?: Array<{ wch?: number }>;
  '!merges'?: ExcelMergeRange[];
  '!props'?: Record<string, unknown>;
  '!view'?: Array<{ RTL?: boolean }>;
  [key: string]: XlsxCell | string | unknown[] | Array<Record<string, unknown>> | undefined;
}

export interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxSheet>;
}

export interface XlsxLike {
  utils: {
    book_new: () => XlsxWorkbook;
    aoa_to_sheet: (rows: unknown[][]) => XlsxSheet;
    book_append_sheet: (wb: XlsxWorkbook, ws: XlsxSheet, name: string) => void;
    encode_cell: (address: ExcelCellAddress) => string;
    decode_range: (ref: string) => { s: ExcelCellAddress; e: ExcelCellAddress };
    sheet_to_json: (ws: XlsxSheet, opts: Record<string, unknown>) => Array<Record<string, unknown>>;
  };
  writeFile: (wb: XlsxWorkbook, filename: string) => void;
  write: (wb: XlsxWorkbook, opts: { bookType: string; type: string }) => unknown;
  read: (data: ArrayBuffer, opts: Record<string, unknown>) => XlsxWorkbook;
}

let xlsxPromise: Promise<XlsxLike> | null = null;

/** Lazy-load موحّد — مع إعادة تعيين الوعد عند الفشل للسماح بإعادة المحاولة. */
export const loadXLSX = (): Promise<XlsxLike> => {
  xlsxPromise ??= import('xlsx-js-style')
    .then((m: unknown) => {
      const mod = m as { default?: XlsxLike };
      return mod.default ?? (m as XlsxLike);
    })
    .catch((err: unknown) => {
      xlsxPromise = null;
      throw err;
    });
  return xlsxPromise;
};

/** يزيل المحارف غير الصالحة في أسماء ملفات Windows. */
export const sanitizeFileName = (value: string): string => {
  const sanitized = Array.from(value)
    .filter(ch => ch.charCodeAt(0) >= 32)
    .join('');
  return (
    sanitized
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'export'
  );
};

// ── خيارات التنسيق القياسي ────────────────────────────────────────────────────

export interface ExcelStylingOptions {
  /** صف اسم الشركة/العنوان الرئيسي (Arial 16 عريض أزرق 1F4E78) — عادة 0. */
  companyRow?: number;
  /** نطاق صفوف العناوين الفرعية (Arial 12 عريض). */
  subHeaderRows?: [number, number];
  /** أعمدة مفاتيح البيانات الوصفية التي تُظلل F2F2F2. */
  metaKeyColumns?: number[];
  /** نطاق صفوف البيانات الوصفية. */
  metaRows?: [number, number];
  /** صف رأس الجدول (خلفية 1F4E78 + خط أبيض). */
  tableHeaderRow?: number;
  /** صفوف ملخص القاع: مفتاح F2F2F2 / قيمة EBF1DE. */
  summaryRows?: [number, number];
  summaryKeyCol?: number;
  summaryValueCol?: number;
  /** تناوب صفوف بيانات الجدول (parity: حتى/فردي). */
  alternate?: { startRow: number; endRow?: number; parity: 'even' | 'odd' };
  /** أعمدة تُنسق أرقاماً صحيحة (#,##0) — الباقي #,##0.00. */
  integerColumns?: number[];
  /** صف مخصص للملاحظات (Arial 11 عريض على العمود 0). */
  notesRow?: number;
  /** صف عنوان القائمة (Arial 14 عريض) — مثل قائمة السندات. */
  listTitleRow?: number;
  /** خلايا وصفية إضافية تُظلل F2F2F2 خارج نطاق metaRows. */
  extraMetaCells?: Array<{ row: number; col: number }>;
  /** صف عنوان كتلة الملخص (خلفية EBF1DE + خط 1F4E78 عريض على كل الأعمدة). */
  summaryTitleRow?: number;
  /** مفاتيح كتلة الملخص بعد العنوان (F2F2F2 عريض) — { fromRow, col }. */
  summaryKeys?: { fromRow: number; col: number };
  /** تنسيق كل الأرقام ابتداءً من صف معيّن كأرقام صحيحة (#,##0). */
  integerFromRow?: number;
  /** عدد الأعمدة (يُستخدم عند غياب !ref). */
  columnCount?: number;
}

export interface BuildSheetOptions {
  colWidths: number[];
  merges?: ExcelMergeRange[];
  styling?: ExcelStylingOptions;
}

const DEFAULT_BORDER = {
  top: { style: 'thin', color: { rgb: 'D3D3D3' } },
  bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
  left: { style: 'thin', color: { rgb: 'D3D3D3' } },
  right: { style: 'thin', color: { rgb: 'D3D3D3' } },
};

const ARIAL_11 = { name: 'Arial', sz: 11, color: { rgb: '000000' } };
const HEADER_FONT = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
const SUB_HEADER_FONT = { name: 'Arial', sz: 12, bold: true };
const TABLE_HEADER_FILL = { fgColor: { rgb: '1F4E78' } };
const TABLE_HEADER_FONT = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
const META_FILL = { fgColor: { rgb: 'F2F2F2' } };
const SUMMARY_VALUE_FILL = { fgColor: { rgb: 'EBF1DE' } };
const ALTERNATE_FILL = { fgColor: { rgb: 'FAFAFA' } };

const readCell = (sheet: XlsxSheet, ref: string): XlsxCell | undefined => {
  // cellRef متغيّر ديناميكي وفق مواصفات xlsx — الوصول المقصود هنا غير قابل للفهرسة الثابتة.
  // eslint-disable-next-line security/detect-object-injection
  const cell = sheet[ref] as XlsxCell | undefined;
  return cell;
};

const applyDefaultCellStyle = (cell: XlsxCell): void => {
  cell.s = {
    border: DEFAULT_BORDER,
    alignment: { horizontal: 'center', vertical: 'center' },
    font: ARIAL_11,
  };
};

const applyNumberFormat = (
  cell: XlsxCell,
  options: ExcelStylingOptions,
  row: number,
  col: number
): void => {
  if (typeof cell.v !== 'number') return;
  const isInteger =
    options.integerColumns?.includes(col) === true ||
    (options.integerFromRow !== undefined && row >= options.integerFromRow);
  cell.z = isInteger ? '#,##0' : '#,##0.00';
};

const applyHeaderFonts = (
  style: Record<string, unknown>,
  options: ExcelStylingOptions,
  row: number
): void => {
  if (options.companyRow !== undefined && row === options.companyRow) {
    style.font = HEADER_FONT;
  }
  if (
    options.subHeaderRows !== undefined &&
    row >= options.subHeaderRows[0] &&
    row <= options.subHeaderRows[1]
  ) {
    style.font = SUB_HEADER_FONT;
  }
  if (options.listTitleRow !== undefined && row === options.listTitleRow) {
    style.font = { name: 'Arial', sz: 14, bold: true };
  }
};

const applyMetaStyles = (
  style: Record<string, unknown>,
  options: ExcelStylingOptions,
  row: number,
  col: number
): void => {
  const inMetaRow =
    options.metaRows !== undefined && row >= options.metaRows[0] && row <= options.metaRows[1];
  const isMetaKeyCol =
    options.metaKeyColumns !== undefined &&
    (col === options.metaKeyColumns[0] || col === options.metaKeyColumns[1]);
  const isExtraMeta =
    options.extraMetaCells?.some(cell => cell.row === row && cell.col === col) === true;
  if ((inMetaRow && isMetaKeyCol) || isExtraMeta) {
    style.font = { name: 'Arial', sz: 11, bold: true };
    style.fill = META_FILL;
  }
};

const applyTableAndSummary = (
  style: Record<string, unknown>,
  options: ExcelStylingOptions,
  row: number,
  col: number
): void => {
  if (options.tableHeaderRow !== undefined && row === options.tableHeaderRow) {
    style.fill = TABLE_HEADER_FILL;
    style.font = TABLE_HEADER_FONT;
  }
  if (
    options.summaryRows !== undefined &&
    row >= options.summaryRows[0] &&
    row <= options.summaryRows[1]
  ) {
    const summaryKeyCol = options.summaryKeyCol ?? 3;
    const summaryValueCol = options.summaryValueCol ?? 4;
    if (col === summaryKeyCol) {
      style.font = { name: 'Arial', sz: 12, bold: true };
      style.fill = META_FILL;
    }
    if (col === summaryValueCol) {
      style.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: '1F4E78' } };
      style.fill = SUMMARY_VALUE_FILL;
    }
  }
};

const applySummaryBlock = (
  style: Record<string, unknown>,
  options: ExcelStylingOptions,
  row: number,
  col: number
): void => {
  if (options.summaryTitleRow !== undefined && row === options.summaryTitleRow) {
    style.fill = SUMMARY_VALUE_FILL;
    style.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: '1F4E78' } };
  }
  if (
    options.summaryKeys !== undefined &&
    row > options.summaryKeys.fromRow &&
    col === options.summaryKeys.col
  ) {
    style.font = { name: 'Arial', sz: 11, bold: true };
    style.fill = META_FILL;
  }
};

const applyAlternateAndNotes = (
  style: Record<string, unknown>,
  options: ExcelStylingOptions,
  row: number,
  rangeEndRow: number
): void => {
  if (options.alternate !== undefined && row > options.alternate.startRow) {
    const endRow =
      options.alternate.endRow ??
      (options.summaryRows === undefined ? rangeEndRow : options.summaryRows[0] - 1);
    const isAlternateParity = row % 2 === (options.alternate.parity === 'odd' ? 1 : 0);
    if (row < endRow && isAlternateParity) {
      style.fill = ALTERNATE_FILL;
    }
  }
  if (options.notesRow !== undefined && row === options.notesRow) {
    style.font = { name: 'Arial', sz: 11, bold: true };
  }
};

/** حلقة التنسيق القياسية — تنسّق كل خلية موجودة في الورقة. */
export const applyExcelStyling = (
  sheet: XlsxSheet,
  XLSX: XlsxLike,
  options: ExcelStylingOptions = {}
): void => {
  const colCount = options.columnCount ?? 5;
  const lastColLetter = String.fromCharCode(64 + Math.min(26, colCount));
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? `A1:${lastColLetter}1`);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = readCell(sheet, ref);
      if (cell === undefined) continue;

      applyDefaultCellStyle(cell);
      applyNumberFormat(cell, options, R, C);

      const style = cell.s ?? {};
      applyHeaderFonts(style, options, R);
      applyMetaStyles(style, options, R, C);
      applyTableAndSummary(style, options, R, C);
      applySummaryBlock(style, options, R, C);
      applyAlternateAndNotes(style, options, R, range.e.r);
    }
  }
};

/** يبني ورقة منمّقة كاملة (أعمدة + دمج + تنسيق + RTL). */
export const buildStyledSheet = (
  XLSX: XlsxLike,
  rows: unknown[][],
  options: BuildSheetOptions
): XlsxSheet => {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = options.colWidths.map(width => ({ wch: width }));
  if (options.merges !== undefined && options.merges.length > 0) {
    sheet['!merges'] = options.merges;
  }
  applyExcelStyling(sheet, XLSX, options.styling);
  sheet['!props'] ??= {};
  sheet['!view'] = [{ RTL: true }];
  return sheet;
};

/** يلحق ورقة بملف عمل (workbook). */
export const appendSheetToWorkbook = (
  XLSX: XlsxLike,
  wb: XlsxWorkbook,
  sheet: XlsxSheet,
  sheetName: string
): void => {
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
};

/** يحفظ ملف العمل كملف xlsx (تنزيل). */
export const saveWorkbookToFile = async (wb: XlsxWorkbook, fileName: string): Promise<void> => {
  const XLSX = await loadXLSX();
  XLSX.writeFile(wb, sanitizeFileName(fileName));
};

/** يحوّل ملف العمل إلى Blob (للاستخدام مع واجهات المشاركة/الطباعة). */
export const workbookToBlob = async (wb: XlsxWorkbook): Promise<Blob> => {
  const XLSX = await loadXLSX();
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};
