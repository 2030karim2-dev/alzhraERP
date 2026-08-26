import React, { useState } from 'react';
import { Car, Sparkles, RotateCcw, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
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

/* ── tiny helpers ── */
const vinPrefixLabel = (v?: string | null): string =>
  v != null && v !== '' ? ` — VIN: ${v}` : '';

const marketLabel = (m?: string | null): string =>
  m != null && m !== '' ? ` [${m}]` : '';

const displacementLabel = (d?: string | null): string =>
  d != null && d !== '' ? ` مكينة ${d}` : '';

const yearLabel = (y: string): string => (y !== '' ? ` (${y})` : '');

/* ── Collapsible generalization panel ── */
interface GeneralizationPanelProps {
  customVehicleTemplate: string;
  onTemplateChange: (value: string) => void;
  onApplyGeneralization: () => void;
  onResetTemplate: () => void;
  hasRows: boolean;
  onClearDraft: () => void;
}

const GeneralizationPanel: React.FC<GeneralizationPanelProps> = ({
  customVehicleTemplate,
  onTemplateChange,
  onApplyGeneralization,
  onResetTemplate,
  hasRows,
  onClearDraft,
}) => (
  <div className="pt-2 mt-2 border-t border-slate-700/60 space-y-3">
    {/* Template input row */}
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 shrink-0">
        <Sparkles size={14} className="text-amber-400" />
        <span>تعميم وصف السيارة (يُطبَّق على كل الأسطر):</span>
      </div>
      <div className="flex-1 min-w-[200px] flex items-center gap-2">
        <input
          type="text"
          value={customVehicleTemplate}
          onChange={(e) => { onTemplateChange(e.target.value); }}
          placeholder="مثال: فيتز 2005 مكينة 1.3"
          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs font-bold text-emerald-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        />
        <Button
          size="sm"
          variant="primary"
          onClick={onApplyGeneralization}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shrink-0"
          title="تطبيق على جميع الأسطر"
        >
          <Sparkles size={12} className="ml-1" />
          تطبيق
        </Button>
        <button
          type="button"
          onClick={onResetTemplate}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="استعادة الصياغة التلقائية"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
    {/* Clear draft */}
    {hasRows && (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onClearDraft}
          className="px-3 py-1 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 text-xs font-bold transition-all"
          title="مسح المسودة والبدء من جديد"
        >
          مسح المسودة وبدء جديد
        </button>
      </div>
    )}
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
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const vehicleLabel =
    `${makeAr} ${modelAr}` +
    yearLabel(years) +
    marketLabel(vehicle.market) +
    displacementLabel(vehicle.displacement) +
    vinPrefixLabel(vehicle.vinPrefix);

  return (
    <div className="bg-gradient-to-l from-slate-900/90 to-slate-950 text-white border border-slate-800 rounded-2xl px-4 py-3 shadow-md">
      {/* ── Single compact header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Vehicle info */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Car size={18} className="flex-shrink-0" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              السيارة النشطة
            </span>
            <p className="text-sm font-bold text-white leading-tight">{vehicleLabel}</p>
          </div>
        </div>

        {/* Right: draft badge + settings toggle */}
        <div className="flex items-center gap-2">
          {/* Auto-save badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-bold"
            title="حفظ المسودة تلقائياً"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            مسودة محفوظة
          </div>

          {/* Settings toggle */}
          <button
            type="button"
            onClick={() => { setSettingsOpen((o) => !o); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              settingsOpen
                ? 'bg-amber-700/40 border-amber-600/60 text-amber-200'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/60'
            }`}
            title="تعميم وصف السيارة / مسح المسودة"
          >
            <Settings2 size={13} />
            <span>التعميم</span>
            {settingsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* ── Collapsible generalization panel ── */}
      {settingsOpen && (
        <GeneralizationPanel
          customVehicleTemplate={customVehicleTemplate}
          onTemplateChange={onTemplateChange}
          onApplyGeneralization={onApplyGeneralization}
          onResetTemplate={onResetTemplate}
          hasRows={hasRows}
          onClearDraft={onClearDraft}
        />
      )}
    </div>
  );
};
