import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '../../../core/utils';

export type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  className?: string;
  compact?: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  compact = false,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <div className="group relative">
        <Calendar
          size={compact ? 14 : 16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <select
          value={value}
          onChange={e => {
            onChange(e.target.value as DateRange);
          }}
          className={cn(
            'appearance-none rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] pl-3 pr-9',
            'focus:ring-[var(--accent)]/10 text-xs font-bold text-[var(--app-text)] outline-none focus:border-[var(--accent)] focus:ring-2 sm:text-sm',
            'min-h-[40px] transition-all sm:min-h-[44px]',
            compact && 'py-1.5 text-[10px] sm:py-2 sm:text-xs'
          )}
        >
          <option value="today">اليوم</option>
          <option value="week">آخر 7 أيام</option>
          <option value="month">آخر 30 يوم</option>
          <option value="quarter">آخر 3 أشهر</option>
          <option value="year">السنة الحالية</option>
          <option value="custom">تاريخ مخصص</option>
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>

      {value === 'custom' && (
        <div className="animate-in fade-in slide-in-from-top-2 flex gap-2 duration-200">
          <input
            type="date"
            value={startDate || ''}
            onChange={e => onStartDateChange?.(e.target.value)}
            className={cn(
              'rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700/50 dark:bg-slate-800/80',
              'font-mono text-xs font-bold text-slate-700 outline-none focus:border-blue-500 dark:text-slate-200 sm:text-sm',
              'min-h-[40px] sm:min-h-[44px]'
            )}
          />
          <input
            type="date"
            value={endDate || ''}
            onChange={e => onEndDateChange?.(e.target.value)}
            className={cn(
              'rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700/50 dark:bg-slate-800/80',
              'font-mono text-xs font-bold text-slate-700 outline-none focus:border-blue-500 dark:text-slate-200 sm:text-sm',
              'min-h-[40px] sm:min-h-[44px]'
            )}
          />
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
