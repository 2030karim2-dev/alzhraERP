import React from 'react';
import { Globe } from 'lucide-react';
import { POPULAR_MARKETS } from '../../../constants/vinPresetsData';
import { SpecCard } from './cards';
import type { ManualVehicleFieldsProps } from './types';

function VinInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
        رقم الشاصي (اختياري)
      </span>
      <input
        type="text"
        dir="ltr"
        placeholder="JT3HN87R... (17 Chars)"
        value={value}
        onChange={e => {
          onChange(e.target.value.toUpperCase().trim());
        }}
        maxLength={17}
        className="h-7.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
      />
    </div>
  );
}

export function MarketVinCard({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'market' | 'vinOptional'>): React.ReactElement {
  return (
    <SpecCard
      icon={<Globe size={13} className="text-emerald-500 dark:text-emerald-400" />}
      title="الوارد ورقم الشاصي"
      headerLayout="inline"
    >
      <div className="space-y-1.5">
        <div>
          <span className="mb-0.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
            المواصفات الإقليمية
          </span>
          <select
            value={draft.market}
            onChange={e => {
              onChange({ market: e.target.value });
            }}
            className="h-7.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {POPULAR_MARKETS.map(m => (
              <option
                key={m}
                value={m}
                className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
              >
                {m}
              </option>
            ))}
            <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
              أخرى / عام
            </option>
          </select>
        </div>

        <VinInput
          value={draft.vinOptional}
          onChange={val => {
            onChange({ vinOptional: val });
          }}
        />
      </div>
    </SpecCard>
  );
}
