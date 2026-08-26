import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PackagePlus,
  Search,
  Plus,
  Sparkles,
  Trash2,
  Copy,
  RefreshCw,
  Car,
  Check,
  Layers,
  Upload,
  Download,
  Share2,
  FileText,
  RotateCcw,
  ExternalLink,
  Globe,
} from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';
import {
  generateSmartPartName,
  buildDefaultVehicleArabicSuffix,
  getArabicVehicleName,
  formatVehicleYears,
} from '../utils/smartPartNamer';
import {
  exportPartsToExcel,
  parsePartsFromFile,
  formatPartsForWhatsApp,
} from '../utils/partsExcelHelper';
import {
  clearDraftRows,
  loadDraftRows,
  loadVehicleTemplate,
  saveDraftRows,
  saveVehicleTemplate,
} from '../utils/draftStorage';
import {
  AUTO_PARTS_CATALOGS,
  openCatalogSearch,
  openCatalogVinSearch,
} from '../constants/catalogs';
import { partIntelligenceService } from '../services/partIntelligenceService';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { useFeedbackStore } from '../../feedback/store';
import CreateQuotationModal from '../../sales/components/quotations/CreateQuotationModal';
import type { ItemRow } from '../../sales/hooks/useQuotationForm';
import type {
  ExcelGridPart,
  ExtractedPart,
  VehicleInfo,
  PartIntelligenceResult,
  PartAlternative,
} from '../types';

interface PartsExtractTabProps {
  hasVehicle: boolean;
  /** Active tenant context — scopes localStorage drafts/templates per company */
  companyId?: string;
  vehicle: VehicleInfo | null;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
                /** resolved count = added + already-existing duplicates */
  onNavigateToInventory?: () => void;
  isAdding: boolean;
  canAdd?: boolean;
}

/** Pre-defined common parts for rapid 1-click addition */
const QUICK_PARTS_TEMPLATES = [
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

export const PartsExtractTab: React.FC<PartsExtractTabProps> = ({
  hasVehicle,
  companyId,
  vehicle,
  onSearchPart,
  isSearching,
  onAdd,
  onNavigateToInventory,
  isAdding,
  canAdd,
}) => {
  const { showToast } = useFeedbackStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize rows from the tenant-scoped localStorage draft or empty array
  const [rows, setRows] = useState<ExcelGridPart[]>(() => loadDraftRows<ExcelGridPart>(companyId));

  // Custom vehicle naming template (Generalization override) — tenant-scoped
  const [customVehicleTemplate, setCustomVehicleTemplate] = useState<string>(() =>
    loadVehicleTemplate(companyId, buildDefaultVehicleArabicSuffix(vehicle)),
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('megazip');
  const [lastAddedCount, setLastAddedCount] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [activeIntelligence, setActiveIntelligence] = useState<PartIntelligenceResult | null>(null);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);

  // Update default custom template when vehicle changes if empty
  useEffect(() => {
    if (vehicle && !customVehicleTemplate.trim()) {
      const defaultSuffix = buildDefaultVehicleArabicSuffix(vehicle);
      setCustomVehicleTemplate(defaultSuffix);
    }
  }, [vehicle, customVehicleTemplate]);

  // Add initial empty rows only on FIRST vehicle selection (not on every switch).
  // Previously this fired on every vehicle change and polluted the grid with two
  // pre-filled rows even when the user just wanted to browse a different vehicle.
  const initialSeedRan = useRef(false);
  useEffect(() => {
    if (initialSeedRan.current) return;
    if (!vehicle) return;
    if (rows.length > 0) {
      initialSeedRan.current = true;
      return;
    }
    if (loadDraftRows(companyId).length > 0) {
      initialSeedRan.current = true;
      return;
    }
    setRows([
      createEmptyRow(vehicle, 'بلاكات', '', vehicle.make || 'GENUINE', 'طقم 4 حبات', customVehicleTemplate),
      createEmptyRow(vehicle, 'فحمات فرامل أمامية', '', vehicle.make || 'GENUINE', 'طقم أمامي', customVehicleTemplate),
    ]);
    initialSeedRan.current = true;
  }, [vehicle, rows.length, customVehicleTemplate]);

  // Persist draft rows to tenant-scoped localStorage on change
  useEffect(() => {
    saveDraftRows(companyId, rows);
  }, [rows, companyId]);

  // Persist template (tenant-scoped; util ignores whitespace-only values)
  useEffect(() => {
    saveVehicleTemplate(companyId, customVehicleTemplate);
  }, [customVehicleTemplate, companyId]);

  // Warn user before accidental page close if there are unsaved rows
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (rows.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rows.length]);
  function createEmptyRow(
    veh: VehicleInfo | null,
    defaultBase = '',
    defaultPartNo = '',
    defaultMfr = 'GENUINE',
    defaultSpec = '',
    templateOverride?: string
  ): ExcelGridPart {
    const smartName = generateSmartPartName(
      defaultBase || 'قطعة غيار',
      veh,
      { customVehicleTemplate: templateOverride || customVehicleTemplate }
    );
    return {
      _id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      partNumber: defaultPartNo,
      baseName: defaultBase,
      description: smartName,
      manufacturer: defaultMfr || veh?.make || '',
      sizeSpec: defaultSpec,
      source: 'manual',
      salePrice: 0,
      purchasePrice: 0,
      selected: true,
    };
  }

  // Update a single cell in the grid
  const updateRow = useCallback((id: string, updates: Partial<ExcelGridPart>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, ...updates };

        // Auto-recalculate smart description if baseName was changed
        if (updates.baseName !== undefined && vehicle) {
          updated.description = generateSmartPartName(updates.baseName, vehicle, {
            customVehicleTemplate: customVehicleTemplate.trim() || undefined,
          });
        }
        return updated;
      })
    );
  }, [vehicle, customVehicleTemplate]);

  const addRow = (template?: typeof QUICK_PARTS_TEMPLATES[0]) => {
    const newRow = createEmptyRow(
      vehicle,
      template?.base || '',
      template?.oem || '',
      template?.mfr || vehicle?.make || 'GENUINE',
      template?.spec || '',
      customVehicleTemplate
    );
    setRows((prev) => [...prev, newRow]);
  };

  const addMultipleRows = (count = 5) => {
    const newRows = Array.from({ length: count }, () =>
      createEmptyRow(vehicle, '', '', 'GENUINE', '', customVehicleTemplate)
    );
    setRows((prev) => [...prev, ...newRows]);
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const duplicateRow = (id: string) => {
    const target = rows.find((r) => r._id === id);
    if (!target) return;
    const clone: ExcelGridPart = {
      ...target,
      _id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      selected: true,
    };
    setRows((prev) => [...prev, clone]);
  };

  // Batch regenerate all smart names based on custom template or active vehicle
  const applyGeneralizationToAllRows = (templateText?: string) => {
    const activeTemplate = (templateText !== undefined ? templateText : customVehicleTemplate).trim();
    if (!vehicle && !activeTemplate) return;

    setRows((prev) => {
      const overriddenCount = prev.reduce((acc, r) => {
        const smart = generateSmartPartName(r.baseName || r.description || 'قطعة غيار', vehicle, {
          customVehicleTemplate: activeTemplate || undefined,
        });
        return r.description && r.description !== smart ? acc + 1 : acc;
      }, 0);

      if (overriddenCount > 0) {
        const ok = window.confirm(
          `لدى ${overriddenCount} سطر أوصافاً مُعدَّلة يدوياً. تطبيق التعميم سيستبدلها. هل تريد المتابعة؟`,
        );
        if (!ok) return prev;
      }

      return prev.map((r) => ({
        ...r,
        description: generateSmartPartName(r.baseName || r.description || 'قطعة غيار', vehicle, {
          customVehicleTemplate: activeTemplate || undefined,
        }),
      }));
    });
    showToast('تم تطبيق التعميم على كافة أسطر الجدول بنجاح ✨', 'success');
  };

  const resetTemplateToSmartDefault = () => {
    const defaultSuffix = buildDefaultVehicleArabicSuffix(vehicle);
    setCustomVehicleTemplate(defaultSuffix);
    applyGeneralizationToAllRows(defaultSuffix);
  };

  const toggleSelectAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleDeepInspectPart = async (partNum: string) => {
    const q = partNum.trim().toUpperCase();
    if (!q || q.length < 3) return;
    setIsIntelligenceOpen(true);
    setIsIntelligenceLoading(true);
    try {
      const intel = await partIntelligenceService.inspectPart(q, vehicle, selectedCatalogId);
      setActiveIntelligence(intel);
    } catch (err) {
      showToast('تعذر فحص تفاصيل القطعة، يرجى المحاولة لاحقاً', 'error', err);
    } finally {
      setIsIntelligenceLoading(false);
    }
  };

  const handleAddAlternativeToGrid = (part: Partial<ExcelGridPart>) => {
    const smartName = generateSmartPartName(
      part.baseName || part.description || 'قطعة غيار',
      vehicle,
      { customVehicleTemplate: customVehicleTemplate.trim() || undefined }
    );

    const newRow: ExcelGridPart = {
      _id: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      partNumber: part.partNumber || '',
      baseName: part.baseName || part.description || '',
      description: smartName,
      manufacturer: part.manufacturer || vehicle?.make || '',
      sizeSpec: part.sizeSpec || '',
      source: part.source || 'catalog',
      salePrice: part.salePrice || 0,
      purchasePrice: part.purchasePrice || 0,
      selected: true,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleAddAllAlternativesToGrid = (alternatives: PartAlternative[]) => {
    if (!alternatives || alternatives.length === 0) return;
    const newRows = alternatives.map((alt) => {
      const smartName = generateSmartPartName(
        activeIntelligence?.primaryNameAr || 'قطعة غيار',
        vehicle,
        { customVehicleTemplate: customVehicleTemplate.trim() || undefined }
      );
      return {
        _id: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        partNumber: alt.partNumber,
        baseName: activeIntelligence?.primaryNameAr || '',
        description: `${smartName} (${alt.brand || 'بديل'})`,
        manufacturer: alt.brand || activeIntelligence?.manufacturer || vehicle?.make || '',
        sizeSpec: '',
        source: 'catalog' as const,
        salePrice: 0,
        purchasePrice: 0,
        selected: true,
      };
    });
    setRows((prev) => [...prev, ...newRows]);
    showToast(`تمت إضافة ${newRows.length} بديل معتمد للجدول بنجاح ✨`, 'success');
  };

  const handleSearchMegazip = async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    // 1. Perform deep inspection
    handleDeepInspectPart(q);

    // 2. Perform catalog extraction & populate grid
    try {
      const res = await onSearchPart(q);
      if (res.length > 0) {
        const newItems: ExcelGridPart[] = res.map((p) => {
          const smartName = generateSmartPartName(
            p.description || p.partNumber,
            vehicle,
            { customVehicleTemplate: customVehicleTemplate.trim() || undefined }
          );

          return {
            _id: `mz-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            partNumber: p.partNumber,
            baseName: p.description || p.partNumber,
            description: smartName,
            manufacturer: p.manufacturer || vehicle?.make || '',
            source: 'megazip',
            salePrice: p.salePrice || 0,
            purchasePrice: p.purchasePrice || 0,
            selected: true,
          };
        });
        setRows((prev) => [...prev, ...newItems]);
        setSearchQuery('');
      } else {
        showToast('لم يتم العثور على قطع مطابقة من الكتالوج', 'info');
      }
    } catch (err) {
      showToast('فشل البحث في الكتالوج، يرجى المحاولة لاحقاً', 'error', err);
    }
  };

  const selectedRows = rows.filter((r) => r.selected);

  const handleSaveToInventory = async () => {
    if (selectedRows.length === 0) return;
    // No synthetic fallback numbering: fabricating "PART-<timestamp>" faked an
    // OEM number, polluted part_compatibility and made server-side dedupe
    // impossible. Empty numbers go as-is (SQL NULLIF stores them as NULL).
    const partsToSave: ExtractedPart[] = selectedRows.map((r) => {
      let finalDescription = (r.description ?? '').trim() || r.baseName.trim() || 'قطعة غيار';
      if (r.sizeSpec?.trim() && !finalDescription.includes(r.sizeSpec.trim())) {
        finalDescription = `${finalDescription} - ${r.sizeSpec.trim()}`;
      }
      return {
        partNumber: r.partNumber.trim(),
        description: finalDescription,
        manufacturer: r.manufacturer?.trim() || vehicle?.make || '',
        source: r.source || 'manual',
        salePrice: r.salePrice || 0,
        purchasePrice: r.purchasePrice || 0,
      };
    });

    try {
      const count = await onAdd(partsToSave);
      setLastAddedCount(count);
      // Clear draft on successful save (tenant-scoped key)
      clearDraftRows(companyId);
    } catch (err) {
      // onError in the hook surfaces a toast; keep rows intact on failure so
      // the user can retry without entering the data again.
      showToast('فشلت إضافة القطع إلى المخزون، تم حفظ المسودة للمراجعة', 'error', err);
    }
  };

  const handleExportExcel = async () => {
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Guard against oversized files (memory pressure / frozen tab on parse).
    // Excel grid imports are expected to be modest; cap at 25 MB.
    const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('حجم الملف كبير جداً (الحد الأقصى 25 ميجابايت)', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const importedParts = await parsePartsFromFile(file, vehicle);
      if (importedParts.length === 0) {
        showToast('لم يتم العثور على أسطر صالحة في الملف', 'warning');
      } else {
        setRows((prev) => [...prev, ...importedParts]);
        showToast(`تم استيراد ${importedParts.length} قطعة بنجاح وتوليد أسمائها الذكية`, 'success');
      }
    } catch (err) {
      showToast('فشل قراءة الملف', 'error', err);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyWhatsAppMemo = async () => {
    if (!vehicle || rows.length === 0) return;
    const targetRows = selectedRows.length > 0 ? selectedRows : rows;
    const text = formatPartsForWhatsApp(vehicle, targetRows);
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم نسخ قائمة القطع بنجاح (جاهزة للواتساب)', 'success');
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  const handleClearAllRows = () => {
    if (rows.length === 0) return;
    if (window.confirm('هل أنت متأكد من مسح جميع أسطر الجدول وبدء مسودة جديدة؟')) {
      setRows([]);
      clearDraftRows(companyId);
      showToast('تم تفريغ الجدول ومسح المسودة', 'info');
    }
  };

  // Convert selected rows to quotation items
  const quotationInitialItems: ItemRow[] = selectedRows.map((r) => {
    let desc = (r.description ?? '').trim() || r.baseName.trim() || 'قطعة غيار';
    if (r.partNumber?.trim()) {
      desc = `${desc} (${r.partNumber.trim()})`;
    }
    if (r.sizeSpec?.trim()) {
      desc = `${desc} - ${r.sizeSpec.trim()}`;
    }
    return {
      productId: '',
      description: desc,
      quantity: 1,
      unitPrice: r.salePrice || 0,
      discountPercent: 0,
    };
  });

  const { makeAr, modelAr } = getArabicVehicleName(vehicle);
  const years = formatVehicleYears(vehicle);
  const quotationNotes = vehicle
    ? `عرض سعر قطع غيار سيارة: ${makeAr} ${modelAr} ${years}`
    : 'عرض سعر قطع غيار';

  if (!hasVehicle || !vehicle) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-12 p-5 shadow-sm font-cairo">
        <PackagePlus size={32} className="text-blue-600 dark:text-blue-400 opacity-60 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
          لم يتم تحديد السيارة بعد
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          يرجى فك رقم الشاصي (VIN) أو إدخال بيانات ومواصفات السيارة في تبويب «فك الشاصي» لتتمكن من إضافة القطع والتسمية التلقائية.
        </p>
      </div>
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <div className="space-y-4 font-cairo">
      {/* Hidden file input for Excel / CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* ── Active Vehicle Context Banner & Custom Generalization Template ── */}
      <div className="bg-gradient-to-l from-slate-900/90 to-slate-950 text-white border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Car size={22} className="flex-shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800">
                  السيارة النشطة
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {vehicle.vinPrefix ? `(VIN: ${vehicle.vinPrefix})` : ''}
                </span>
              </div>
              <h4 className="text-sm md:text-base font-bold text-white mt-1">
                {makeAr} {modelAr}{' '}
                {years ? `(${years})` : ''}{' '}
                {vehicle.market ? `[${vehicle.market}]` : ''}{' '}
                {vehicle.transmission ? `[${vehicle.transmission}]` : ''}{' '}
                {vehicle.displacement ? `[مكينة ${vehicle.displacement}]` : ''}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold" title="حفظ المسودة تلقائياً في المتصفح لمنع فقدان البيانات">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>مسودة محفوظة تلقائياً 💾</span>
            </div>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllRows}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 text-xs font-bold transition-all"
                title="مسح المسودة والبدء من جديد"
              >
                مسح المسودة
              </button>
            )}
          </div>
        </div>

        {/* ── Generalization Override Bar (الميزة الأولى: تعميم الجدول اليدوي المتقن) ── */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 shrink-0">
            <Sparkles size={16} className="text-amber-400" />
            <span>تعميم وصف السيارة للجدول (يدوي / دقيق):</span>
          </div>

          <div className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={customVehicleTemplate}
              onChange={(e) => setCustomVehicleTemplate(e.target.value)}
              placeholder="مثال: فيتز 2005 مكينة 1.3"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs font-bold text-emerald-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => applyGeneralizationToAllRows()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm"
              title="تطبيق هذا الوصف فوراً على جميع أسطر الجدول الحالية والجديدة"
            >
              <Sparkles size={13} className="ml-1" />
              تطبيق التعميم على الجدول ✨
            </Button>
            <button
              type="button"
              onClick={resetTemplateToSmartDefault}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="استعادة الصياغة التلقائية المقترحة"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {lastAddedCount !== null && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <p className="text-xs font-bold">
              تم بنجاح إضافة وتحديث <span className="underline decoration-2 font-bold">{lastAddedCount}</span> قطعة في المخزون وشبكة التوافق لهذه المركبة!
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToInventory && (
              <Button
                size="sm"
                variant="success"
                onClick={onNavigateToInventory}
                className="text-xs font-bold px-3 py-1 bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
              >
                عرض في المخزون المتطابق →
              </Button>
            )}
            <button
              onClick={() => { setLastAddedCount(null); }}
              className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 text-xs font-bold px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Multi-Catalog Controls ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              بحث واستخراج قطع الغيار من الكتالوجات العالمية (OEM & Aftermarket)
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>الكتالوج النشط:</span>
            <select
              value={selectedCatalogId}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {AUTO_PARTS_CATALOGS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Part Number Search Input */}
          <div className="lg:col-span-5">
            <Input
              label="رقم القطعة OEM / Part Number"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchMegazip()}
              placeholder="مثال: 90919-01253 أو 04465-42190..."
            />
          </div>

          {/* Action buttons */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSearchMegazip}
              isLoading={isSearching}
              disabled={searchQuery.trim().length < 3}
              className="flex-1 rounded-xl font-bold py-2"
              title="جلب وتفريغ بيانات القطعة تلقائياً في الجدول"
            >
              <Search size={14} className="ml-1" /> بحث واستخراج
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCatalogSearch(selectedCatalogId, searchQuery || vehicle?.vinPrefix || '')}
              className="rounded-xl font-bold py-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              title="فتح نتيجة البحث مباشرة في موقع الكتالوج المختار"
            >
              <ExternalLink size={14} className="ml-1" /> فتح في الكتالوج ↗
            </Button>
          </div>

          {/* Quick Row insertion actions */}
          <div className="lg:col-span-3 flex items-center justify-end gap-2">
            <Button size="sm" variant="primary" onClick={() => { addRow(); }} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl shadow-sm py-2">
              <Plus size={14} className="ml-1" /> سطر جديد
            </Button>
            <Button size="sm" variant="outline" onClick={() => { addMultipleRows(5); }} className="font-bold text-xs rounded-xl py-2">
              <Layers size={14} className="ml-1" /> +5 أسطر
            </Button>
          </div>
        </div>

        {/* Quick Catalogs Launcher Pill Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-1">
            الكتالوجات المعتمدة (بحث فوري بضغطة زر):
          </span>
          {AUTO_PARTS_CATALOGS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCatalogId(cat.id);
                openCatalogSearch(cat.id, searchQuery || vehicle?.vinPrefix || '');
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shadow-2xs',
                cat.colorClass.bg,
                cat.colorClass.text,
                cat.colorClass.border,
                cat.colorClass.hoverBg
              )}
              title={`${cat.description} - انقر للبحث عن «${searchQuery || 'السيارة'}» في ${cat.nameEn}`}
            >
              <span>{cat.badge}</span>
              <ExternalLink size={11} className="opacity-70" />
            </button>
          ))}
          {vehicle?.vinPrefix && (
            <button
              type="button"
              onClick={() => openCatalogVinSearch('partsouq', vehicle.vinPrefix || '')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
              title="فحص شاصي هذه المركبة في كتالوج PartSouq المعتمد"
            >
              <span>🇦🇪 فحص الشاصي في PartSouq ({vehicle.vinPrefix})</span>
              <ExternalLink size={11} className="opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Templates Chips & Action Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">إضافة سريعة:</span>
          {QUICK_PARTS_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.base}
              type="button"
              onClick={() => { addRow(tmpl); }}
              className="shrink-0 px-3 py-1 text-xs font-bold rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
            >
              + {tmpl.base}
            </button>
          ))}
        </div>

        {/* Pro Tools: Excel Export, Import, WhatsApp Memo Copy, Quotations */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Create Quotation Directly (الميزة الثانية: الربط المباشر مع عروض الأسعار) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (selectedRows.length === 0) {
                showToast('يرجى تحديد قطعة واحدة على الأقل لإنشاء عرض السعر', 'warning');
                return;
              }
              setIsQuotationModalOpen(true);
            }}
            disabled={selectedRows.length === 0}
            className="text-xs font-bold rounded-lg border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 shadow-sm"
            title="إنشاء عرض أسعار للعميل مباشرة من هذه القطع دون إدخالها للمخزون"
          >
            <FileText size={13} className="ml-1 text-indigo-600 dark:text-indigo-400" />
            إنشاء عرض سعر ({selectedRows.length})
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isImporting}
            className="text-xs font-bold rounded-lg border-slate-300 dark:border-slate-700"
            title="استيراد أسطر قطع من ملف Excel أو CSV"
          >
            <Upload size={13} className="ml-1 text-slate-600 dark:text-slate-300" />
            استيراد Excel/CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            isLoading={isExporting}
            disabled={rows.length === 0}
            className="text-xs font-bold rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="تصدير جدول القطع بالكامل إلى ملف Excel منسق"
          >
            <Download size={13} className="ml-1 text-emerald-600 dark:text-emerald-400" />
            تصدير Excel
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyWhatsAppMemo}
            disabled={rows.length === 0}
            className="text-xs font-bold rounded-lg border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
            title="نسخ قائمة القطع كنص منسق للواتساب أو عروض الأسعار"
          >
            <Share2 size={13} className="ml-1 text-green-600 dark:text-green-400" />
            نسخ للواتساب
          </Button>
        </div>
      </div>

      {/* ── Professional Excel Grid Table ── */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto max-h-[540px] custom-scrollbar">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 select-none">
              <tr>
                <th className="p-2.5 text-center w-9">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => { toggleSelectAll(e.target.checked); }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-2.5 w-10 text-center text-slate-400">#</th>
                <th className="p-2.5 min-w-[130px]">رقم القطعة (OEM / Part No)</th>
                <th className="p-2.5 min-w-[120px]">نوع القطعة (الأولي)</th>
                <th className="p-2.5 min-w-[280px]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>اسم المنتج المكتمل (تلقائي / يدوي)</span>
                  </div>
                </th>
                <th className="p-2.5 min-w-[100px]">الشركة الصانعة</th>
                <th className="p-2.5 min-w-[110px]">المقاس / المواصفات</th>
                <th className="p-2.5 min-w-[85px] text-center">سعر الشراء</th>
                <th className="p-2.5 min-w-[85px] text-center">سعر البيع</th>
                <th className="p-2.5 w-16 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    لا توجد أسطر حالياً. انقر على «سطر جديد» أو «إضافة سريعة» للبدء.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row._id}
                    className={cn(
                      'hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group',
                      row.selected ? 'bg-blue-50/30 dark:bg-blue-950/30' : 'bg-white dark:bg-slate-900'
                    )}
                  >
                    {/* Select Checkbox */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.selected}
                        onChange={(e) => { updateRow(row._id, { selected: e.target.checked }); }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="p-2 text-center font-mono text-xs text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Part Number Input */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={row.partNumber}
                        onChange={(e) => { updateRow(row._id, { partNumber: e.target.value }); }}
                        onFocus={(e) => e.target.select()}
                        placeholder="رقم القطعة..."
                        className="w-full px-2.5 py-1.5 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </td>

                    {/* Base Name / Category Input */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={row.baseName}
                        onChange={(e) => { updateRow(row._id, { baseName: e.target.value }); }}
                        onFocus={(e) => e.target.select()}
                        placeholder="مثال: بلاكات..."
                        className="w-full px-2.5 py-1.5 font-bold text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </td>

                    {/* Auto-Completed / Editable Smart Product Name */}
                    <td className="p-1.5">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => { updateRow(row._id, { description: e.target.value }); }}
                          onFocus={(e) => e.target.select()}
                          title={row.description}
                          className="w-full px-2.5 py-1.5 font-bold text-xs text-slate-900 dark:text-blue-200 bg-blue-50/40 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            updateRow(row._id, {
                              description: generateSmartPartName(row.baseName || 'قطعة غيار', vehicle, {
                                customVehicleTemplate: customVehicleTemplate.trim() || undefined,
                              }),
                            });
                          }}
                          className="absolute left-2 p-1 text-blue-500 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="إعادة صياغة الاسم بناءً على التعميم المعتمد"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Manufacturer / Brand */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={row.manufacturer || ''}
                        onChange={(e) => { updateRow(row._id, { manufacturer: e.target.value }); }}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2.5 py-1.5 font-medium text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </td>

                    {/* Size & Specification */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={row.sizeSpec || ''}
                        onChange={(e) => { updateRow(row._id, { sizeSpec: e.target.value }); }}
                        onFocus={(e) => e.target.select()}
                        placeholder="المقاس..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </td>

                    {/* Purchase Price */}
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.purchasePrice || ''}
                        onChange={(e) => { updateRow(row._id, { purchasePrice: parseFloat(e.target.value) || 0 }); }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-emerald-600 dark:text-emerald-400"
                      />
                    </td>

                    {/* Sale Price */}
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.salePrice || ''}
                        onChange={(e) => { updateRow(row._id, { salePrice: parseFloat(e.target.value) || 0 }); }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-600 dark:text-blue-400"
                      />
                    </td>

                    {/* Actions (Inspect, Duplicate, Delete) */}
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.partNumber.trim() || row.baseName.trim()) {
                              handleDeepInspectPart(row.partNumber.trim() || row.baseName.trim());
                            } else {
                              showToast('يرجى كتابة رقم القطعة أو اسمها أولاً للفحص', 'warning');
                            }
                          }}
                          className="p-1.5 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          title="فحص بالذكاء الاصطناعي واستخراج البدائل والسيارات المتوافقة ونسبة الثقة"
                        >
                          <Sparkles size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { duplicateRow(row._id); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="تكرار السطر"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { deleteRow(row._id); }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="حذف السطر"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Grid Footer & Batch Commit ── */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              تم تحديد <strong className="text-blue-600 dark:text-blue-400 font-bold">{selectedRows.length}</strong> من أصل {rows.length} قطعة
            </span>
            <Button size="sm" variant="outline" onClick={() => { addRow(); }} className="text-xs font-bold rounded-lg">
              <Plus size={12} className="ml-1" /> إضافة سطر
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {canAdd === false ? (
              <p className="text-xs text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                تتطلب إضافة القطع للمخزون صلاحية مدير أو مسؤول
              </p>
            ) : (
              <Button
                size="md"
                variant="success"
                onClick={handleSaveToInventory}
                isLoading={isAdding}
                disabled={selectedRows.length === 0}
                className="font-bold px-5 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-500/10"
              >
                <Check size={16} className="ml-1.5" /> حفظ وإضافة القطع المحددة ({selectedRows.length}) للمخزون
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Smart Part Intelligence & Cross-Reference Modal ── */}
      <PartIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => setIsIntelligenceOpen(false)}
        intelligence={activeIntelligence}
        isLoading={isIntelligenceLoading}
        onAddAlternativeToGrid={handleAddAlternativeToGrid}
        onAddAllAlternativesToGrid={handleAddAllAlternativesToGrid}
      />

      {/* ── Quotation Creation Modal ── */}
      {isQuotationModalOpen && (
        <CreateQuotationModal
          onClose={() => setIsQuotationModalOpen(false)}
          onSuccess={() => {
            showToast('تم إنشاء وحفظ عرض السعر بنجاح! 📄', 'success');
            setIsQuotationModalOpen(false);
          }}
          initialItems={quotationInitialItems}
          initialNotes={quotationNotes}
        />
      )}
    </div>
  );
};
