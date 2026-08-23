import React, { useState } from 'react';
import { Car, Save, Sparkles, Hash } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import type { VehicleInfo } from '../types';

interface ManualVinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: VehicleInfo, vinNumber: string) => Promise<void>;
  onSaveAndExtract?: (vehicle: VehicleInfo, vinNumber: string) => Promise<void>;
}

const COMMON_MAKES = [
  { id: 'Toyota', nameAr: 'تويوتا' },
  { id: 'Nissan', nameAr: 'نيسان' },
  { id: 'Hyundai', nameAr: 'هيونداي' },
  { id: 'Kia', nameAr: 'كيا' },
  { id: 'Honda', nameAr: 'هوندا' },
  { id: 'Isuzu', nameAr: 'إيسوزو' },
  { id: 'Mitsubishi', nameAr: 'ميتسوبيشي' },
  { id: 'Mazda', nameAr: 'مازدا' },
  { id: 'Ford', nameAr: 'فورد' },
  { id: 'Chevrolet', nameAr: 'شفروليه' },
  { id: 'GMC', nameAr: 'جمس' },
  { id: 'Suzuki', nameAr: 'سوزوكي' },
  { id: 'Lexus', nameAr: 'لكزس' },
];

const POPULAR_MODELS_BY_MAKE: Record<string, Array<{ model: string; modelAr: string }>> = {
  Toyota: [
    { model: 'Vitz', modelAr: 'فيتز' },
    { model: 'Passo', modelAr: 'باسو' },
    { model: 'Yaris', modelAr: 'يارس' },
    { model: 'Corolla', modelAr: 'كورولا' },
    { model: 'Camry', modelAr: 'كامري' },
    { model: 'Hilux', modelAr: 'هايلوكس' },
    { model: 'Land Cruiser 70', modelAr: 'شاص' },
    { model: 'Land Cruiser', modelAr: 'لاندكروزر' },
    { model: 'Prado', modelAr: 'برادو' },
    { model: 'Rush', modelAr: 'راش' },
    { model: 'Prius', modelAr: 'بريوس' },
    { model: 'RAV4', modelAr: 'راف فور' },
    { model: 'Hiace', modelAr: 'هايس' },
  ],
  Nissan: [
    { model: 'Patrol', modelAr: 'باترول' },
    { model: 'Sunny', modelAr: 'صني' },
    { model: 'Altima', modelAr: 'ألتيما' },
    { model: 'Maxima', modelAr: 'مكسيما' },
    { model: 'Navara', modelAr: 'نافارا' },
    { model: 'Pathfinder', modelAr: 'باثفايندر' },
  ],
  Hyundai: [
    { model: 'Accent', modelAr: 'أكسنت' },
    { model: 'Elantra', modelAr: 'إلنترا' },
    { model: 'Sonata', modelAr: 'سوناتا' },
    { model: 'Tucson', modelAr: 'توسان' },
    { model: 'Santa Fe', modelAr: 'سنتافي' },
    { model: 'Azera', modelAr: 'أزيرا' },
  ],
  Kia: [
    { model: 'Cerato', modelAr: 'سيراتو' },
    { model: 'Optima', modelAr: 'أوبتيما' },
    { model: 'Sportage', modelAr: 'سبورتاج' },
    { model: 'Sorento', modelAr: 'سورينتو' },
    { model: 'Pegas', modelAr: 'بيجاس' },
  ],
  Honda: [
    { model: 'Civic', modelAr: 'سيفيك' },
    { model: 'Accord', modelAr: 'أكورد' },
    { model: 'CR-V', modelAr: 'سي آر في' },
    { model: 'City', modelAr: 'سيتي' },
  ],
  Isuzu: [
    { model: 'D-Max', modelAr: 'ديماكس' },
    { model: 'NPR', modelAr: 'دينا' },
    { model: 'MUX', modelAr: 'إم يو إكس' },
  ],
  Mitsubishi: [
    { model: 'Pajero', modelAr: 'باجيرو' },
    { model: 'Lancer', modelAr: 'لانسر' },
    { model: 'L200', modelAr: 'إل 200' },
    { model: 'Canter', modelAr: 'كانتر' },
  ],
};

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

  const activeMake = make === 'OTHER' ? customMake.trim() : make;
  const activeModel = model;

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
    if (transmission) veh.transmission = transmission;
    if (driveType) veh.driveType = driveType;
    if (fuelType) veh.fuelType = fuelType;
    if (market) veh.market = market;
    if (submodel.trim()) veh.submodel = submodel.trim();
    return veh;
  };

  const handleSaveOnly = async () => {
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

  const handleSaveAndExtractAction = async () => {
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
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            إلغاء
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveOnly}
              isLoading={isSaving}
              disabled={!activeMake || isSaving}
              className="font-bold text-xs rounded-xl border-slate-300 dark:border-slate-700"
            >
              <Save size={14} className="ml-1 text-slate-600 dark:text-slate-300" />
              حفظ الشاصي فقط
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAndExtractAction}
              isLoading={isSaving}
              disabled={!activeMake || isSaving}
              className="font-bold text-xs rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              <Sparkles size={14} className="ml-1 text-amber-300" />
              حفظ والانتقال لجدول القطع الذكي ⚡
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-cairo">
        {/* VIN Number / Chassis */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Hash size={14} className="text-blue-600 dark:text-blue-400" />
            <span>رقم الشاصي (VIN) أو رقم الهيكل (اختياري):</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={vinNumber}
              onChange={(e) => setVinNumber(e.target.value.toUpperCase())}
              placeholder="مثال: KSP90-5012345 أو JTEBU25J56..."
              className="w-full px-3 py-2 font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            إذا لم يتوفر رقم شاصي كامل، سيقوم النظام تلقائياً بتوليد معرّف يدوي فريد للمركبة.
          </p>
        </div>

        {/* Make Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الشركة الصانعة (Make):</label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
            {COMMON_MAKES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMake(m.id);
                  const firstModel = POPULAR_MODELS_BY_MAKE[m.id]?.[0]?.model || '';
                  setModel(firstModel || '');
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-xl border transition-all',
                  make === m.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                )}
              >
                {m.nameAr} ({m.id})
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setMake('OTHER'); setModel('OTHER'); }}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-xl border transition-all',
                make === 'OTHER'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              )}
            >
              أخرى...
            </button>
          </div>
          {make === 'OTHER' && (
            <input
              type="text"
              value={customMake}
              onChange={(e) => setCustomMake(e.target.value)}
              placeholder="اكتب اسم الشركة الصانعة..."
              className="w-full mt-2 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
            />
          )}
        </div>

        {/* Model Selection & Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الموديل / الطراز (Model):</label>
          {POPULAR_MODELS_BY_MAKE[make] && POPULAR_MODELS_BY_MAKE[make].length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {POPULAR_MODELS_BY_MAKE[make].map((md) => (
                <button
                  key={md.model}
                  type="button"
                  onClick={() => setModel(md.model)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all',
                    model === md.model
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                  )}
                >
                  {md.modelAr} ({md.model})
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="مثال: Vitz أو فيتز أو Hilux..."
            className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Grid: Year, Engine, Market, Submodel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Year */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">سنة الصنع:</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Displacement / Engine */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">سعة المحرك (لتر):</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={displacement}
                onChange={(e) => setDisplacement(e.target.value)}
                placeholder="1.3"
                className="w-full px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Market */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">السوق / المواصفات:</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
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
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">الفئة (اختياري):</label>
            <input
              type="text"
              value={submodel}
              onChange={(e) => setSubmodel(e.target.value)}
              placeholder="مثال: RS, G, LE, SR5"
              className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Toggles: Transmission, Drive Type, Fuel Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Transmission */}
          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">ناقل الحركة:</label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button
                type="button"
                onClick={() => setTransmission('automatic')}
                className={cn(
                  'py-1.5 text-xs font-bold rounded-lg border transition-all',
                  transmission === 'automatic'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                )}
              >
                تماتيك (Auto)
              </button>
              <button
                type="button"
                onClick={() => setTransmission('manual')}
                className={cn(
                  'py-1.5 text-xs font-bold rounded-lg border transition-all',
                  transmission === 'manual'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                )}
              >
                عادي (Manual)
              </button>
            </div>
          </div>

          {/* Drive Type */}
          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">نظام الدفع:</label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['2WD', '4WD', 'AWD'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDriveType(d)}
                  className={cn(
                    'py-1.5 text-xs font-bold rounded-lg border transition-all',
                    driveType === d
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  {d === '2WD' ? 'سنجل' : d === '4WD' ? 'دبل 4x4' : 'AWD'}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">نوع الوقود:</label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {[
                { id: 'gasoline', label: 'بنزين' },
                { id: 'diesel', label: 'ديزل' },
                { id: 'hybrid', label: 'هايبرد' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFuelType(f.id as any)}
                  className={cn(
                    'py-1.5 text-xs font-bold rounded-lg border transition-all',
                    fuelType === f.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
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
