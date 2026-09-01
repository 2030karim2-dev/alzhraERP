import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PackagePlus } from 'lucide-react';
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
import { usePartInspection } from '../hooks/usePartInspection';
import {
  pickBaseName,
  pickManufacturer,
  pickPrice,
  pickPartName,
  pickAltManufacturer,
  buildFinalDescription,
} from '../utils/vinRowHelpers';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { PartsGridTable } from './PartsGridTable';
import { PartsSearchControls } from './PartsSearchControls';
import {
  QuickPartsToolbar,
  QUICK_PARTS_TEMPLATES,
  type QuickPartTemplate,
} from './QuickPartsToolbar';
import { VehicleContextBanner } from './VehicleContextBanner';
import { useFeedbackStore } from '../../feedback/store';
import CreateQuotationModal from '../../sales/components/quotations/CreateQuotationModal';
import type { ItemRow } from '../../sales/hooks/useQuotationForm';
import type { ExcelGridPart, ExtractedPart, VehicleInfo, PartAlternative } from '../types';

/* ──────────────────────────────────────────────────────────────────
   Pure row-normalization helpers — module scope keeps them stable for
   hooks deps and each function stays under the complexity-10 ceiling
   (note: `?.`, `??`, `||` and `&&` all count toward complexity here).
   ────────────────────────────────────────────────────────────────── */

interface CreateEmptyRowOptions {
  veh: VehicleInfo | null;
  base?: string;
  partNo?: string;
  mfr?: string;
  spec?: string;
  template?: string;
}

function createEmptyRow(options: CreateEmptyRowOptions): ExcelGridPart {
  const smartName = generateSmartPartName((options.base ?? '') || 'قطعة غيار', options.veh, {
    customVehicleTemplate: options.template,
  });
  return {
    _id: `row-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    partNumber: options.partNo ?? '',
    baseName: options.base ?? '',
    description: smartName,
    manufacturer: (options.mfr ?? '') || (options.veh?.make ?? ''),
    sizeSpec: options.spec ?? '',
    source: 'manual',
    salePrice: 0,
    purchasePrice: 0,
    selected: true,
  };
}

const TEMPLATE_DEFAULTS: QuickPartTemplate = { base: '', oem: '', mfr: 'GENUINE', spec: '' };

function templateRowArgs(
  template: QuickPartTemplate | undefined,
  vehicle: VehicleInfo | null
): [string, string, string, string] {
  const t = template ?? TEMPLATE_DEFAULTS;
  return [t.base, t.oem, t.mfr || (vehicle?.make ?? 'GENUINE'), t.spec];
}

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
  onNavigateToDecode?: () => void;
  isAdding: boolean;
  canAdd?: boolean;
}

// eslint-disable-next-line max-lines-per-function -- React component composing five presentational units + modals; the 50-line ceiling is not applicable to a component boundary.
export const PartsExtractTab: React.FC<PartsExtractTabProps> = ({
  hasVehicle,
  companyId,
  vehicle,
  onSearchPart,
  isSearching,
  onAdd,
  onNavigateToInventory,
  onNavigateToDecode,
  isAdding,
  canAdd,
}) => {
  const { showToast } = useFeedbackStore();
  const {
    isIntelligenceOpen,
    setIsIntelligenceOpen,
    isIntelligenceLoading,
    activeIntelligence,
    handleDeepInspectPart,
  } = usePartInspection();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize rows from the tenant-scoped localStorage draft or empty array
  const [rows, setRows] = useState<ExcelGridPart[]>(() => loadDraftRows<ExcelGridPart>(companyId));

  // Custom vehicle naming template (Generalization override) — tenant-scoped
  const [customVehicleTemplate, setCustomVehicleTemplate] = useState<string>(() =>
    loadVehicleTemplate(companyId, buildDefaultVehicleArabicSuffix(vehicle))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('megazip');
  const [lastAddedCount, setLastAddedCount] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

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
      createEmptyRow({
        veh: vehicle,
        base: 'بلاكات',
        mfr: vehicle.make || 'GENUINE',
        spec: 'طقم 4 حبات',
        template: customVehicleTemplate,
      }),
      createEmptyRow({
        veh: vehicle,
        base: 'فحمات فرامل أمامية',
        mfr: vehicle.make || 'GENUINE',
        spec: 'طقم أمامي',
        template: customVehicleTemplate,
      }),
    ]);
    initialSeedRan.current = true;
  }, [vehicle, rows.length, customVehicleTemplate, companyId]);

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
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (rows.length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [rows.length]);

  // Update a single cell in the grid
  const updateRow = useCallback(
    (id: string, updates: Partial<ExcelGridPart>) => {
      setRows(prev =>
        prev.map(r => {
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
    },
    [vehicle, customVehicleTemplate]
  );

  const addRow = (template?: (typeof QUICK_PARTS_TEMPLATES)[0]): void => {
    const args = templateRowArgs(template, vehicle);
    const newRow = createEmptyRow({
      veh: vehicle,
      base: args[0],
      partNo: args[1],
      mfr: args[2],
      spec: args[3],
      template: customVehicleTemplate,
    });
    setRows(prev => [...prev, newRow]);
  };

  const addMultipleRows = (count = 5): void => {
    const newRows = Array.from({ length: count }, () =>
      createEmptyRow({ veh: vehicle, mfr: 'GENUINE', template: customVehicleTemplate })
    );
    setRows(prev => [...prev, ...newRows]);
  };

  const deleteRow = (id: string): void => {
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const duplicateRow = (id: string): void => {
    const target = rows.find(r => r._id === id);
    if (!target) return;
    const clone: ExcelGridPart = {
      ...target,
      _id: `row-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
      selected: true,
    };
    setRows(prev => [...prev, clone]);
  };

  // Batch regenerate all smart names based on custom template or active vehicle
  const applyGeneralizationToAllRows = (templateText?: string): void => {
    const activeTemplate = (templateText ?? customVehicleTemplate).trim();
    if (!vehicle && !activeTemplate) return;

    setRows(prev => {
      const overriddenCount = prev.reduce((acc, r) => {
        const smart = generateSmartPartName(
          r.baseName || (r.description ?? '') || 'قطعة غيار',
          vehicle,
          {
            customVehicleTemplate: activeTemplate || undefined,
          }
        );
        const desc = r.description ?? '';
        return desc.length > 0 && desc !== smart ? acc + 1 : acc;
      }, 0);

      if (overriddenCount > 0) {
        const ok = window.confirm(
          `لدى ${String(overriddenCount)} سطر أوصافاً مُعدَّلة يدوياً. تطبيق التعميم سيستبدلها. هل تريد المتابعة؟`
        );
        if (!ok) return prev;
      }

      return prev.map(r => ({
        ...r,
        description: generateSmartPartName(
          r.baseName || (r.description ?? '') || 'قطعة غيار',
          vehicle,
          {
            customVehicleTemplate: activeTemplate || undefined,
          }
        ),
      }));
    });
    showToast('تم تطبيق التعميم على كافة أسطر الجدول بنجاح ✨', 'success');
  };

  const resetTemplateToSmartDefault = (): void => {
    const defaultSuffix = buildDefaultVehicleArabicSuffix(vehicle);
    setCustomVehicleTemplate(defaultSuffix);
    applyGeneralizationToAllRows(defaultSuffix);
  };

  const toggleSelectAll = (checked: boolean): void => {
    setRows(prev => prev.map(r => ({ ...r, selected: checked })));
  };

  const handleAddAlternativeToGrid = (part: Partial<ExcelGridPart>): void => {
    const smartName = generateSmartPartName(pickBaseName(part) || 'قطعة غيار', vehicle, {
      customVehicleTemplate: customVehicleTemplate.trim() || undefined,
    });

    const newRow: ExcelGridPart = {
      _id: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
      partNumber: part.partNumber ?? '',
      baseName: pickBaseName(part),
      description: smartName,
      manufacturer: pickManufacturer(part, vehicle),
      sizeSpec: part.sizeSpec ?? '',
      source: part.source ?? 'catalog',
      salePrice: pickPrice(part.salePrice),
      purchasePrice: pickPrice(part.purchasePrice),
      selected: true,
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleAddAllAlternativesToGrid = (alternatives: PartAlternative[]): void => {
    if (alternatives.length === 0) return;
    const primaryNameAr = activeIntelligence?.primaryNameAr ?? '';
    const smartBase = primaryNameAr || 'قطعة غيار';
    const newRows = alternatives.map(alt => {
      const smartName = generateSmartPartName(smartBase, vehicle, {
        customVehicleTemplate: customVehicleTemplate.trim() || undefined,
      });
      return {
        _id: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
        partNumber: alt.partNumber,
        baseName: primaryNameAr,
        description: `${smartName} (${alt.brand ?? 'بديل'})`,
        manufacturer: pickAltManufacturer(alt, activeIntelligence, vehicle),
        sizeSpec: '',
        source: 'catalog' as const,
        salePrice: 0,
        purchasePrice: 0,
        selected: true,
      };
    });
    setRows(prev => [...prev, ...newRows]);
    showToast(`تمت إضافة ${String(newRows.length)} بديل معتمد للجدول بنجاح ✨`, 'success');
  };

  const handleSearchMegazip = async (): Promise<void> => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    // 1. Perform deep inspection
    void handleDeepInspectPart(q, vehicle, selectedCatalogId);

    // 2. Perform catalog extraction & populate grid
    try {
      const res = await onSearchPart(q);
      if (res.length > 0) {
        const newItems: ExcelGridPart[] = res.map(p => {
          const smartName = generateSmartPartName(pickPartName(p), vehicle, {
            customVehicleTemplate: customVehicleTemplate.trim() || undefined,
          });

          return {
            _id: `mz-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
            partNumber: p.partNumber,
            baseName: pickPartName(p),
            description: smartName,
            manufacturer: pickManufacturer(p, vehicle),
            source: 'megazip',
            salePrice: pickPrice(p.salePrice),
            purchasePrice: pickPrice(p.purchasePrice),
            selected: true,
          };
        });
        setRows(prev => [...prev, ...newItems]);
        setSearchQuery('');
      } else {
        showToast('لم يتم العثور على قطع مطابقة من الكتالوج', 'info');
      }
    } catch (err) {
      showToast('فشل البحث في الكتالوج، يرجى المحاولة لاحقاً', 'error', err);
    }
  };

  const selectedRows = rows.filter(r => r.selected === true);

  const handleOpenQuotation = (): void => {
    if (selectedRows.length === 0) {
      showToast('يرجى تحديد قطعة واحدة على الأقل لإنشاء عرض السعر', 'warning');
      return;
    }
    setIsQuotationModalOpen(true);
  };

  const handleSaveToInventory = async (): Promise<void> => {
    if (selectedRows.length === 0) return;
    // No synthetic fallback numbering: fabricating "PART-<timestamp>" faked an
    // OEM number, polluted part_compatibility and made server-side dedupe
    // impossible. Empty numbers go as-is (SQL NULLIF stores them as NULL).
    const partsToSave: ExtractedPart[] = selectedRows.map(r => {
      return {
        partNumber: r.partNumber.trim(),
        description: buildFinalDescription(r),
        manufacturer: pickManufacturer(r, vehicle),
        source: r.source,
        salePrice: pickPrice(r.salePrice),
        purchasePrice: pickPrice(r.purchasePrice),
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
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

  const handleCopyWhatsAppMemo = async (): Promise<void> => {
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

  const handleClearAllRows = (): void => {
    if (rows.length === 0) return;
    if (window.confirm('هل أنت متأكد من مسح جميع أسطر الجدول وبدء مسودة جديدة؟')) {
      setRows([]);
      clearDraftRows(companyId);
      showToast('تم تفريغ الجدول ومسح المسودة', 'info');
    }
  };

  // Convert selected rows to quotation items
  const quotationInitialItems: ItemRow[] = selectedRows.map(r => {
    let desc = (r.description ?? '').trim() || r.baseName.trim() || 'قطعة غيار';
    const partNo = r.partNumber.trim();
    if (partNo.length > 0) {
      desc = `${desc} (${partNo})`;
    }
    const sizeSpec = r.sizeSpec?.trim() ?? '';
    if (sizeSpec.length > 0) {
      desc = `${desc} - ${sizeSpec}`;
    }
    return {
      productId: '',
      description: desc,
      quantity: 1,
      unitPrice: r.salePrice ?? 0,
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
      <div className="font-cairo rounded-2xl border border-slate-200 bg-white p-8 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          <PackagePlus size={28} />
        </div>
        <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">
          لم يتم تحديد السيارة بعد
        </h3>
        <p className="mx-auto mb-6 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          يرجى فك رقم الشاصي (VIN) أو اختيار موديل ومواصفات السيارة في تبويب «فك الشاصي» لتتمكن من
          إضافة القطع وتسعيرها والتسمية التلقائية.
        </p>
        {onNavigateToDecode && (
          <Button
            size="md"
            onClick={onNavigateToDecode}
            className="rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20"
          >
            الانتقال لفك الشاصي وتحديد السيارة
          </Button>
        )}
      </div>
    );
  }

  const allSelected = rows.length > 0 && rows.every(r => r.selected === true);

  return (
    <div className="font-cairo space-y-4">
      {/* Hidden file input for Excel / CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={e => {
          void handleFileImport(e);
        }}
      />

      {/* ── Active Vehicle Context Banner & Custom Generalization Template ── */}
      <VehicleContextBanner
        vehicle={vehicle}
        makeAr={makeAr}
        modelAr={modelAr}
        years={years}
        customVehicleTemplate={customVehicleTemplate}
        onTemplateChange={setCustomVehicleTemplate}
        onApplyGeneralization={() => {
          applyGeneralizationToAllRows();
        }}
        onResetTemplate={resetTemplateToSmartDefault}
        hasRows={rows.length > 0}
        onClearDraft={handleClearAllRows}
      />

      {/* Success Notification Alert */}
      {lastAddedCount !== null && (
        <div className="animate-in fade-in flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 shadow-sm duration-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              ✓
            </div>
            <p className="text-xs font-bold">
              تم بنجاح إضافة وتحديث{' '}
              <span className="font-bold underline decoration-2">{lastAddedCount}</span> قطعة في
              المخزون وشبكة التوافق لهذه المركبة!
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToInventory && (
              <Button
                size="sm"
                variant="success"
                onClick={onNavigateToInventory}
                className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold shadow-sm hover:bg-emerald-800"
              >
                عرض في المخزون المتطابق →
              </Button>
            )}
            <button
              onClick={() => {
                setLastAddedCount(null);
              }}
              className="px-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
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
        onSearch={() => {
          void handleSearchMegazip();
        }}
        vehicle={vehicle}
        onAddRow={() => {
          addRow();
        }}
        onAddMultipleRows={count => {
          addMultipleRows(count);
        }}
      />

      {/* ── Quick Templates Chips & Action Toolbar ── */}
      <QuickPartsToolbar
        templates={QUICK_PARTS_TEMPLATES}
        selectedCount={selectedRows.length}
        rowsCount={rows.length}
        isImporting={isImporting}
        isExporting={isExporting}
        onAddFromTemplate={tmpl => {
          addRow(tmpl);
        }}
        onOpenQuotation={handleOpenQuotation}
        onImportClick={() => {
          fileInputRef.current?.click();
        }}
        onExport={() => {
          void handleExportExcel();
        }}
        onCopyWhatsApp={() => {
          void handleCopyWhatsAppMemo();
        }}
      />

      {/* ── Professional Excel Grid Table ── */}
      <PartsGridTable
        rows={rows}
        allSelected={allSelected}
        onToggleSelectAll={toggleSelectAll}
        onUpdateRow={updateRow}
        onDuplicateRow={duplicateRow}
        onDeleteRow={deleteRow}
        onInspectPart={q => {
          void handleDeepInspectPart(q, vehicle, selectedCatalogId);
        }}
        selectedRows={selectedRows}
        onAddRow={() => {
          addRow();
        }}
        onSaveToInventory={() => {
          void handleSaveToInventory();
        }}
        canAdd={canAdd}
        isAdding={isAdding}
        vehicle={vehicle}
        customVehicleTemplate={customVehicleTemplate}
      />

      {/* ── Smart Part Intelligence & Cross-Reference Modal ── */}
      <PartIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => {
          setIsIntelligenceOpen(false);
        }}
        intelligence={activeIntelligence}
        isLoading={isIntelligenceLoading}
        onAddAlternativeToGrid={handleAddAlternativeToGrid}
        onAddAllAlternativesToGrid={handleAddAllAlternativesToGrid}
      />

      {/* ── Quotation Creation Modal ── */}
      {isQuotationModalOpen && (
        <CreateQuotationModal
          onClose={() => {
            setIsQuotationModalOpen(false);
          }}
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
