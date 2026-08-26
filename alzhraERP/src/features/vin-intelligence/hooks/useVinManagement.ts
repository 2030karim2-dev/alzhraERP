import { useState, useEffect, useCallback } from 'react';
import type {
  ExtractedPart,
  VehicleInfo,
  VehicleProductLink,
  VinAnalysisRecord,
  PartIntelligenceResult,
  PartAlternative,
} from '../types';
import { partIntelligenceService } from '../services/partIntelligenceService';
import { useFeedbackStore } from '../../feedback/store';
import { safeParseVehicleInfo } from '../utils/vehicleGuard';

export type UiPart = ExtractedPart & { _key: string };

interface UseVinManagementProps {
  savedVins: VinAnalysisRecord[];
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  onAddParts: (vehicle: VehicleInfo, parts: ExtractedPart[]) => Promise<number>;
                                          /** resolved count = added + already-existing duplicates */
}

export function useVinManagement({
  savedVins,
  onLoadParts,
  onSearchPart,
  onAddParts,
}: UseVinManagementProps) {
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

  const vehicle: VehicleInfo | null = selected ? safeParseVehicleInfo(selected.decoded) : null;

  // Automatically select the first vehicle if none selected
  useEffect(() => {
    if (!selected && savedVins.length > 0) {
      setSelected(savedVins[0]);
    }
  }, [savedVins, selected]);

  // Load linked parts when selected vehicle changes
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

  const handleSelect = useCallback((v: VinAnalysisRecord) => {
    setSelected(v);
    setParts([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setManualNumber('');
    setManualDesc('');
    setCopiedVin(false);
  }, []);

  const handleCopyVin = useCallback(async (vinStr: string) => {
    try {
      await navigator.clipboard.writeText(vinStr);
      setCopiedVin(true);
      showToast('تم نسخ رقم الشاصي إلى الحافظة 📋', 'success');
      setTimeout(() => setCopiedVin(false), 2000);
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  }, [showToast]);

  const handleDeepInspectPart = useCallback(async (partNum: string) => {
    const q = partNum.trim().toUpperCase();
    if (!q || q.length < 3) return;
    setIsIntelligenceOpen(true);
    setIsIntelligenceLoading(true);
    try {
      const intel = await partIntelligenceService.inspectPart(q, vehicle, selectedCatalogId);
      setActiveIntelligence(intel);
    } catch (err) {
      showToast('تعذر فحص تفاصيل القطعة، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsIntelligenceLoading(false);
    }
  }, [vehicle, selectedCatalogId, showToast]);

  const handleAddAlternativeToParts = useCallback((part: { partNumber?: string; description?: string; baseName?: string; manufacturer?: string }) => {
    const newPart: UiPart = {
      partNumber: part.partNumber || '',
      description: part.description || part.baseName || 'قطعة غيار',
      manufacturer: part.manufacturer || vehicle?.make || '',
      source: 'catalog',
      _key: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
    setParts((prev) => [...prev, newPart]);
    showToast(`تمت إضافة الرقم البديل ${part.partNumber} بنجاح ✨`, 'success');
  }, [vehicle, showToast]);

  const handleAddAllAlternativesToParts = useCallback((alternatives: PartAlternative[]) => {
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
  }, [activeIntelligence, vehicle, showToast]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    // Trigger deep intelligence modal
    handleDeepInspectPart(q);

    const res = await onSearchPart(q);
    if (res.length > 0) {
      setParts((prev) => [
        ...prev,
        ...res.map((p, i) => ({ ...p, _key: `${p.partNumber || 'mz'}-${i}-${Date.now()}` })),
      ]);
      setSearchQuery('');
    }
  }, [searchQuery, handleDeepInspectPart, onSearchPart]);

  const addManual = useCallback(() => {
    if (!manualNumber.trim() && !manualDesc.trim()) return;
    const desc = manualDesc.trim();
    const newPart: UiPart = { partNumber: manualNumber.trim(), source: 'manual', _key: `manual-${Date.now()}` };
    if (desc) newPart.description = desc;
    setParts((prev) => [...prev, newPart]);
    setManualNumber('');
    setManualDesc('');
  }, [manualNumber, manualDesc]);

  const handleAdd = useCallback(async () => {
    if (!vehicle || selectedIds.size === 0) return 0;
    const result = await onAddParts(
      vehicle,
      parts.filter((p) => selectedIds.has(p._key)).map(({ _key: _k, ...p }) => p)
    );
    const total = typeof result === 'number' ? result : (result as { added?: number; existing?: number }).added ?? 0;
    setSelectedIds(new Set());
    if (selected?.vehicle_id) {
      try {
        const rows = await onLoadParts(selected.vehicle_id);
        setLinkedParts(rows);
      } catch {
        // ignore
      }
    }
    return total;
  }, [vehicle, selectedIds, parts, onAddParts, selected, onLoadParts]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === parts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parts.map((p) => p._key)));
    }
  }, [selectedIds, parts]);

  const toggleSelectOne = useCallback((key: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return {
    selected,
    setSelected,
    vehicle,
    linkedParts,
    parts,
    setParts,
    selectedIds,
    setSelectedIds,
    searchQuery,
    setSearchQuery,
    selectedCatalogId,
    setSelectedCatalogId,
    manualNumber,
    setManualNumber,
    manualDesc,
    setManualDesc,
    filterText,
    setFilterText,
    isManualModalOpen,
    setIsManualModalOpen,
    copiedVin,
    isIntelligenceOpen,
    setIsIntelligenceOpen,
    activeIntelligence,
    setActiveIntelligence,
    isIntelligenceLoading,
    handleSelect,
    handleCopyVin,
    handleDeepInspectPart,
    handleAddAlternativeToParts,
    handleAddAllAlternativesToParts,
    handleSearch,
    addManual,
    handleAdd,
    toggleSelectAll,
    toggleSelectOne,
  };
}
