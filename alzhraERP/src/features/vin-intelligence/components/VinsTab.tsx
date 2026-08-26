import React, { useEffect, useState } from 'react';
import {
  Car,
  PackagePlus,
  Search,
  Plus,
  Sparkles,
  ExternalLink,
  Globe,
  Trash2,
} from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import { cn } from '../../../core/utils';
import { useFeedbackStore } from '../../feedback/store';
import { ManualVinModal } from './ManualVinModal';
import { VehicleProfileCard } from './VehicleProfileCard';
import {
  getArabicVehicleName,
  formatVehicleYears,
  formatEngineSpec,
  formatMarketLabel,
} from '../utils/smartPartNamer';
import { driveLabel, transLabel } from '../utils/vehicleLabels';
import {
  AUTO_PARTS_CATALOGS,
  openCatalogSearch,
  openCatalogVinSearch,
} from '../constants/catalogs';
import { partIntelligenceService } from '../services/partIntelligenceService';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { safeParseVehicleInfo } from '../utils/vehicleGuard';
import type { ExtractedPart, VehicleInfo, VehicleProductLink, VinAnalysisRecord, PartIntelligenceResult, PartAlternative, ExcelGridPart } from '../types';

type UiPart = ExtractedPart & { _key: string };

interface VinsTabProps {
  savedVins: VinAnalysisRecord[];
  isLoading: boolean;
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAddParts: (vehicle: VehicleInfo, parts: ExtractedPart[]) => Promise<number>;
                                          /** resolved count = added + already-existing duplicates */
  onOpenInExtract?: ((record: VinAnalysisRecord) => void) | undefined;
  onSaveManualVehicle?: (vehicle: VehicleInfo, vinNumber?: string) => Promise<any>;
  onDeleteSavedVin?: (id: string) => Promise<any>;
  isAdding: boolean;
  canAdd?: boolean;
}

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
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [activeIntelligence, setActiveIntelligence] = useState<PartIntelligenceResult | null>(null);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);
  const [deleteConfirmVin, setDeleteConfirmVin] = useState<VinAnalysisRecord | null>(null);
  const [isDeletingVin, setIsDeletingVin] = useState(false);

  const vehicle: VehicleInfo | null = selected ? safeParseVehicleInfo(selected.decoded) : null;

  // Derived Arabic labels for the active vehicle (memoized for the profile card).
  const activeVehicleNames = vehicle
    ? getArabicVehicleName(vehicle)
    : { makeAr: '', modelAr: '' };
  const activeVehicleYears = formatVehicleYears(vehicle);

  const handleDeleteVin = async () => {
    if (!deleteConfirmVin || !onDeleteSavedVin) return;
    setIsDeletingVin(true);
    try {
      await onDeleteSavedVin(deleteConfirmVin.id);
      if (selected?.id === deleteConfirmVin.id) {
        const remaining = savedVins.filter((v) => v.id !== deleteConfirmVin.id);
        setSelected(remaining[0] || null);
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
    if (selected?.vehicle_id) {
      onLoadParts(selected.vehicle_id)
        .then((rows) => {
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

  const handleSelect = (v: VinAnalysisRecord) => {
    setSelected(v);
    setParts([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setManualNumber('');
    setManualDesc('');
    setCopiedVin(false);
  };

  const handleCopyVin = async (vinStr: string) => {
    try {
      await navigator.clipboard.writeText(vinStr);
      setCopiedVin(true);
      showToast('تم نسخ رقم الشاصي إلى الحافظة 📋', 'success');
      setTimeout(() => setCopiedVin(false), 2000);
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
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

  const handleAddAlternativeToParts = (part: Partial<ExcelGridPart>) => {
    const newPart: UiPart = {
      partNumber: part.partNumber || '',
      description: part.description || part.baseName || 'قطعة غيار',
      manufacturer: part.manufacturer || vehicle?.make || '',
      source: 'catalog',
      _key: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
    setParts((prev) => [...prev, newPart]);
    showToast(`تمت إضافة الرقم البديل ${part.partNumber} بنجاح ✨`, 'success');
  };

  const handleAddAllAlternativesToParts = (alternatives: PartAlternative[]) => {
    if (!alternatives || alternatives.length === 0) return;
    const newItems: UiPart[] = alternatives.map((alt) => ({
      partNumber: alt.partNumber,
      description: `${activeIntelligence?.primaryNameAr || 'قطعة غيار'} (${alt.brand || 'بديل'})`,
      manufacturer: alt.brand || activeIntelligence?.manufacturer || vehicle?.make || '',
      source: 'catalog' as const,
      _key: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    }));
    setParts((prev) => [...prev, ...newItems]);
    showToast(`تمت إضافة ${newItems.length} بديل معتمد بنجاح ✨`, 'success');
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    // Trigger deep intelligence modal
    handleDeepInspectPart(q);

    try {
      const res = await onSearchPart(q);
      if (res.length > 0) {
        setParts((prev) => [
          ...prev,
          ...res.map((p, i) => ({ ...p, _key: `${p.partNumber || 'mz'}-${i}-${Date.now()}` })),
        ]);
        setSearchQuery('');
      } else {
        showToast('لم يتم العثور على قطع مطابقة من الكتالوج', 'info');
      }
    } catch (err) {
      showToast('فشل البحث في الكتالوج، يرجى المحاولة لاحقاً', 'error', err);
    }
  };

  const addManual = () => {
    if (!manualNumber.trim() && !manualDesc.trim()) return;
    const desc = manualDesc.trim();
    const newPart: UiPart = { partNumber: manualNumber.trim(), source: 'manual', _key: `manual-${Date.now()}` };
    if (desc) newPart.description = desc;
    setParts((prev) => [...prev, newPart]);
    setManualNumber('');
    setManualDesc('');
  };

  const handleAdd = async () => {
    if (!vehicle || selectedIds.size === 0) return;
    try {
      await onAddParts(
        vehicle,
        parts.filter((p) => selectedIds.has(p._key)).map(({ _key: _k, ...p }) => p)
      );
      setSelectedIds(new Set());
    } catch {
      // onError in the hook already surfaces a toast; keep this from
      // escaping as an unhandled rejection and stop the reload-on-failure.
      return;
    }
    if (selected?.vehicle_id) {
      try {
        const rows = await onLoadParts(selected.vehicle_id);
        setLinkedParts(rows);
      } catch {
        /* ignore */
      }
    }
  };

  const handleSaveManualModal = async (newVehicle: VehicleInfo, vinVal: string) => {
    if (onSaveManualVehicle) {
      await onSaveManualVehicle(newVehicle, vinVal);
    }
  };

  const handleSaveAndExtractModal = async (newVehicle: VehicleInfo, vinVal: string) => {
    if (onSaveManualVehicle) {
      const res = await onSaveManualVehicle(newVehicle, vinVal);
      if (res && onOpenInExtract) {
        onOpenInExtract({
          id: `temp-${Date.now()}`,
          vin: vinVal,
          vehicle_id: newVehicle.id || null,
          decoded: newVehicle,
          source: 'manual',
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  // Smart Bilingual Filter (Arabic + English + VIN + Year)
  const filteredVins = savedVins.filter((v) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase().trim();
    const info = safeParseVehicleInfo(v.decoded);
    const { makeAr, modelAr } = getArabicVehicleName(info);
    const rawMake = (info?.make || '').toLowerCase();
    const rawModel = (info?.model || '').toLowerCase();
    const vinStr = (v.vin || '').toLowerCase();
    const yearStr = String(info?.year || info?.yearStart || '');

    return (
      vinStr.includes(q) ||
      rawMake.includes(q) ||
      rawModel.includes(q) ||
      makeAr.toLowerCase().includes(q) ||
      modelAr.toLowerCase().includes(q) ||
      yearStr.includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm font-cairo">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
          جارٍ تحميل سجل الشواصي والمركبات المحفوظة...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-cairo">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Car size={22} />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
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
          onClick={() => setIsManualModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
        >
          <Plus size={15} className="ml-1" />
          إدخال شاصي / مركبة يدوياً
        </Button>
      </div>

      {savedVins.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-16 p-6 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900">
            <Car size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
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
            onClick={() => setIsManualModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl px-5 shadow-sm"
          >
            <Plus size={15} className="ml-1" />
            + إضافة أول شاصي يدوياً
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left Sidebar: Saved VINs List (Arabic Rendered) ── */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  قائمة الشواصي ({filteredVins.length})
                </h4>
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
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
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>

              {/* VIN Cards list */}
              <div className="space-y-1.5 max-h-[68vh] overflow-y-auto custom-scrollbar pr-0.5">
                {filteredVins.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-8">لا توجد نتائج مطابقة للبحث</p>
                ) : (
                  filteredVins.map((v) => {
                    const info = safeParseVehicleInfo(v.decoded);
                    const { makeAr, modelAr } = getArabicVehicleName(info);
                    const years = formatVehicleYears(info);
                    const engine = formatEngineSpec(info);
                    const market = formatMarketLabel(info?.market || info?.region);
                    const isActive = selected?.id === v.id;

                    return (
                      <button
                        key={v.id}
                        onClick={() => { handleSelect(v); }}
                        className={cn(
                          'w-full text-right p-3 rounded-2xl border transition-all relative overflow-hidden group',
                          isActive
                            ? 'bg-gradient-to-l from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={cn(
                              'font-mono text-xs font-bold tracking-tight',
                              isActive ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                            )}
                          >
                            {v.vin}
                          </span>
                          <div className="flex items-center gap-1">
                            {market && (
                              <span
                                className={cn(
                                  'text-[9px] font-bold px-1.5 py-0.5 rounded-md border',
                                  isActive
                                    ? 'bg-white/20 text-white border-white/30'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                )}
                              >
                                {market}
                              </span>
                            )}
                            {onDeleteSavedVin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmVin(v);
                                }}
                                className={cn(
                                  'opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity',
                                  isActive
                                    ? 'text-white/80 hover:text-white hover:bg-white/20'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                )}
                                title="حذف الشاصي من السجل"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Arabic Title */}
                        <div className="font-bold text-xs truncate">
                          {makeAr} {modelAr} {years ? `(${years})` : ''}
                        </div>

                        {/* Subtitle specs */}
                        <div
                          className={cn(
                            'text-[10px] font-medium mt-1 flex flex-wrap items-center gap-1.5',
                            isActive ? 'text-blue-100/90' : 'text-slate-500 dark:text-slate-400'
                          )}
                        >
                          {engine && <span>{engine}</span>}
                          {info?.transmission && <span>• {transLabel(info.transmission)}</span>}
                          {info?.driveType && <span>• {driveLabel(info.driveType)}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Right Panel: Full Arabic Vehicle Profile & Parts Actions ── */}
          <div className="lg:col-span-2 space-y-4">
            {selected && vehicle ? (
              <>
                <VehicleProfileCard
                  vehicle={vehicle}
                  names={activeVehicleNames}
                  years={activeVehicleYears}
                  selected={selected}
                  copiedVin={copiedVin}
                  onCopyVin={handleCopyVin}
                  onRequestDelete={(v) => setDeleteConfirmVin(v)}
                  onOpenInExtract={onOpenInExtract}
                  linkedParts={linkedParts}
                />

                {/* ── Search & Extract Additional Parts for this Vehicle ── */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
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

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Catalog search input & action */}
                    <div className="md:col-span-7 flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label="بحث OEM برقم القطعة"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="رقم القطعة OEM..."
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSearch}
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
                        onClick={() => openCatalogSearch(selectedCatalogId, searchQuery || selected?.vin || '')}
                        className="rounded-xl font-bold border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        title="فتح نتيجة البحث في موقع الكتالوج مباشرة"
                      >
                        <ExternalLink size={13} className="ml-1" /> فتح في الكتالوج ↗
                      </Button>
                    </div>

                    {/* Manual part insertion */}
                    <div className="md:col-span-5 flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label="إضافة سريعة: رقم القطعة"
                          value={manualNumber}
                          onChange={(e) => setManualNumber(e.target.value)}
                          placeholder="رقم القطعة..."
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          label="الوصف"
                          value={manualDesc}
                          onChange={(e) => setManualDesc(e.target.value)}
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
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                      الكتالوجات المعتمدة:
                    </span>
                    {AUTO_PARTS_CATALOGS.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCatalogId(cat.id);
                          openCatalogSearch(cat.id, searchQuery || selected?.vin || '');
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shadow-2xs',
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
                    {selected?.vin && (
                      <button
                        type="button"
                        onClick={() => openCatalogVinSearch('partsouq', selected.vin)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                        title="فحص شاصي هذه المركبة في PartSouq"
                      >
                        <span>🇦🇪 فحص الشاصي في PartSouq ({selected.vin})</span>
                        <ExternalLink size={11} className="opacity-70" />
                      </button>
                    )}
                  </div>

                  {parts.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-2.5 text-center w-9">
                                <input
                                  type="checkbox"
                                  checked={parts.length > 0 && selectedIds.size === parts.length}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedIds(new Set(parts.map((p) => p._key)));
                                    else setSelectedIds(new Set());
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                              <th className="p-2.5">رقم القطعة</th>
                              <th className="p-2.5">الوصف</th>
                              <th className="p-2.5">المصنع</th>
                              <th className="p-2.5 text-center">المصدر / الكتالوج</th>
                              <th className="p-2.5 text-center w-16">فحص</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {parts.map((p) => {
                              const isSelected = selectedIds.has(p._key);
                              const matchedCatalog = AUTO_PARTS_CATALOGS.find((c) => c.id === p.source);

                              return (
                                <tr
                                  key={p._key}
                                  className={cn(
                                    isSelected
                                      ? 'bg-blue-50/40 dark:bg-blue-950/20'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  )}
                                >
                                  <td className="p-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const next = new Set(selectedIds);
                                        if (e.target.checked) next.add(p._key);
                                        else next.delete(p._key);
                                        setSelectedIds(next);
                                      }}
                                      className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {p.partNumber || '—'}
                                  </td>
                                  <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                                    {p.description || '—'}
                                  </td>
                                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                    {p.manufacturer || '—'}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span
                                      className={cn(
                                        'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                        matchedCatalog
                                          ? cn(matchedCatalog.colorClass.bg, matchedCatalog.colorClass.text, matchedCatalog.colorClass.border)
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                      )}
                                    >
                                      {matchedCatalog ? matchedCatalog.nameEn : (p.source === 'manual' ? 'يدوي' : p.source)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (p.partNumber) {
                                            handleDeepInspectPart(p.partNumber);
                                          }
                                        }}
                                        className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors rounded-lg hover:bg-amber-50"
                                        title="فحص ذكي للبدائل والسيارات المتوافقة ونسبة الثقة"
                                      >
                                        <Sparkles size={13} />
                                      </button>
                                      {p.partNumber && (
                                        <button
                                          type="button"
                                          onClick={() => openCatalogSearch(selectedCatalogId, p.partNumber)}
                                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100"
                                          title={`فحص في ${selectedCatalogId}`}
                                        >
                                          <ExternalLink size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          المحدد: {selectedIds.size} من أصل {parts.length}
                        </span>
                        {canAdd === false ? (
                          <p className="text-xs text-amber-600 font-bold">تتطلب الإضافة صلاحية مدير</p>
                        ) : (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={handleAdd}
                            isLoading={isAdding}
                            disabled={selectedIds.size === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl"
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                <Car size={32} className="text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">اختر شاصي من القائمة لعرض تفاصيله باللغة العربية</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Smart Part Intelligence & Cross-Reference Modal ── */}
      <PartIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => setIsIntelligenceOpen(false)}
        intelligence={activeIntelligence}
        isLoading={isIntelligenceLoading}
        onAddAlternativeToGrid={handleAddAlternativeToParts}
        onAddAllAlternativesToGrid={handleAddAllAlternativesToParts}
      />

      {/* ── Manual VIN Entry Modal ── */}
      <ManualVinModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveManualModal}
        onSaveAndExtract={handleSaveAndExtractModal}
      />

      {/* ── Confirm Delete VIN Modal ── */}
      <ConfirmModal
        isOpen={!!deleteConfirmVin}
        onClose={() => setDeleteConfirmVin(null)}
        onConfirm={handleDeleteVin}
        isLoading={isDeletingVin}
        title="حذف الشاصي من السجل"
        message={`هل أنت متأكد من حذف الشاصي (${deleteConfirmVin?.vin}) من السجل؟ لن يؤثر هذا على المنتجات المسجلة مسبقاً في المخزون.`}
        variant="danger"
        confirmLabel="نعم، احذف الشاصي"
        cancelLabel="إلغاء"
      />
    </div>
  );
};
