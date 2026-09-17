import React from 'react';
import { Car, RotateCcw } from 'lucide-react';
import type { ManualVehicleDraft } from './manual-vehicle/types';
import { ManualVehicleCatalog } from './manual-vehicle/ManualVehicleCatalog';
import { ManualVehiclePresets } from './manual-vehicle/ManualVehiclePresets';
import { ManualVehicleIdentity } from './manual-vehicle/ManualVehicleIdentity';
import { ManualVehicleSpecifications } from './manual-vehicle/ManualVehicleSpecifications';
import { ManualVehiclePreview } from './manual-vehicle/ManualVehiclePreview';

// Preserve the existing public type import used by callers.
export type { ManualVehicleDraft } from './manual-vehicle/types';

interface VinManualVehicleFormProps {
  draft: ManualVehicleDraft;
  onChange: (patch: Partial<ManualVehicleDraft>) => void;
  onApplyManualVehicle: () => Promise<void>;
  isDecoding: boolean;
}

/** واجهة إدخال مواصفات السيارة: ترويسة + كتالوج + قوالب + هوية + مواصفات + معاينة. */
export const VinManualVehicleForm: React.FC<VinManualVehicleFormProps> = ({
  draft,
  onChange,
  onApplyManualVehicle,
  isDecoding,
}) => {
  const handleResetForm = (): void => {
    onChange({ make: '' });
    onChange({ model: '' });
    onChange({ yearStart: '' });
    onChange({ yearEnd: '' });
    onChange({ market: 'خليجي' });
    onChange({ engine: '' });
    onChange({ transmission: 'تماتيك' });
    onChange({ drive: 'سنجل' });
    onChange({ vinOptional: '' });
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl transition-colors dark:border-slate-800 dark:bg-slate-900 md:p-4">
      {/* 1. Compact Header Bar */}
      <HeaderBar onReset={handleResetForm} showReset={draft.make.length > 0} />
      <ManualVehicleCatalog onChange={onChange} />
      <ManualVehiclePresets draft={draft} onChange={onChange} />
      <ManualVehicleIdentity draft={draft} onChange={onChange} />
      <ManualVehicleSpecifications draft={draft} onChange={onChange} />
      <ManualVehiclePreview
        draft={draft}
        onApplyManualVehicle={onApplyManualVehicle}
        isDecoding={isDecoding}
      />
    </div>
  );
};

function HeaderBar({
  onReset,
  showReset,
}: {
  onReset: () => void;
  showReset: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/30 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-sm">
          <Car size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white md:text-sm">
              إدخال مواصفات السيارة والكتالوج (PartSouq Specs)
            </h3>
            <span className="py-0.2 rounded border border-indigo-200 bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
              كتالوج معتمد
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            ربط القطع بالمركبة وتوليد الأسماء ثنائية اللغة تلقائياً
          </p>
        </div>
      </div>

      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 hover:dark:text-white"
        >
          <RotateCcw size={12} className="text-slate-400 dark:text-slate-300" />
          <span>تفريغ الحقول</span>
        </button>
      )}
    </div>
  );
}
