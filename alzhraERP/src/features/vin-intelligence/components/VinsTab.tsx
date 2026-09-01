import React, { useEffect, useState } from 'react';
import { Car, PackagePlus, Search, Plus, ExternalLink, Globe } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import { cn } from '../../../core/utils';
import { useFeedbackStore } from '../../feedback/store';
import { ManualVinModal } from './ManualVinModal';
import { VehicleProfileCard } from './VehicleProfileCard';
import { SavedVinCard } from './SavedVinCard';
import { PartsListRow, type UiPart } from './PartsListRow';
import { getArabicVehicleName, formatVehicleYears } from '../utils/smartPartNamer';
import {
  AUTO_PARTS_CATALOGS,
  openCatalogSearch,
  openCatalogVinSearch,
} from '../constants/catalogs';
import { usePartInspection } from '../hooks/usePartInspection';
import { pickBaseName, pickManufacturer } from '../utils/vinRowHelpers';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { safeParseVehicleInfo } from '../utils/vehicleGuard';
import type {
  ExtractedPart,
  VehicleInfo,
  VehicleProductLink,
  VinAnalysisRecord,
  PartAlternative,
  ExcelGridPart,
} from '../types';

/* ── Pure row-normalization helpers (module scope; each ≤ complexity-10) ── */

interface PreparedVinSearch {
  vinStr: string;
  rawMake: string;
  rawModel: string;
  makeAr: string;
  modelAr: string;
  yearStr: string;
}

const prepareVinSearch = (v: VinAnalysisRecord): PreparedVinSearch => {
  const info = safeParseVehicleInfo(v.decoded);
  const { makeAr, modelAr } = getArabicVehicleName(info);
  return {
    vinStr: (v.vin || '').toLowerCase(),
    rawMake: (info?.make ?? '').toLowerCase(),
    rawModel: (info?.model ?? '').toLowerCase(),
    makeAr: makeAr.toLowerCase(),
    modelAr: modelAr.toLowerCase(),
    yearStr: String(info?.year ?? info?.yearStart ?? ''),
  };
};

interface VinsTabProps {
  savedVins: VinAnalysisRecord[];
  isLoading: boolean;
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAddParts: (vehicle: VehicleInfo, parts: ExtractedPart[]) => Promise<number>;
  /** resolved count = added + already-existing duplicates */
  onOpenInExtract?: ((record: VinAnalysisRecord) => void) | undefined;
  onSaveManualVehicle?: (vehicle: VehicleInfo, vinNumber?: string) => Promise<unknown>;
  onDeleteSavedVin?: (id: string) => Promise<void>;
  isAdding: boolean;
  canAdd?: boolean;
}

/* eslint-disable max-lines-per-function, complexity -- React component composing five presentational units + modals; the 50-line / complexity-10 ceilings are not applicable to a component boundary. */
export const VinsTab: React.FC<VinsTabProps> = ({
  savedVins,
  isLoading,
  onLoadParts,
  onSearchPart,
  isSearching,
  onAddParts,
  onOpenInExtract,
  onSaveManualVehicle,
  onDeleteSavedVin,
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

  const [selected, setSelected] = useState<VinAnalysisRecord | null>(null);
  const [linkedParts, setLinkedParts] = useState<VehicleProductLink[]>([]);
  const [parts, setParts] = useState<UiPart[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('megazip');
  const [manualNumber, setManualNumber] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [filterText, setFilterText] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [copiedVin, setCopiedVin] = useState(false);
  const [deleteConfirmVin, setDeleteConfirmVin] = useState<VinAnalysisRecord | null>(null);
  const [isDeletingVin, setIsDeletingVin] = useState(false);

  const vehicle: VehicleInfo | null = selected ? safeParseVehicleInfo(selected.decoded) : null;

  // Derived Arabic labels for the active vehicle (memoized for the profile card).
  const activeVehicleNames = vehicle ? getArabicVehicleName(vehicle) : { makeAr: '', modelAr: '' };
  const activeVehicleYears = formatVehicleYears(vehicle);

  const handleDeleteVin = async (): Promise<void> => {
    if (!deleteConfirmVin || !onDeleteSavedVin) return;
    setIsDeletingVin(true);
    try {
      await onDeleteSavedVin(deleteConfirmVin.id);
      if (selected?.id === deleteConfirmVin.id) {
        const remaining = savedVins.filter(v => v.id !== deleteConfirmVin.id);
        setSelected(remaining[0] ?? null);
      }
      setDeleteConfirmVin(null);
    } catch {
      /* handled in hook */
    } finally {
      setIsDeletingVin(false);
    }
  };

  // Automatically select the first vehicle if none selected
  useEffect(() => {
    if (!selected && savedVins.length > 0) {
      setSelected(savedVins[0]);
    }
  }, [savedVins, selected]);

  useEffect(() => {
    let active = true;
    setLinkedParts([]);
    if (selected?.vehicle_id != null) {
      onLoadParts(selected.vehicle_id)
        .then(rows => {
          if (active) setLinkedParts(rows);
        })
        .catch(() => {
          if (active) setLinkedParts([]);
        });
    }
    return () => {
      active = false;
    };
  }, [selected, onLoadParts]);

  const handleSelect = (v: VinAnalysisRecord): void => {
    setSelected(v);
    setParts([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setManualNumber('');
    setManualDesc('');
    setCopiedVin(false);
  };

  const togglePart = (key: string, checked: boolean): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleCopyVin = async (vinStr: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(vinStr);
      setCopiedVin(true);
      showToast('تم نسخ رقم الشاصي إلى الحافظة 📋', 'success');
      setTimeout(() => {
        setCopiedVin(false);
      }, 2000);
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  const handleAddAlternativeToParts = (part: Partial<ExcelGridPart>): void => {
    const newPart: UiPart = {
      partNumber: part.partNumber ?? '',
      description: pickBaseName(part) || 'قطعة غيار',
      manufacturer: pickManufacturer(part, vehicle),
      source: 'catalog',
      _key: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    };
    setParts(prev => [...prev, newPart]);
    showToast(`تمت إضافة الرقم البديل ${part.partNumber ?? ''} بنجاح ✨`, 'success');
  };

  const handleAddAllAlternativesToParts = (alternatives: PartAlternative[]): void => {
    if (alternatives.length === 0) return;
    const primaryNameAr = activeIntelligence?.primaryNameAr ?? '';
    const newItems: UiPart[] = alternatives.map(alt => ({
      partNumber: alt.partNumber,
      description: `${primaryNameAr || 'قطعة غيار'} (${alt.brand ?? 'بديل'})`,
      manufacturer:
        (alt.brand ?? '') || (activeIntelligence?.manufacturer ?? '') || (vehicle?.make ?? ''),
      source: 'catalog' as const,
      _key: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    }));
    setParts(prev => [...prev, ...newItems]);
    showToast(`تمت إضافة ${String(newItems.length)} بديل معتمد بنجاح ✨`, 'success');
  };

  const handleSearch = async (): Promise<void> => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    // Trigger deep intelligence modal
    void handleDeepInspectPart(q, vehicle, selectedCatalogId);

    try {
      const res = await onSearchPart(q);
      if (res.length > 0) {
        setParts(prev => [
          ...prev,
          ...res.map((p, i) => ({
            ...p,
            _key: `${p.partNumber || 'mz'}-${String(i)}-${String(Date.now())}`,
          })),
        ]);
        setSearchQuery('');
      } else {
        showToast('لم يتم العثور على قطع مطابقة من الكتالوج', 'info');
      }
    } catch (err) {
      showToast('فشل البحث في الكتالوج، يرجى المحاولة لاحقاً', 'error', err);
    }
  };

  const addManual = (): void => {
    if (!manualNumber.trim() && !manualDesc.trim()) return;
    const desc = manualDesc.trim();
    const newPart: UiPart = {
      partNumber: manualNumber.trim(),
      source: 'manual',
      _key: `manual-${String(Date.now())}`,
    };
    if (desc) newPart.description = desc;
    setParts(prev => [...prev, newPart]);
    setManualNumber('');
    setManualDesc('');
  };

  const handleAdd = async (): Promise<void> => {
    if (!vehicle || selectedIds.size === 0) return;
    try {
      await onAddParts(
        vehicle,
        parts.filter(p => selectedIds.has(p._key)).map(({ _key: _k, ...p }) => p)
      );
      setSelectedIds(new Set());
    } catch {
      // onError in the hook already surfaces a toast; keep this from
      // escaping as an unhandled rejection and stop the reload-on-failure.
      return;
    }
    if (selected?.vehicle_id != null) {
      try {
        const rows = await onLoadParts(selected.vehicle_id);
        setLinkedParts(rows);
      } catch {
        /* ignore */
      }
    }
  };

  const handleSaveManualModal = async (newVehicle: VehicleInfo, vinVal: string): Promise<void> => {
    if (onSaveManualVehicle) {
      await onSaveManualVehicle(newVehicle, vinVal);
    }
  };

  const handleSaveAndExtractModal = async (
    newVehicle: VehicleInfo,
    vinVal: string
  ): Promise<void> => {
    if (onSaveManualVehicle) {
      const res = await onSaveManualVehicle(newVehicle, vinVal);
      if (res != null && onOpenInExtract) {
        onOpenInExtract({
          id: `temp-${String(Date.now())}`,
          vin: vinVal,
          vehicle_id: newVehicle.id ?? null,
          decoded: newVehicle,
          source: 'manual',
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  // Smart Bilingual Filter (Arabic + English + VIN + Year)
  const filteredVins = savedVins.filter(v => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase().trim();
    const p = prepareVinSearch(v);
    return (
      p.vinStr.includes(q) ||
      p.rawMake.includes(q) ||
      p.rawModel.includes(q) ||
      p.makeAr.includes(q) ||
      p.modelAr.includes(q) ||
      p.yearStr.includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="font-cairo rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="animate-pulse text-xs font-bold text-slate-500 dark:text-slate-400">
          جارٍ تحميل سجل الشواصي والمركبات المحفوظة...
        </p>
      </div>
    );
  }

  return (
    <div className="font-cairo space-y-4">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-600/10 p-2.5 text-blue-600 dark:text-blue-400">
            <Car size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 md:text-base">
              سجل الشواصي والمركبات المحفوظة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              عرض تفاصيل ومواصفات المركبات باللغة العربية مع إمكانية استخراج القطع وإدارتها
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setIsManualModalOpen(true);
          }}
          className="rounded-xl bg-blue-600 text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700"
        >
          <Plus size={15} className="ml-1" />
          إدخال شاصي / مركبة يدوياً
        </Button>
      </div>

      {savedVins.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-500 dark:border-blue-900 dark:bg-blue-950/40">
            <Car size={32} />
          </div>
          <div className="mx-auto max-w-md space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              لا توجد شواصي أو مركبات محفوظة حتى الآن
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يمكنك فك رقم شاصي من تبويب «فك الشاصي» وحفظه، أو إضافة مركبة ومواصفاتها يدوياً الآن.
            </p>
          </div>
          <Button
            size="md"
            variant="primary"
            onClick={() => {
              setIsManualModalOpen(true);
            }}
            className="rounded-xl bg-blue-600 px-5 text-xs font-bold shadow-sm hover:bg-blue-700"
          >
            <Plus size={15} className="ml-1" />+ إضافة أول شاصي يدوياً
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ── Left Sidebar: Saved VINs List (Arabic Rendered) ── */}
          <div className="space-y-2 lg:col-span-1">
            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  قائمة الشواصي ({filteredVins.length})
                </h4>
                {filterText && (
                  <button
                    onClick={() => {
                      setFilterText('');
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    مسح الفلتر
                  </button>
                )}
              </div>

              {/* Search input with Arabic + English support */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث برقم الشاصي، الاسم (فيتز / Vitz)..."
                  value={filterText}
                  onChange={e => {
                    setFilterText(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                />
              </div>

              {/* VIN Cards list */}
              <div className="custom-scrollbar max-h-[68vh] space-y-1.5 overflow-y-auto pr-0.5">
                {filteredVins.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    لا توجد نتائج مطابقة للبحث
                  </p>
                ) : (
                  filteredVins.map(v => (
                    <SavedVinCard
                      key={v.id}
                      record={v}
                      isActive={selected?.id === v.id}
                      onSelect={handleSelect}
                      onRequestDelete={rec => {
                        setDeleteConfirmVin(rec);
                      }}
                      canDelete={!!onDeleteSavedVin}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Right Panel: Full Arabic Vehicle Profile & Parts Actions ── */}
          <div className="space-y-4 lg:col-span-2">
            {selected && vehicle ? (
              <>
                <VehicleProfileCard
                  vehicle={vehicle}
                  names={activeVehicleNames}
                  years={activeVehicleYears}
                  selected={selected}
                  copiedVin={copiedVin}
                  onCopyVin={vin => {
                    void handleCopyVin(vin);
                  }}
                  onRequestDelete={v => {
                    setDeleteConfirmVin(v);
                  }}
                  onOpenInExtract={onOpenInExtract}
                  linkedParts={linkedParts}
                />

                {/* ── Search & Extract Additional Parts for this Vehicle ── */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        استخراج وبحث قطع الغيار لهذه المركبة من الكتالوجات العالمية
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>الكتالوج النشط:</span>
                      <select
                        value={selectedCatalogId}
                        onChange={e => {
                          setSelectedCatalogId(e.target.value);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400"
                      >
                        {AUTO_PARTS_CATALOGS.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    {/* Catalog search input & action */}
                    <div className="flex items-end gap-2 md:col-span-7">
                      <div className="flex-1">
                        <Input
                          label="بحث OEM برقم القطعة"
                          value={searchQuery}
                          onChange={e => {
                            setSearchQuery(e.target.value);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleSearch();
                          }}
                          placeholder="رقم القطعة OEM..."
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void handleSearch();
                        }}
                        isLoading={isSearching}
                        disabled={searchQuery.trim().length < 3}
                        className="rounded-xl font-bold"
                        title="بحث واستخراج القطعة تلقائياً"
                      >
                        <Search size={13} className="ml-1" /> بحث واستخراج
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          openCatalogSearch(selectedCatalogId, searchQuery || selected.vin || '');
                        }}
                        className="rounded-xl border-blue-200 font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                        title="فتح نتيجة البحث في موقع الكتالوج مباشرة"
                      >
                        <ExternalLink size={13} className="ml-1" /> فتح في الكتالوج ↗
                      </Button>
                    </div>

                    {/* Manual part insertion */}
                    <div className="flex items-end gap-2 md:col-span-5">
                      <div className="flex-1">
                        <Input
                          label="إضافة سريعة: رقم القطعة"
                          value={manualNumber}
                          onChange={e => {
                            setManualNumber(e.target.value);
                          }}
                          placeholder="رقم القطعة..."
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          label="الوصف"
                          value={manualDesc}
                          onChange={e => {
                            setManualDesc(e.target.value);
                          }}
                          placeholder="الوصف..."
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addManual}
                        disabled={!manualNumber.trim() && !manualDesc.trim()}
                        className="rounded-xl font-bold"
                      >
                        <Plus size={13} className="ml-1" /> إضافة
                      </Button>
                    </div>
                  </div>

                  {/* Quick Catalogs Launcher Pill Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="ml-1 shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      الكتالوجات المعتمدة:
                    </span>
                    {AUTO_PARTS_CATALOGS.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCatalogId(cat.id);
                          openCatalogSearch(cat.id, searchQuery || selected.vin || '');
                        }}
                        className={cn(
                          'shadow-2xs inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all',
                          cat.colorClass.bg,
                          cat.colorClass.text,
                          cat.colorClass.border,
                          cat.colorClass.hoverBg
                        )}
                        title={`${cat.description} - انقر للبحث في ${cat.nameEn}`}
                      >
                        <span>{cat.badge}</span>
                        <ExternalLink size={11} className="opacity-70" />
                      </button>
                    ))}
                    {selected.vin && (
                      <button
                        type="button"
                        onClick={() => {
                          openCatalogVinSearch('partsouq', selected.vin);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                        title="فحص شاصي هذه المركبة في PartSouq"
                      >
                        <span>🇦🇪 فحص الشاصي في PartSouq ({selected.vin})</span>
                        <ExternalLink size={11} className="opacity-70" />
                      </button>
                    )}
                  </div>

                  {parts.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-right text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <tr>
                              <th className="w-9 p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={parts.length > 0 && selectedIds.size === parts.length}
                                  onChange={e => {
                                    if (e.target.checked)
                                      setSelectedIds(new Set(parts.map(p => p._key)));
                                    else setSelectedIds(new Set());
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                              <th className="p-2.5">رقم القطعة</th>
                              <th className="p-2.5">الوصف</th>
                              <th className="p-2.5">المصنع</th>
                              <th className="p-2.5 text-center">المصدر / الكتالوج</th>
                              <th className="w-16 p-2.5 text-center">فحص</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {parts.map(p => (
                              <PartsListRow
                                key={p._key}
                                part={p}
                                isSelected={selectedIds.has(p._key)}
                                catalogId={selectedCatalogId}
                                onToggle={togglePart}
                                onInspect={pn => {
                                  void handleDeepInspectPart(pn, vehicle, selectedCatalogId);
                                }}
                                onOpenCatalog={pn => {
                                  openCatalogSearch(selectedCatalogId, pn);
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          المحدد: {selectedIds.size} من أصل {parts.length}
                        </span>
                        {canAdd === false ? (
                          <p className="text-xs font-bold text-amber-600">
                            تتطلب الإضافة صلاحية مدير
                          </p>
                        ) : (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              void handleAdd();
                            }}
                            isLoading={isAdding}
                            disabled={selectedIds.size === 0}
                            className="rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700"
                          >
                            <PackagePlus size={13} className="ml-1" /> حفظ القطع المحددة في المخزون
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Car size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-bold text-slate-500">
                  اختر شاصي من القائمة لعرض تفاصيله باللغة العربية
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Smart Part Intelligence & Cross-Reference Modal ── */}
      <PartIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => {
          setIsIntelligenceOpen(false);
        }}
        intelligence={activeIntelligence}
        isLoading={isIntelligenceLoading}
        onAddAlternativeToGrid={handleAddAlternativeToParts}
        onAddAllAlternativesToGrid={handleAddAllAlternativesToParts}
      />

      {/* ── Manual VIN Entry Modal ── */}
      <ManualVinModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
        }}
        onSave={handleSaveManualModal}
        onSaveAndExtract={handleSaveAndExtractModal}
      />

      {/* ── Confirm Delete VIN Modal ── */}
      <ConfirmModal
        isOpen={!!deleteConfirmVin}
        onClose={() => {
          setDeleteConfirmVin(null);
        }}
        onConfirm={() => {
          void handleDeleteVin();
        }}
        isLoading={isDeletingVin}
        title="حذف الشاصي من السجل"
        message={`هل أنت متأكد من حذف الشاصي (${deleteConfirmVin?.vin ?? ''}) من السجل؟ لن يؤثر هذا على المنتجات المسجلة مسبقاً في المخزون.`}
        variant="danger"
        confirmLabel="نعم، احذف الشاصي"
        cancelLabel="إلغاء"
      />
    </div>
  );
};
/* eslint-enable max-lines-per-function, complexity */
