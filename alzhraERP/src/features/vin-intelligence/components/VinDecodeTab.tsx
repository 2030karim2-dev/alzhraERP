import React, { useState } from 'react';
import { ScanLine, Sparkles, Database, History, Car, Save, AlertTriangle, Edit3, PackagePlus } from 'lucide-react';
import Input from '../../../ui/base/Input';
import Button from '../../../ui/base/Button';
import Card from '../../../ui/base/Card';
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
    <div className="space-y-2">
      {/* ── Main Mode Switch (VIN Lookup vs Manual / PartSouq) ── */}
      <div className="flex bg-[var(--app-bg-surface)] p-1 rounded-[var(--radius)] border border-[var(--app-border)] gap-1">
        <button
          type="button"
          onClick={() => { setEntryMode('vin'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[var(--radius)] text-[11px] font-bold transition-all',
            entryMode === 'vin'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
          )}
        >
          <ScanLine size={13} />
          فك الشاصي التلقائي (VIN)
        </button>
        <button
          type="button"
          onClick={() => { setEntryMode('manual'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[var(--radius)] text-[11px] font-bold transition-all',
            entryMode === 'manual'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
          )}
        >
          <Edit3 size={13} />
          إدخال يدوي (بارت سوق / كتالوج)
        </button>
      </div>

      {entryMode === 'vin' ? (
        /* ── Mode 1: VIN Lookup Form ── */
        <Card isMicro>
          <div className="space-y-2">
            <Input
              variant="micro"
              label="رقم الشاصي (VIN)"
              placeholder="مثال: JTDBR32E100001234"
              value={vin}
              onChange={(e) => { setVin(e.target.value); }}
              onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
              icon={<ScanLine />}
            />
            {vin && !validation.isValid && (
              <p className="text-[10px] text-rose-600 font-semibold px-1">
                {validation.error === 'INVALID_LENGTH'
                  ? 'رقم الشاصي يجب أن يكون بين 11 و 17 خانة'
                  : 'رموز غير صالحة (لا يُسمح بالأحرف I, O, Q)'}
              </p>
            )}
            {vin && validation.isValid && validation.checkDigitValid === false && (
              <p className="text-[10px] text-amber-600 font-semibold px-1">
                تنبيه: خانة الفحص (Check Digit) غير صحيحة — تأكد من الرقم
              </p>
            )}

            <div className="flex flex-wrap gap-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius)] text-[10px] font-bold border transition-colors',
                    mode === m.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]',
                  )}
                >
                  <m.icon size={12} /> {m.label}
                </button>
              ))}
            </div>

            <Button size="sm" onClick={handleDecode} disabled={!canDecode} isLoading={isDecoding} fullWidth>
              فك الشاصي
            </Button>

            {error && <p className="text-[10px] text-rose-600 font-semibold">{error}</p>}
          </div>
        </Card>
      ) : (
        /* ── Mode 2: Manual / PartSouq Vehicle Form ── */
        <Card isMicro>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
              <span className="text-[11px] font-black text-indigo-600">
                إدخال بيانات ومواصفات السيارة (كتالوج / PartSouq)
              </span>
              <span className="text-[9px] text-[var(--app-text-secondary)]">
                يربط القطع بالمركبة ويولد الأسماء تلقائياً
              </span>
            </div>

            {/* Quick Vehicle Presets */}
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
              <label className="text-[9px] font-bold text-indigo-700 block mb-1">
                ⚡ تعبئة سريعة لأشهر السيارات في السوق:
              </label>
              <div className="flex flex-wrap gap-1">
                {QUICK_VEHICLE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { applyPreset(p); }}
                    className="px-2 py-0.5 text-[9px] font-bold rounded bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Make Selection */}
            <div>
              <label className="text-[9px] font-bold text-[var(--app-text-secondary)] block mb-1">
                الشركة المصنعة
              </label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {POPULAR_MAKES.map((mk) => (
                  <button
                    key={mk}
                    type="button"
                    onClick={() => { setManualMake(mk); }}
                    className={cn(
                      'px-2 py-0.5 text-[9px] font-bold rounded border transition-colors',
                      manualMake === mk
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-[var(--app-bg)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]'
                    )}
                  >
                    {mk}
                  </button>
                ))}
              </div>
              <Input
                variant="micro"
                value={manualMake}
                onChange={(e) => { setManualMake(e.target.value); }}
                placeholder="أو اكتب الشركة (مثل: تويوتا، نيسان...)"
              />
            </div>

            {/* Model & Year Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <div className="md:col-span-1">
                <Input
                  variant="micro"
                  label="الموديل / الطراز"
                  value={manualModel}
                  onChange={(e) => { setManualModel(e.target.value); }}
                  placeholder="مثال: كورولا، كامري، هايلوكس"
                />
              </div>
              <div>
                <Input
                  variant="micro"
                  type="number"
                  label="من سنة"
                  value={manualYearStart}
                  onChange={(e) => { setManualYearStart(e.target.value); }}
                  placeholder="مثال: 2001"
                />
              </div>
              <div>
                <Input
                  variant="micro"
                  type="number"
                  label="إلى سنة"
                  value={manualYearEnd}
                  onChange={(e) => { setManualYearEnd(e.target.value); }}
                  placeholder="مثال: 2007"
                />
              </div>
            </div>

            {/* Market & Engine & Transmission & Drive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              <div>
                <label className="text-[9px] font-bold text-[var(--app-text-secondary)] block mb-0.5">
                  الوارد / المواصفات
                </label>
                <select
                  value={manualMarket}
                  onChange={(e) => { setManualMarket(e.target.value); }}
                  className="w-full h-[28px] px-2 text-[10px] font-bold bg-[var(--app-bg)] border border-[var(--app-border)] rounded-[var(--radius)] text-[var(--app-text)] focus:outline-none focus:border-indigo-500"
                >
                  {POPULAR_MARKETS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="">أخرى / عام</option>
                </select>
              </div>

              <div>
                <Input
                  variant="micro"
                  label="المكينة / السعة"
                  value={manualEngine}
                  onChange={(e) => { setManualEngine(e.target.value); }}
                  placeholder="مثال: 1.8 أو 2.4"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--app-text-secondary)] block mb-0.5">
                  الجير / الناقل
                </label>
                <select
                  value={manualTransmission}
                  onChange={(e) => { setManualTransmission(e.target.value); }}
                  className="w-full h-[28px] px-2 text-[10px] font-bold bg-[var(--app-bg)] border border-[var(--app-border)] rounded-[var(--radius)] text-[var(--app-text)] focus:outline-none focus:border-indigo-500"
                >
                  <option value="تماتيك">تماتيك (أوتوماتيك)</option>
                  <option value="عادي">عادي (مانيوال)</option>
                  <option value="">غير محدد</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--app-text-secondary)] block mb-0.5">
                  الدفع
                </label>
                <select
                  value={manualDrive}
                  onChange={(e) => { setManualDrive(e.target.value); }}
                  className="w-full h-[28px] px-2 text-[10px] font-bold bg-[var(--app-bg)] border border-[var(--app-border)] rounded-[var(--radius)] text-[var(--app-text)] focus:outline-none focus:border-indigo-500"
                >
                  <option value="سنجل">سنجل (أمامي / خلفي)</option>
                  <option value="دبل">دبل (4x4 / AWD)</option>
                  <option value="">غير محدد</option>
                </select>
              </div>
            </div>

            {/* Optional VIN Number */}
            <Input
              variant="micro"
              label="رقم الشاصي VIN (اختياري)"
              value={manualVinOptional}
              onChange={(e) => { setManualVinOptional(e.target.value); }}
              placeholder="إذا كان رقم الشاصي متوفراً لديك من موقع بارت سوق"
            />

            <Button
              size="sm"
              variant="primary"
              onClick={handleApplyManualVehicle}
              isLoading={isDecoding}
              disabled={!manualMake.trim()}
              fullWidth
            >
              تثبيت بيانات السيارة والبدء بإضافة القطع 🚀
            </Button>
          </div>
        </Card>
      )}

      {/* ── Active Vehicle Card & Direct Actions ── */}
      {result?.vehicle && (
        <>
          <VehicleCard vehicle={result.vehicle} source={result.source} confidence={result.confidence} />

          {/* Quick shortcut to add parts in Excel table */}
          {onNavigateToExtract && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onNavigateToExtract}
              className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-bold"
              fullWidth
            >
              <PackagePlus size={14} className="ml-1 text-indigo-600" />
              إضافة قطع غيار لهذه السيارة في جدول إكسل ⚡
            </Button>
          )}

          {/* ── AI uncertainty warning ─────────────────────────── */}
          {uncertain && (
            <Card isMicro>
              <div className="flex items-start gap-2 p-1">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="text-[10px] font-bold text-amber-700">
                    تحذير: هذه النتيجة تخمينية من الذكاء الاصطناعي وقد تكون غير دقيقة
                  </p>
                  <p className="text-[9px] text-amber-600 leading-relaxed">
                    VIN هذا لم يُعثر عليه في قاعدة بيانات NHTSA الرسمية. البيانات المعروضة تُقدَّر بواسطة AI
                    وقد تحتوي على معلومات خاطئة. لا تعتمد عليها لربط القطع أو الفواتير.
                  </p>
                  {!aiSaveConfirmed ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setAiSaveConfirmed(true); }}
                        className="text-[9px] font-bold px-2 py-1 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        أفهم المخاطر — أريد الحفظ
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" variant="success" onClick={onSave} isLoading={isSaving} fullWidth>
                      <Save size={14} className="ml-1" /> حفظ البيانات (ثقة منخفضة)
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── Normal save button (vPIC / DB / Manual results) ── */}
          {!uncertain && (
            <Button size="sm" variant="success" onClick={onSave} isLoading={isSaving} fullWidth>
              <Save size={14} className="ml-1" /> حفظ بيانات الشاصي والسيارة
            </Button>
          )}
        </>
      )}

      {history.length > 0 && (
        <Card isMicro>
          <div className="flex items-center gap-1.5 mb-1.5">
            <History size={12} className="text-[var(--app-text-secondary)]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
              آخر الشواصي التي تم تحليلها
            </h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {history.slice(0, 10).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setEntryMode('vin');
                  setVin(h.vin);
                }}
                className="px-2 py-1 rounded-[var(--radius)] text-[10px] font-mono font-bold bg-[var(--app-bg)] border border-[var(--app-border)] text-blue-600 hover:bg-[var(--app-surface-hover)]"
                title="إعادة فك هذا الشاصي"
              >
                {h.vin}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ── Source label helpers ─────────────────────────────────────
const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  vpic:   { label: 'vPIC رسمي ✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  db:     { label: 'قاعدة البيانات ✓', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  manual: { label: 'إدخال يدوي / كتالوج ✓', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ai:     { label: 'ذكاء اصطناعي ⚠', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const CONFIDENCE_LABELS: Record<string, { label: string; cls: string }> = {
  high:   { label: 'عالية', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  medium: { label: 'متوسطة', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { label: 'منخفضة', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
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
    <Card isMicro className="border-indigo-200">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Car size={14} className="text-indigo-600" />
          <h3 className="text-[11px] font-black tracking-wide text-[var(--app-text)]">
            {vehicle.make} {vehicle.model ?? ''} {years ? `(${years})` : ''}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${srcInfo.cls}`}>
            {srcInfo.label}
          </span>
          {confInfo && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${confInfo.cls}`}>
              ثقة: {confInfo.label}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg px-2 py-1">
            <p className="text-[8px] font-black uppercase text-[var(--app-text-secondary)]">{k}</p>
            <p className="text-[11px] font-bold text-[var(--app-text)] truncate">{v}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
