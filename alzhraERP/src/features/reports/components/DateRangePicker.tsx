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
    value, onChange, startDate, endDate,
    onStartDateChange, onEndDateChange, className, compact = false
}) => {
    return (
        <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
            <div className="relative group">
                <Calendar size={compact ? 14 : 16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as DateRange)}
                    className={cn(
                        "appearance-none bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl pl-3 pr-9",
                        "text-xs sm:text-sm font-bold text-[var(--app-text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10",
                        "transition-all min-h-[40px] sm:min-h-[44px]",
                        compact && "text-[10px] sm:text-xs py-1.5 sm:py-2"
                    )}
                >
                    <option value="today">اليوم</option>
                    <option value="week">آخر 7 أيام</option>
                    <option value="month">آخر 30 يوم</option>
                    <option value="quarter">آخر 3 أشهر</option>
                    <option value="year">السنة الحالية</option>
                    <option value="custom">تاريخ مخصص</option>
                </select>
                <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {value === 'custom' && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                        type="date"
                        value={startDate || ''}
                        onChange={(e) => onStartDateChange?.(e.target.value)}
                        className={cn(
                            "bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3",
                            "text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500",
                            "min-h-[40px] sm:min-h-[44px]"
                        )}
                    />
                    <input
                        type="date"
                        value={endDate || ''}
                        onChange={(e) => onEndDateChange?.(e.target.value)}
                        className={cn(
                            "bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3",
                            "text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500",
                            "min-h-[40px] sm:min-h-[44px]"
                        )}
                    />
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
