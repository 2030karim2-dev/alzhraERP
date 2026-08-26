import React from 'react';
import { Car, Sparkles, RotateCcw } from 'lucide-react';
import Button from '../../../ui/base/Button';
import type { VehicleInfo } from '../types';

interface VehicleContextBannerProps {
  vehicle: VehicleInfo;
  makeAr: string;
  modelAr: string;
  years: string;
  customVehicleTemplate: string;
  onTemplateChange: (value: string) => void;
  onApplyGeneralization: () => void;
  onResetTemplate: () => void;
  hasRows: boolean;
  onClearDraft: () => void;
}

/* ──────────────────────────────────────────────────────────────────
   Label helpers — explicit nullish/empty handling keeps the
   strict-boolean-expressions rule satisfied.
   ────────────────────────────────────────────────────────────────── */

const vinPrefixLabel = (vinPrefix?: string | null): string =>
  vinPrefix != null && vinPrefix !== '' ? `(VIN: ${vinPrefix})` : '';

const marketLabel = (market?: string | null): string =>
  market != null && market !== '' ? `[${market}]` : '';

const transmissionLabel = (transmission?: string | null): string =>
  transmission != null && transmission !== '' ? `[${transmission}]` : '';

const displacementLabel = (displacement?: string | null): string =>
  displacement != null && displacement !== '' ? `[مكينة ${displacement}]` : '';

const yearLabel = (years: string): string => (years !== '' ? `(${years})` : '');

interface VehicleTitleBlockProps {
  vehicle: VehicleInfo;
  makeAr: string;
  modelAr: string;
  years: string;
}

const VehicleTitleBlock: React.FC<VehicleTitleBlockProps> = ({ vehicle, makeAr, modelAr, years }) => (
  <div className="flex items-center gap-3">
    <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
      <Car size={22} className="flex-shrink-0" />
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800">
          السيارة النشطة
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {vinPrefixLabel(vehicle.vinPrefix)}
        </span>
      </div>
      <h4 className="text-sm md:text-base font-bold text-white mt-1">
        {makeAr} {modelAr}{' '}
        {yearLabel(years)}{' '}
        {marketLabel(vehicle.market)}{' '}
        {transmissionLabel(vehicle.transmission)}{' '}
        {displacementLabel(vehicle.displacement)}
      </h4>
    </div>
  </div>
);

interface DraftStatusBadgeProps {
  hasRows: boolean;
  onClearDraft: () => void;
}

const DraftStatusBadge: React.FC<DraftStatusBadgeProps> = ({ hasRows, onClearDraft }) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold" title="حفظ المسودة تلقائياً في المتصفح لمنع فقدان البيانات">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>مسودة محفوظة تلقائياً 💾</span>
    </div>
    {hasRows && (
      <button
        type="button"
        onClick={onClearDraft}
        className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 text-xs font-bold transition-all"
        title="مسح المسودة والبدء من جديد"
      >
        مسح المسودة
      </button>
    )}
  </div>
);

interface GeneralizationBarProps {
  customVehicleTemplate: string;
  onTemplateChange: (value: string) => void;
  onApplyGeneralization: () => void;
  onResetTemplate: () => void;
}

const GeneralizationBar: React.FC<GeneralizationBarProps> = ({ customVehicleTemplate, onTemplateChange, onApplyGeneralization, onResetTemplate }) => (
  <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex flex-wrap items-center gap-3">
    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 shrink-0">
      <Sparkles size={16} className="text-amber-400" />
      <span>تعميم وصف السيارة للجدول (يدوي / دقيق):</span>
    </div>
    <div className="flex-1 min-w-[240px] relative">
      <input
        type="text"
        value={customVehicleTemplate}
        onChange={(e) => {
          onTemplateChange(e.target.value);
        }}
        placeholder="مثال: فيتز 2005 مكينة 1.3"
        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs font-bold text-emerald-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
      />
    </div>
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="primary"
        onClick={onApplyGeneralization}
        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm"
        title="تطبيق هذا الوصف فوراً على جميع أسطر الجدول الحالية والجديدة"
      >
        <Sparkles size={13} className="ml-1" />
        تطبيق التعميم على الجدول ✨
      </Button>
      <button
        type="button"
        onClick={onResetTemplate}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        title="استعادة الصياغة التلقائية المقترحة"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  </div>
);

export const VehicleContextBanner: React.FC<VehicleContextBannerProps> = ({
  vehicle,
  makeAr,
  modelAr,
  years,
  customVehicleTemplate,
  onTemplateChange,
  onApplyGeneralization,
  onResetTemplate,
  hasRows,
  onClearDraft,
}) => (
  <div className="bg-gradient-to-l from-slate-900/90 to-slate-950 text-white border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <VehicleTitleBlock vehicle={vehicle} makeAr={makeAr} modelAr={modelAr} years={years} />
      <DraftStatusBadge hasRows={hasRows} onClearDraft={onClearDraft} />
    </div>
    <GeneralizationBar customVehicleTemplate={customVehicleTemplate} onTemplateChange={onTemplateChange} onApplyGeneralization={onApplyGeneralization} onResetTemplate={onResetTemplate} />
  </div>
);

