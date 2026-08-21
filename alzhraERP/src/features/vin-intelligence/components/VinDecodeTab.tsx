import React, { useState } from 'react';
import { ScanLine, Sparkles, Database, History, Car, Save, AlertTriangle, Edit3, PackagePlus } from 'lucide-react';
import Input from '../../../ui/base/Input';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import { validateVin } from '../utils/vinValidator';
import { driveLabel, fuelLabel, transLabel } from '../utils/vehicleLabels';
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

/** Popular vehicle manufacturers for quick selection */
const POPULAR_MAKES = ['تويوتا', 'نيسان', 'هيونداي', 'كيا', 'شفروليه', 'جمس', 'فورد', 'هوندا', 'إيسوزو', 'ميتسوبيشي', 'مازدا', 'لكزس'];

/** Popular markets/specs */
const POPULAR_MARKETS = ['خليجي', 'وارد أمريكي', 'وارد ياباني', 'سعودي', 'كوري', 'أوروبي'];

/** Quick presets for popular vehicles in Yemen & Gulf market */
const QUICK_VEHICLE_PRESETS = [
  { label: 'كورولا (2001-2007)', make: 'تويوتا', model: 'كورولا', yStart: '2001', yEnd: '2007', market: 'خليجي', engine: '1.8', trans: 'تماتيك', drive: 'سنجل' },
  { label: 'هايلوكس (2006-2015)', make: 'تويوتا', model: 'هايلوكس', yStart: '2006', yEnd: '2015', market: 'خليجي', engine: '2.7', trans: 'عادي', drive: 'دبل' },
  { label: 'شاص (2007-2022)', make: 'تويوتا', model: 'شاص', yStart: '2007', yEnd: '2022', market: 'خليجي', engine: '4.0', trans: 'عادي', drive: 'دبل' },
  { label: 'كامري (2003-2006)', make: 'تويوتا', model: 'كامري', yStart: '2003', yEnd: '2006', market: 'خليجي', engine: '2.4', trans: 'تماتيك', drive: 'سنجل' },
  { label: 'يارس (2006-2013)', make: 'تويوتا', model: 'يارس', yStart: '2006', yEnd: '2013', market: 'خليجي', engine: '1.3', trans: 'تماتيك', drive: 'سنجل' },
  { label: 'سنتافي (2013-2018)', make: 'هيونداي', model: 'سنتافي', yStart: '2013', yEnd: '2018', market: 'وارد أمريكي', engine: '3.3', trans: 'تماتيك', drive: 'دبل' },
  { label: 'توسان (2016-2020)', make: 'هيونداي', model: 'توسان', yStart: '2016', yEnd: '2020', market: 'خليجي', engine: '2.0', trans: 'تماتيك', drive: 'سنجل' },
];

/** Result is considered "uncertain" when it comes from AI with low/medium confidence. */
function isUncertainResult(result: VinDecodeResult | null): boolean {
  if (!result) return false;
  return result.source === 'ai' && (result.confidence === 'low' || result.confidence === 'medium');
}

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

  const applyPreset = (preset: typeof QUICK_VEHICLE_PRESETS[0]) => {
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
  const prevVinRef = React.useRef<string | null>(null);
  if (result?.vin && result.vin !== prevVinRef.current) {
    prevVinRef.current = result.vin;
    Promise.resolve().then(() => { setAiSaveConfirmed(false); });
  }

  const validation = validateVin(vin);
  const canDecode = vin.trim().length > 0 && validation.isValid && !isDecoding;
  const uncertain = isUncertainResult(result);

  const handleDecode = async () => {
    if (!canDecode) return;
    await onDecode(vin, mode);
  };

  const handleApplyManualVehicle = async () => {
    if (!manualMake.trim()) return;
    const yStart = parseInt(manualYearStart, 10) || undefined;
    const yEnd = parseInt(manualYearEnd, 10) || undefined;
    const vehicleData: VehicleInfo = {
      make: manualMake.trim(),
      model: manualModel.trim() || null,
      year: yStart ?? null,
      yearStart: yStart ?? null,
      yearEnd: (yEnd || yStart) ?? null,
      market: manualMarket.trim() || null,
      displacement: manualEngine.trim() || null,
      engine: manualEngine.trim() || null,
      transmission: manualTransmission.trim() || null,
      driveType: manualDrive.trim() || null,
    };

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
      <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => { setEntryMode('vin'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all',
            entryMode === 'vin'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          <ScanLine size={15} />
          فك الشاصي التلقائي (VIN)
        </button>
        <button
          type="button"
          onClick={() => { setEntryMode('manual'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all',
            entryMode === 'manual'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          <Edit3 size={15} />
          إدخال يدوي (بارت سوق / كتالوج)
        </button>
      </div>

      {entryMode === 'vin' ? (
        /* ── Mode 1: VIN Lookup Form ── */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-3">
            <Input
              label="رقم الشاصي (VIN)"
              value={vin}
              onChange={(e) => { setVin(e.target.value.toUpperCase()); }}
              onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
              icon={<ScanLine />}
            />
            {vin && !validation.isValid && (
              <p className="text-xs text-rose-600 font-semibold px-1">
                {validation.error === 'INVALID_LENGTH'
                  ? 'رقم الشاصي يجب أن يكون بين 11 و 17 خانة'
                  : 'رموز غير صالحة (لا يُسمح بالأحرف I, O, Q)'}
              </p>
            )}
            {vin && validation.isValid && validation.checkDigitValid === false && (
              <p className="text-xs text-amber-600 font-semibold px-1">
                تنبيه: خانة الفحص (Check Digit) غير صحيحة — تأكد من الرقم
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                    mode === m.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <m.icon size={13} /> {m.label}
                </button>
              ))}
            </div>

            <Button size="md" onClick={handleDecode} disabled={!canDecode} isLoading={isDecoding} fullWidth className="rounded-lg font-bold shadow-md shadow-blue-500/10">
              فك وتحليل رقم الشاصي 🔍
            </Button>

            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          </div>
        </div>
      ) : (
        /* ── Mode 2: Manual / PartSouq Vehicle Form ── */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                إدخال مواصفات السيارة (كتالوج / PartSouq)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                يربط القطع بالمركبة ويولد الأسماء تلقائياً
              </span>
            </div>

            {/* Quick Vehicle Presets */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mb-1.5">
                ⚡ تعبئة سريعة لأشهر السيارات في السوق:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_VEHICLE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { applyPreset(p); }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors shadow-sm"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Make Selection */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                الشركة المصنعة
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {POPULAR_MAKES.map((mk) => (
                  <button
                    key={mk}
                    type="button"
                    onClick={() => { setManualMake(mk); }}
                    className={cn(
                      'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all',
                      manualMake === mk
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {mk}
                  </button>
                ))}
              </div>
              <Input
                value={manualMake}
                onChange={(e) => { setManualMake(e.target.value); }}
              />
            </div>

            {/* Model & Year Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Input
                  label="الموديل / الطراز"
                  value={manualModel}
                  onChange={(e) => { setManualModel(e.target.value); }}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="من سنة"
                  value={manualYearStart}
                  onChange={(e) => { setManualYearStart(e.target.value); }}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="إلى سنة"
                  value={manualYearEnd}
                  onChange={(e) => { setManualYearEnd(e.target.value); }}
                />
              </div>
            </div>

            {/* Market & Engine & Transmission & Drive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الوارد / المواصفات
                </label>
                <select
                  value={manualMarket}
                  onChange={(e) => { setManualMarket(e.target.value); }}
                  className="w-full py-2 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {POPULAR_MARKETS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="">أخرى / عام</option>
                </select>
              </div>

              <div>
                <Input
                  label="المكينة / السعة"
                  value={manualEngine}
                  onChange={(e) => { setManualEngine(e.target.value); }}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الجير / الناقل
                </label>
                <select
                  value={manualTransmission}
                  onChange={(e) => { setManualTransmission(e.target.value); }}
                  className="w-full py-2 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="تماتيك">تماتيك (أوتوماتيك)</option>
                  <option value="عادي">عادي (مانيوال)</option>
                  <option value="">غير محدد</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الدفع
                </label>
                <select
                  value={manualDrive}
                  onChange={(e) => { setManualDrive(e.target.value); }}
                  className="w-full py-2 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              onChange={(e) => { setManualVinOptional(e.target.value); }}
            />

            <Button
              size="md"
              variant="primary"
              onClick={handleApplyManualVehicle}
              isLoading={isDecoding}
              disabled={!manualMake.trim()}
              fullWidth
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-500/10"
            >
              تثبيت بيانات السيارة والبدء بإضافة القطع 🚀
            </Button>
          </div>
        </div>
      )}

      {/* ── Active Vehicle Card & Direct Actions ── */}
      {result?.vehicle && (
        <>
          <VehicleCard vehicle={result.vehicle} source={result.source} confidence={result.confidence} />

          {/* Quick shortcut to add parts in Excel table */}
          {onNavigateToExtract && (
            <Button
              size="md"
              variant="secondary"
              onClick={onNavigateToExtract}
              className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 font-bold rounded-lg"
              fullWidth
            >
              <PackagePlus size={16} className="ml-1.5 text-indigo-600 dark:text-indigo-400" />
              إضافة قطع غيار لهذه السيارة في جدول إكسل ⚡
            </Button>
          )}

          {/* ── AI uncertainty warning ─────────────────────────── */}
          {uncertain && (
            <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    تحذير: هذه النتيجة تخمينية من الذكاء الاصطناعي وقد تكون غير دقيقة
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    VIN هذا لم يُعثر عليه في قاعدة بيانات NHTSA الرسمية. البيانات المعروضة تُقدَّر بواسطة AI
                    وقد تحتوي على معلومات خاطئة.
                  </p>
                  {!aiSaveConfirmed ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setAiSaveConfirmed(true); }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      >
                        أفهم المخاطر — أريد الحفظ
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" variant="success" onClick={onSave} isLoading={isSaving} fullWidth className="rounded-lg">
                      <Save size={14} className="ml-1" /> حفظ البيانات (ثقة منخفضة)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Normal save button (vPIC / DB / Manual results) ── */}
          {!uncertain && (
            <Button size="md" variant="success" onClick={onSave} isLoading={isSaving} fullWidth className="rounded-lg font-bold shadow-md shadow-emerald-500/10">
              <Save size={16} className="ml-1.5" /> حفظ بيانات الشاصي والسيارة
            </Button>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              آخر الشواصي التي تم تحليلها
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.slice(0, 10).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setEntryMode('vin');
                  setVin(h.vin);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
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
  vpic:   { label: 'vPIC رسمي ✓', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' },
  db:     { label: 'قاعدة البيانات ✓', cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60' },
  manual: { label: 'إدخال يدوي / كتالوج ✓', cls: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60' },
  ai:     { label: 'ذكاء اصطناعي ⚠', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' },
};

const CONFIDENCE_LABELS: Record<string, { label: string; cls: string }> = {
  high:   { label: 'عالية', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' },
  medium: { label: 'متوسطة', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' },
  low:    { label: 'منخفضة', cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' },
};

function VehicleCard({
  vehicle,
  source,
  confidence,
}: {
  vehicle: VehicleInfo;
  source: string;
  confidence: string | null;
}) {
  const years = vehicle.yearStart && vehicle.yearEnd && vehicle.yearStart !== vehicle.yearEnd
    ? `${vehicle.yearStart}-${vehicle.yearEnd}`
    : vehicle.year ? String(vehicle.year) : null;

  const rows: Array<[string, string]> = (
    [
      ['الشركة المصنعة', vehicle.make],
      ['الموديل / الطراز', vehicle.model ?? null],
      ['سنة / سنوات الصنع', years],
      ['حجم المكينة', vehicle.displacement ? vehicle.displacement : null],
      ['عدد السلندر', vehicle.cylinders ? `${vehicle.cylinders} سلندر` : null],
      ['المحرك', vehicle.engine ?? null],
      ['الوقود', vehicle.fuelType ? fuelLabel(vehicle.fuelType) : null],
      ['الدفع', vehicle.driveType ? driveLabel(vehicle.driveType) : null],
      ['الجير', vehicle.transmission ? transLabel(vehicle.transmission) : null],
      ['الوارد / المواصفات', vehicle.market ?? null],
      ['بلد الصنع', vehicle.region ?? null],
    ] as Array<[string, string | null]>
  ).filter(([, v]) => !!v) as Array<[string, string]>;

  const srcInfo = SOURCE_LABELS[source] ?? SOURCE_LABELS.ai;
  const confInfo = confidence ? (CONFIDENCE_LABELS[confidence] ?? null) : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Car size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {vehicle.make} {vehicle.model ?? ''} {years ? `(${years})` : ''}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">مواصفات المركبة المفكوكة</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${srcInfo.cls}`}>
            {srcInfo.label}
          </span>
          {confInfo && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${confInfo.cls}`}>
              ثقة: {confInfo.label}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-0.5">{k}</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
