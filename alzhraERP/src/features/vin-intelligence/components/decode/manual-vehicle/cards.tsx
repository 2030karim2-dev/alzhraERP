import React from 'react';
import { cn } from '../../../../../core/utils';
import { normalizeToEnglishNumbers } from '../../../utils/vehicleCanonicalizer';

interface SpecCardProps {
  icon: React.ReactNode;
  title: string;
  headerLayout: 'between' | 'inline';
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

/** بطاقة مواصفات مخصصة داخل شبكة الأربعة (سنوات/مكينة/جير/وارد). */
export function SpecCard({
  icon,
  title,
  headerLayout,
  headerExtra,
  children,
}: SpecCardProps): React.ReactElement {
  return (
    <div className="flex flex-col justify-between gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs dark:border-slate-750 dark:bg-slate-850">
      <div
        className={
          headerLayout === 'between'
            ? 'flex items-center justify-between'
            : 'flex items-center gap-1'
        }
      >
        <div className="flex items-center gap-1 text-slate-900 dark:text-slate-100">
          {icon}
          <span className="text-[11px] font-black">{title}</span>
        </div>
        {headerExtra}
      </div>
      {children}
    </div>
  );
}

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
export function FieldCard({
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

interface OptionToggleProps {
  options: Array<{ value: string; text: string }>;
  activeValue: string;
  onSelect: (value: string) => void;
  activeClassName: string;
}

/** مجموعة أزرار اختيار (تماتيك/عادي، سنجل/دبل) بنفس مظهر الشيفرة الأصلية. */
export function OptionToggle({
  options,
  activeValue,
  onSelect,
  activeClassName,
}: OptionToggleProps): React.ReactElement {
  return (
    <>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onSelect(option.value);
          }}
          className={cn(
            'flex h-6 items-center justify-center rounded py-0.5 text-[10px] font-black transition-all',
            activeValue === option.value
              ? activeClassName
              : 'text-slate-500 dark:text-slate-400 hover:dark:text-slate-200'
          )}
        >
          {option.text}
        </button>
      ))}
    </>
  );
}

interface YearInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/** حقل سنة رقمي بأربعة خانات مع تطبيع الأرقام العربية (نفس سلوك الحقل الأصلي). */
export function YearInput({
  label,
  placeholder,
  value,
  onChange,
}: YearInputProps): React.ReactElement {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        placeholder={placeholder}
        value={value}
        onChange={e => {
          onChange(normalizeToEnglishNumbers(e.target.value).replace(/\D/g, '').slice(0, 4));
        }}
        className="h-7.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
      />
    </div>
  );
}
