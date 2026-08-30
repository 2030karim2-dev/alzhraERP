import React from 'react';
import Input from '../../../../ui/base/Input';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
import {
  POPULAR_MAKE_OPTIONS,
  POPULAR_MARKETS,
  QUICK_VEHICLE_PRESETS,
} from '../../constants/vinPresetsData';

interface VinManualVehicleFormProps {
  manualMake: string;
  setManualMake: (v: string) => void;
  manualModel: string;
  setManualModel: (v: string) => void;
  manualYearStart: string;
  setManualYearStart: (v: string) => void;
  manualYearEnd: string;
  setManualYearEnd: (v: string) => void;
  manualMarket: string;
  setManualMarket: (v: string) => void;
  manualEngine: string;
  setManualEngine: (v: string) => void;
  manualTransmission: string;
  setManualTransmission: (v: string) => void;
  manualDrive: string;
  setManualDrive: (v: string) => void;
  manualVinOptional: string;
  setManualVinOptional: (v: string) => void;
  onApplyManualVehicle: () => Promise<void>;
  isDecoding: boolean;
}

export const VinManualVehicleForm: React.FC<VinManualVehicleFormProps> = ({
  manualMake,
  setManualMake,
  manualModel,
  setManualModel,
  manualYearStart,
  setManualYearStart,
  manualYearEnd,
  setManualYearEnd,
  manualMarket,
  setManualMarket,
  manualEngine,
  setManualEngine,
  manualTransmission,
  setManualTransmission,
  manualDrive,
  setManualDrive,
  manualVinOptional,
  setManualVinOptional,
  onApplyManualVehicle,
  isDecoding,
}) => {
  const applyPreset = (preset: (typeof QUICK_VEHICLE_PRESETS)[0]): void => {
    setManualMake(preset.make);
    setManualModel(preset.model);
    setManualYearStart(preset.yStart);
    setManualYearEnd(preset.yEnd);
    setManualMarket(preset.market);
    setManualEngine(preset.engine);
    setManualTransmission(preset.trans);
    setManualDrive(preset.drive);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            إدخال مواصفات السيارة (كتالوج / PartSouq)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            يربط القطع بالمركبة ويولد الأسماء تلقائياً
          </span>
        </div>

        {/* Quick Vehicle Presets */}
        <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-800/60">
          <span className="mb-1.5 block text-xs font-bold text-indigo-700 dark:text-indigo-300">
            ⚡ تعبئة سريعة لأشهر السيارات في السوق:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_VEHICLE_PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-900 shadow-sm transition-colors hover:bg-indigo-50 dark:border-indigo-800/60 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-indigo-950/40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Make Selection */}
        <div>
          <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
            الشركة المصنعة
          </span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {POPULAR_MAKE_OPTIONS.map(mk => (
              <button
                key={mk.id}
                type="button"
                onClick={() => setManualMake(mk.id)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-bold transition-all',
                  manualMake === mk.id
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {mk.label}
              </button>
            ))}
          </div>
          <Input value={manualMake} onChange={e => setManualMake(e.target.value)} />
        </div>

        {/* Model & Year Range */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <Input
              label="الموديل / الطراز"
              value={manualModel}
              onChange={e => setManualModel(e.target.value)}
            />
          </div>
          <div>
            <Input
              type="number"
              label="من سنة"
              value={manualYearStart}
              onChange={e => setManualYearStart(e.target.value)}
            />
          </div>
          <div>
            <Input
              type="number"
              label="إلى سنة"
              value={manualYearEnd}
              onChange={e => setManualYearEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Market & Engine & Transmission & Drive */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
              الوارد / المواصفات
            </span>
            <select
              value={manualMarket}
              onChange={e => setManualMarket(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
            >
              {POPULAR_MARKETS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="">أخرى / عام</option>
            </select>
          </div>

          <div>
            <Input
              label="المكينة / السعة"
              value={manualEngine}
              onChange={e => setManualEngine(e.target.value)}
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
              الجير / الناقل
            </span>
            <select
              value={manualTransmission}
              onChange={e => setManualTransmission(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
            >
              <option value="تماتيك">تماتيك (أوتوماتيك)</option>
              <option value="عادي">عادي (مانيوال)</option>
              <option value="">غير محدد</option>
            </select>
          </div>

          <div>
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
              الدفع
            </span>
            <select
              value={manualDrive}
              onChange={e => setManualDrive(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
            >
              <option value="سنجل">سنجل (أمامي / خلفي)</option>
              <option value="دبل">دبل (4x4 / AWD)</option>
              <option value="">غير محدد</option>
            </select>
          </div>
        </div>

        {/* Optional VIN Number */}
        <Input
          label="رقم الشاصي VIN (اختياري)"
          value={manualVinOptional}
          onChange={e => setManualVinOptional(e.target.value)}
        />

        <Button
          size="md"
          variant="primary"
          onClick={() => void onApplyManualVehicle()}
          isLoading={isDecoding}
          disabled={!manualMake.trim()}
          fullWidth
          className="rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-700"
        >
          تثبيت بيانات السيارة والبدء بإضافة القطع 🚀
        </Button>
      </div>
    </div>
  );
};
