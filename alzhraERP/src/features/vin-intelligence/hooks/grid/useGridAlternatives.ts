import { generateSmartPartName } from '../../utils/smartPartNamer';
import {
  pickBaseName,
  pickManufacturer,
  pickPrice,
  pickAltManufacturer,
} from '../../utils/vinRowHelpers';
import { useFeedbackStore } from '../../../feedback/store';
import type {
  ExcelGridPart,
  VehicleInfo,
  PartAlternative,
  PartIntelligenceResult,
} from '../../types';

function buildSingleAlternative(
  part: Partial<ExcelGridPart>,
  vehicle: VehicleInfo | null,
  template: string
): ExcelGridPart {
  const customTpl = template.trim() !== '' ? template.trim() : undefined;
  const baseName = pickBaseName(part);
  const smartName = generateSmartPartName(baseName !== '' ? baseName : 'قطعة غيار', vehicle, {
    customVehicleTemplate: customTpl,
  });

  return {
    _id: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    partNumber: part.partNumber ?? '',
    baseName,
    description: smartName,
    manufacturer: pickManufacturer(part, vehicle),
    sizeSpec: part.sizeSpec ?? '',
    source: part.source ?? 'catalog',
    salePrice: pickPrice(part.salePrice),
    purchasePrice: pickPrice(part.purchasePrice),
    selected: true,
  };
}

function buildAlternativeList(
  alternatives: PartAlternative[],
  intelligence: PartIntelligenceResult | null,
  vehicle: VehicleInfo | null,
  template: string
): ExcelGridPart[] {
  const primaryNameAr = intelligence?.primaryNameAr ?? '';
  const smartBase = primaryNameAr !== '' ? primaryNameAr : 'قطعة غيار';
  const customTpl = template.trim() !== '' ? template.trim() : undefined;

  return alternatives.map(alt => ({
    _id: `alt-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    partNumber: alt.partNumber,
    baseName: primaryNameAr,
    description: `${generateSmartPartName(smartBase, vehicle, {
      customVehicleTemplate: customTpl,
    })} (${alt.brand ?? 'بديل'})`,
    manufacturer: pickAltManufacturer(alt, intelligence, vehicle),
    sizeSpec: '',
    source: 'catalog' as const,
    salePrice: 0,
    purchasePrice: 0,
    selected: true,
  }));
}

export interface UseGridAlternativesProps {
  vehicle: VehicleInfo | null;
  customVehicleTemplate: string;
  activeIntelligence: PartIntelligenceResult | null;
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
}

export interface UseGridAlternativesReturn {
  handleAddAlternativeToGrid: (part: Partial<ExcelGridPart>) => void;
  handleAddAllAlternativesToGrid: (alternatives: PartAlternative[]) => void;
}

export function useGridAlternatives({
  vehicle,
  customVehicleTemplate,
  activeIntelligence,
  setRows,
}: UseGridAlternativesProps): UseGridAlternativesReturn {
  const { showToast } = useFeedbackStore();

  const handleAddAlternativeToGrid = (part: Partial<ExcelGridPart>): void => {
    const newAlt = buildSingleAlternative(part, vehicle, customVehicleTemplate);
    setRows(prev => [...prev, newAlt]);
  };

  const handleAddAllAlternativesToGrid = (alternatives: PartAlternative[]): void => {
    if (alternatives.length === 0) return;
    const newRows = buildAlternativeList(
      alternatives,
      activeIntelligence,
      vehicle,
      customVehicleTemplate
    );
    setRows(prev => [...prev, ...newRows]);
    showToast(`تمت إضافة ${String(newRows.length)} بديل معتمد للجدول بنجاح ✨`, 'success');
  };

  return { handleAddAlternativeToGrid, handleAddAllAlternativesToGrid };
}
