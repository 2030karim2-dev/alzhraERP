import React, { useState } from 'react';
import { Car, Save, Sparkles, Hash } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import type { VehicleInfo } from '../types';
import { POPULAR_MAKE_OPTIONS, getPopularModelsForMake } from '../constants/vinPresetsData';
import { parseCatalogVehicleText } from '../utils/catalogTextExtractor';

interface ManualVinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: VehicleInfo, vinNumber: string) => Promise<void>;
  onSaveAndExtract?: (vehicle: VehicleInfo, vinNumber: string) => Promise<void>;
}

const COMMON_MAKES = POPULAR_MAKE_OPTIONS;

const getMakeModels = (makeKey: string): Array<{ id: string; label: string }> =>
  getPopularModelsForMake(makeKey);

/* eslint-disable max-lines-per-function -- React modal with multiple form groups; the 50-line ceiling is not applicable to a component boundary. */
export const ManualVinModal: React.FC<ManualVinModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndExtract,
}) => {
  const [vinNumber, setVinNumber] = useState('');
  const [make, setMake] = useState('Toyota');
  const [customMake, setCustomMake] = useState('');
  const [model, setModel] = useState('Vitz');
  const [year, setYear] = useState<number>(2005);
  const [displacement, setDisplacement] = useState('1.3');
  const [transmission, setTransmission] = useState<'automatic' | 'manual'>('automatic');
  const [driveType, setDriveType] = useState<'2WD' | '4WD' | 'AWD'>('2WD');
  const [fuelType, setFuelType] = useState<'gasoline' | 'diesel' | 'hybrid'>('gasoline');
  const [market, setMarket] = useState('وارد ياباني');
  const [submodel, setSubmodel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleVinPasteChange = (raw: string): void => {
    if (
      raw.includes('\n') ||
      raw.includes('http') ||
      raw.includes('[') ||
      raw.includes('ModelCode') ||
      raw.toLowerCase().includes('partsouq') ||
      raw.toLowerCase().includes('catalog')
    ) {
      const parsed = parseCatalogVehicleText(raw);
      if (parsed.vin) setVinNumber(parsed.vin);
      if (parsed.make) {
        const matchedMake = COMMON_MAKES.find(
          m =>
            m.id.toLowerCase() === parsed.make?.toLowerCase() ||
            (parsed.makeAr && m.label.includes(parsed.makeAr))
        );
        if (matchedMake) {
          setMake(matchedMake.id);
        } else {
          setMake('OTHER');
          setCustomMake(parsed.make || '');
        }
      }
      if (parsed.model) setModel(parsed.model);
      if (parsed.year) setYear(parseInt(parsed.year, 10) || 2011);
      if (parsed.market) setMarket(parsed.market);
      if (parsed.transmission) {
        setTransmission(parsed.transmission === 'عادي' ? 'manual' : 'automatic');
      }
      if (parsed.drive) setDriveType(parsed.drive === 'دبل' ? '4WD' : '2WD');
    } else {
      setVinNumber(raw.toUpperCase());
    }
  };

  const activeMake = make === 'OTHER' ? customMake.trim() : make;
  const activeModel = model;
  const makeModels = getMakeModels(make);

  const buildVehicleObject = (): VehicleInfo => {
    const veh: VehicleInfo = {
      make: activeMake || 'Toyota',
    };
    if (activeModel) veh.model = activeModel;
    if (year) {
      veh.year = year;
      veh.yearStart = year;
    }
    if (displacement) veh.displacement = `${displacement}L`;
    veh.transmission = transmission;
    veh.driveType = driveType;
    veh.fuelType = fuelType;
    if (market) veh.market = market;
    if (submodel.trim()) veh.submodel = submodel.trim();
    return veh;
  };

  const handleSaveOnly = async (): Promise<void> => {
    if (!activeMake) return;
    setIsSaving(true);
    try {
      const veh = buildVehicleObject();
      const vinVal = vinNumber.trim() || `MANUAL-${Date.now().toString(36).toUpperCase()}`;
      await onSave(veh, vinVal);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndExtractAction = async (): Promise<void> => {
    if (!activeMake) return;
    setIsSaving(true);
    try {
      const veh = buildVehicleObject();
      const vinVal = vinNumber.trim() || `MANUAL-${Date.now().toString(36).toUpperCase()}`;
      if (onSaveAndExtract) {
        await onSaveAndExtract(veh, vinVal);
      } else {
        await onSave(veh, vinVal);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const currentYear = new Date().getFullYear() + 1;
  const yearOptions = Array.from({ length: 35 }, (_, i) => currentYear - i);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Car}
      title="إضافة شاصي / مركبة يدوياً"
      description="إدخال وحفظ بيانات مواصفات مركبة جديدة يدوياً في قاعدة البيانات"
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            إلغاء
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleSaveOnly();
              }}
              isLoading={isSaving}
              disabled={!activeMake || isSaving}
              className="rounded-xl border-slate-300 text-xs font-bold dark:border-slate-700"
            >
              <Save size={14} className="ml-1 text-slate-600 dark:text-slate-300" />
              حفظ الشاصي فقط
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void handleSaveAndExtractAction();
              }}
              isLoading={isSaving}
              disabled={!activeMake || isSaving}
              className="rounded-xl bg-blue-600 text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              <Sparkles size={14} className="ml-1 text-amber-300" />
              حفظ والانتقال لجدول القطع الذكي ⚡
            </Button>
          </div>
        </div>
      }
    >
      <div className="font-cairo space-y-4">
        {/* VIN Number / Chassis */}
        <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-slate-800/50">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Hash size={14} className="text-blue-600 dark:text-blue-400" />
            <span>رقم الشاصي (VIN) أو رقم الهيكل (اختياري):</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={vinNumber}
              onChange={e => {
                handleVinPasteChange(e.target.value);
              }}
              placeholder="مثال: KSP90-5012345 أو الصق بيانات الكتالوج مباشرة..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            إذا لم يتوفر رقم شاصي كامل، سيقوم النظام تلقائياً بتوليد معرّف يدوي فريد للمركبة.
          </p>
        </div>

        {/* Make Selection */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            الشركة الصانعة (Make):
          </span>
          <div className="custom-scrollbar flex max-h-28 flex-wrap gap-1.5 overflow-y-auto p-1">
            {COMMON_MAKES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMake(m.id);
                  const firstModel = getMakeModels(m.id)[0]?.id ?? '';
                  setModel(firstModel || '');
                }}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                  make === m.id
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                )}
              >
                {m.label} ({m.id})
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMake('OTHER');
                setModel('OTHER');
              }}
              className={cn(
                'rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                make === 'OTHER'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              )}
            >
              أخرى...
            </button>
          </div>
          {make === 'OTHER' && (
            <input
              type="text"
              value={customMake}
              onChange={e => {
                setCustomMake(e.target.value);
              }}
              placeholder="اكتب اسم الشركة الصانعة..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          )}
        </div>

        {/* Model Selection & Chips */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            الموديل / الطراز (Model):
          </span>
          {makeModels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {makeModels.map(md => (
                <button
                  key={md.id}
                  type="button"
                  onClick={() => {
                    setModel(md.id);
                  }}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs font-bold transition-all',
                    model === md.id
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {md.label} ({md.id})
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={model}
            onChange={e => {
              setModel(e.target.value);
            }}
            placeholder="مثال: Vitz أو فيتز أو Hilux..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Grid: Year, Engine, Market, Submodel */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Year */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">سنة الصنع:</span>
            <select
              value={year}
              onChange={e => {
                setYear(parseInt(e.target.value, 10));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Displacement / Engine */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              سعة المحرك (لتر):
            </span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={displacement}
                onChange={e => {
                  setDisplacement(e.target.value);
                }}
                placeholder="1.3"
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Market */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              السوق / المواصفات:
            </span>
            <select
              value={market}
              onChange={e => {
                setMarket(e.target.value);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="وارد ياباني">وارد ياباني (Japan)</option>
              <option value="خليجي">خليجي (GCC)</option>
              <option value="وارد أمريكي">وارد أمريكي (USA)</option>
              <option value="وارد كوري">وارد كوري (Korea)</option>
              <option value="وارد أوروبي">وارد أوروبي (Europe)</option>
              <option value="وارد كندي">وارد كندي (Canada)</option>
            </select>
          </div>

          {/* Submodel / Trim */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              الفئة (اختياري):
            </span>
            <input
              type="text"
              value={submodel}
              onChange={e => {
                setSubmodel(e.target.value);
              }}
              placeholder="مثال: RS, G, LE, SR5"
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Toggles: Transmission, Drive Type, Fuel Type */}
        <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
          {/* Transmission */}
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              ناقل الحركة:
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setTransmission('automatic');
                }}
                className={cn(
                  'rounded-lg border py-1.5 text-xs font-bold transition-all',
                  transmission === 'automatic'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                تماتيك (Auto)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransmission('manual');
                }}
                className={cn(
                  'rounded-lg border py-1.5 text-xs font-bold transition-all',
                  transmission === 'manual'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                عادي (Manual)
              </button>
            </div>
          </div>

          {/* Drive Type */}
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              نظام الدفع:
            </span>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(['2WD', '4WD', 'AWD'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDriveType(d);
                  }}
                  className={cn(
                    'rounded-lg border py-1.5 text-xs font-bold transition-all',
                    driveType === d
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {d === '2WD' ? 'سنجل' : d === '4WD' ? 'دبل 4x4' : 'AWD'}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              نوع الوقود:
            </span>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'gasoline', label: 'بنزين' },
                  { id: 'diesel', label: 'ديزل' },
                  { id: 'hybrid', label: 'هايبرد' },
                ] as Array<{ id: 'gasoline' | 'diesel' | 'hybrid'; label: string }>
              ).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFuelType(f.id);
                  }}
                  className={cn(
                    'rounded-lg border py-1.5 text-xs font-bold transition-all',
                    fuelType === f.id
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
/* eslint-enable max-lines-per-function */
