import React, { useMemo } from 'react';
import { Car, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import Input from '../../../../ui/base/Input';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
import {
  POPULAR_MAKE_OPTIONS,
  POPULAR_MARKETS,
  QUICK_VEHICLE_PRESETS,
  POPULAR_MODELS_BY_MAKE,
  POPULAR_ENGINES,
} from '../../constants/vinPresetsData';
import {
  canonicalizeMake,
  canonicalizeModel,
  normalizeToEnglishNumbers,
} from '../../utils/vehicleCanonicalizer';
import { getArabicVehicleName } from '../../utils/smartPartNamer';

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
  const canonicalCurrentMake = useMemo(() => canonicalizeMake(manualMake), [manualMake]);

  const availableModelPresets = useMemo(() => {
    if (!canonicalCurrentMake) return [];
    return POPULAR_MODELS_BY_MAKE[canonicalCurrentMake] || [];
  }, [canonicalCurrentMake]);

  const applyPreset = (preset: (typeof QUICK_VEHICLE_PRESETS)[0]): void => {
    setManualMake(preset.make);
    setManualModel(preset.model);
    setManualYearStart(normalizeToEnglishNumbers(preset.yStart));
    setManualYearEnd(normalizeToEnglishNumbers(preset.yEnd));
    setManualMarket(preset.market);
    setManualEngine(normalizeToEnglishNumbers(preset.engine));
    setManualTransmission(preset.trans);
    setManualDrive(preset.drive);
  };

  const handleResetForm = (): void => {
    setManualMake('');
    setManualModel('');
    setManualYearStart('');
    setManualYearEnd('');
    setManualMarket('خليجي');
    setManualEngine('');
    setManualTransmission('تماتيك');
    setManualDrive('سنجل');
    setManualVinOptional('');
  };

  // Build live preview object
  const previewData = useMemo(() => {
    if (!manualMake.trim()) return null;
    const effMake = canonicalizeMake(manualMake) || manualMake.trim();
    const effModel = canonicalizeModel(manualModel.trim(), effMake) || manualModel.trim();
    const arabicNames = getArabicVehicleName({ make: effMake, model: effModel });

    const yStart = parseInt(normalizeToEnglishNumbers(manualYearStart).replace(/\D/g, ''), 10);
    const yEnd = parseInt(normalizeToEnglishNumbers(manualYearEnd).replace(/\D/g, ''), 10);

    let yearsLabel = '';
    if (!isNaN(yStart) && !isNaN(yEnd) && yStart > 0 && yEnd > 0) {
      yearsLabel =
        yStart === yEnd ? `${yStart}` : `${Math.min(yStart, yEnd)}-${Math.max(yStart, yEnd)}`;
    } else if (!isNaN(yStart) && yStart > 0) {
      yearsLabel = `${yStart}`;
    }

    return {
      titleAr: `${arabicNames.makeAr} ${arabicNames.modelAr}`.trim(),
      yearsLabel,
      engine: manualEngine ? `${manualEngine}L` : '',
      market: manualMarket || 'عام',
      trans: manualTransmission || '',
      drive: manualDrive || '',
    };
  }, [
    manualMake,
    manualModel,
    manualYearStart,
    manualYearEnd,
    manualEngine,
    manualMarket,
    manualTransmission,
    manualDrive,
  ]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            إدخال مواصفات السيارة (كتالوج / PartSouq)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تحديد السيارة بالموديل يربط القطع بالمركبة ويولد الأسماء تلقائياً باللغتين
          </p>
        </div>
        {manualMake && (
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RotateCcw size={12} />
            تفريغ الحقول
          </button>
        )}
      </div>

      {/* 1. Quick Presets Bar */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-950/60 dark:bg-indigo-950/20">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
            تعبئة سريعة لأشهر السيارات في السوق:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_VEHICLE_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="shadow-2xs rounded-lg border border-indigo-200/80 bg-white px-2.5 py-1 text-xs font-bold text-indigo-900 transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 dark:border-indigo-800/60 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Manufacturer (الشركة المصنعة) */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
          1. الشركة المصنعة (الماركة) <span className="text-rose-500">*</span>
        </label>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {POPULAR_MAKE_OPTIONS.map(mk => {
            const isSelected =
              canonicalCurrentMake.toLowerCase() === mk.id.toLowerCase() ||
              manualMake.trim().toLowerCase() === mk.label.toLowerCase();
            return (
              <button
                key={mk.id}
                type="button"
                onClick={() => {
                  setManualMake(mk.id);
                  // If switching make, clear current model if not matching
                  setManualModel('');
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {mk.label}
              </button>
            );
          })}
        </div>
        <Input
          placeholder="أو اكتب اسم الماركة هنا..."
          value={manualMake}
          onChange={e => setManualMake(e.target.value)}
        />
      </div>

      {/* 3. Model & Contextual Model Suggestions */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
          2. الموديل / الطراز <span className="text-rose-500">*</span>
        </label>

        {availableModelPresets.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              موديلات شائعة لـ {manualMake}:
            </span>
            {availableModelPresets.map(m => {
              const isSelected =
                manualModel.trim().toLowerCase() === m.id.toLowerCase() ||
                manualModel.trim().toLowerCase() === m.label.toLowerCase();
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setManualModel(m.id)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs font-bold transition-colors',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        <Input
          placeholder="مثال: Corolla أو كورولا..."
          value={manualModel}
          onChange={e => setManualModel(e.target.value)}
        />
      </div>

      {/* 4. Model Years Range (All English Digits) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            من سنة (سنة البداية)
          </label>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            placeholder="2001"
            value={manualYearStart}
            onChange={e => {
              const val = normalizeToEnglishNumbers(e.target.value).replace(/\D/g, '').slice(0, 4);
              setManualYearStart(val);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-mono text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            إلى سنة (سنة النهاية)
          </label>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            placeholder="2007"
            value={manualYearEnd}
            onChange={e => {
              const val = normalizeToEnglishNumbers(e.target.value).replace(/\D/g, '').slice(0, 4);
              setManualYearEnd(val);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-mono text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* 5. Market / Specs & Engine & Transmission & Drive */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            الوارد / المواصفات
          </label>
          <select
            value={manualMarket}
            onChange={e => setManualMarket(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            المكينة / السعة (L)
          </label>
          <input
            type="text"
            dir="ltr"
            placeholder="مثال: 1.8"
            value={manualEngine}
            onChange={e => {
              const val = normalizeToEnglishNumbers(e.target.value)
                .replace(/[^\d.]/g, '')
                .slice(0, 5);
              setManualEngine(val);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-mono text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {POPULAR_ENGINES.slice(0, 6).map(eng => (
              <button
                key={eng}
                type="button"
                onClick={() => setManualEngine(eng)}
                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {eng}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            الجير / الناقل
          </label>
          <select
            value={manualTransmission}
            onChange={e => setManualTransmission(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="تماتيك">تماتيك (أوتوماتيك)</option>
            <option value="عادي">عادي (مانيوال)</option>
            <option value="">غير محدد</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            نظام الدفع
          </label>
          <select
            value={manualDrive}
            onChange={e => setManualDrive(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="سنجل">سنجل (أمامي / خلفي)</option>
            <option value="دبل">دبل (4x4 / AWD)</option>
            <option value="">غير محدد</option>
          </select>
        </div>
      </div>

      {/* 6. Optional VIN */}
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
          رقم الشاصي VIN (اختياري)
        </label>
        <input
          type="text"
          dir="ltr"
          placeholder="اختياري — 17 حرفاً ورقم"
          value={manualVinOptional}
          onChange={e => setManualVinOptional(e.target.value.toUpperCase().trim())}
          maxLength={17}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* 7. Live Preview Card */}
      {previewData && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <div className="shadow-2xs flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Car size={16} />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                معاينة السيارة المختارة:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-100">
                <span>{previewData.titleAr}</span>
                {previewData.yearsLabel && (
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300">
                    ({previewData.yearsLabel})
                  </span>
                )}
                {previewData.market && (
                  <span className="py-0.2 rounded bg-emerald-100 px-1.5 text-[10px] text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                    {previewData.market}
                  </span>
                )}
                {previewData.engine && (
                  <span className="py-0.2 rounded bg-emerald-200/70 px-1.5 font-mono text-[10px] text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100">
                    {previewData.engine}
                  </span>
                )}
              </div>
            </div>
          </div>
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
      )}

      {/* 8. Action Button */}
      <Button
        size="md"
        variant="primary"
        onClick={() => void onApplyManualVehicle()}
        isLoading={isDecoding}
        disabled={!manualMake.trim()}
        fullWidth
        className="active:scale-98 h-11 rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/15 transition-all hover:bg-indigo-700"
      >
        تثبيت بيانات السيارة والبدء بإضافة القطع 🚀
      </Button>
    </div>
  );
};
