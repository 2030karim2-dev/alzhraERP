/* eslint-disable max-lines-per-function -- compound hook managing catalog search, manual parts, and inventory integration */
import { useState } from 'react';
import { useFeedbackStore } from '../../feedback/store';
import { pickBaseName, pickManufacturer } from '../utils/vinRowHelpers';
import type {
  ExtractedPart,
  VehicleInfo,
  VehicleProductLink,
  PartAlternative,
  ExcelGridPart,
  PartIntelligenceResult,
} from '../types';
import type { UiPart } from '../components/PartsListRow';

interface UseVehiclePartsActionsProps {
  vehicle: VehicleInfo | null;
  vehicleId: string | null | undefined;
  activeIntelligence: PartIntelligenceResult | null;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  onAddParts: (vehicle: VehicleInfo, parts: ExtractedPart[]) => Promise<number>;
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  setLinkedParts: React.Dispatch<React.SetStateAction<VehicleProductLink[]>>;
  handleDeepInspectPart: (
    query: string,
    vehicle: VehicleInfo | null,
    catalogId: string
  ) => Promise<void>;
}

export interface VehiclePartsActionsReturn {
  parts: UiPart[];
  setParts: React.Dispatch<React.SetStateAction<UiPart[]>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedCatalogId: string;
  setSelectedCatalogId: React.Dispatch<React.SetStateAction<string>>;
  manualNumber: string;
  setManualNumber: React.Dispatch<React.SetStateAction<string>>;
  manualDesc: string;
  setManualDesc: React.Dispatch<React.SetStateAction<string>>;
  togglePart: (key: string, checked: boolean) => void;
  toggleSelectAll: (checked: boolean) => void;
  addManual: () => void;
  handleSearch: () => Promise<void>;
  handleAdd: () => Promise<void>;
  handleAddAlternativeToParts: (part: Partial<ExcelGridPart>) => void;
  handleAddAllAlternativesToParts: (alternatives: PartAlternative[]) => void;
  resetPartsForm: () => void;
}

export function useVehiclePartsActions({
  vehicle,
  vehicleId,
  activeIntelligence,
  onSearchPart,
  onAddParts,
  onLoadParts,
  setLinkedParts,
  handleDeepInspectPart,
}: UseVehiclePartsActionsProps): VehiclePartsActionsReturn {
  const { showToast } = useFeedbackStore();
  const [parts, setParts] = useState<UiPart[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('megazip');
  const [manualNumber, setManualNumber] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const resetPartsForm = (): void => {
    setParts([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setManualNumber('');
    setManualDesc('');
  };

  const togglePart = (key: string, checked: boolean): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean): void => {
    if (checked) setSelectedIds(new Set(parts.map(p => p._key)));
    else setSelectedIds(new Set());
  };

  const addManual = (): void => {
    if (manualNumber.trim() === '' && manualDesc.trim() === '') return;
    const desc = manualDesc.trim();
    const newPart: UiPart = {
      partNumber: manualNumber.trim(),
      source: 'manual',
      _key: `manual-${String(Date.now())}`,
    };
    if (desc !== '') newPart.description = desc;
    setParts(prev => [...prev, newPart]);
    setManualNumber('');
    setManualDesc('');
  };

  const handleSearch = async (): Promise<void> => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
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

  const handleAdd = async (): Promise<void> => {
    if (!vehicle || selectedIds.size === 0) return;
    try {
      await onAddParts(
        vehicle,
        parts.filter(p => selectedIds.has(p._key)).map(({ _key: _k, ...p }) => p)
      );
      setSelectedIds(new Set());
    } catch {
      return;
    }
    if (vehicleId != null) {
      try {
        const rows = await onLoadParts(vehicleId);
        setLinkedParts(rows);
      } catch {
        /* ignore */
      }
    }
  };

  const handleAddAlternativeToParts = (part: Partial<ExcelGridPart>): void => {
    const newPart: UiPart = {
      partNumber: part.partNumber ?? '',
      description: pickBaseName(part) !== '' ? pickBaseName(part) : 'قطعة غيار',
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
      description: `${primaryNameAr !== '' ? primaryNameAr : 'قطعة غيار'} (${alt.brand ?? 'بديل'})`,
      manufacturer:
        (alt.brand ?? '') || (activeIntelligence?.manufacturer ?? '') || (vehicle?.make ?? ''),
      source: 'catalog' as const,
      _key: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    }));
    setParts(prev => [...prev, ...newItems]);
    showToast(`تمت إضافة ${String(newItems.length)} بديل معتمد بنجاح ✨`, 'success');
  };

  return {
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
    togglePart,
    toggleSelectAll,
    addManual,
    handleSearch,
    handleAdd,
    handleAddAlternativeToParts,
    handleAddAllAlternativesToParts,
    resetPartsForm,
  };
}
