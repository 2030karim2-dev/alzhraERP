import { useState, useRef } from 'react';
import {
  exportPartsToExcel,
  parsePartsFromFile,
  formatPartsForWhatsApp,
} from '../utils/partsExcelHelper';
import { useFeedbackStore } from '../../feedback/store';
import type { ExcelGridPart, VehicleInfo } from '../types';

export interface PartsExportImportReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isExporting: boolean;
  isImporting: boolean;
  handleExportExcel: () => Promise<void>;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCopyWhatsAppMemo: () => Promise<void>;
  handleClearAllRows: () => void;
}

interface ExportHookProps {
  vehicle: VehicleInfo | null;
  rows: ExcelGridPart[];
  selectedRows: ExcelGridPart[];
}

interface UsePartsExportReturn {
  isExporting: boolean;
  handleExportExcel: () => Promise<void>;
  handleCopyWhatsAppMemo: () => Promise<void>;
}

function usePartsExport({ vehicle, rows, selectedRows }: ExportHookProps): UsePartsExportReturn {
  const { showToast } = useFeedbackStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async (): Promise<void> => {
    if (!vehicle || rows.length === 0) return;
    setIsExporting(true);
    try {
      await exportPartsToExcel(vehicle, rows);
      showToast('تم تصدير ملف الإكسل بنجاح', 'success');
    } catch (err) {
      showToast('فشل تصدير ملف الإكسل', 'error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyWhatsAppMemo = async (): Promise<void> => {
    if (!vehicle || rows.length === 0) return;
    const targetRows = selectedRows.length > 0 ? selectedRows : rows;
    try {
      await navigator.clipboard.writeText(formatPartsForWhatsApp(vehicle, targetRows));
      showToast('تم نسخ قائمة القطع بنجاح (جاهزة للواتساب)', 'success');
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  return { isExporting, handleExportExcel, handleCopyWhatsAppMemo };
}

interface ImportHookProps {
  vehicle: VehicleInfo | null;
  rows: ExcelGridPart[];
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
  clearAllDraft: () => void;
}

interface UsePartsImportReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleClearAllRows: () => void;
}

function usePartsImport({
  vehicle,
  rows,
  setRows,
  clearAllDraft,
}: ImportHookProps): UsePartsImportReturn {
  const { showToast } = useFeedbackStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('حجم الملف كبير جداً (الحد الأقصى 25 ميجابايت)', 'warning');
      return;
    }
    setIsImporting(true);
    try {
      const importedParts = await parsePartsFromFile(file, vehicle);
      if (importedParts.length === 0) {
        showToast('لم يتم العثور على أسطر صالحة في الملف', 'warning');
      } else {
        setRows(prev => [...prev, ...importedParts]);
        showToast(
          `تم استيراد ${String(importedParts.length)} قطعة بنجاح وتوليد أسمائها الذكية`,
          'success'
        );
      }
    } catch (err) {
      showToast('فشل قراءة الملف', 'error', err);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAllRows = (): void => {
    if (rows.length === 0) return;
    if (window.confirm('هل أنت متأكد من مسح جميع أسطر الجدول وبدء مسودة جديدة؟')) {
      clearAllDraft();
      showToast('تم تفريغ الجدول ومسح المسودة', 'info');
    }
  };

  return { fileInputRef, isImporting, handleFileImport, handleClearAllRows };
}

interface UsePartsExportImportProps {
  vehicle: VehicleInfo | null;
  rows: ExcelGridPart[];
  selectedRows: ExcelGridPart[];
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
  clearAllDraft: () => void;
}

export function usePartsExportImport(props: UsePartsExportImportProps): PartsExportImportReturn {
  const exportOps = usePartsExport({
    vehicle: props.vehicle,
    rows: props.rows,
    selectedRows: props.selectedRows,
  });

  const importOps = usePartsImport({
    vehicle: props.vehicle,
    rows: props.rows,
    setRows: props.setRows,
    clearAllDraft: props.clearAllDraft,
  });

  return {
    ...exportOps,
    ...importOps,
  };
}
