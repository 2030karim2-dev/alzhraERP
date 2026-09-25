import { generateSmartPartName, buildDefaultVehicleArabicSuffix } from '../../utils/smartPartNamer';
import { parseBulkPartsText } from '../../utils/partsExcelHelper';
import { useFeedbackStore } from '../../../feedback/store';
import type { ExcelGridPart, VehicleInfo } from '../../types';

export interface UseGridTemplatesProps {
  vehicle: VehicleInfo | null;
  customVehicleTemplate: string;
  setCustomVehicleTemplate: React.Dispatch<React.SetStateAction<string>>;
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
}

export interface UseGridTemplatesReturn {
  applyGeneralizationToAllRows: (templateText?: string) => void;
  resetTemplateToSmartDefault: () => void;
  handleApplyBulkParts: (rawText: string, onDone: () => void) => void;
}

export function useGridTemplates({
  vehicle,
  customVehicleTemplate,
  setCustomVehicleTemplate,
  setRows,
}: UseGridTemplatesProps): UseGridTemplatesReturn {
  const { showToast } = useFeedbackStore();

  const applyGeneralizationToAllRows = (templateText?: string): void => {
    const activeTemplate = (templateText ?? customVehicleTemplate).trim();
    if (!vehicle && activeTemplate === '') return;

    setRows(prev =>
      prev.map(r => ({
        ...r,
        description: generateSmartPartName(
          r.baseName !== ''
            ? r.baseName
            : (r.description ?? '') !== ''
              ? (r.description ?? '')
              : 'قطعة غيار',
          vehicle,
          { customVehicleTemplate: activeTemplate !== '' ? activeTemplate : undefined }
        ),
      }))
    );
    showToast('تم تطبيق التعميم على كافة أسطر الجدول بنجاح ✨', 'success');
  };

  const resetTemplateToSmartDefault = (): void => {
    const defaultSuffix = buildDefaultVehicleArabicSuffix(vehicle);
    setCustomVehicleTemplate(defaultSuffix);
    applyGeneralizationToAllRows(defaultSuffix);
  };

  const handleApplyBulkParts = (rawText: string, onDone: () => void): void => {
    if (rawText.trim() === '') return;
    const customTpl =
      customVehicleTemplate.trim() !== '' ? customVehicleTemplate.trim() : undefined;
    const parsed = parseBulkPartsText(rawText, vehicle, customTpl);
    if (parsed.length > 0) {
      setRows(prev => [...prev, ...parsed]);
      onDone();
      showToast(
        `تم استخراج وإضافة ${String(parsed.length)} قطعة بنجاح مع التسمية الذكية ✨`,
        'success'
      );
    } else {
      showToast('لم يتم العثور على أرقام أو أسماء قطع صالحة في النص المنسوخ', 'warning');
    }
  };

  return { applyGeneralizationToAllRows, resetTemplateToSmartDefault, handleApplyBulkParts };
}
