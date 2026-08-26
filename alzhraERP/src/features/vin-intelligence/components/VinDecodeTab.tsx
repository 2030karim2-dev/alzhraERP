import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Sparkles,
  Database,
  History,
  Car,
  Save,
  AlertTriangle,
  Edit3,
  PackagePlus,
} from 'lucide-react';
import Input from '../../../ui/base/Input';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import { validateVin } from '../utils/vinValidator';
import { preDecodeVin } from '../utils/wmiDecoder';
import {
  driveLabel,
  fuelLabel,
  transLabel,
  bodyTypeLabel,
  regionLabel,
} from '../utils/vehicleLabels';
import { canonicalizeMake, canonicalizeModel } from '../utils/vehicleCanonicalizer';
import type { VinAnalysisRecord, VinDecodeMode, VinDecodeResult, VehicleInfo } from '../types';

interface VinDecodeTabProps {
  isDecoding: boolean;
  error: string | null;
  result: VinDecodeResult | null;
  history: VinAnalysisRecord[];
  onDecode: (vin: string, mode: VinDecodeMode) => Promise<void>;
  onSetManualVehicle?: (vehicle: VehicleInfo, vinNumber?: string) => Promise<VinDecodeResult>;
  onSave: () => void;
  onNavigateToExtract?: () => void;
  isSaving: boolean;
}

const MODES: Array<{ id: VinDecodeMode; label: string; icon: typeof ScanLine }> = [
  { id: 'hybrid', label: 'تلقائي (vPIC + داخلي + AI)', icon: Sparkles },
  { id: 'db', label: 'بنيوي (قاعدة البيانات)', icon: Database },
  { id: 'ai', label: 'ذكاء اصطناعي فقط', icon: Sparkles },
];

/** Popular manufacturers — CANONICAL English ids persisted, Arabic shown (M1 fix) */
const POPULAR_MAKE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'Toyota', label: 'تويوتا' },
  { id: 'Nissan', label: 'نيسان' },
  { id: 'Hyundai', label: 'هيونداي' },
  { id: 'Kia', label: 'كيا' },
  { id: 'Chevrolet', label: 'شفروليه' },
  { id: 'GMC', label: 'جمس' },
  { id: 'Ford', label: 'فورد' },
  { id: 'Honda', label: 'هوندا' },
  { id: 'Isuzu', label: 'إيسوزو' },
  { id: 'Mitsubishi', label: 'ميتسوبيشي' },
  { id: 'Mazda', label: 'مازدا' },
  { id: 'Lexus', label: 'لكزس' },
];

/** Popular markets/specs */
const POPULAR_MARKETS = ['خليجي', 'وارد أمريكي', 'وارد ياباني', 'سعودي', 'كوري', 'أوروبي'];

/** Quick presets for popular vehicles in Yemen & Gulf market
 *  (make/model stored as CANONICAL English per migration 20260826000002) */
const QUICK_VEHICLE_PRESETS = [
  {
    label: 'كورولا (2001-2007)',
    make: 'Toyota',
    model: 'Corolla',
    yStart: '2001',
    yEnd: '2007',
    market: 'خليجي',
    engine: '1.8',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
  {
    label: 'هايلوكس (2006-2015)',
    make: 'Toyota',
    model: 'Hilux',
    yStart: '2006',
    yEnd: '2015',
    market: 'خليجي',
    engine: '2.7',
    trans: 'عادي',
    drive: 'دبل',
  },
  {
    label: 'شاص (2007-2022)',
    make: 'Toyota',
    model: 'Land Cruiser 70',
    yStart: '2007',
    yEnd: '2022',
    market: 'خليجي',
    engine: '4.0',
    trans: 'عادي',
    drive: 'دبل',
  },
  {
    label: 'كامري (2003-2006)',
    make: 'Toyota',
    model: 'Camry',
    yStart: '2003',
    yEnd: '2006',
    market: 'خليجي',
    engine: '2.4',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
  {
    label: 'يارس (2006-2013)',
    make: 'Toyota',
    model: 'Yaris',
    yStart: '2006',
    yEnd: '2013',
    market: 'خليجي',
    engine: '1.3',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
  {
    label: 'سنتافي (2013-2018)',
    make: 'Hyundai',
    model: 'Santa Fe',
    yStart: '2013',
    yEnd: '2018',
    market: 'وارد أمريكي',
    engine: '3.3',
    trans: 'تماتيك',
    drive: 'دبل',
  },
  {
    label: 'توسان (2016-2020)',
    make: 'Hyundai',
    model: 'Tucson',
    yStart: '2016',
    yEnd: '2020',
    market: 'خليجي',
    engine: '2.0',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
];

/** Result is considered "uncertain" when it comes from AI with low/medium confidence. */
function isUncertainResult(result: VinDecodeResult | null): boolean {
  if (!result) return false;
  return result.source === 'ai' && (result.confidence === 'low' || result.confidence === 'medium');
}

/* eslint-disable max-lines-per-function, complexity -- React component composing VIN form + manual form + vehicle card + save gates; the 50-line / complexity-10 ceilings are not applicable to a component boundary. */
export const VinDecodeTab: React.FC<VinDecodeTabProps> = ({
  isDecoding,
  error,
  result,
  history,
  onDecode,
  onSetManualVehicle,
  onSave,
  onNavigateToExtract,
  isSaving,
}) => {
  const [entryMode, setEntryMode] = useState<'vin' | 'manual'>('vin');
  const [vin, setVin] = useState('');
  const [mode, setMode] = useState<VinDecodeMode>('hybrid');
  const [aiSaveConfirmed, setAiSaveConfirmed] = useState(false);

  // Manual vehicle state (PartSouq / Catalog mode)
  const [manualMake, setManualMake] = useState('تويوتا');
  const [manualModel, setManualModel] = useState('كورولا');
  const [manualYearStart, setManualYearStart] = useState('2001');
  const [manualYearEnd, setManualYearEnd] = useState('2007');
  const [manualMarket, setManualMarket] = useState('خليجي');
  const [manualEngine, setManualEngine] = useState('1.8');
  const [manualTransmission, setManualTransmission] = useState('تماتيك');
  const [manualDrive, setManualDrive] = useState('سنجل');
  const [manualVinOptional, setManualVinOptional] = useState('');

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

  // Reset confirmation whenever a new result arrives
  const prevVinRef = useRef<string | null>(null);
  useEffect(() => {
    if (result?.vin != null && result.vin !== prevVinRef.current) {
      prevVinRef.current = result.vin;
      setAiSaveConfirmed(false);
    } else if (!result) {
      prevVinRef.current = null;
      setAiSaveConfirmed(false);
    }
  }, [result]);

  const validation = validateVin(vin);
  const wmiPreview = preDecodeVin(vin);
  const canDecode = vin.trim().length > 0 && validation.isValid && !isDecoding;
  const uncertain = isUncertainResult(result);

  const handleDecode = async (): Promise<void> => {
    if (!canDecode) return;
    await onDecode(vin, mode);
  };

  const handleApplyManualVehicle = async (): Promise<void> => {
    if (!manualMake.trim()) return;
    // M1: persist CANONICAL identifiers regardless of the input language,
    // so inventory matching and catalog dedupe never split on spelling.
    const vehicleData = buildManualVehicleInput({
      make: manualMake,
      model: manualModel,
      yearStart: manualYearStart,
      yearEnd: manualYearEnd,
      market: manualMarket,
      engine: manualEngine,
      transmission: manualTransmission,
      drive: manualDrive,
    });

    if (onSetManualVehicle) {
      await onSetManualVehicle(vehicleData, manualVinOptional);
      if (onNavigateToExtract) {
        onNavigateToExtract();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Main Mode Switch (VIN Lookup vs Manual / PartSouq) ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-800/90">
        <button
          type="button"
          onClick={() => {
            setEntryMode('vin');
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all',
            entryMode === 'vin'
              ? 'border border-slate-200/60 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          )}
        >
          <ScanLine size={15} />
          فك الشاصي التلقائي (VIN)
        </button>
        <button
          type="button"
          onClick={() => {
            setEntryMode('manual');
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all',
            entryMode === 'manual'
              ? 'border border-slate-200/60 bg-white text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          )}
        >
          <Edit3 size={15} />
          إدخال يدوي (بارت سوق / كتالوج)
        </button>
      </div>

      {entryMode === 'vin' ? (
        /* ── Mode 1: VIN Lookup Form ── */
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3">
            <Input
              label="رقم الشاصي (VIN)"
              value={vin}
              onChange={e => {
                setVin(e.target.value.toUpperCase());
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleDecode();
              }}
              icon={<ScanLine />}
            />
            {wmiPreview && (
              <div className="animate-in fade-in flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-xs text-blue-950 duration-200 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-200">
                <span className="font-bold text-blue-700 dark:text-blue-300">⚡ كشف فوري:</span>
                {wmiPreview.makeAr !== 'غير محدد' && (
                  <span className="rounded-md border border-blue-200 bg-white px-2 py-0.5 font-bold shadow-xs dark:border-blue-800 dark:bg-slate-800">
                    {wmiPreview.makeAr} ({wmiPreview.make})
                  </span>
                )}
                <span className="rounded-md border border-blue-200 bg-white px-2 py-0.5 shadow-xs dark:border-blue-800 dark:bg-slate-800">
                  المنشأ: {wmiPreview.countryAr}
                </span>
                {wmiPreview.year != null && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    سنة الموديل: {wmiPreview.year}
                  </span>
                )}
              </div>
            )}

            {vin && !validation.isValid && (
              <p className="px-1 text-xs font-semibold text-rose-600">
                {validation.error === 'INVALID_LENGTH'
                  ? 'رقم الشاصي يجب أن يكون بين 11 و 17 خانة'
                  : 'رموز غير صالحة (لا يُسمح بالأحرف I, O, Q)'}
              </p>
            )}
            {vin && validation.isValid && validation.checkDigitValid === false && (
              <p className="px-1 text-xs font-semibold text-amber-600">
                تنبيه: خانة الفحص (Check Digit) غير صحيحة — تأكد من الرقم
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                    mode === m.id
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <m.icon size={13} /> {m.label}
                </button>
              ))}
            </div>

            <Button
              size="md"
              onClick={() => {
                void handleDecode();
              }}
              disabled={!canDecode}
              isLoading={isDecoding}
              fullWidth
              className="rounded-lg font-bold shadow-md shadow-blue-500/10"
            >
              فك وتحليل رقم الشاصي 🔍
            </Button>

            {error != null && error !== '' && (
              <p className="text-xs font-semibold text-rose-600">{error}</p>
            )}
          </div>
        </div>
      ) : (
        /* ── Mode 2: Manual / PartSouq Vehicle Form ── */
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
                    onClick={() => {
                      applyPreset(p);
                    }}
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
                    onClick={() => {
                      setManualMake(mk.id);
                    }}
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
              <Input
                value={manualMake}
                onChange={e => {
                  setManualMake(e.target.value);
                }}
              />
            </div>

            {/* Model & Year Range */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <Input
                  label="الموديل / الطراز"
                  value={manualModel}
                  onChange={e => {
                    setManualModel(e.target.value);
                  }}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="من سنة"
                  value={manualYearStart}
                  onChange={e => {
                    setManualYearStart(e.target.value);
                  }}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="إلى سنة"
                  value={manualYearEnd}
                  onChange={e => {
                    setManualYearEnd(e.target.value);
                  }}
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
                  onChange={e => {
                    setManualMarket(e.target.value);
                  }}
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
                  onChange={e => {
                    setManualEngine(e.target.value);
                  }}
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  الجير / الناقل
                </span>
                <select
                  value={manualTransmission}
                  onChange={e => {
                    setManualTransmission(e.target.value);
                  }}
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
                  onChange={e => {
                    setManualDrive(e.target.value);
                  }}
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
              onChange={e => {
                setManualVinOptional(e.target.value);
              }}
            />

            <Button
              size="md"
              variant="primary"
              onClick={() => {
                void handleApplyManualVehicle();
              }}
              isLoading={isDecoding}
              disabled={!manualMake.trim()}
              fullWidth
              className="rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-700"
            >
              تثبيت بيانات السيارة والبدء بإضافة القطع 🚀
            </Button>
          </div>
        </div>
      )}

      {/* ── Active Vehicle Card & Direct Actions ── */}
      {result?.vehicle && (
        <>
          <VehicleCard
            vehicle={result.vehicle}
            source={result.source}
            confidence={result.confidence}
          />

          {/* Quick shortcut to add parts in Excel table */}
          {onNavigateToExtract && (
            <Button
              size="md"
              variant="secondary"
              onClick={onNavigateToExtract}
              className="rounded-lg border-indigo-200 bg-indigo-50 font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              fullWidth
            >
              <PackagePlus size={16} className="ml-1.5 text-indigo-600 dark:text-indigo-400" />
              إضافة قطع غيار لهذه السيارة في جدول إكسل ⚡
            </Button>
          )}

          {/* ── AI uncertainty warning ─────────────────────────── */}
          {uncertain && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    تحذير: هذه النتيجة تخمينية من الذكاء الاصطناعي وقد تكون غير دقيقة
                  </p>
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    VIN هذا لم يُعثر عليه في قاعدة بيانات NHTSA الرسمية. البيانات المعروضة تُقدَّر
                    بواسطة AI وقد تحتوي على معلومات خاطئة.
                  </p>
                  {!aiSaveConfirmed ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setAiSaveConfirmed(true);
                        }}
                        className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                      >
                        أفهم المخاطر — أريد الحفظ
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={onSave}
                      isLoading={isSaving}
                      fullWidth
                      className="rounded-lg"
                    >
                      <Save size={14} className="ml-1" /> حفظ البيانات (ثقة منخفضة)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Normal save button (vPIC / DB / Manual results) ── */}
          {!uncertain && (
            <Button
              size="md"
              variant="success"
              onClick={onSave}
              isLoading={isSaving}
              fullWidth
              className="rounded-lg font-bold shadow-md shadow-emerald-500/10"
            >
              <Save size={16} className="ml-1.5" /> حفظ بيانات الشاصي والسيارة
            </Button>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              آخر الشواصي التي تم تحليلها
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.slice(0, 10).map(h => (
              <button
                key={h.id}
                onClick={() => {
                  setEntryMode('vin');
                  setVin(h.vin);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-blue-400 dark:hover:bg-slate-700"
                title="إعادة فك هذا الشاصي"
              >
                {h.vin}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Source label helpers ─────────────────────────────────────
const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  vpic: {
    label: 'vPIC رسمي ✓',
    cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  },
  db: {
    label: 'قاعدة البيانات ✓',
    cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  },
  manual: {
    label: 'إدخال يدوي / كتالوج ✓',
    cls: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  },
  ai: {
    label: 'ذكاء اصطناعي ⚠',
    cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  },
};

const CONFIDENCE_LABELS: Record<string, { label: string; cls: string }> = {
  high: {
    label: 'عالية',
    cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  },
  medium: {
    label: 'متوسطة',
    cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  },
  low: {
    label: 'منخفضة',
    cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  },
};

interface ManualVehicleInput {
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

function buildManualVehicleInput(input: ManualVehicleInput): VehicleInfo {
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

const rangeLabel = (v: VehicleInfo): string | null => {
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

function buildVehicleRows(vehicle: VehicleInfo): Array<[string, string]> {
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

function VehicleCard({
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
/* eslint-enable max-lines-per-function, complexity */
