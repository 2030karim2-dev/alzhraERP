import React from 'react';
import { Car } from 'lucide-react';
import type { VehicleInfo } from '../../types';
import {
  driveLabel,
  fuelLabel,
  transLabel,
  bodyTypeLabel,
  regionLabel,
} from '../../utils/vehicleLabels';
import { canonicalizeMake, canonicalizeModel } from '../../utils/vehicleCanonicalizer';
import { SOURCE_LABELS, CONFIDENCE_LABELS } from '../../constants/vinPresetsData';

export interface ManualVehicleInput {
  make: string;
  model: string;
  yearStart: string;
  yearEnd: string;
  market: string;
  engine: string;
  transmission: string;
  drive: string;
}

const trimOrNull = (s: string): string | null => {
  const t = s.trim();
  return t === '' ? null : t;
};

export function buildManualVehicleInput(input: ManualVehicleInput): VehicleInfo {
  const yStart = parseInt(input.yearStart, 10);
  const yEnd = parseInt(input.yearEnd, 10);
  return {
    make: canonicalizeMake(input.make) || input.make.trim(),
    model: canonicalizeModel(input.model.trim()) || null,
    year: yStart || null,
    yearStart: yStart || null,
    yearEnd: yEnd || yStart || null,
    market: trimOrNull(input.market),
    displacement: trimOrNull(input.engine),
    engine: trimOrNull(input.engine),
    transmission: trimOrNull(input.transmission),
    driveType: trimOrNull(input.drive),
  };
}

export const rangeLabel = (v: VehicleInfo): string | null => {
  if (v.yearStart != null && v.yearEnd != null && v.yearStart !== v.yearEnd) {
    return `${String(v.yearStart)}-${String(v.yearEnd)}`;
  }
  if (v.year != null) {
    return String(v.year);
  }
  return null;
};

const specValue = (
  value: string | number | null | undefined,
  formatter?: (v: string) => string
): string | null => {
  if (value == null) return null;
  const s = String(value);
  if (s === '') return null;
  return formatter ? formatter(s) : s;
};

function lookupLabel<T>(record: Record<string, T>, key: string, fallback: T): T {
  return Object.entries(record).find(([k]) => k === key)?.[1] ?? fallback;
}

export function buildVehicleRows(vehicle: VehicleInfo): Array<[string, string]> {
  const rawRows: Array<[string, string | null]> = [
    ['الشركة المصنعة', vehicle.make],
    ['الموديل / الطراز', vehicle.model ?? null],
    ['الفئة / الدرجة', specValue(vehicle.submodel ?? vehicle.trim)],
    ['سنة / سنوات الصنع', rangeLabel(vehicle)],
    ['نوع الهيكل', specValue(vehicle.bodyType, bodyTypeLabel)],
    ['حجم المكينة', specValue(vehicle.displacement, d => `${d} لتر`)],
    ['عدد السلندر', specValue(vehicle.cylinders, c => `${c} سلندر`)],
    ['المحرك', vehicle.engine ?? null],
    ['الوقود', specValue(vehicle.fuelType, fuelLabel)],
    ['الدفع', specValue(vehicle.driveType, driveLabel)],
    ['الجير / الناقل', specValue(vehicle.transmission, transLabel)],
    ['عدد الأبواب', specValue(vehicle.doors, d => `${d} أبواب`)],
    ['نظام الفرامل', vehicle.brakeSystem ?? null],
    ['الوارد / المواصفات', vehicle.market ?? null],
    ['بلد الصنع', specValue(vehicle.region, regionLabel)],
  ];
  return rawRows.filter(([, v]) => v != null && v !== '') as Array<[string, string]>;
}

export function VehicleCard({
  vehicle,
  source,
  confidence,
}: {
  vehicle: VehicleInfo;
  source: string;
  confidence: string | null;
}): React.ReactElement {
  const rows = buildVehicleRows(vehicle);
  const yearRange = rangeLabel(vehicle);
  const srcInfo = lookupLabel(SOURCE_LABELS, source, SOURCE_LABELS.ai);
  const confInfo =
    confidence != null && confidence !== ''
      ? lookupLabel(CONFIDENCE_LABELS, confidence, null)
      : null;
  const titleSubmodel =
    vehicle.submodel != null && vehicle.submodel !== '' ? `[${vehicle.submodel}]` : '';
  const titleYears = yearRange != null && yearRange !== '' ? `(${yearRange})` : '';

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Car size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {vehicle.make} {vehicle.model ?? ''} {titleSubmodel} {titleYears}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">مواصفات المركبة المفكوكة</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${srcInfo.cls}`}>
            {srcInfo.label}
          </span>
          {confInfo && (
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${confInfo.cls}`}>
              ثقة: {confInfo.label}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-800/60"
          >
            <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
              {k}
            </p>
            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
