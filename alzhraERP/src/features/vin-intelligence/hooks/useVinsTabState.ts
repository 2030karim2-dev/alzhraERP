/* eslint-disable max-lines-per-function -- hook managing vehicle selection, filtering, and deletion lifecycle */
import { useState, useEffect } from 'react';
import { safeParseVehicleInfo } from '../utils/vehicleGuard';
import { getArabicVehicleName, formatVehicleYears } from '../utils/smartPartNamer';
import { useFeedbackStore } from '../../feedback/store';
import type { VinAnalysisRecord, VehicleProductLink, VehicleInfo } from '../types';

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

function filterSavedVins(savedVins: VinAnalysisRecord[], filterText: string): VinAnalysisRecord[] {
  if (filterText.trim() === '') return savedVins;
  const q = filterText.toLowerCase().trim();
  return savedVins.filter(v => {
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
}

interface UseVinsTabStateProps {
  savedVins: VinAnalysisRecord[];
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  onDeleteSavedVin?: ((id: string) => Promise<void>) | undefined;
}

export interface VinsTabStateReturn {
  selected: VinAnalysisRecord | null;
  setSelected: React.Dispatch<React.SetStateAction<VinAnalysisRecord | null>>;
  vehicle: VehicleInfo | null;
  activeVehicleNames: { makeAr: string; modelAr: string };
  activeVehicleYears: string;
  linkedParts: VehicleProductLink[];
  filterText: string;
  setFilterText: (text: string) => void;
  filteredVins: VinAnalysisRecord[];
  copiedVin: boolean;
  handleCopyVin: (vinStr: string) => Promise<void>;
  deleteConfirmVin: VinAnalysisRecord | null;
  setDeleteConfirmVin: (record: VinAnalysisRecord | null) => void;
  isDeletingVin: boolean;
  handleDeleteVin: () => Promise<void>;
  isManualModalOpen: boolean;
  setIsManualModalOpen: (open: boolean) => void;
}

export function useVinsTabState({
  savedVins,
  onLoadParts,
  onDeleteSavedVin,
}: UseVinsTabStateProps): VinsTabStateReturn {
  const { showToast } = useFeedbackStore();
  const [selected, setSelected] = useState<VinAnalysisRecord | null>(null);
  const [linkedParts, setLinkedParts] = useState<VehicleProductLink[]>([]);
  const [filterText, setFilterText] = useState('');
  const [copiedVin, setCopiedVin] = useState(false);
  const [deleteConfirmVin, setDeleteConfirmVin] = useState<VinAnalysisRecord | null>(null);
  const [isDeletingVin, setIsDeletingVin] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const vehicle = selected ? safeParseVehicleInfo(selected.decoded) : null;
  const activeVehicleNames = vehicle ? getArabicVehicleName(vehicle) : { makeAr: '', modelAr: '' };
  const activeVehicleYears = formatVehicleYears(vehicle);

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
    } finally {
      setIsDeletingVin(false);
    }
  };

  const filteredVins = filterSavedVins(savedVins, filterText);

  return {
    selected,
    setSelected,
    vehicle,
    activeVehicleNames,
    activeVehicleYears,
    linkedParts,
    filterText,
    setFilterText,
    filteredVins,
    copiedVin,
    handleCopyVin,
    deleteConfirmVin,
    setDeleteConfirmVin,
    isDeletingVin,
    handleDeleteVin,
    isManualModalOpen,
    setIsManualModalOpen,
  };
}
