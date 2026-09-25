import { generateSmartPartName } from '../../utils/smartPartNamer';
import {
  pickPrice,
  pickPartName,
  pickManufacturer,
  buildFinalDescription,
} from '../../utils/vinRowHelpers';
import { useFeedbackStore } from '../../../feedback/store';
import type { ExcelGridPart, ExtractedPart, VehicleInfo } from '../../types';

function mapCatalogToGrid(
  parts: ExtractedPart[],
  vehicle: VehicleInfo | null,
  template: string
): ExcelGridPart[] {
  const customTpl = template.trim() !== '' ? template.trim() : undefined;
  return parts.map(p => ({
    _id: `mz-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    partNumber: p.partNumber,
    baseName: pickPartName(p),
    description: generateSmartPartName(pickPartName(p), vehicle, {
      customVehicleTemplate: customTpl,
    }),
    manufacturer: pickManufacturer(p, vehicle),
    source: 'megazip',
    salePrice: pickPrice(p.salePrice),
    purchasePrice: pickPrice(p.purchasePrice),
    selected: true,
  }));
}

function mapRowsToExtractedParts(
  selectedRows: ExcelGridPart[],
  vehicle: VehicleInfo | null
): ExtractedPart[] {
  return selectedRows.map(r => ({
    partNumber: r.partNumber.trim(),
    description: buildFinalDescription(r),
    manufacturer: pickManufacturer(r, vehicle),
    source: r.source,
    salePrice: pickPrice(r.salePrice),
    purchasePrice: pickPrice(r.purchasePrice),
  }));
}

export interface UseGridCatalogAndInventoryProps {
  vehicle: VehicleInfo | null;
  customVehicleTemplate: string;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
  handleDeepInspectPart: (
    query: string,
    vehicle: VehicleInfo | null,
    catalogId: string
  ) => Promise<void>;
  clearAllDraft: () => void;
  setLastAddedCount: (count: number | null) => void;
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
}

export interface UseGridCatalogAndInventoryReturn {
  handleSearchMegazip: (searchQuery: string, selectedCatalogId: string) => Promise<void>;
  handleSaveToInventory: (selectedRows: ExcelGridPart[]) => Promise<void>;
}

export function useGridCatalogAndInventory({
  vehicle,
  customVehicleTemplate,
  onSearchPart,
  onAdd,
  handleDeepInspectPart,
  clearAllDraft,
  setLastAddedCount,
  setRows,
}: UseGridCatalogAndInventoryProps): UseGridCatalogAndInventoryReturn {
  const { showToast } = useFeedbackStore();

  const handleSearchMegazip = async (
    searchQuery: string,
    selectedCatalogId: string
  ): Promise<void> => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
    void handleDeepInspectPart(q, vehicle, selectedCatalogId);
    try {
      const res = await onSearchPart(q);
      if (res.length > 0) {
        const newItems = mapCatalogToGrid(res, vehicle, customVehicleTemplate);
        setRows(prev => [...prev, ...newItems]);
      } else {
        showToast('لم يتم العثور على قطع مطابقة من الكتالوج', 'info');
      }
    } catch (err) {
      showToast('فشل البحث في الكتالوج، يرجى المحاولة لاحقاً', 'error', err);
    }
  };

  const handleSaveToInventory = async (selectedRows: ExcelGridPart[]): Promise<void> => {
    if (selectedRows.length === 0) return;
    const partsToSave = mapRowsToExtractedParts(selectedRows, vehicle);
    try {
      const count = await onAdd(partsToSave);
      setLastAddedCount(count);
      clearAllDraft();
    } catch (err) {
      showToast('فشلت إضافة القطع إلى المخزون، تم حفظ المسودة للمراجعة', 'error', err);
    }
  };

  return { handleSearchMegazip, handleSaveToInventory };
}
