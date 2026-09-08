import React, { useId } from 'react';
import { Search, X, Calendar, RotateCcw, Package, User, Hash } from 'lucide-react';
import type { DatePreset } from '@/core/types/invoiceSearch';
import { getDateRangeForPreset } from '@/core/utils/dateUtils';

interface InvoiceSearchToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string | undefined;
  datePreset: DatePreset;
  onDatePresetChange: (
    preset: DatePreset,
    range: { from?: string | undefined; to?: string | undefined }
  ) => void;
  dateFrom?: string | undefined;
  onDateFromChange?: ((val: string) => void) | undefined;
  dateTo?: string | undefined;
  onDateToChange?: ((val: string) => void) | undefined;
  statusFilter?: string | undefined;
  onStatusFilterChange?: ((status: string) => void) | undefined;
  paymentMethodFilter?: string | undefined;
  onPaymentMethodFilterChange?: ((method: string) => void) | undefined;
  totalMatches?: number | undefined;
  totalMatchingCount?: number | undefined;
  isLoading?: boolean | undefined;
  onResetFilters: () => void;
  scopeLabel?: 'sales' | 'purchases' | undefined;
}

const PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'last_3_months', label: 'آخر 3 أشهر' },
  { id: 'custom', label: 'مخصص' },
];

export const InvoiceSearchToolbar: React.FC<InvoiceSearchToolbarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder,
  datePreset,
  onDatePresetChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  statusFilter = 'all',
  onStatusFilterChange,
  paymentMethodFilter = 'all',
  onPaymentMethodFilterChange,
  totalMatches,
  totalMatchingCount,
  isLoading = false,
  onResetFilters,
  scopeLabel = 'sales',
}) => {
  const inputId = useId();
  const dateFromId = useId();
  const dateToId = useId();

  const partyScope = scopeLabel === 'sales' ? 'العميل' : 'المورد';
  const defaultPlaceholder = `ابحث برقم الفاتورة، ${partyScope}، اسم القطعة، رقم القطعة (Part #)، أو الباركود...`;

  const hasActiveFilters = Boolean(
    (searchTerm && searchTerm.trim() !== '') ||
    datePreset !== 'all' ||
    dateFrom ||
    dateTo ||
    (statusFilter && statusFilter !== 'all') ||
    (paymentMethodFilter && paymentMethodFilter !== 'all')
  );

  const handlePresetClick = (preset: DatePreset) => {
    const range = getDateRangeForPreset(preset);
    onDatePresetChange(preset, range);
  };

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs">
      {/* Row 1: Search Bar & Primary Actions */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <label htmlFor={inputId} className="sr-only">
            بحث متقدم في الفواتير
          </label>
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-[var(--app-text-secondary)]">
            <Search size={15} className={isLoading ? 'animate-spin text-blue-500' : ''} />
          </div>
          <input
            id={inputId}
            type="text"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder || defaultPlaceholder}
            className="focus:outline-hidden h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] pe-9 ps-9 text-xs font-semibold text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 end-0 flex items-center pe-2.5 text-[var(--app-text-secondary)] hover:text-rose-500"
              title="مسح البحث"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Quick Filter: Payment Method */}
        {onPaymentMethodFilterChange && (
          <select
            value={paymentMethodFilter}
            onChange={e => onPaymentMethodFilterChange(e.target.value)}
            aria-label="تصفية حسب طريقة الدفع"
            className="focus:outline-hidden h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
          >
            <option value="all">كل طرق الدفع</option>
            <option value="cash">نقدي</option>
            <option value="credit">آجل</option>
          </select>
        )}

        {/* Quick Filter: Status */}
        {onStatusFilterChange && (
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            aria-label="تصفية حسب حالة الفاتورة"
            className="focus:outline-hidden h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
          >
            <option value="all">كل الحالات</option>
            <option value="paid">مدفوعة</option>
            <option value="posted">مرحّلة</option>
            <option value="partially_paid">مدفوعة جزئياً</option>
            <option value="draft">مسودة</option>
          </select>
        )}

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
            title="إعادة تعيين كافة الفلاتر"
          >
            <RotateCcw size={13} />
            <span>مسح الفلاتر</span>
          </button>
        )}
      </div>

      {/* Row 2: Date Presets & Search Scopes Bar */}
      <div className="border-[var(--app-border)]/60 flex flex-wrap items-center justify-between gap-1.5 border-t pt-2">
        {/* Date Presets Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--app-text-secondary)]">
            <Calendar size={12} />
            <span>الفترة:</span>
          </span>
          {PRESETS.map(preset => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Matches Indicator */}
        <div className="flex items-center gap-2">
          {typeof totalMatches === 'number' && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {totalMatchingCount && totalMatchingCount > totalMatches
                ? `عرض ${totalMatches} من أصل ${totalMatchingCount} فاتورة`
                : `${totalMatches} فاتورة`}
            </span>
          )}
        </div>
      </div>

      {/* Row 3: Custom Date Range (Shown only when datePreset is 'custom') */}
      {datePreset === 'custom' && (
        <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-2 border-t pt-2">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={dateFromId}
              className="text-xs font-bold text-[var(--app-text-secondary)]"
            >
              من تاريخ:
            </label>
            <input
              id={dateFromId}
              type="date"
              value={dateFrom || ''}
              onChange={e => onDateFromChange?.(e.target.value)}
              className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={dateToId}
              className="text-xs font-bold text-[var(--app-text-secondary)]"
            >
              إلى تاريخ:
            </label>
            <input
              id={dateToId}
              type="date"
              value={dateTo || ''}
              onChange={e => onDateToChange?.(e.target.value)}
              className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
            />
          </div>
        </div>
      )}

      {/* Search Hints Helper */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--app-text-secondary)]">
        <span className="flex items-center gap-1">
          <Package size={11} className="text-emerald-500" />
          البحث في محتويات الأصناف والقطع وقطع الغيار
        </span>
        <span className="flex items-center gap-1">
          <Hash size={11} className="text-blue-500" />
          البحث برقم الفاتورة
        </span>
        <span className="flex items-center gap-1">
          <User size={11} className="text-purple-500" />
          البحث باسم {partyScope} أو رقم الهاتف
        </span>
      </div>
    </div>
  );
};

export default InvoiceSearchToolbar;
