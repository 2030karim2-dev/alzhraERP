import { useGridRowCrud } from './grid/useGridRowCrud';
import type { UseGridRowCrudReturn } from './grid/useGridRowCrud';
import { useGridTemplates } from './grid/useGridTemplates';
import type { UseGridTemplatesReturn } from './grid/useGridTemplates';
import { useGridAlternatives } from './grid/useGridAlternatives';
import type { UseGridAlternativesReturn } from './grid/useGridAlternatives';
import { useGridCatalogAndInventory } from './grid/useGridCatalogAndInventory';
import type { UseGridCatalogAndInventoryReturn } from './grid/useGridCatalogAndInventory';
import type { ExcelGridPart, ExtractedPart, VehicleInfo, PartIntelligenceResult } from '../types';

interface UsePartsGridActionsProps {
  vehicle: VehicleInfo | null;
  rows: ExcelGridPart[];
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
  customVehicleTemplate: string;
  setCustomVehicleTemplate: React.Dispatch<React.SetStateAction<string>>;
  activeIntelligence: PartIntelligenceResult | null;
  companyId?: string | undefined;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
  handleDeepInspectPart: (
    query: string,
    vehicle: VehicleInfo | null,
    catalogId: string
  ) => Promise<void>;
  clearAllDraft: () => void;
  setLastAddedCount: (count: number | null) => void;
}

export interface PartsGridActionsReturn
  extends
    UseGridRowCrudReturn,
    UseGridTemplatesReturn,
    UseGridAlternativesReturn,
    UseGridCatalogAndInventoryReturn {}

export function usePartsGridActions(props: UsePartsGridActionsProps): PartsGridActionsReturn {
  const rowCrud = useGridRowCrud({
    vehicle: props.vehicle,
    rows: props.rows,
    setRows: props.setRows,
    customVehicleTemplate: props.customVehicleTemplate,
  });

  const templateOps = useGridTemplates({
    vehicle: props.vehicle,
    customVehicleTemplate: props.customVehicleTemplate,
    setCustomVehicleTemplate: props.setCustomVehicleTemplate,
    setRows: props.setRows,
  });

  const altOps = useGridAlternatives({
    vehicle: props.vehicle,
    customVehicleTemplate: props.customVehicleTemplate,
    activeIntelligence: props.activeIntelligence,
    setRows: props.setRows,
  });

  const externalOps = useGridCatalogAndInventory({
    vehicle: props.vehicle,
    customVehicleTemplate: props.customVehicleTemplate,
    onSearchPart: props.onSearchPart,
    onAdd: props.onAdd,
    handleDeepInspectPart: props.handleDeepInspectPart,
    clearAllDraft: props.clearAllDraft,
    setLastAddedCount: props.setLastAddedCount,
    setRows: props.setRows,
  });

  return {
    ...rowCrud,
    ...templateOps,
    ...altOps,
    ...externalOps,
  };
}
