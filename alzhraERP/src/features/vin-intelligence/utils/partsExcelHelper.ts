/**
 * Excel & CSV Exporter / Importer + Memo Formatter for VIN Extracted Parts
 */

import { generateSmartPartName } from './smartPartNamer';
import type { VehicleInfo } from '../types';
import type { ExcelGridPart } from '../types';

/* ── Minimal typings for the untyped `xlsx-js-style` module ── */

interface XlsxSheet {
  '!cols'?: Array<{ wch: number }>;
  [key: string]: unknown;
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxSheet>;
}

interface XlsxLike {
  utils: {
    book_new: () => XlsxWorkbook;
    aoa_to_sheet: (rows: unknown[][]) => XlsxSheet;
    book_append_sheet: (wb: XlsxWorkbook, ws: XlsxSheet, name: string) => void;
    sheet_to_json: (ws: XlsxSheet, opts: { defval: string }) => Array<Record<string, unknown>>;
  };
  read: (data: ArrayBuffer, opts: { type: string }) => XlsxWorkbook;
  writeFile: (wb: XlsxWorkbook, filename: string) => void;
}

let xlsxPromise: Promise<XlsxLike> | null = null;
const loadXLSX = (): Promise<XlsxLike> => {
  xlsxPromise ??= import('xlsx-js-style').then((m: unknown) => {
    const mod = m as { default?: XlsxLike };
    return mod.default ?? (m as XlsxLike);
  });
  return xlsxPromise;
};

/* ── Small typed helpers (each stays under the complexity-10 ceiling) ── */

/** Returns the first non-empty trimmed primitive string among the given values. */
const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string') {
      const t = value.trim();
      if (t !== '') return t;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      const t = String(value).trim();
      if (t !== '') return t;
    }
  }
  return '';
};

const parseNum = (s: string): number => {
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
};

/** Export parts grid to stylized Excel (.xlsx) file */
export async function exportPartsToExcel(
  vehicle: VehicleInfo,
  parts: ExcelGridPart[]
): Promise<void> {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const vehicleTitle =
    `${vehicle.make} ${vehicle.model ?? ''} ${String(vehicle.year ?? '')}`.trim() || 'المركبة';

  const rows: Array<Array<string | number>> = [
    [`قائمة قطع الغيار — ${vehicleTitle}`],
    [
      `المواصفات: ${vehicle.market ?? 'عام'} | الجير: ${vehicle.transmission ?? 'غير محدد'} | المكينة: ${vehicle.displacement ?? vehicle.engine ?? 'غير محدد'}`,
    ],
    [],
    [
      '#',
      'رقم القطعة (OEM)',
      'نوع القطعة الأساسي',
      'اسم المنتج الذكي',
      'الشركة الصانعة',
      'المقاس والمواصفات',
      'سعر الشراء',
      'سعر البيع',
    ],
  ];

  parts.forEach((p, idx) => {
    rows.push([
      idx + 1,
      p.partNumber || '',
      p.baseName || '',
      p.description ?? '',
      (p.manufacturer ?? '') || vehicle.make,
      p.sizeSpec ?? '',
      p.purchasePrice ?? 0,
      p.salePrice ?? 0,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 22 },
    { wch: 40 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'قطع الغيار');
  const filename = `قطع_${vehicle.make}_${vehicle.model ?? ''}_${String(Date.now())}.xlsx`.replace(
    /[\s/\\:]+/g,
    '_'
  );
  XLSX.writeFile(wb, filename);
}

/** Converts one raw Excel row into a part (without its `_id`, set by the caller). */
const parseRowPart = (
  row: Record<string, unknown>,
  vehicle: VehicleInfo | null
): Omit<ExcelGridPart, '_id'> | null => {
  // Find fields regardless of column header language (Arabic or English)
  const partNo = firstString(
    row['رقم القطعة'],
    row['رقم القطعة (OEM)'],
    row.part_number,
    row.partNumber,
    row.OEM,
    row.PartNo
  );
  const base = firstString(
    row['نوع القطعة'],
    row['نوع القطعة الأساسي'],
    row.الاسم,
    row.name,
    row.description,
    row.baseName,
    row.Item
  );
  const mfr = firstString(
    row['المصنع'],
    row['الشركة الصانعة'],
    row.manufacturer,
    row.brand,
    row.Brand,
    vehicle?.make
  );
  const spec = firstString(row['المواصفات'], row['المقاس والمواصفات'], row.sizeSpec, row.spec);
  const purchase = parseNum(
    firstString(row['سعر الشراء'], row.سعر_الشراء, row.purchasePrice, row.cost)
  );
  const sale = parseNum(firstString(row['سعر البيع'], row.سعر_البيع, row.salePrice, row.price));

  if (!partNo && !base) return null;

  const baseTerm = base || partNo;
  const smartName = vehicle ? generateSmartPartName(baseTerm, vehicle) : baseTerm;

  return {
    partNumber: partNo,
    baseName: baseTerm,
    description: smartName,
    manufacturer: mfr || 'GENUINE',
    sizeSpec: spec,
    source: 'manual',
    purchasePrice: purchase,
    salePrice: sale,
    selected: true,
  };
};

/** Parse an uploaded Excel (.xlsx, .xls) or CSV file into ExcelGridPart items */
export async function parsePartsFromFile(
  file: File,
  vehicle: VehicleInfo | null
): Promise<ExcelGridPart[]> {
  const XLSX = await loadXLSX();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (sheetName.length === 0) return [];

  const sheet = Object.entries(wb.Sheets).find(([name]) => name === sheetName)?.[1];
  if (sheet == null) return [];

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const parsedParts: ExcelGridPart[] = [];

  rawRows.forEach((row, i) => {
    const part = parseRowPart(row, vehicle);
    if (part == null) return;
    parsedParts.push({
      ...part,
      _id: `import-${String(Date.now())}-${String(i)}-${Math.random().toString(36).slice(2, 6)}`,
    });
  });

  return parsedParts;
}

/** Formats extracted parts as a beautiful WhatsApp / Text memo */
export function formatPartsForWhatsApp(vehicle: VehicleInfo, parts: ExcelGridPart[]): string {
  const years =
    vehicle.yearStart != null && vehicle.yearEnd != null
      ? `(${String(vehicle.yearStart)}-${String(vehicle.yearEnd)})`
      : vehicle.year != null
        ? `(${String(vehicle.year)})`
        : '';
  const lines: string[] = [
    `🚗 *قائمة قطع الغيار لسيارة: ${vehicle.make} ${vehicle.model ?? ''} ${years}*`,
    `📋 *المواصفات:* ${vehicle.market ?? 'عام'} | ${vehicle.transmission ?? ''} | ${vehicle.displacement != null && vehicle.displacement !== '' ? `مكينة ${vehicle.displacement}` : ''}`,
    `━━━━━━━━━━━━━━━━━━`,
  ];

  parts.forEach((p, idx) => {
    let line = `${String(idx + 1)}. *${(p.description ?? '') || p.baseName}*`;
    if (p.partNumber) line += `\n   🔢 OEM: \`${p.partNumber}\``;
    if (p.manufacturer != null && p.manufacturer !== '') line += ` | 🏷️ ${p.manufacturer}`;
    if (p.salePrice != null && p.salePrice > 0) line += ` | 💰 ${p.salePrice.toLocaleString()}`;
    lines.push(line);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push(`📦 *إجمالي القطع:* ${String(parts.length)}`);
  lines.push(`🏢 *نظام الزهراء لقطع الغيار*`);

  return lines.join('\n');
}
