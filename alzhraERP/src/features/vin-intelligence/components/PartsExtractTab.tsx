import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PackagePlus,
} from 'lucide-react';
import Button from '../../../ui/base/Button';
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
import { partIntelligenceService } from '../services/partIntelligenceService';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { PartsGridTable } from './PartsGridTable';
import { PartsSearchControls } from './PartsSearchControls';
import { QuickPartsToolbar, QUICK_PARTS_TEMPLATES } from './QuickPartsToolbar';
import { VehicleContextBanner } from './VehicleContextBanner';
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
  companyId?: string | undefined;
  vehicle: VehicleInfo | null;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
                /** resolved count = added + already-existing duplicates */
  onNavigateToInventory?: () => void;
  isAdding: boolean;
  canAdd?: boolean;
}

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

  const handleOpenQuotation = () => {
    if (selectedRows.length === 0) {
      showToast('يرجى تحديد قطعة واحدة على الأقل لإنشاء عرض السعر', 'warning');
      return;
    }
    setIsQuotationModalOpen(true);
  };

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
      <VehicleContextBanner
        vehicle={vehicle}
        makeAr={makeAr}
        modelAr={modelAr}
        years={years}
        customVehicleTemplate={customVehicleTemplate}
        onTemplateChange={setCustomVehicleTemplate}
        onApplyGeneralization={() => { applyGeneralizationToAllRows(); }}
        onResetTemplate={resetTemplateToSmartDefault}
        hasRows={rows.length > 0}
        onClearDraft={handleClearAllRows}
      />

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
      <PartsSearchControls
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedCatalogId={selectedCatalogId}
        onCatalogChange={setSelectedCatalogId}
        isSearching={isSearching}
        onSearch={handleSearchMegazip}
        vehicle={vehicle}
        onAddRow={() => { addRow(); }}
        onAddMultipleRows={(count) => { addMultipleRows(count); }}
      />

      {/* ── Quick Templates Chips & Action Toolbar ── */}
      <QuickPartsToolbar
        templates={QUICK_PARTS_TEMPLATES}
        selectedCount={selectedRows.length}
        rowsCount={rows.length}
        isImporting={isImporting}
        isExporting={isExporting}
        onAddFromTemplate={(tmpl) => { addRow(tmpl); }}
        onOpenQuotation={handleOpenQuotation}
        onImportClick={() => { fileInputRef.current?.click(); }}
        onExport={handleExportExcel}
        onCopyWhatsApp={handleCopyWhatsAppMemo}
      />

      {/* ── Professional Excel Grid Table ── */}
      <PartsGridTable
        rows={rows}
        allSelected={allSelected}
        onToggleSelectAll={toggleSelectAll}
        onUpdateRow={updateRow}
        onDuplicateRow={duplicateRow}
        onDeleteRow={deleteRow}
        onInspectPart={handleDeepInspectPart}
        selectedRows={selectedRows}
        onAddRow={() => { addRow(); }}
        onSaveToInventory={handleSaveToInventory}
        canAdd={canAdd}
        isAdding={isAdding}
        vehicle={vehicle}
        customVehicleTemplate={customVehicleTemplate}
      />

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
