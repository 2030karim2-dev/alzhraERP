import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  History,
  AlertTriangle,
  Save,
  Edit3,
  PackagePlus,
  PackageSearch,
} from 'lucide-react';
import Input from '../../../ui/base/Input';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import { validateVin } from '../utils/vinValidator';
import { preDecodeVin } from '../utils/wmiDecoder';
import { parseCatalogVehicleText } from '../utils/catalogTextExtractor';
import type { VinAnalysisRecord, VinDecodeMode, VinDecodeResult, VehicleInfo } from '../types';
import { VehicleCard, buildManualVehicleInput } from './decode/VehicleCard';
import { VinManualVehicleForm } from './decode/VinManualVehicleForm';

interface VinDecodeTabProps {
  isDecoding: boolean;
  error: string | null;
  result: VinDecodeResult | null;
  history: VinAnalysisRecord[];
  onDecode: (vin: string, mode: VinDecodeMode) => Promise<void>;
  onSetManualVehicle?: (vehicle: VehicleInfo, vinNumber?: string) => Promise<VinDecodeResult>;
  onUpdateVehicle?: (vehicle: VehicleInfo) => void;
  onSave: () => void;
  onNavigateToExtract?: () => void;
  onNavigateToInventory?: () => void;
  isSaving: boolean;
}

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
  onUpdateVehicle,
  onSave,
  onNavigateToExtract,
  onNavigateToInventory,
  isSaving,
}) => {
  const [entryMode, setEntryMode] = useState<'vin' | 'manual'>('vin');
  const [vin, setVin] = useState('');
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

  const handleVinChange = (rawInput: string): void => {
    if (
      rawInput.includes('\n') ||
      rawInput.includes('http') ||
      rawInput.includes('[') ||
      rawInput.includes('ModelCode') ||
      rawInput.toLowerCase().includes('partsouq') ||
      rawInput.toLowerCase().includes('catalog')
    ) {
      // It's a catalog paste — sanitize and extract all structured attributes automatically
      const parsed = parseCatalogVehicleText(rawInput);
      if (parsed.vin) {
        setVin(parsed.vin);
        setManualVinOptional(parsed.vin);
      }
      if (parsed.makeAr || parsed.make) setManualMake(parsed.makeAr || parsed.make || 'تويوتا');
      if (parsed.model) setManualModel(parsed.model);
      if (parsed.yearStart) setManualYearStart(parsed.yearStart);
      if (parsed.yearEnd) setManualYearEnd(parsed.yearEnd);
      if (parsed.market) setManualMarket(parsed.market);
      if (parsed.engine) setManualEngine(parsed.engine);
      if (parsed.transmission) setManualTransmission(parsed.transmission);
      if (parsed.drive) setManualDrive(parsed.drive);
    } else {
      setVin(rawInput.toUpperCase());
    }
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
    await onDecode(vin, 'hybrid');
  };

  const handleApplyManualVehicle = async (): Promise<void> => {
    if (!manualMake.trim()) return;
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
      {/* Main Mode Switch (VIN Lookup vs Manual / PartSouq) */}
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
          إدخال يدوي (اختيار السيارة بالموديل)
        </button>
      </div>

      {entryMode === 'vin' ? (
        /* Mode 1: VIN Lookup Form */
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3">
            <Input
              label="أدخل رقم الشاصي (VIN) أو الصق نص الكتالوج"
              placeholder="مثال: JTDBR32E100001234 أو الصق بيانات PartSouq مباشرة..."
              value={vin}
              onChange={e => {
                handleVinChange(e.target.value);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleDecode();
              }}
              icon={<ScanLine className="text-blue-600" />}
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
                تنبيه: خانة الفحص (Check Digit) غير صحيحة — تأكد من صحة الحروف والأرقام
              </p>
            )}

            <Button
              size="md"
              onClick={() => void handleDecode()}
              disabled={!canDecode}
              isLoading={isDecoding}
              fullWidth
              className="h-11 rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/15 transition-all hover:bg-blue-700"
            >
              فك وتحليل بيانات المركبة 🔍
            </Button>

            {error != null && error !== '' && (
              <p className="text-xs font-semibold text-rose-600">{error}</p>
            )}
          </div>
        </div>
      ) : (
        /* Mode 2: Manual / PartSouq Vehicle Form */
        <VinManualVehicleForm
          manualMake={manualMake}
          setManualMake={setManualMake}
          manualModel={manualModel}
          setManualModel={setManualModel}
          manualYearStart={manualYearStart}
          setManualYearStart={setManualYearStart}
          manualYearEnd={manualYearEnd}
          setManualYearEnd={setManualYearEnd}
          manualMarket={manualMarket}
          setManualMarket={setManualMarket}
          manualEngine={manualEngine}
          setManualEngine={setManualEngine}
          manualTransmission={manualTransmission}
          setManualTransmission={setManualTransmission}
          manualDrive={manualDrive}
          setManualDrive={setManualDrive}
          manualVinOptional={manualVinOptional}
          setManualVinOptional={setManualVinOptional}
          onApplyManualVehicle={handleApplyManualVehicle}
          isDecoding={isDecoding}
        />
      )}

      {/* Active Vehicle Card & Direct Guided Actions */}
      {result?.vehicle && (
        <div className="space-y-4">
          <VehicleCard
            vehicle={result.vehicle}
            source={result.source}
            confidence={result.confidence}
            onUpdateVehicle={onUpdateVehicle}
          />

          {/* Guided Next-Step Actions */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
            <h4 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-200">
              الخطوة التالية الموصى بها لهذه المركبة:
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {onNavigateToInventory && (
                <Button
                  size="md"
                  onClick={onNavigateToInventory}
                  className="rounded-xl border border-blue-200 bg-white font-bold text-blue-700 shadow-sm transition-all hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                >
                  <PackageSearch size={16} className="ml-1.5 text-blue-600 dark:text-blue-400" />
                  قطع المخزون المتطابقة 📦
                </Button>
              )}

              {onNavigateToExtract && (
                <Button
                  size="md"
                  onClick={onNavigateToExtract}
                  className="rounded-xl bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                >
                  <PackagePlus size={16} className="ml-1.5 text-white" />
                  تسعير واستخراج قطع جديدة ➕
                </Button>
              )}

              {!uncertain && (
                <Button
                  size="md"
                  variant="success"
                  onClick={onSave}
                  isLoading={isSaving}
                  className="rounded-xl font-bold shadow-sm shadow-emerald-500/20"
                >
                  <Save size={16} className="ml-1.5" />
                  حفظ السيارة في السجل ⭐
                </Button>
              )}
            </div>
          </div>

          {/* AI uncertainty warning */}
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
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              آخر الشواصي التي تم تحليلها مؤخراً
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
