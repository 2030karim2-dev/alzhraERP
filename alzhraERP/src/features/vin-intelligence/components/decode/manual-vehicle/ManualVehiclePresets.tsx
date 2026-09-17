import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../../../core/utils';
import { QUICK_VEHICLE_PRESETS } from '../../../constants/vinPresetsData';
import { normalizeToEnglishNumbers } from '../../../utils/vehicleCanonicalizer';
import type { ManualVehicleDraft, ManualVehicleFieldsProps } from './types';

/** يطبّق قالب سيارة جاهزة: نفس ترتيب الرقع والحروف كما في الشيفرة الأصلية. */
function applyVehiclePreset(
  preset: (typeof QUICK_VEHICLE_PRESETS)[0],
  onChange: (patch: Partial<ManualVehicleDraft>) => void
): void {
  onChange({ make: preset.make });
  onChange({ model: preset.model });
  onChange({ yearStart: normalizeToEnglishNumbers(preset.yStart) });
  onChange({ yearEnd: normalizeToEnglishNumbers(preset.yEnd) });
  onChange({ market: preset.market });
  onChange({ engine: normalizeToEnglishNumbers(preset.engine) });
  onChange({ transmission: preset.trans });
  onChange({ drive: preset.drive });
}

export function ManualVehiclePresets({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'make' | 'model'>): React.ReactElement {
  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-slate-50/70 p-2.5 shadow-xs dark:border-indigo-800/70 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300">
          <Sparkles size={14} className="animate-pulse text-indigo-600 dark:text-indigo-400" />
          <span className="text-[11px] font-black tracking-tight">
            تعبئة سريعة لأشهر السيارات في السوق:
          </span>
        </div>
        <span className="hidden text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:inline">
          نقرة واحدة للملء
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_VEHICLE_PRESETS.map(p => {
          const isPresetActive =
            draft.make.toLowerCase() === p.make.toLowerCase() &&
            draft.model.toLowerCase() === p.model.toLowerCase();
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                applyVehiclePreset(p, onChange);
              }}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[11px] font-bold shadow-xs transition-all active:scale-95',
                isPresetActive
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs dark:border-indigo-500'
                  : 'border-indigo-200/90 bg-white text-indigo-950 hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/50 dark:hover:text-white'
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
