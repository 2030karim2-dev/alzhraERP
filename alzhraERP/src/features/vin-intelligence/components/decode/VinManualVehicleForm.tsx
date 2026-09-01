import React, { useMemo } from 'react';
import {
  Car,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Gauge,
  Globe,
  Sliders,
  Calendar,
  ArrowRight,
  Zap,
} from 'lucide-react';
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

const YEAR_RANGE_PRESETS = [
  { label: '2001-2007', start: '2001', end: '2007' },
  { label: '2008-2015', start: '2008', end: '2015' },
  { label: '2016-2022', start: '2016', end: '2022' },
  { label: '2023-2026', start: '2023', end: '2026' },
];

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
    const arabicNames = getArabicVehicleName({
      make: effMake,
      model: effModel,
    });

    const yStart = parseInt(normalizeToEnglishNumbers(manualYearStart).replace(/\D/g, ''), 10);
    const yEnd = parseInt(normalizeToEnglishNumbers(manualYearEnd).replace(/\D/g, ''), 10);

    let yearsLabel = '';
    if (!isNaN(yStart) && !isNaN(yEnd) && yStart > 0 && yEnd > 0) {
      yearsLabel =
        yStart === yEnd ? `${yStart}` : `${Math.min(yStart, yEnd)} - ${Math.max(yStart, yEnd)}`;
    } else if (!isNaN(yStart) && yStart > 0) {
      yearsLabel = `${yStart}`;
    }

    return {
      titleAr: `${arabicNames.makeAr} ${arabicNames.modelAr}`.trim(),
      titleEn: `${effMake} ${effModel}`.trim(),
      yearsLabel,
      engine: manualEngine ? `${manualEngine}L` : '',
      market: manualMarket || 'خليجي',
      trans: manualTransmission || 'تماتيك',
      drive: manualDrive || 'سنجل',
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
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900 md:p-6">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25">
            <Car size={22} />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white md:text-base">
              <span>إدخال مواصفات السيارة والكتالوج (PartSouq Specs)</span>
              <span className="rounded-md border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 shadow-xs dark:border-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                كتالوج معتمد
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
              تحديد السيارة بالموديل يربط القطع بالمركبة ويولد أرقام القطع والأسماء ثنائية اللغة
              تلقائياً
            </p>
          </div>
        </div>

        {manualMake && (
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 hover:dark:text-white"
          >
            <RotateCcw size={13} className="text-slate-400 dark:text-slate-300" />
            <span>تفريغ الحقول</span>
          </button>
        )}
      </div>

      {/* 2. Quick Presets Section */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-slate-50/70 p-4 shadow-sm dark:border-indigo-800/70 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Sparkles size={16} className="animate-pulse text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-black tracking-tight">
              تعبئة سريعة لأشهر السيارات في السوق اليمني والخليجي:
            </span>
          </div>
          <span className="hidden text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:inline">
            نقرة واحدة لملء كافة المواصفات
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_VEHICLE_PRESETS.map(p => {
            const isPresetActive =
              manualMake.toLowerCase() === p.make.toLowerCase() &&
              manualModel.toLowerCase() === p.model.toLowerCase();
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95',
                  isPresetActive
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/30 dark:border-indigo-500'
                    : 'border-indigo-200/90 bg-white text-indigo-950 hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/50 dark:hover:text-white'
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Make & Model Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Make Card (Span 6) */}
        <div className="dark:bg-slate-850 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-xs dark:border-slate-800 lg:col-span-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 font-mono text-[10px] text-white">
                  1
                </span>
                <span>الشركة المصنعة (الماركة)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                ماركات شائعة
              </span>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
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
                      setManualModel('');
                    }}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                      isSelected
                        ? 'scale-[1.02] border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/30 dark:border-blue-500'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'
                    )}
                  >
                    {mk.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="أو اكتب اسم الماركة يدوياً..."
              value={manualMake}
              onChange={e => setManualMake(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
            />
          </div>
        </div>

        {/* Model Card (Span 6) */}
        <div className="dark:bg-slate-850 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-xs dark:border-slate-800 lg:col-span-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 font-mono text-[10px] text-white">
                  2
                </span>
                <span>الموديل / الطراز</span>
                <span className="text-rose-500">*</span>
              </label>
              {manualMake && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                  طرازات {manualMake}
                </span>
              )}
            </div>

            {availableModelPresets.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
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
                        'rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                        isSelected
                          ? 'scale-[1.02] border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/30 dark:border-indigo-500'
                          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                اختر الماركة لتظهر لك أشهر الموديلات الخاصة بها
              </div>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="مثال: Corolla أو كورولا..."
              value={manualModel}
              onChange={e => setManualModel(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* 4. Years & Technical Parameters Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Years Span Card */}
        <div className="dark:bg-slate-850 flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
              <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
              <span className="text-xs font-black">نطاق سنوات الصنع</span>
            </div>
            {manualYearStart && (
              <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {manualYearStart}
                {manualYearEnd && manualYearEnd !== manualYearStart ? ` - ${manualYearEnd}` : ''}
              </span>
            )}
          </div>

          <div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  من سنة
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="2001"
                  value={manualYearStart}
                  onChange={e => {
                    const val = normalizeToEnglishNumbers(e.target.value)
                      .replace(/\D/g, '')
                      .slice(0, 4);
                    setManualYearStart(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center font-mono text-xs font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                />
              </div>

              <div>
                <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  إلى سنة
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="2007"
                  value={manualYearEnd}
                  onChange={e => {
                    const val = normalizeToEnglishNumbers(e.target.value)
                      .replace(/\D/g, '')
                      .slice(0, 4);
                    setManualYearEnd(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center font-mono text-xs font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                />
              </div>
            </div>

            {/* Quick Year Range Chips */}
            <div className="flex flex-wrap gap-1">
              {YEAR_RANGE_PRESETS.map(yr => {
                const isSelected = manualYearStart === yr.start && manualYearEnd === yr.end;
                return (
                  <button
                    key={yr.label}
                    type="button"
                    onClick={() => {
                      setManualYearStart(yr.start);
                      setManualYearEnd(yr.end);
                    }}
                    className={cn(
                      'rounded-lg border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
                    )}
                  >
                    {yr.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Engine Specs Card */}
        <div className="dark:bg-slate-850 flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
              <Gauge size={14} className="text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-black">المكينة / السعة (L)</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-300">
              {manualEngine ? `${manualEngine}L` : 'سعة اللتر'}
            </span>
          </div>

          <div>
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
              className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center font-mono text-xs font-black text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-amber-400"
            />

            <div className="flex flex-wrap gap-1">
              {POPULAR_ENGINES.slice(0, 6).map(eng => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => setManualEngine(eng)}
                  className={cn(
                    'rounded-lg border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                    manualEngine === eng
                      ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
                  )}
                >
                  {eng}L
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transmission & Drivetrain Card */}
        <div className="dark:bg-slate-850 flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            <Sliders size={14} className="text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-black">الجير ونظام الدفع</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                ناقل الحركة
              </span>
              <div className="dark:border-slate-750 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setManualTransmission('تماتيك')}
                  className={cn(
                    'rounded-md py-1 text-[10px] font-black transition-all',
                    manualTransmission === 'تماتيك'
                      ? 'border border-slate-200/60 bg-white text-indigo-600 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300'
                      : 'text-slate-500 dark:text-slate-400 hover:dark:text-slate-200'
                  )}
                >
                  تماتيك (Auto)
                </button>
                <button
                  type="button"
                  onClick={() => setManualTransmission('عادي')}
                  className={cn(
                    'rounded-md py-1 text-[10px] font-black transition-all',
                    manualTransmission === 'عادي'
                      ? 'border border-slate-200/60 bg-white text-indigo-600 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300'
                      : 'text-slate-500 dark:text-slate-400 hover:dark:text-slate-200'
                  )}
                >
                  عادي (Manual)
                </button>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                نظام الدفع
              </span>
              <div className="dark:border-slate-750 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setManualDrive('سنجل')}
                  className={cn(
                    'rounded-md py-1 text-[10px] font-black transition-all',
                    manualDrive === 'سنجل'
                      ? 'border border-slate-200/60 bg-white text-blue-600 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300'
                      : 'text-slate-500 dark:text-slate-400 hover:dark:text-slate-200'
                  )}
                >
                  سنجل (2WD)
                </button>
                <button
                  type="button"
                  onClick={() => setManualDrive('دبل')}
                  className={cn(
                    'rounded-md py-1 text-[10px] font-black transition-all',
                    manualDrive === 'دبل'
                      ? 'border border-slate-200/60 bg-white text-emerald-600 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300'
                      : 'text-slate-500 dark:text-slate-400 hover:dark:text-slate-200'
                  )}
                >
                  دبل (4x4)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Market Specs & Optional VIN */}
        <div className="dark:bg-slate-850 flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            <Globe size={14} className="text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-black">الوارد ورقم الشاصي</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                المواصفات الإقليمية
              </span>
              <select
                value={manualMarket}
                onChange={e => setManualMarket(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {POPULAR_MARKETS.map(m => (
                  <option
                    key={m}
                    value={m}
                    className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                  >
                    {m}
                  </option>
                ))}
                <option
                  value=""
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  أخرى / عام
                </option>
              </select>
            </div>

            <div>
              <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                رقم الشاصي (اختياري)
              </span>
              <input
                type="text"
                dir="ltr"
                placeholder="JT3HN87R... (17 Chars)"
                value={manualVinOptional}
                onChange={e => setManualVinOptional(e.target.value.toUpperCase().trim())}
                maxLength={17}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Live Interactive Vehicle Preview & Instant Action Card */}
      {previewData && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-blue-50/60 p-4 shadow-lg shadow-black/10 transition-all dark:border-emerald-700/60 dark:from-emerald-950/70 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-[280px] flex-1 items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Car size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    هوية السيارة المستهدفة
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/70 dark:text-emerald-200">
                    <CheckCircle2 size={12} />
                    <span>جاهزة للتثبيت</span>
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {previewData.titleAr}
                  </h4>
                  <span
                    className="font-mono text-xs font-bold text-slate-500 dark:text-slate-300"
                    dir="ltr"
                  >
                    ({previewData.titleEn})
                  </span>
                  {previewData.yearsLabel && (
                    <span className="rounded-lg border border-emerald-200 bg-white px-2.5 py-0.5 font-mono text-xs font-black text-emerald-800 shadow-xs dark:border-emerald-700/60 dark:bg-slate-800 dark:text-emerald-200">
                      {previewData.yearsLabel}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  <span className="rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                    المواصفات: {previewData.market}
                  </span>
                  {previewData.engine && (
                    <span className="rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 font-mono dark:border-slate-700 dark:bg-slate-800">
                      المحرك: {previewData.engine}
                    </span>
                  )}
                  <span className="rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                    الجير: {previewData.trans}
                  </span>
                  <span className="rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                    الدفع: {previewData.drive}
                  </span>
                </div>
              </div>
            </div>

            {/* Embedded Action Button right inside the card */}
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <button
                type="button"
                onClick={() => void onApplyManualVehicle()}
                disabled={isDecoding || !manualMake.trim()}
                className={cn(
                  'flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-xl transition-all lg:w-auto',
                  !manualMake.trim()
                    ? 'cursor-not-allowed bg-slate-300 opacity-60 dark:bg-slate-800'
                    : 'border border-emerald-400/30 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99]'
                )}
              >
                {isDecoding ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    <span>جاري التثبيت...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="animate-bounce text-amber-300" />
                    <span>تثبيت مواصفات المركبة والبدء باستخراج القطع</span>
                    <ArrowRight size={16} className="rotate-180" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
