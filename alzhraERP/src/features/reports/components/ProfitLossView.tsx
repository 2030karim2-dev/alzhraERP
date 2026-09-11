import React, { useState } from 'react';
import { useProfitAndLoss } from '../hooks';
import { formatCurrency, cn, formatLocalDate } from '../../../core/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import ShareButton from '../../../ui/common/ShareButton';

const ProfitLossView: React.FC = () => {
  const { data, isLoading, isError, refetch } = useProfitAndLoss();
  const [showAllRevenues, setShowAllRevenues] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  if (isLoading)
    return (
      <div className="flex animate-pulse flex-col items-center justify-center p-8 max-md:gap-4 max-md:p-4 md:p-12">
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        <p className="mt-1 text-xs text-slate-400">جاري تحليل الأداء المالي...</p>
      </div>
    );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-md:gap-4 max-md:p-4 md:p-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30">
          <TrendingDown size={20} className="text-rose-500" />
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          تعذر تحميل البيانات المالية
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 flex min-h-[38px] items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-rose-600 active:scale-95"
        >
          <RefreshCw size={14} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const isProfit = (data?.netProfit ?? 0) >= 0;
  const totalRevenues =
    typeof data?.totalRevenues === 'number'
      ? data.totalRevenues
      : data?.revenues.reduce(
          (s: number, r: { netBalance: number }) => s + (Number(r.netBalance) || 0),
          0
        ) || 0;
  const totalExpenses =
    typeof data?.totalExpenses === 'number'
      ? data.totalExpenses
      : data?.expenses.reduce(
          (s: number, r: { netBalance: number }) => s + (Number(r.netBalance) || 0),
          0
        ) || 0;

  const displayedRevenues = showAllRevenues ? data?.revenues : data?.revenues.slice(0, 5);
  const displayedExpenses = showAllExpenses ? data?.expenses : data?.expenses.slice(0, 5);
  const reportDate = formatLocalDate(new Date());

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-6 duration-700">
      {/* Hero Stat Card */}
      <div
        className={cn(
          'flex flex-col items-stretch justify-between gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:p-5',
          isProfit ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={cn(
              'flex items-center justify-center rounded-xl p-3 text-white shadow-sm',
              isProfit ? 'bg-emerald-600' : 'bg-rose-600'
            )}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className="mb-0.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isProfit ? 'صافي أرباح المنشأة' : 'صافي خسائر المنشأة'}
            </h2>
            <div className="flex items-baseline gap-1.5">
              <p
                className={cn(
                  'font-mono text-2xl font-bold tracking-tight sm:text-3xl',
                  isProfit
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatCurrency(Math.abs(data?.netProfit || 0))}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                )}
              />
              <p className="text-[10px] font-semibold text-slate-400">
                محدث تلقائياً وفق قيود اليومية المسجلة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
          <div className="border-[var(--app-border)] text-right sm:border-l sm:pl-4">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              نسبة الأداء
            </p>
            <p
              className={cn(
                'font-mono text-base font-bold',
                isProfit
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {isProfit ? '+' : '-'}
              {totalRevenues > 0
                ? ((Math.abs(data?.netProfit || 0) / totalRevenues) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
          <ShareButton
            size="md"
            eventType="profit_loss"
            title="مشاركة تقرير الأداء المالي"
            className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            message={`📊 تقرير الأرباح والخسائر - الزهراء سمارت\n━━━━━━━━━━━━━━\n📗 إجمالي الإيرادات: ${formatCurrency(totalRevenues)}\n📕 إجمالي المصروفات: ${formatCurrency(totalExpenses)}\n${isProfit ? '✅' : '🔴'} صافي ${isProfit ? 'الربح' : 'الخسارة'}: ${formatCurrency(Math.abs(data?.netProfit || 0))}\n📅 التاريخ: ${reportDate}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Revenues Layout */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/20 dark:bg-emerald-900/10 sm:p-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600">
                <TrendingUp size={14} />
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                تحليل الإيرادات
              </span>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 sm:text-sm"
            >
              {formatCurrency(data?.totalRevenues || 0)}
            </span>
          </div>
          <div className="flex-1 space-y-2 p-3 sm:p-3.5">
            {displayedRevenues?.map((rev: { id: string; name: string; netBalance: number }) => (
              <div
                key={rev.id}
                className="group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
              >
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {rev.name}
                  </span>
                </div>
                <span
                  dir="ltr"
                  className={`font-mono text-xs font-bold ${
                    rev.netBalance < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {rev.netBalance < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(rev.netBalance))}
                </span>
              </div>
            ))}
          </div>
          {(data?.revenues.length || 0) > 5 && (
            <div className="border-t border-[var(--app-border)] p-2 sm:p-2.5">
              <button
                onClick={() => {
                  setShowAllRevenues(!showAllRevenues);
                }}
                className="flex min-h-[36px] w-full items-center justify-center gap-1.5 text-center text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                {showAllRevenues ? (
                  <>
                    <ChevronUp size={14} /> عرض ملخص
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> عرض التفاصيل ({data?.revenues.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Expenses Layout */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/50 p-3 dark:border-rose-900/20 dark:bg-rose-900/10 sm:p-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600">
                <TrendingDown size={14} />
              </div>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                تحليل المصاريف
              </span>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400 sm:text-sm"
            >
              {formatCurrency(data?.totalExpenses || 0)}
            </span>
          </div>
          <div className="flex-1 space-y-2 p-3 sm:p-3.5">
            {displayedExpenses?.map((exp: { id: string; name: string; netBalance: number }) => (
              <div
                key={exp.id}
                className="group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
              >
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {exp.name}
                  </span>
                </div>
                <span
                  dir="ltr"
                  className={`font-mono text-xs font-bold ${
                    exp.netBalance < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {exp.netBalance < 0 ? '(' : ''}
                  {formatCurrency(Math.abs(exp.netBalance))}
                  {exp.netBalance < 0 ? ')' : ''}
                </span>
              </div>
            ))}
          </div>
          {(data?.expenses.length || 0) > 5 && (
            <div className="border-t border-[var(--app-border)] p-2 sm:p-2.5">
              <button
                onClick={() => {
                  setShowAllExpenses(!showAllExpenses);
                }}
                className="flex min-h-[36px] w-full items-center justify-center gap-1.5 text-center text-xs font-bold text-rose-600 transition-colors hover:text-rose-700"
              >
                {showAllExpenses ? (
                  <>
                    <ChevronUp size={14} /> عرض ملخص
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> عرض التفاصيل ({data?.expenses.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitLossView;
