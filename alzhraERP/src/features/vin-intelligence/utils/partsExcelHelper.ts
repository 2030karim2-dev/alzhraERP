/**
 * Excel & CSV Exporter / Importer + Memo Formatter for VIN Extracted Parts
 */

import { generateSmartPartName } from './smartPartNamer';
import type { VehicleInfo } from '../types';
import type { ExcelGridPart } from '../types';

let xlsxPromise: Promise<any> | null = null;
const loadXLSX = (): Promise<any> => {
  xlsxPromise ??= import('xlsx-js-style').then((m: any) => m.default ?? m);
  return xlsxPromise;
};

/** Export parts grid to stylized Excel (.xlsx) file */
export async function exportPartsToExcel(vehicle: VehicleInfo, parts: ExcelGridPart[]): Promise<void> {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() || 'المركبة';

  const rows: any[][] = [
    [`قائمة قطع الغيار — ${vehicleTitle}`],
    [`المواصفات: ${vehicle.market || 'عام'} | الجير: ${vehicle.transmission || 'غير محدد'} | المكينة: ${vehicle.displacement || vehicle.engine || 'غير محدد'}`],
    [],
    ['#', 'رقم القطعة (OEM)', 'نوع القطعة الأساسي', 'اسم المنتج الذكي', 'الشركة الصانعة', 'المقاس والمواصفات', 'سعر الشراء', 'سعر البيع'],
  ];

  parts.forEach((p, idx) => {
    rows.push([
      idx + 1,
      p.partNumber || '',
      p.baseName || '',
      p.description || '',
      p.manufacturer || vehicle.make || '',
      p.sizeSpec || '',
      p.purchasePrice || 0,
      p.salePrice || 0,
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
  const filename = `قطع_${vehicle.make}_${vehicle.model || ''}_${Date.now()}.xlsx`.replace(/[\s/\\:]+/g, '_');
  XLSX.writeFile(wb, filename);
}

/** Parse an uploaded Excel (.xlsx, .xls) or CSV file into ExcelGridPart items */
export async function parsePartsFromFile(file: File, vehicle: VehicleInfo | null): Promise<ExcelGridPart[]> {
  const XLSX = await loadXLSX();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const rawRows = (XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }) || []) as Array<Record<string, unknown>>;
  const parsedParts: ExcelGridPart[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Find fields regardless of column header language (Arabic or English)
    const partNo = String(row['رقم القطعة'] || row['رقم القطعة (OEM)'] || row['part_number'] || row['partNumber'] || row['OEM'] || row['PartNo'] || '').trim();
    const base = String(row['نوع القطعة'] || row['نوع القطعة الأساسي'] || row['الاسم'] || row['name'] || row['description'] || row['baseName'] || row['Item'] || '').trim();
    const mfr = String(row['المصنع'] || row['الشركة الصانعة'] || row['manufacturer'] || row['brand'] || row['Brand'] || vehicle?.make || '').trim();
    const spec = String(row['المواصفات'] || row['المقاس والمواصفات'] || row['sizeSpec'] || row['spec'] || '').trim();
    const purchase = parseFloat(String(row['سعر الشراء'] || row['سعر_الشراء'] || row['purchasePrice'] || row['cost'] || '0')) || 0;
    const sale = parseFloat(String(row['سعر البيع'] || row['سعر_البيع'] || row['salePrice'] || row['price'] || '0')) || 0;

    if (!partNo && !base) continue;

    const baseTerm = base || partNo;
    const smartName = vehicle ? generateSmartPartName(baseTerm, vehicle) : baseTerm;

    parsedParts.push({
      _id: `import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      partNumber: partNo,
      baseName: baseTerm,
      description: smartName,
      manufacturer: mfr || vehicle?.make || 'GENUINE',
      sizeSpec: spec,
      source: 'manual',
      purchasePrice: purchase,
      salePrice: sale,
      selected: true,
    });
  }

  return parsedParts;
}

/** Formats extracted parts as a beautiful WhatsApp / Text memo */
export function formatPartsForWhatsApp(vehicle: VehicleInfo, parts: ExcelGridPart[]): string {
  const years = vehicle.yearStart && vehicle.yearEnd ? `(${vehicle.yearStart}-${vehicle.yearEnd})` : (vehicle.year ? `(${vehicle.year})` : '');
  const lines: string[] = [
    `🚗 *قائمة قطع الغيار لسيارة: ${vehicle.make} ${vehicle.model || ''} ${years}*`,
    `📋 *المواصفات:* ${vehicle.market || 'عام'} | ${vehicle.transmission || ''} | ${vehicle.displacement ? `مكينة ${vehicle.displacement}` : ''}`,
    `━━━━━━━━━━━━━━━━━━`,
  ];

  parts.forEach((p, idx) => {
    let line = `${idx + 1}. *${p.description || p.baseName}*`;
    if (p.partNumber) line += `\n   🔢 OEM: \`${p.partNumber}\``;
    if (p.manufacturer) line += ` | 🏷️ ${p.manufacturer}`;
    if (p.salePrice && p.salePrice > 0) line += ` | 💰 ${p.salePrice.toLocaleString()}`;
    lines.push(line);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push(`📦 *إجمالي القطع:* ${parts.length}`);
  lines.push(`🏢 *نظام الزهراء لقطع الغيار*`);

  return lines.join('\n');
}
