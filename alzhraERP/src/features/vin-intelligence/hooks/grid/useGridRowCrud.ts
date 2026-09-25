import { useCallback } from 'react';
import { generateSmartPartName } from '../../utils/smartPartNamer';
import { createEmptyRow } from '../usePartsExtractDraft';
import type { QuickPartTemplate } from '../../components/QuickPartsToolbar';
import type { ExcelGridPart, VehicleInfo } from '../../types';

const TEMPLATE_DEFAULTS: QuickPartTemplate = { base: '', oem: '', mfr: 'GENUINE', spec: '' };

function templateRowArgs(
  template: QuickPartTemplate | undefined,
  vehicle: VehicleInfo | null
): [string, string, string, string] {
  const t = template ?? TEMPLATE_DEFAULTS;
  return [t.base, t.oem, t.mfr !== '' ? t.mfr : (vehicle?.make ?? 'GENUINE'), t.spec];
}

interface UpdateRowContext {
  vehicle: VehicleInfo | null;
  template: string;
}

function updateSingleRow(
  r: ExcelGridPart,
  id: string,
  updates: Partial<ExcelGridPart>,
  ctx: UpdateRowContext
): ExcelGridPart {
  if (r._id !== id) return r;
  const updated = { ...r, ...updates };
  if (updates.baseName !== undefined && ctx.vehicle) {
    const customTpl = ctx.template.trim() !== '' ? ctx.template.trim() : undefined;
    updated.description = generateSmartPartName(updates.baseName, ctx.vehicle, {
      customVehicleTemplate: customTpl,
    });
  }
  return updated;
}

export interface UseGridRowCrudProps {
  vehicle: VehicleInfo | null;
  rows: ExcelGridPart[];
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
  customVehicleTemplate: string;
}

export interface UseGridRowCrudReturn {
  updateRow: (id: string, updates: Partial<ExcelGridPart>) => void;
  addRow: (template?: QuickPartTemplate) => void;
  addMultipleRows: (count?: number) => void;
  deleteRow: (id: string) => void;
  duplicateRow: (id: string) => void;
  toggleSelectAll: (checked: boolean) => void;
}

export function useGridRowCrud({
  vehicle,
  rows,
  setRows,
  customVehicleTemplate,
}: UseGridRowCrudProps): UseGridRowCrudReturn {
  const updateRow = useCallback(
    (id: string, updates: Partial<ExcelGridPart>): void => {
      setRows(prev =>
        prev.map(r => updateSingleRow(r, id, updates, { vehicle, template: customVehicleTemplate }))
      );
    },
    [vehicle, customVehicleTemplate, setRows]
  );

  const addRow = (template?: QuickPartTemplate): void => {
    const [base, partNo, mfr, spec] = templateRowArgs(template, vehicle);
    const newRow = createEmptyRow({
      veh: vehicle,
      base,
      partNo,
      mfr,
      spec,
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
    setRows(prev => [
      ...prev,
      {
        ...target,
        _id: `row-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
        selected: true,
      },
    ]);
  };

  const toggleSelectAll = (checked: boolean): void => {
    setRows(prev => prev.map(r => ({ ...r, selected: checked })));
  };

  return { updateRow, addRow, addMultipleRows, deleteRow, duplicateRow, toggleSelectAll };
}
