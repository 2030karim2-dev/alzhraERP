import { useState, useRef } from 'react';
import { loadXLSX } from '../../../core/utils/excelExporterBase';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';

export interface ImportConflict {
  rowIndex: number;
  type: 'DUPLICATE_BARCODE' | 'DUPLICATE_SKU' | 'DUPLICATE_PART_BRAND' | 'IN_FILE_DUPLICATE';
  message: string;
  field: string;
  value: string;
  existingItem?: {
    id: string;
    name_ar: string;
    sku?: string | null;
    barcode?: string | null;
  };
}

export interface RawImportRow {
  name?: string;
  sku?: string;
  barcode?: string;
  partNumber?: string;
  brand?: string;
  [key: string]: unknown;
}

export const detectImportConflicts = async (
  rows: RawImportRow[],
  companyId: string
): Promise<ImportConflict[]> => {
  const conflicts: ImportConflict[] = [];
  const seenBarcodes = new Map<string, number>();
  const seenSkus = new Map<string, number>();
  const seenPartBrands = new Map<string, number>();

  // 1. In-file duplicate check
  rows.forEach((row, idx) => {
    const barcode = String(row.barcode || '').trim();
    const sku = String(row.sku || '')
      .trim()
      .toUpperCase();
    const part = String(row.partNumber || '')
      .trim()
      .toLowerCase();
    const brand = String(row.brand || '')
      .trim()
      .toLowerCase();
    const partBrand = part && brand ? `${part}_${brand}` : '';

    if (barcode !== '') {
      if (seenBarcodes.has(barcode)) {
        conflicts.push({
          rowIndex: idx,
          type: 'IN_FILE_DUPLICATE',
          message: `الباركود (${barcode}) مكرر داخل نفس الملف في السطرين ${seenBarcodes.get(barcode)! + 1} و ${idx + 1}`,
          field: 'barcode',
          value: barcode,
        });
      } else {
        seenBarcodes.set(barcode, idx);
      }
    }

    if (sku !== '') {
      if (seenSkus.has(sku)) {
        conflicts.push({
          rowIndex: idx,
          type: 'IN_FILE_DUPLICATE',
          message: `رمز الصنف SKU (${sku}) مكرر داخل نفس الملف في السطرين ${seenSkus.get(sku)! + 1} و ${idx + 1}`,
          field: 'sku',
          value: sku,
        });
      } else {
        seenSkus.set(sku, idx);
      }
    }

    if (partBrand !== '') {
      if (seenPartBrands.has(partBrand)) {
        conflicts.push({
          rowIndex: idx,
          type: 'IN_FILE_DUPLICATE',
          message: `تركيبة رقم القطعة والماركة (${row.partNumber} / ${row.brand}) مكررة داخل الملف في السطرين ${seenPartBrands.get(partBrand)! + 1} و ${idx + 1}`,
          field: 'partNumber',
          value: `${row.partNumber} - ${row.brand}`,
        });
      } else {
        seenPartBrands.set(partBrand, idx);
      }
    }
  });

  // 2. Database duplicate check (if companyId is available)
  if (companyId && rows.length > 0) {
    const barcodesToCheck = Array.from(seenBarcodes.keys());
    const skusToCheck = Array.from(seenSkus.keys());

    if (barcodesToCheck.length > 0 || skusToCheck.length > 0) {
      try {
        const chunkArray = <T>(arr: T[], size: number): T[][] => {
          const chunks: T[][] = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };

        const foundProducts: Array<{
          id: string;
          name_ar: string;
          sku?: string | null;
          barcode?: string | null;
          part_number?: string | null;
          brand?: string | null;
        }> = [];

        // Check barcodes in chunks of 50
        const barcodeChunks = chunkArray(barcodesToCheck, 50);
        for (const chunk of barcodeChunks) {
          const { data } = await supabase
            .from('products')
            .select('id, name_ar, sku, barcode, part_number, brand')
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .in('barcode', chunk);
          if (data && data.length > 0) {
            foundProducts.push(...data);
          }
        }

        // Check SKUs in chunks of 50
        const skuChunks = chunkArray(skusToCheck, 50);
        for (const chunk of skuChunks) {
          const { data } = await supabase
            .from('products')
            .select('id, name_ar, sku, barcode, part_number, brand')
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .in('sku', chunk);
          if (data && data.length > 0) {
            foundProducts.push(...data);
          }
        }

        if (foundProducts.length > 0) {
          const dbBarcodeMap = new Map<string, (typeof foundProducts)[0]>();
          const dbSkuMap = new Map<string, (typeof foundProducts)[0]>();

          foundProducts.forEach(p => {
            if (p.barcode && String(p.barcode).trim()) {
              dbBarcodeMap.set(String(p.barcode).trim(), p);
            }
            if (p.sku && String(p.sku).trim()) {
              dbSkuMap.set(String(p.sku).trim().toUpperCase(), p);
            }
          });

          rows.forEach((row, idx) => {
            const barcode = String(row.barcode || '').trim();
            const sku = String(row.sku || '')
              .trim()
              .toUpperCase();

            if (barcode && dbBarcodeMap.has(barcode)) {
              const existing = dbBarcodeMap.get(barcode)!;
              conflicts.push({
                rowIndex: idx,
                type: 'DUPLICATE_BARCODE',
                message: `الباركود (${barcode}) مسجل مسبقاً في المنظومة باسم: "${existing.name_ar}"`,
                field: 'barcode',
                value: barcode,
                existingItem: existing,
              });
            } else if (sku && dbSkuMap.has(sku)) {
              const existing = dbSkuMap.get(sku)!;
              conflicts.push({
                rowIndex: idx,
                type: 'DUPLICATE_SKU',
                message: `رمز الصنف SKU (${sku}) مسجل مسبقاً باسم: "${existing.name_ar}"`,
                field: 'sku',
                value: sku,
                existingItem: existing,
              });
            }
          });
        }
      } catch {
        // Silently preserve pre-flight check resilience
      }
    }
  }

  return conflicts;
};

export const useExcelImport = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setErrorMsg('');

      // Quick Preview
      const reader = new FileReader();
      reader.onload = async evt => {
        try {
          const XLSX = await loadXLSX();
          const buffer = evt.target?.result as ArrayBuffer;
          const wb = XLSX.read(buffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          setPreview(data.slice(0, 5)); // Show first 5 rows

          const rawRows = XLSX.utils.sheet_to_json(ws) as Array<Record<string, unknown>>;
          const mappedRows: RawImportRow[] = rawRows.map(r => ({
            name: String(r['اسم المنتج'] ?? r['name'] ?? ''),
            sku: String(r['رقم الصنف (SKU)'] ?? r['sku'] ?? ''),
            barcode: String(r['الباركود'] ?? r['barcode'] ?? ''),
            partNumber: String(r['رقم القطعة (OEM)'] ?? r['part_number'] ?? r['partNumber'] ?? ''),
            brand: String(r['الماركة / الشركة'] ?? r['brand'] ?? ''),
          }));
          const detected = await detectImportConflicts(mappedRows, user?.company_id || '');
          setConflicts(detected);
        } catch {
          setErrorMsg('فشل في قراءة ملف Excel');
          setStatus('error');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus('uploading');
    // Direct server-side Excel import is not wired to `products` yet.
    // Fail HONESTLY instead of the previous fake-success path (the old
    // placeholder returned resolved without importing anything).
    setErrorMsg(
      'الاستيراد المباشر من Excel غير مفعّل بعد — استخدم شبكة Excel التفاعلية لإضافة الأصناف'
    );
    setStatus('error');
  };

  const downloadTemplate = async () => {
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet([
      {
        'اسم المنتج': 'فحمات فرامل أمامية',
        'رقم الصنف (SKU)': 'BP-001',
        الباركود: '628100000001',
        'رقم القطعة (OEM)': '04465-0K240',
        'الماركة / الشركة': 'Toyota',
        'سعر البيع': 150,
        التكلفة: 100,
        الكمية: 50,
        العملة: 'SAR',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Inventory_Template.xlsx');
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setErrorMsg('');
    setPreview([]);
    setConflicts([]);
  };

  return {
    file,
    status,
    errorMsg,
    preview,
    conflicts,
    fileInputRef,
    handleFileChange,
    handleImport,
    downloadTemplate,
    reset,
  };
};
