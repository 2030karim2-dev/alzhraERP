import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../../../../core/utils';
import { SpecCard, YearInput } from './cards';
import type { ManualVehicleFieldsProps } from './types';

const YEAR_RANGE_PRESETS = [
  { label: '2001-2007', start: '2001', end: '2007' },
  { label: '2008-2015', start: '2008', end: '2015' },
  { label: '2016-2022', start: '2016', end: '2022' },
  { label: '2023-2026', start: '2023', end: '2026' },
];

function YearPresetsRow({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'yearStart' | 'yearEnd'>): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1">
      {YEAR_RANGE_PRESETS.map(yr => {
        const isSelected = draft.yearStart === yr.start && draft.yearEnd === yr.end;
        return (
          <button
            key={yr.label}
            type="button"
            onClick={() => {
              onChange({ yearStart: yr.start });
              onChange({ yearEnd: yr.end });
            }}
            className={cn(
              'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
              isSelected
                ? 'border-blue-500 bg-blue-500 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
            )}
          >
            {yr.label}
          </button>
        );
      })}
    </div>
  );
}

export function YearsCard({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'yearStart' | 'yearEnd'>): React.ReactElement {
  return (
    <SpecCard
      icon={<Calendar size={13} className="text-blue-500 dark:text-blue-400" />}
      title="سنوات الصنع"
      headerLayout="between"
      headerExtra={
        draft.yearStart.length > 0 ? (
          <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
            {draft.yearStart}
            {draft.yearEnd.length > 0 && draft.yearEnd !== draft.yearStart
              ? `-${draft.yearEnd}`
              : ''}
          </span>
        ) : null
      }
    >
      <div>
        <div className="mb-1.5 grid grid-cols-2 gap-1.5">
          <YearInput
            label="من"
            placeholder="2001"
            value={draft.yearStart}
            onChange={val => {
              onChange({ yearStart: val });
            }}
          />
          <YearInput
            label="إلى"
            placeholder="2007"
            value={draft.yearEnd}
            onChange={val => {
              onChange({ yearEnd: val });
            }}
          />
        </div>
        <YearPresetsRow draft={draft} onChange={onChange} />
      </div>
    </SpecCard>
  );
}
