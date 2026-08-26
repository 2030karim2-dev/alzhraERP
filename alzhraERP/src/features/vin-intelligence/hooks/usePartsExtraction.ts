import { useState, useEffect, useCallback, useRef } from 'react';
import type { VehicleInfo, PartIntelligenceResult, PartAlternative } from '../types';
import type { ExcelGridPart } from '../components/PartsExtractTab';
import {
  generateSmartPartName,
  buildDefaultVehicleArabicSuffix,
} from '../utils/smartPartNamer';
import {
  exportPartsToExcel,
  parsePartsFromFile,
  formatPartsForWhatsApp,
} from '../utils/partsExcelHelper';
import { partIntelligenceService } from '../services/partIntelligenceService';
import { useFeedbackStore } from '../../feedback/store';
import type { ItemRow } from '../../sales/hooks/useQuotationForm';

const DRAFT_STORAGE_KEY = 'alz_vin_extract_draft_rows';
const TEMPLATE_STORAGE_KEY = 'alz_vin_extract_custom_template';

export const QUICK_PARTS_TEMPLATES = [
  { base: 'بلاكات', oem: '', mfr: 'DENSO', spec: 'طقم 4 حبات' },
  { base: 'فحمات فرامل أمامية', oem: '', mfr: 'TOYOTA', spec: 'طقم أمامي' },
  { base: 'فحمات فرامل خلفية', oem: '', mfr: 'TOYOTA', spec: 'طقم خلفي' },
  { base: 'فلتر زيت', oem: '', mfr: 'TOYOTA', spec: 'سيفون أصلي' },
  { base: 'فلتر هواء', oem: '', mfr: 'TOYOTA', spec: 'فلتر شوية' },
  { base: 'فلتر مكيف', oem: '', mfr: 'TOYOTA', spec: 'فلتر صالون' },
  { base: 'مساعدات أمامية', oem: '', mfr: 'KYB', spec: 'يمين / يسار' },
  { base: 'دينمو', oem: '', mfr: 'DENSO', spec: '12V' },
  { base: 'سلف', oem: '', mfr: 'DENSO', spec: 'أصلي' },
  { base: 'سير مكينة', oem: '', mfr: 'BANDO', spec: '6PK' },
  { base: 'طرمبة ماء', oem: '', mfr: 'AISIN', spec: 'مع الوجوه' },
];

export function usePartsExtraction(vehicle: VehicleInfo | null) {
  const { showToast } = useFeedbackStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template State
  const defaultSuffix = buildDefaultVehicleArabicSuffix(vehicle);
  const [customVehicleTemplate, setCustomVehicleTemplate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return defaultSuffix;
  });
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  // Grid Rows State
  const [rows, setRows] = useState<ExcelGridPart[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Modal states
  const [activeIntelPart, setActiveIntelPart] = useState<ExcelGridPart | null>(null);
  const [isIntelLoading, setIsIntelLoading] = useState(false);
  const [intelResult, setIntelResult] = useState<PartIntelligenceResult | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [quotationInitialItems, setQuotationInitialItems] = useState<ItemRow[]>([]);

  // Update custom template when vehicle changes
  useEffect(() => {
    if (vehicle) {
      const newDef = buildDefaultVehicleArabicSuffix(vehicle);
      if (newDef) {
        setCustomVehicleTemplate(newDef);
        try {
          localStorage.setItem(TEMPLATE_STORAGE_KEY, newDef);
        } catch {
          // ignore
        }
      }
    }
  }, [vehicle]);

  // Persist draft rows
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // ignore
    }
  }, [rows]);

  const addEmptyRow = useCallback((count = 1) => {
    setRows((prev) => {
      const newRows: ExcelGridPart[] = Array.from({ length: count }, () => {
        const _id = crypto.randomUUID();
        const baseName = '';
        const smartName = generateSmartPartName(baseName, vehicle, {
          customVehicleTemplate: customVehicleTemplate || undefined,
        });
        return {
          _id,
          partNumber: '',
          description: smartName,
          baseName,
          category: 'قطع غيار',
          manufacturer: vehicle?.make || 'Toyota',
          source: 'manual' as const,
          salePrice: 0,
          purchasePrice: 0,
          selected: true,
        };
      });
      return [...prev, ...newRows];
    });
  }, [vehicle, customVehicleTemplate]);

  const addQuickPart = useCallback((tpl: typeof QUICK_PARTS_TEMPLATES[0]) => {
    setRows((prev) => {
      const exists = prev.some((r) => r.baseName === tpl.base || r.description?.includes(tpl.base));
      if (exists) {
        showToast(`الصنف (${tpl.base}) مضاف مسبقاً في الجدول`, 'info');
        return prev;
      }
      const _id = crypto.randomUUID();
      const smartName = generateSmartPartName(tpl.base, vehicle, {
        customVehicleTemplate: customVehicleTemplate || undefined,
      });
      const newRow: ExcelGridPart = {
        _id,
        partNumber: tpl.oem,
        description: smartName,
        baseName: tpl.base,
        category: 'قطع غيار',
        manufacturer: tpl.mfr,
        sizeSpec: tpl.spec,
        source: 'manual' as const,
        salePrice: 0,
        purchasePrice: 0,
        selected: true,
      };
      return [...prev, newRow];
    });
    showToast(`تمت إضافة (${tpl.base}) إلى الجدول`, 'success');
  }, [vehicle, customVehicleTemplate, showToast]);

  const updateRow = useCallback((id: string, field: keyof ExcelGridPart, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'baseName') {
          updated.description = generateSmartPartName(value, vehicle, {
            customVehicleTemplate: customVehicleTemplate || undefined,
          });
        }
        return updated;
      })
    );
  }, [vehicle, customVehicleTemplate]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
  }, []);

  const clearAllRows = useCallback(() => {
    setRows([]);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const toggleSelectAll = useCallback((selectAll: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: selectAll })));
  }, []);

  const openIntelligence = useCallback(async (part: ExcelGridPart) => {
    setActiveIntelPart(part);
    setIsIntelLoading(true);
    try {
      const res = await partIntelligenceService.inspectPart(
        part.partNumber || part.baseName || part.description || '',
        vehicle
      );
      setIntelResult(res);
    } catch (err) {
      showToast('تعذر فحص تفاصيل الذكاء للصنف', 'error');
    } finally {
      setIsIntelLoading(false);
    }
  }, [vehicle, showToast]);

  const applyAlternative = useCallback((alt: PartAlternative) => {
    if (!activeIntelPart) return;
    updateRow(activeIntelPart._id, 'partNumber', alt.partNumber);
    if (alt.brand) {
      updateRow(activeIntelPart._id, 'manufacturer', alt.brand);
    }
    showToast(`تم تطبيق البديل: ${alt.partNumber} (${alt.brand || 'معتمد'})`, 'success');
    setActiveIntelPart(null);
  }, [activeIntelPart, updateRow, showToast]);

  const handleExportExcel = useCallback(async () => {
    if (rows.length === 0) {
      showToast('لا توجد أصناف في الجدول لتصديرها', 'warning');
      return;
    }
    const targetVeh: VehicleInfo = vehicle || { make: 'Toyota', model: 'عام' };
    await exportPartsToExcel(targetVeh, rows);
    showToast('تم تصدير الجدول إلى ملف Excel بنجاح', 'success');
  }, [rows, vehicle, showToast]);

  const handleShareWhatsApp = useCallback(() => {
    if (rows.length === 0) {
      showToast('لا توجد أصناف لمشاركتها', 'warning');
      return;
    }
    const targetVeh: VehicleInfo = vehicle || { make: 'Toyota', model: 'عام' };
    const message = formatPartsForWhatsApp(targetVeh, rows);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [rows, vehicle, showToast]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const imported = await parsePartsFromFile(file, vehicle);
      if (imported.length > 0) {
        setRows((prev) => [...prev, ...imported]);
        showToast(`تم استيراد ${imported.length} صنف بنجاح`, 'success');
      } else {
        showToast('لم يتم العثور على بيانات صالحة في الملف', 'warning');
      }
    } catch (err) {
      showToast('تعذر قراءة ملف Excel/CSV', 'error');
    }
  }, [vehicle, showToast]);

  return {
    rows,
    setRows,
    customVehicleTemplate,
    setCustomVehicleTemplate,
    isEditingTemplate,
    setIsEditingTemplate,
    addEmptyRow,
    addQuickPart,
    updateRow,
    removeRow,
    clearAllRows,
    toggleSelectAll,
    activeIntelPart,
    setActiveIntelPart,
    isIntelLoading,
    intelResult,
    openIntelligence,
    applyAlternative,
    isQuotationModalOpen,
    setIsQuotationModalOpen,
    quotationInitialItems,
    setQuotationInitialItems,
    handleExportExcel,
    handleShareWhatsApp,
    handleImportFile,
    fileInputRef,
    showToast,
  };
}
