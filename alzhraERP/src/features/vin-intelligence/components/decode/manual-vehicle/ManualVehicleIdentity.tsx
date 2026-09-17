import React, { useMemo } from 'react';
import { cn } from '../../../../../core/utils';
import { POPULAR_MAKE_OPTIONS, getPopularModelsForMake } from '../../../constants/vinPresetsData';
import { canonicalizeMake } from '../../../utils/vehicleCanonicalizer';
import type { ManualVehicleFieldsProps } from './types';

interface FieldCardProps {
  step: number;
  title: string;
  stepColorClass: string;
  hint?: string | null;
  hintColorClass?: string;
  children: React.ReactNode;
  input: React.ReactNode;
}

/** بطاقة حقل مُرقّمة (ماركة/موديل) بنفس مظهر البطاقتين الأصليتين. */
function FieldCard({
  step,
  title,
  stepColorClass,
  hint,
  hintColorClass,
  children,
  input,
}: FieldCardProps): React.ReactElement {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-xs dark:border-slate-750 dark:bg-slate-850 lg:col-span-6">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full font-mono text-[10px] text-white ${stepColorClass}`}
            >
              {step}
            </span>
            <span>{title}</span>
            <span className="text-rose-500">*</span>
          </span>
          {hint !== null && hint !== undefined && (
            <span className={`text-[10px] font-bold ${hintColorClass ?? ''}`}>{hint}</span>
          )}
        </div>
        {children}
      </div>
      {input}
    </div>
  );
}

function MakeChoices({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'make' | 'model'>): React.ReactElement {
  const canonicalCurrentMake = useMemo(() => canonicalizeMake(draft.make), [draft.make]);
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {POPULAR_MAKE_OPTIONS.map(mk => {
        const isSelected =
          canonicalCurrentMake.toLowerCase() === mk.id.toLowerCase() ||
          draft.make.trim().toLowerCase() === mk.label.toLowerCase();
        return (
          <button
            key={mk.id}
            type="button"
            onClick={() => {
              onChange({ make: mk.id });
              onChange({ model: '' });
            }}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all',
              isSelected
                ? 'scale-[1.02] border-blue-600 bg-blue-600 text-white shadow-xs dark:border-blue-500'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'
            )}
          >
            {mk.label}
          </button>
        );
      })}
    </div>
  );
}

function ModelChoices({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'make' | 'model'>): React.ReactElement {
  const canonicalCurrentMake = useMemo(() => canonicalizeMake(draft.make), [draft.make]);
  const availableModelPresets = useMemo(
    () => getPopularModelsForMake(canonicalCurrentMake),
    [canonicalCurrentMake]
  );
  return (
    <>
      {availableModelPresets.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {availableModelPresets.map(m => {
            const isSelected =
              draft.model.trim().toLowerCase() === m.id.toLowerCase() ||
              draft.model.trim().toLowerCase() === m.label.toLowerCase();
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange({ model: m.id });
                }}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all',
                  isSelected
                    ? 'scale-[1.02] border-indigo-600 bg-indigo-600 text-white shadow-xs dark:border-indigo-500'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-2 rounded-lg border border-dashed border-slate-300 bg-white/60 p-2 text-center text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
          اختر الماركة لتظهر لك أشهر الموديلات الخاصة بها
        </div>
      )}
    </>
  );
}

function MakeField({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'make' | 'model'>): React.ReactElement {
  return (
    <FieldCard
      step={1}
      title="الشركة المصنعة (الماركة)"
      stepColorClass="bg-blue-600"
      hint="ماركات شائعة"
      hintColorClass="text-blue-600 dark:text-blue-400"
      input={
        <input
          type="text"
          placeholder="أو اكتب اسم الماركة يدوياً..."
          value={draft.make}
          onChange={e => {
            onChange({ make: e.target.value });
          }}
          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
        />
      }
    >
      <MakeChoices draft={draft} onChange={onChange} />
    </FieldCard>
  );
}

function ModelField({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'make' | 'model'>): React.ReactElement {
  return (
    <FieldCard
      step={2}
      title="الموديل / الطراز"
      stepColorClass="bg-indigo-600"
      hint={draft.make.length > 0 ? `طرازات ${draft.make}` : null}
      hintColorClass="text-indigo-600 dark:text-indigo-300"
      input={
        <input
          type="text"
          placeholder="مثال: Corolla أو كورولا..."
          value={draft.model}
          onChange={e => {
            onChange({ model: e.target.value });
          }}
          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
        />
      }
    >
      <ModelChoices draft={draft} onChange={onChange} />
    </FieldCard>
  );
}

export function ManualVehicleIdentity({
  draft,
  onChange,
}: ManualVehicleFieldsProps<'make' | 'model'>): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
      <MakeField draft={draft} onChange={onChange} />
      <ModelField draft={draft} onChange={onChange} />
    </div>
  );
}
