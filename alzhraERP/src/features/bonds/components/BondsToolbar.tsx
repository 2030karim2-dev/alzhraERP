/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import type { DatePreset } from '../../../core/types/invoiceSearch';
import { getDateRangeForPreset } from '../../../core/utils/dateUtils';
import type { BondSortBy, BondSortOrder } from '../hooks/useBondsFilter';

export const BOND_DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'custom', label: 'مخصص' },
];

interface BondsToolbarProps {
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  dateFrom: string | undefined;
  setDateFrom: (date?: string) => void;
  dateTo: string | undefined;
  setDateTo: (date?: string) => void;
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  sortBy: BondSortBy;
  setSortBy: (sortBy: BondSortBy) => void;
  sortOrder: BondSortOrder;
  setSortOrder: (order: BondSortOrder) => void;
  displayedCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const BondsToolbar: React.FC<BondsToolbarProps> = ({
  datePreset,
  setDatePreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  currencyFilter,
  setCurrencyFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  displayedCount,
  hasActiveFilters,
  onResetFilters,
}) => {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Date Presets Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--app-text-secondary)]">
            <Calendar size={12} />
            <span>الفترة:</span>
          </span>
          {BOND_DATE_PRESETS.map(preset => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDatePreset(preset.id);
                  const range = getDateRangeForPreset(preset.id);
                  setDateFrom(range.from);
                  setDateTo(range.to);
                }}
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

        {/* Currency & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={e => setCurrencyFilter(e.target.value)}
            aria-label="تصفية حسب العملة"
            className="focus:outline-hidden h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
          >
            <option value="all">كل العملات</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="YER">ريال يمني (YER)</option>
            <option value="USD">دولار أمريكي (USD)</option>
            <option value="OMR">ريال عماني (OMR)</option>
            <option value="CNY">يوان صيني (CNY)</option>
          </select>

          {/* Sort Selector */}
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={e => {
              const [by, order] = e.target.value.split('_');
              setSortBy(by as BondSortBy);
              setSortOrder(order as BondSortOrder);
            }}
            aria-label="ترتيب وفرز السندات"
            className="focus:outline-hidden h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
          >
            <option value="date_desc">الأحدث تاريخاً / وقتاً</option>
            <option value="date_asc">الأقدم تاريخاً</option>
            <option value="amount_desc">الأعلى مبلغاً</option>
            <option value="amount_asc">الأقل مبلغاً</option>
            <option value="number_desc">رقم السند (تنازلي)</option>
            <option value="number_asc">رقم السند (تصاعدي)</option>
          </select>

          {/* Counter */}
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {displayedCount} سند
          </span>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
              title="مسح الفلاتر"
            >
              <RotateCcw size={12} />
              <span>مسح</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Row */}
      {datePreset === 'custom' && (
        <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-2 border-t pt-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-[var(--app-text-secondary)]">من تاريخ:</label>
            <input
              type="date"
              value={dateFrom || ''}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-[var(--app-text-secondary)]">إلى تاريخ:</label>
            <input
              type="date"
              value={dateTo || ''}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
