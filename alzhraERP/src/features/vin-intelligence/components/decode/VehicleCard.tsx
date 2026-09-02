import React, { useState, useEffect } from 'react';
import { Car, Edit3, Check, X, Sparkles } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { useFeedbackStore } from '../../../feedback/store';
import type { VehicleInfo } from '../../types';
import {
  driveLabel,
  fuelLabel,
  transLabel,
  bodyTypeLabel,
  regionLabel,
} from '../../utils/vehicleLabels';
import {
  canonicalizeMake,
  canonicalizeModel,
  normalizeToEnglishNumbers,
} from '../../utils/vehicleCanonicalizer';
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
  const rawStart = normalizeToEnglishNumbers(input.yearStart).replace(/\D/g, '');
  const rawEnd = normalizeToEnglishNumbers(input.yearEnd).replace(/\D/g, '');
  const rawEngine = normalizeToEnglishNumbers(input.engine).replace(/[^\d.]/g, '');

  let yStart = parseInt(rawStart, 10);
  let yEnd = parseInt(rawEnd, 10);

  if (isNaN(yStart)) yStart = 0;
  if (isNaN(yEnd)) yEnd = 0;

  // Auto-correct inverted year bounds (e.g. 2020 - 2012 -> 2012 - 2020)
  if (yStart > 0 && yEnd > 0 && yStart > yEnd) {
    const temp = yStart;
    yStart = yEnd;
    yEnd = temp;
  }

  const effectiveMake = canonicalizeMake(input.make) || input.make.trim();
  const effectiveModel = canonicalizeModel(input.model.trim(), effectiveMake) || null;

  return {
    make: effectiveMake,
    model: effectiveModel,
    year: yStart || null,
    yearStart: yStart || null,
    yearEnd: yEnd || yStart || null,
    market: trimOrNull(input.market),
    displacement: trimOrNull(rawEngine),
    engine: trimOrNull(rawEngine),
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

export interface VehicleCardProps {
  vehicle: VehicleInfo;
  source: string;
  confidence: string | null;
  onUpdateVehicle?: ((updated: VehicleInfo) => void) | undefined;
}

export function VehicleCard({
  vehicle,
  source,
  confidence,
  onUpdateVehicle,
}: VehicleCardProps): React.ReactElement {
  const { showToast } = useFeedbackStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editMake, setEditMake] = useState(vehicle.make || '');
  const [editModel, setEditModel] = useState(vehicle.model || '');
  const [editSubmodel, setEditSubmodel] = useState(vehicle.submodel || vehicle.trim || '');
  const [editYearStart, setEditYearStart] = useState(
    vehicle.yearStart ? String(vehicle.yearStart) : vehicle.year ? String(vehicle.year) : ''
  );
  const [editYearEnd, setEditYearEnd] = useState(
    vehicle.yearEnd ? String(vehicle.yearEnd) : vehicle.year ? String(vehicle.year) : ''
  );
  const [editEngine, setEditEngine] = useState(vehicle.engine || '');
  const [editDisplacement, setEditDisplacement] = useState(vehicle.displacement || '');
  const [editTransmission, setEditTransmission] = useState(vehicle.transmission || 'تماتيك');
  const [editDrive, setEditDrive] = useState(vehicle.driveType || 'سنجل');
  const [editMarket, setEditMarket] = useState(vehicle.market || 'خليجي');
  const [editFuel, setEditFuel] = useState(vehicle.fuelType || 'بنزين');
  const [editBodyType, setEditBodyType] = useState(vehicle.bodyType || '');

  // Synchronize edit fields when vehicle prop changes externally
  useEffect(() => {
    setEditMake(vehicle.make || '');
    setEditModel(vehicle.model || '');
    setEditSubmodel(vehicle.submodel || vehicle.trim || '');
    setEditYearStart(
      vehicle.yearStart ? String(vehicle.yearStart) : vehicle.year ? String(vehicle.year) : ''
    );
    setEditYearEnd(
      vehicle.yearEnd ? String(vehicle.yearEnd) : vehicle.year ? String(vehicle.year) : ''
    );
    setEditEngine(vehicle.engine || '');
    setEditDisplacement(vehicle.displacement || '');
    setEditTransmission(vehicle.transmission || 'تماتيك');
    setEditDrive(vehicle.driveType || 'سنجل');
    setEditMarket(vehicle.market || 'خليجي');
    setEditFuel(vehicle.fuelType || 'بنزين');
    setEditBodyType(vehicle.bodyType || '');
  }, [vehicle]);

  const handleSaveEdit = (): void => {
    if (!editMake.trim()) {
      showToast('يرجى تحديد الشركة المصنعة', 'warning');
      return;
    }

    const yStart = parseInt(editYearStart.replace(/\D/g, ''), 10) || null;
    const yEnd = parseInt(editYearEnd.replace(/\D/g, ''), 10) || yStart;

    const updated: VehicleInfo = {
      ...vehicle,
      make: editMake.trim(),
      model: editModel.trim() || null,
      submodel: editSubmodel.trim() || null,
      trim: editSubmodel.trim() || null,
      year: yStart,
      yearStart: yStart,
      yearEnd: yEnd,
      engine: editEngine.trim() || null,
      displacement: editDisplacement.trim() || null,
      transmission: editTransmission.trim() || null,
      driveType: editDrive.trim() || null,
      market: editMarket.trim() || null,
      fuelType: editFuel.trim() || null,
      bodyType: editBodyType.trim() || null,
    };

    if (onUpdateVehicle) {
      onUpdateVehicle(updated);
    }
    setIsEditing(false);
    showToast('تم تحديث وتثبيت مواصفات المركبة بنجاح ✨', 'success');
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
  };

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
      {/* ── Header: Title + Source + Edit Switch ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Car size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {vehicle.make} {vehicle.model ?? ''} {titleSubmodel} {titleYears}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditing ? 'تعديل وتخصيص مواصفات المركبة' : 'مواصفات المركبة المفكوكة'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${srcInfo.cls}`}
              >
                {srcInfo.label}
              </span>
              {confInfo && (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${confInfo.cls}`}
                >
                  ثقة: {confInfo.label}
                </span>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsEditing(true);
                }}
                className="rounded-xl border border-slate-200 font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Edit3 size={13} className="ml-1 text-blue-600 dark:text-blue-400" />
                تعديل المواصفات ✏️
              </Button>
            </>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                className="rounded-xl font-bold text-slate-600 dark:text-slate-300"
              >
                <X size={13} className="ml-1" />
                إلغاء
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveEdit}
                className="rounded-xl bg-emerald-600 font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
              >
                <Check size={14} className="ml-1" />
                حفظ وتطبيق التعديل ✓
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mode 1: Static High-Density Badges ── */}
      {!isEditing && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map(([k, v]) => (
            <div
              key={k}
              onClick={() => {
                setIsEditing(true);
              }}
              className="group cursor-pointer rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 transition-all hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-blue-800"
              title="انقر لتعديل هذه القيمة"
            >
              <div className="flex items-center justify-between">
                <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                  {k}
                </p>
                <Edit3
                  size={10}
                  className="text-blue-500 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Mode 2: Interactive High-Density Edit Form ── */}
      {isEditing && (
        <div className="animate-in fade-in space-y-4 duration-200">
          <div className="flex items-center gap-1.5 pb-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <Sparkles size={14} />
            <span>يمكنك تعديل أي حقل وتطبيق التعديلات فوراً على استخراج وتسمية القطع:</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Input
              label="الشركة المصنعة (Make)"
              value={editMake}
              onChange={e => {
                setEditMake(e.target.value);
              }}
              placeholder="مثال: تويوتا، نيسان..."
            />

            <Input
              label="الموديل / الطراز (Model)"
              value={editModel}
              onChange={e => {
                setEditModel(e.target.value);
              }}
              placeholder="مثال: سافاري بيك اب، نوها..."
            />

            <Input
              label="الفئة / المواصفات (Submodel / Trim)"
              value={editSubmodel}
              onChange={e => {
                setEditSubmodel(e.target.value);
              }}
              placeholder="مثال: VX-R, X TYPE, STANDARD..."
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="من سنة (Start)"
                value={editYearStart}
                onChange={e => {
                  setEditYearStart(e.target.value);
                }}
                placeholder="2011"
              />
              <Input
                label="إلى سنة (End)"
                value={editYearEnd}
                onChange={e => {
                  setEditYearEnd(e.target.value);
                }}
                placeholder="2016"
              />
            </div>

            <Input
              label="كود المحرك (Engine Code)"
              value={editEngine}
              onChange={e => {
                setEditEngine(e.target.value);
              }}
              placeholder="مثال: TB48DE, 3ZRFA, 1GR-FE..."
            />

            <Input
              label="حجم المكينة (Displacement L)"
              value={editDisplacement}
              onChange={e => {
                setEditDisplacement(e.target.value);
              }}
              placeholder="مثال: 4.8, 1.8, 4.0..."
            />

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                الجير / الناقل (Transmission)
              </label>
              <select
                value={editTransmission}
                onChange={e => {
                  setEditTransmission(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="تماتيك">تماتيك (Automatic)</option>
                <option value="عادي">عادي (Manual)</option>
                <option value="CVT">CVT</option>
                <option value="أوتوماتيك 6 سرعات">أوتوماتيك 6 سرعات</option>
                <option value="يدوي 5 سرعات">يدوي 5 سرعات</option>
                <option value="يدوي 6 سرعات">يدوي 6 سرعات</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                نظام الدفع (Drive Type)
              </label>
              <select
                value={editDrive}
                onChange={e => {
                  setEditDrive(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="دبل">دبل (4WD / 4x4)</option>
                <option value="دبل مستمر">دبل مستمر (AWD)</option>
                <option value="سنجل">سنجل (2WD)</option>
                <option value="دفع خلفي">دفع خلفي (RWD)</option>
                <option value="دفع أمامي">دفع أمامي (FWD)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                السوق / الوارد (Market)
              </label>
              <select
                value={editMarket}
                onChange={e => {
                  setEditMarket(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="خليجي">خليجي (GCC / Gulf)</option>
                <option value="وارد ياباني">وارد ياباني (Japan JDM)</option>
                <option value="وارد أمريكي">وارد أمريكي (USA / America)</option>
                <option value="وارد كوري">وارد كوري (Korea)</option>
                <option value="وارد أوروبي">وارد أوروبي (Europe)</option>
                <option value="وارد كندي">وارد كندي (Canada)</option>
                <option value="عام">عام (General / Other)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                نوع الوقود (Fuel Type)
              </label>
              <select
                value={editFuel}
                onChange={e => {
                  setEditFuel(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="بنزين">بنزين (Gasoline)</option>
                <option value="ديزل">ديزل (Diesel)</option>
                <option value="هايبرد">هايبرد (Hybrid)</option>
                <option value="كهرباء">كهرباء (Electric)</option>
              </select>
            </div>

            <Input
              label="نوع الهيكل (Body Type)"
              value={editBodyType}
              onChange={e => {
                setEditBodyType(e.target.value);
              }}
              placeholder="مثال: بيك اب، صالون، SUV..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
