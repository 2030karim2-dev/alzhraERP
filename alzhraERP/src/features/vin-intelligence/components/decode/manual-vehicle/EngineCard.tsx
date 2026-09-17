import React from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '../../../../../core/utils';
import { POPULAR_ENGINES } from '../../../constants/vinPresetsData';
import { normalizeToEnglishNumbers } from '../../../utils/vehicleCanonicalizer';
import { SpecCard } from './cards';
import type { ManualVehicleFieldsProps } from './types';

function EnginePresetChips({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'engine'>): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1">
      {POPULAR_ENGINES.slice(0, 6).map(eng => (
        <button
          key={eng}
          type="button"
          onClick={() => {
            onChange({ engine: eng });
          }}
          className={cn(
            'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
            draft.engine === eng
              ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
          )}
        >
          {eng}L
        </button>
      ))}
    </div>
  );
}

export function EngineCard({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'engine'>): React.ReactElement {
  return (
    <SpecCard
      icon={<Gauge size={13} className="text-amber-500 dark:text-amber-400" />}
      title="المكينة / السعة (L)"
      headerLayout="between"
      headerExtra={
        <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-300">
          {draft.engine.length > 0 ? `${draft.engine}L` : 'سعة اللتر'}
        </span>
      }
    >
      <div>
        <input
          type="text"
          dir="ltr"
          placeholder="مثال: 1.8"
          value={draft.engine}
          onChange={e => {
            const val = normalizeToEnglishNumbers(e.target.value)
              .replace(/[^\d.]/g, '')
              .slice(0, 5);
            onChange({ engine: val });
          }}
          className="h-7.5 mb-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-black text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-amber-400"
        />

        <EnginePresetChips draft={draft} onChange={onChange} />
      </div>
    </SpecCard>
  );
}
