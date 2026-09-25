import { useState, useEffect, useRef } from 'react';
import { generateSmartPartName, buildDefaultVehicleArabicSuffix } from '../utils/smartPartNamer';
import {
  clearDraftRows,
  loadDraftRows,
  loadVehicleTemplate,
  saveDraftRows,
  saveVehicleTemplate,
} from '../utils/draftStorage';
import type { ExcelGridPart, VehicleInfo } from '../types';

export interface CreateEmptyRowOptions {
  veh: VehicleInfo | null;
  base?: string | undefined;
  partNo?: string | undefined;
  mfr?: string | undefined;
  spec?: string | undefined;
  template?: string | undefined;
}

export function createEmptyRow(options: CreateEmptyRowOptions): ExcelGridPart {
  const baseName = options.base ?? '';
  const smartName = generateSmartPartName(baseName !== '' ? baseName : 'قطعة غيار', options.veh, {
    customVehicleTemplate: options.template,
  });
  const mfr = options.mfr ?? '';
  const vehicleMake = options.veh?.make ?? '';

  return {
    _id: `row-${String(Date.now())}-${Math.random().toString(36).substring(2, 8)}`,
    partNumber: options.partNo ?? '',
    baseName,
    description: smartName,
    manufacturer: mfr !== '' ? mfr : vehicleMake,
    sizeSpec: options.spec ?? '',
    source: 'manual',
    salePrice: 0,
    purchasePrice: 0,
    selected: true,
  };
}

export interface PartsExtractDraftState {
  rows: ExcelGridPart[];
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
  customVehicleTemplate: string;
  setCustomVehicleTemplate: React.Dispatch<React.SetStateAction<string>>;
  clearAllDraft: () => void;
}

function useBeforeUnloadWarning(hasRows: boolean): void {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (hasRows) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasRows]);
}

interface InitialSeedProps {
  vehicle: VehicleInfo | null;
  rowsLength: number;
  setRows: React.Dispatch<React.SetStateAction<ExcelGridPart[]>>;
  customVehicleTemplate: string;
  companyId: string | undefined;
}

function useInitialSeedRows({
  vehicle,
  rowsLength,
  setRows,
  customVehicleTemplate,
  companyId,
}: InitialSeedProps): void {
  const initialSeedRan = useRef(false);
  useEffect(() => {
    if (
      initialSeedRan.current ||
      !vehicle ||
      rowsLength > 0 ||
      loadDraftRows(companyId).length > 0
    ) {
      if (vehicle) initialSeedRan.current = true;
      return;
    }
    const make = vehicle.make !== '' ? vehicle.make : 'GENUINE';
    setRows([
      createEmptyRow({
        veh: vehicle,
        base: 'بلاكات',
        mfr: make,
        spec: 'طقم 4 حبات',
        template: customVehicleTemplate,
      }),
      createEmptyRow({
        veh: vehicle,
        base: 'فحمات فرامل أمامية',
        mfr: make,
        spec: 'طقم أمامي',
        template: customVehicleTemplate,
      }),
    ]);
    initialSeedRan.current = true;
  }, [vehicle, rowsLength, customVehicleTemplate, companyId, setRows]);
}

export function usePartsExtractDraft(
  companyId: string | undefined,
  vehicle: VehicleInfo | null
): PartsExtractDraftState {
  const [rows, setRows] = useState<ExcelGridPart[]>(() => loadDraftRows<ExcelGridPart>(companyId));
  const [customVehicleTemplate, setCustomVehicleTemplate] = useState<string>(() =>
    loadVehicleTemplate(companyId, buildDefaultVehicleArabicSuffix(vehicle))
  );

  useEffect(() => {
    if (vehicle && customVehicleTemplate.trim() === '') {
      setCustomVehicleTemplate(buildDefaultVehicleArabicSuffix(vehicle));
    }
  }, [vehicle, customVehicleTemplate]);

  useInitialSeedRows({
    vehicle,
    rowsLength: rows.length,
    setRows,
    customVehicleTemplate,
    companyId,
  });
  useBeforeUnloadWarning(rows.length > 0);

  useEffect(() => {
    saveDraftRows(companyId, rows);
  }, [rows, companyId]);

  useEffect(() => {
    saveVehicleTemplate(companyId, customVehicleTemplate);
  }, [customVehicleTemplate, companyId]);

  const clearAllDraft = (): void => {
    setRows([]);
    clearDraftRows(companyId);
  };

  return {
    rows,
    setRows,
    customVehicleTemplate,
    setCustomVehicleTemplate,
    clearAllDraft,
  };
}
