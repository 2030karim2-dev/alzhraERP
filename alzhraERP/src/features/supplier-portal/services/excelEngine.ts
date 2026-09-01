import { normalizeOem } from '../../../core/utils/oemNormalization';
import type {
  VendorProductItem,
  QuotationItemDraft,
  ExcelImportRow,
  ItemAvailability,
} from '../types';

let xlsxPromise: Promise<any> | null = null;
const loadXLSX = (): Promise<any> => {
  xlsxPromise ??= import('xlsx-js-style').then((m: any) => m.default ?? m);
  return xlsxPromise;
};

/**
 * Sanitizes a cell string value against CSV/Excel formula injection (SEC-04).
 * If a string begins with =, +, -, @, \t, \r and is NOT a valid decimal number,
 * it is prepended with a single quote (') to force Excel to treat it strictly as text.
 */
export const sanitizeExcelValue = (val: unknown): unknown => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed === '') return '';

  // If it's a valid integer or floating point number (e.g. "-123.45" or "+5"), don't treat as formula
  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  // If it starts with dangerous formula triggers
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }

  return trimmed;
};

export interface ExportQuotationExcelOptions {
  companyName: string;
  supplierName: string;
  quotationNumber?: string;
  rfqNumber?: string;
  currency: string;
  items: QuotationItemDraft[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  deliveryDays?: number;
}

/**
 * Generates and downloads a professional, styled Excel Workbook (SEC-04 Sanitized)
 */
export const exportQuotationToExcel = async (
  options: ExportQuotationExcelOptions
): Promise<void> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const titleStyle = {
    font: { name: 'Segoe UI', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4F46E5' } }, // Indigo
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const metaLabelStyle = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '374151' } },
    fill: { fgColor: { rgb: 'F3F4F6' } },
    alignment: { horizontal: 'right', vertical: 'center' },
  };

  const metaValueStyle = {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '111827' } },
    alignment: { horizontal: 'right', vertical: 'center' },
  };

  const headerStyle = {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E1B4B' } }, // Deep Navy
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '4F46E5' } },
    },
  };

  const cellStyle = {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '1F2937' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  };

  const moneyStyle = {
    font: { name: 'Consolas', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  };

  const totalStyle = {
    font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } }, // Emerald
    alignment: { horizontal: 'right', vertical: 'center' },
  };

  // Build Sheet Data Array
  const wsData: any[][] = [];

  // Row 1: Title Header
  wsData.push([
    { v: sanitizeExcelValue(`عرض أسعار وتوريد - ${options.companyName}`), s: titleStyle },
  ]);
  wsData.push([]); // Empty row

  // Metadata block
  wsData.push([
    { v: 'المورد:', s: metaLabelStyle },
    { v: sanitizeExcelValue(options.supplierName), s: metaValueStyle },
    { v: 'رقم العرض:', s: metaLabelStyle },
    { v: sanitizeExcelValue(options.quotationNumber || 'مسودة'), s: metaValueStyle },
  ]);
  wsData.push([
    { v: 'العملة:', s: metaLabelStyle },
    { v: sanitizeExcelValue(options.currency), s: metaValueStyle },
    { v: 'رقم طلب التسعير RFQ:', s: metaLabelStyle },
    { v: sanitizeExcelValue(options.rfqNumber || '---'), s: metaValueStyle },
  ]);
  wsData.push([
    { v: 'مدة التوريد (أيام):', s: metaLabelStyle },
    { v: `${Math.max(0, options.deliveryDays || 0)} يوم`, s: metaValueStyle },
    { v: 'تاريخ المستند:', s: metaLabelStyle },
    { v: new Date().toLocaleDateString('ar-SA-u-nu-latn'), s: metaValueStyle },
  ]);
  wsData.push([]); // Empty row

  // Table Column Headers
  const columns = [
    '#',
    'معرف الصنف',
    'اسم المنتج / القطعة',
    'رقم القطعة / OEM',
    'كود المورد SKU',
    'الكمية',
    'الوحدة',
    'سعر الوحدة',
    'نسبة الخصم %',
    'الإجمالي',
    'حالة التوفر',
    'الضمان (أيام)',
    'ملاحظات المورد',
  ];

  wsData.push(columns.map(c => ({ v: c, s: headerStyle })));

  // Table Rows (Sanitized against injection)
  options.items.forEach((item, index) => {
    wsData.push([
      { v: index + 1, s: cellStyle },
      { v: sanitizeExcelValue(item.product_id), s: cellStyle },
      {
        v: sanitizeExcelValue(item.product_name),
        s: { ...cellStyle, alignment: { horizontal: 'right' } },
      },
      {
        v: sanitizeExcelValue(item.oem_number || '---'),
        s: { ...cellStyle, font: { name: 'Consolas', sz: 10 } },
      },
      { v: sanitizeExcelValue(item.vendor_sku || '---'), s: cellStyle },
      { v: Math.max(0, Number(item.quantity) || 1), s: cellStyle },
      { v: sanitizeExcelValue(item.unit_of_measure), s: cellStyle },
      { v: Math.max(0, Number(item.unit_price) || 0), s: moneyStyle },
      { v: Math.min(100, Math.max(0, Number(item.discount_percentage) || 0)), s: cellStyle },
      { v: Math.max(0, Number(item.total_price) || 0), s: moneyStyle },
      {
        v:
          item.availability === 'in_stock'
            ? 'متوفر'
            : item.availability === 'on_order'
              ? 'تحت الطلب'
              : 'غير متوفر',
        s: cellStyle,
      },
      { v: Math.max(0, Number(item.warranty_days) || 0), s: cellStyle },
      {
        v: sanitizeExcelValue(item.vendor_notes || ''),
        s: { ...cellStyle, alignment: { horizontal: 'right' } },
      },
    ]);
  });

  // Summary Rows
  wsData.push([]);
  wsData.push([
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    { v: 'المجموع الفرعي:', s: metaLabelStyle },
    {},
    { v: Math.max(0, options.subtotal), s: moneyStyle },
  ]);
  wsData.push([
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    { v: 'الإجمالي النهائي:', s: totalStyle },
    {},
    { v: Math.max(0, options.totalAmount), s: totalStyle },
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge headers
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];

  // Column Widths
  ws['!cols'] = [
    { wch: 5 }, // #
    { wch: 15 }, // ID
    { wch: 30 }, // Product Name
    { wch: 18 }, // OEM
    { wch: 15 }, // Vendor SKU
    { wch: 8 }, // Qty
    { wch: 8 }, // Unit
    { wch: 14 }, // Unit Price
    { wch: 12 }, // Discount %
    { wch: 16 }, // Total
    { wch: 14 }, // Availability
    { wch: 12 }, // Warranty
    { wch: 25 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'عرض السعر');

  const filename = `${options.quotationNumber || 'Quotation'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
};

export interface ExportCatalogExcelOptions {
  companyName: string;
  currency: string;
  products: VendorProductItem[];
}

/**
 * Generates and downloads the Product Catalog Excel Workbook
 */
export const exportProductCatalogToExcel = async (
  options: ExportCatalogExcelOptions
): Promise<void> => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const titleStyle = {
    font: { name: 'Segoe UI', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '312E81' } }, // Dark Indigo
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const headerStyle = {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E1B4B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const cellStyle = {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '1F2937' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const moneyStyle = {
    font: { name: 'Consolas', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
  };

  const wsData: any[][] = [];
  wsData.push([
    { v: sanitizeExcelValue(`كتالوج الأصناف المعتمدة - ${options.companyName}`), s: titleStyle },
  ]);
  wsData.push([]);

  const columns = [
    '#',
    'معرف الصنف Product ID',
    'اسم المنتج / الصنف',
    'رقم القطعة OEM',
    'كود المورد SKU',
    'الفئة',
    'العلامة التجارية',
    'الكمية المتوفرة',
    'سعر التكلفة',
    'مدة التوريد (أيام)',
    'الوحدة',
  ];

  wsData.push(columns.map(c => ({ v: c, s: headerStyle })));

  options.products.forEach((p, idx) => {
    wsData.push([
      { v: idx + 1, s: cellStyle },
      { v: sanitizeExcelValue(p.product_id), s: cellStyle },
      {
        v: sanitizeExcelValue(p.product_name),
        s: { ...cellStyle, alignment: { horizontal: 'right' } },
      },
      {
        v: sanitizeExcelValue(p.oem_number || '---'),
        s: { ...cellStyle, font: { name: 'Consolas', sz: 10 } },
      },
      { v: sanitizeExcelValue(p.vendor_sku || '---'), s: cellStyle },
      { v: sanitizeExcelValue(p.category || 'عام'), s: cellStyle },
      { v: sanitizeExcelValue(p.brand || '---'), s: cellStyle },
      { v: p.stock_quantity, s: cellStyle },
      { v: p.cost_price, s: moneyStyle },
      { v: p.lead_time_days || 3, s: cellStyle },
      { v: sanitizeExcelValue(p.unit), s: cellStyle },
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 32 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'كتالوج المنتجات');
  XLSX.writeFile(wb, `Product_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Parses and validates an uploaded Excel file for quotation import (SEC-04 Hardened)
 */
export const parseQuotationExcel = async (
  file: File,
  existingProducts: VendorProductItem[]
): Promise<ExcelImportRow[]> => {
  // Max size limit: 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
  }

  const XLSX = await loadXLSX();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellFormula: false, cellHTML: false });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  if (!ws) {
    throw new Error('الملف فارغ أو لا يحتوي على أوراق صالحة.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rawRows.length < 2) {
    throw new Error('الملف لا يحتوي على بيانات كافية.');
  }

  // Find Header Row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (row && Array.isArray(row)) {
      const rowText = row.join(' ').toLowerCase();
      if (
        (rowText.includes('سعر') || rowText.includes('price')) &&
        (rowText.includes('كمية') || rowText.includes('qty') || rowText.includes('quantity'))
      ) {
        headerIndex = i;
        break;
      }
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headers = rawRows[headerIndex].map((h: any) => String(h || '').trim());
  const dataRows = rawRows.slice(headerIndex + 1);

  // Column Index Mappers
  const findCol = (keywords: string[]) =>
    headers.findIndex((h: string) => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

  const idCol = findCol(['معرف', 'product_id', 'id']);
  const nameCol = findCol(['اسم', 'name', 'product', 'item', 'وصف', 'description']);
  const oemCol = findCol(['oem', 'رقم القطعة', 'part_number', 'part number', 'part']);
  const skuCol = findCol(['sku', 'كود', 'vendor_sku']);
  const qtyCol = findCol(['كمية', 'qty', 'quantity']);
  const priceCol = findCol(['سعر', 'price', 'unit_price', 'cost']);
  const discCol = findCol(['خصم', 'discount', 'discount%']);
  const taxCol = findCol(['ضريبة', 'tax', 'vat']);
  const availCol = findCol(['توفر', 'availability', 'حالة']);
  const leadCol = findCol(['توريد', 'lead', 'delivery', 'ايام']);
  const warrantyCol = findCol(['ضمان', 'warranty']);
  const notesCol = findCol(['ملاحظات', 'notes', 'remarks']);

  const parsedRows: ExcelImportRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    if (!r || r.length === 0) continue;

    const rowId = idCol >= 0 ? String(r[idCol] || '').trim() : '';
    const rowName = nameCol >= 0 ? String(r[nameCol] || '').trim() : '';
    const rowOem = oemCol >= 0 ? String(r[oemCol] || '').trim() : '';
    const rowSku = skuCol >= 0 ? String(r[skuCol] || '').trim() : '';

    // Ignore fully empty rows
    if (!rowId && !rowName && !rowOem && !rowSku) continue;

    const rawQty = qtyCol >= 0 ? Number(r[qtyCol]) : 1;
    const rawPrice = priceCol >= 0 ? Number(r[priceCol]) : 0;
    const rawDisc = discCol >= 0 ? Number(r[discCol]) : 0;
    const rawTax = taxCol >= 0 ? Number(r[taxCol]) : 0;

    const parsedQty = isNaN(rawQty) || rawQty <= 0 ? 1 : rawQty;
    const parsedPrice = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
    const parsedDisc = isNaN(rawDisc) || rawDisc < 0 ? 0 : Math.min(rawDisc, 100);
    const parsedTax = isNaN(rawTax) || rawTax < 0 ? 0 : rawTax;

    // Multi-Priority Matching
    let matchedProduct: VendorProductItem | undefined = undefined;

    // 1. Match by Product ID
    if (rowId) {
      matchedProduct = existingProducts.find(p => p.product_id === rowId || p.id === rowId);
    }

    // 2. Match by Normalized OEM Number
    if (!matchedProduct && rowOem) {
      const normalizedRowOem = normalizeOem(rowOem);
      matchedProduct = existingProducts.find(
        p => p.oem_number && normalizeOem(p.oem_number) === normalizedRowOem
      );
    }

    // 3. Match by Vendor SKU
    if (!matchedProduct && rowSku) {
      matchedProduct = existingProducts.find(
        p =>
          (p.vendor_sku && p.vendor_sku.toLowerCase() === rowSku.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase() === rowSku.toLowerCase())
      );
    }

    const availabilityRaw =
      availCol >= 0
        ? String(r[availCol] || '')
            .trim()
            .toLowerCase()
        : '';
    const validAvailability: ItemAvailability =
      availabilityRaw === 'on_order' ||
      availabilityRaw === 'unavailable' ||
      availabilityRaw === 'partial'
        ? (availabilityRaw as ItemAvailability)
        : 'in_stock';

    // Map to the ExcelImportRow contract consumed by ExcelImportModal
    const rowObj: ExcelImportRow = {
      rowNumber: i + 1,
      rawProductIdentifier: rowId || rowSku || rowName || '',
      quantity: parsedQty,
      unitPrice: parsedPrice,
      discountPercentage: parsedDisc,
      taxPercentage: parsedTax,
      availability: validAvailability,
      leadTimeDays: leadCol >= 0 ? Number(r[leadCol]) || 0 : 0,
      warrantyDays: warrantyCol >= 0 ? Number(r[warrantyCol]) || 0 : 0,
      matchStatus: matchedProduct ? 'matched' : parsedPrice <= 0 ? 'invalid_price' : 'unmatched',
    };
    if (rowOem) rowObj.rawPartNumber = rowOem;
    if (rowSku) rowObj.rawVendorSku = rowSku;
    if (rowName) rowObj.rawProductName = rowName;
    if (notesCol >= 0 && r[notesCol]) rowObj.notes = String(r[notesCol]).trim();
    if (matchedProduct) {
      rowObj.matchedProduct = {
        id: matchedProduct.product_id,
        name: matchedProduct.product_name,
        part_number: matchedProduct.oem_number || null,
        sku: matchedProduct.sku,
      };
    }
    if (parsedPrice <= 0) {
      rowObj.validationError = 'سعر الوحدة صفر أو غير محدد';
    }

    parsedRows.push(rowObj);
  }

  return parsedRows;
};
