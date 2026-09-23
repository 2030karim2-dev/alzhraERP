import React, { useState, useMemo } from 'react';
import { Calendar, RotateCcw, BookOpen } from 'lucide-react';
import ExpenseStats from '../components/ExpenseStats';
import ExpenseTable from '../components/ExpenseTable';
import ExpenseBreakdownChart from '../components/ExpenseBreakdownChart';
import Card from '../../../ui/base/Card';
import { formatCurrency } from '../../../core/utils';
import { expensesService } from '../service';
import type { Expense } from '../types';
import type { DatePreset } from '../../../core/types/invoiceSearch';
import { getDateRangeForPreset } from '../../../core/utils/dateUtils';

const EXPENSE_DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'custom', label: 'مخصص' },
];

interface ExpensesListViewProps {
  expenses: Expense[];
  isLoading: boolean;
  stats: any;
  onDelete: (id: string) => void;
  onOpenLedger?: (categoryIdOrAccountId?: string) => void;
}

const ExpensesListView: React.FC<ExpensesListViewProps> = ({
  expenses,
  isLoading,
  onDelete,
  onOpenLedger,
}) => {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'voucher'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showVoided, setShowVoided] = useState(false);

  // Count voided expenses
  const voidedCount = useMemo(() => expenses.filter(e => e.status === 'void').length, [expenses]);

  // Extract unique categories from expenses for the filter dropdown
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const exp of expenses) {
      if (exp.category_id && exp.category_name) {
        map.set(exp.category_id, exp.category_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  // Deep Filter & Sort
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Exclude voided expenses unless explicitly requested
    if (!showVoided) {
      result = result.filter(e => e.status !== 'void');
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      result = result.filter(
        e => (e.currency_code || '').toUpperCase() === currencyFilter.toUpperCase()
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(
        e => e.category_id === categoryFilter || e.category_name === categoryFilter
      );
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(e => e.expense_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(e => e.expense_date <= dateTo);
    }

    // Multi-field Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'amount') {
        cmp = (a.amount || 0) - (b.amount || 0);
      } else if (sortBy === 'voucher') {
        const vA = a.voucher_number || '';
        const vB = b.voucher_number || '';
        cmp = vA.localeCompare(vB, undefined, { numeric: true });
      } else {
        const dateA = new Date(a.expense_date).getTime() || 0;
        const dateB = new Date(b.expense_date).getTime() || 0;
        cmp = dateA - dateB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [expenses, showVoided, currencyFilter, categoryFilter, dateFrom, dateTo, sortBy, sortOrder]);

  // Compute live stats matching the active filtered subset
  const liveStats = useMemo(() => {
    return expensesService.calculateStats(filteredExpenses);
  }, [filteredExpenses]);

  const hasActiveFilters = Boolean(
    currencyFilter !== 'all' ||
    categoryFilter !== 'all' ||
    datePreset !== 'all' ||
    dateFrom ||
    dateTo ||
    showVoided ||
    sortBy !== 'date' ||
    sortOrder !== 'desc'
  );

  const handleResetFilters = () => {
    setCurrencyFilter('all');
    setCategoryFilter('all');
    setDatePreset('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setShowVoided(false);
    setSortBy('date');
    setSortOrder('desc');
  };

  const breakdownData = useMemo(
    () => expensesService.getCategoryBreakdown(filteredExpenses),
    [filteredExpenses]
  );

  return (
    <div className="mx-auto max-w-none space-y-4">
      {/* Live Active KPI Stats */}
      <ExpenseStats customStats={liveStats} />

      {/* High-Density Filtering & Sorting Toolbar */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Date Presets Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--app-text-secondary)]">
              <Calendar size={12} />
              <span>الفترة:</span>
            </span>
            {EXPENSE_DATE_PRESETS.map(preset => {
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

          {/* Controls: Currency, Category, Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Currency Filter */}
            <select
              value={currencyFilter}
              onChange={e => {
                setCurrencyFilter(e.target.value);
              }}
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

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => {
                  setCategoryFilter(e.target.value);
                }}
                aria-label="تصفية حسب التصنيف"
                className="focus:outline-hidden h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
              >
                <option value="all">كل التصنيفات</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={e => {
                const [by, order] = e.target.value.split('_');
                setSortBy(by as 'date' | 'amount' | 'voucher');
                setSortOrder(order as 'asc' | 'desc');
              }}
              aria-label="ترتيب وفرز المصروفات"
              className="focus:outline-hidden h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
            >
              <option value="date_desc">الأحدث تاريخاً / وقتاً</option>
              <option value="date_asc">الأقدم تاريخاً</option>
              <option value="amount_desc">الأعلى مبلغاً</option>
              <option value="amount_asc">الأقل مبلغاً</option>
              <option value="voucher_desc">رقم السند (تنازلي)</option>
              <option value="voucher_asc">رقم السند (تصاعدي)</option>
            </select>

            {/* Voided Expenses Toggle Button */}
            {voidedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowVoided(prev => !prev);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-bold transition-all ${
                  showVoided
                    ? 'shadow-2xs border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                }`}
                title="إظهار أو إخفاء السندات الملغاة"
              >
                <span>{showVoided ? 'إخفاء الملغي' : 'السندات الملغاة'}</span>
                <span className="py-0.2 rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {voidedCount}
                </span>
              </button>
            )}

            {/* Detailed Ledger Button */}
            {onOpenLedger && (
              <button
                type="button"
                onClick={() => {
                  onOpenLedger();
                }}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                title="عرض كشف حساب تفصيلي للمصروفات والعهد"
              >
                <BookOpen size={13} />
                <span>كشف تفصيلي للحسابات</span>
              </button>
            )}

            {/* Counter */}
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {filteredExpenses.length} مصروف
            </span>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                title="إعادة تعيين الفلاتر"
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
              <label className="text-xs font-bold text-[var(--app-text-secondary)]">
                من تاريخ:
              </label>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={e => {
                  setDateFrom(e.target.value);
                }}
                className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-[var(--app-text-secondary)]">
                إلى تاريخ:
              </label>
              <input
                type="date"
                value={dateTo || ''}
                onChange={e => {
                  setDateTo(e.target.value);
                }}
                className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="animate-in fade-in grid grid-cols-1 gap-6 duration-500 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
            توزيع المصاريف حسب الفئة
          </h3>
          <ExpenseBreakdownChart data={breakdownData} />
        </Card>
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">ملخص مالي</h3>
            {onOpenLedger && (
              <button
                type="button"
                onClick={() => {
                  onOpenLedger();
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>كشف الحسابات التفصيلي</span>
                <BookOpen size={11} />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {breakdownData.map(item => {
              const matchedCat = categories.find(c => c.name === item.name);
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-xs font-bold">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span dir="ltr" className="font-mono text-xs font-bold">
                      {formatCurrency(item.value)}
                    </span>
                    {onOpenLedger && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenLedger(matchedCat?.id);
                        }}
                        className="shadow-2xs rounded-lg border border-[var(--app-border)] bg-white px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600"
                        title="عرض كشف حساب هذا البند"
                      >
                        كشف الحساب
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <ExpenseTable
          expenses={filteredExpenses}
          isLoading={isLoading}
          onDelete={onDelete}
          {...(onOpenLedger ? { onViewLedger: onOpenLedger } : {})}
        />
      </div>
    </div>
  );
};

export default ExpensesListView;
