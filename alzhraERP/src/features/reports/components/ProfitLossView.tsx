import React, { useState } from 'react';
import { useProfitAndLoss } from '../hooks';
import { useResponsive } from '../hooks/useResponsive';
import { formatCurrency } from '../../../core/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../../core/utils';
import ShareButton from '../../../ui/common/ShareButton';

const ProfitLossView: React.FC = () => {
  const { data, isLoading, isError, refetch } = useProfitAndLoss();
  const { isMobile } = useResponsive();
  const [showAllRevenues, setShowAllRevenues] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  if (isLoading)
    return (
      <div className="flex animate-pulse flex-col items-center justify-center p-8 max-md:gap-4 max-md:p-4 md:p-20">
        <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800 max-md:rounded-xl" />
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <p className="text-xs text-slate-400 md:text-sm">جاري تحليل الأداء المالي...</p>
      </div>
    );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-md:gap-4 max-md:p-4 md:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30 max-md:rounded-xl">
          <TrendingDown size={24} className="text-rose-500" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">تعذر تحميل البيانات المالية</p>
        <button
          onClick={() => refetch()}
          className="flex min-h-[44px] items-center rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-rose-600 active:scale-95 max-md:gap-2"
        >
          <RefreshCw size={14} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const isProfit = data?.netProfit! >= 0;
  const totalRevenues =
    data?.revenues.reduce(
      (s: number, r: { netBalance: number }) => s + Math.abs(r.netBalance),
      0
    ) || 0;
  const totalExpenses =
    data?.expenses.reduce(
      (s: number, r: { netBalance: number }) => s + Math.abs(r.netBalance),
      0
    ) || 0;

  const displayedRevenues = showAllRevenues ? data?.revenues : data?.revenues.slice(0, 5);
  const displayedExpenses = showAllExpenses ? data?.expenses : data?.expenses.slice(0, 5);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-10 duration-700 md:space-y-6 md:pb-20">
      {/* Premium Hero Stat Card — responsive padding & font sizes */}
      <div
        className={cn(
          'glass-card bento-item relative flex flex-col items-center justify-between overflow-hidden border-none shadow-2xl max-md:p-5 md:flex-row md:p-8 lg:p-10',
          isProfit ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : 'bg-rose-500/5 dark:bg-rose-500/10'
        )}
      >
        {/* Animated Background Elements */}
        <div
          className={cn(
            'absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full opacity-20 blur-[100px]',
            isProfit ? 'bg-emerald-400' : 'bg-rose-400'
          )}
        />
        <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-current to-transparent opacity-20" />

        <div className="relative z-10 flex items-center max-md:gap-4 md:gap-6">
          <div
            className={cn(
              'rounded-2xl shadow-xl transition-transform duration-500 hover:rotate-12 max-md:rounded-xl max-md:p-4 md:rounded-3xl md:p-5',
              isProfit
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-rose-500 text-white shadow-rose-500/30'
            )}
          >
            <DollarSign size={isMobile ? 24 : 32} />
          </div>
          <div>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 md:mb-2 md:text-sm md:tracking-[0.3em]">
              {isProfit ? 'صافي أرباح المنشأة' : 'صافي خسائر المنشأة'}
            </h2>
            <div className="flex items-baseline max-md:gap-2">
              <p
                className={cn(
                  'number-reveal font-mono text-3xl font-bold tracking-tighter max-md:text-xl md:text-4xl lg:text-5xl',
                  isProfit ? 'stat-value-profit' : 'stat-value-loss'
                )}
              >
                {formatCurrency(Math.abs(data?.netProfit || 0))}
              </p>
              <span className="text-[10px] font-bold text-slate-400 md:text-xs">ريال</span>
            </div>
            <div className="mt-2 flex items-center max-md:gap-2 md:mt-3">
              <div
                className={cn(
                  'h-1.5 w-1.5 animate-pulse rounded-full',
                  isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                )}
              />
              <p className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 max-md:gap-1 md:text-xs">
                <TrendingUp size={12} className={isProfit ? 'text-emerald-500' : 'text-rose-500'} />
                تحديث مالي لحظي للنظام المحاسبي
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-col items-center max-md:mt-3 max-md:gap-3 md:mt-0 md:items-end md:gap-4">
          <div className="flex items-center max-md:gap-3">
            <div className="text-right">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 md:text-xs">
                نسبة الأداء
              </p>
              <p
                className={cn(
                  'font-mono text-base font-bold md:text-lg',
                  isProfit ? 'text-emerald-500' : 'text-rose-500'
                )}
              >
                {isProfit ? '+' : '-'}
                {totalRevenues > 0
                  ? ((Math.abs(data?.netProfit || 0) / totalRevenues) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
            {!isMobile && (
              <ShareButton
                size="md"
                eventType="profit_loss"
                title="مشاركة تقرير الأداء المالي"
                className="rounded-2xl border border-white/20 bg-white/10 transition-all hover:bg-white/20 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-800 max-md:rounded-xl max-md:p-4"
                message={`📊 تقرير الأرباح والخسائر - الزهراء سمارت
━━━━━━━━━━━━━━
📗 إجمالي الإيرادات: ${formatCurrency(totalRevenues)}
📕 إجمالي المصروفات: ${formatCurrency(totalExpenses)}
${isProfit ? '✅' : '🔴'} صافي ${isProfit ? 'الربح' : 'الخسارة'}: ${formatCurrency(Math.abs(data?.netProfit || 0))}
📅 التاريخ: ${new Date().toLocaleDateString('ar-SA-u-nu-latn')}`}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 max-md:gap-4 md:grid-cols-2 md:gap-6">
        {/* Revenues Layout */}
        <div className="glass-card bento-item flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/20 dark:bg-emerald-900/10 max-md:p-4 md:p-5">
            <div className="flex items-center max-md:gap-2 md:gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 md:h-8 md:w-8">
                <TrendingUp size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                تحليل الإيرادات
              </span>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 md:text-sm"
            >
              {formatCurrency(data?.totalRevenues || 0)}
            </span>
          </div>
          <div className="flex-1 space-y-3 max-md:p-4 md:space-y-4 md:p-6">
            {displayedRevenues?.map((rev: { id: string; name: string; netBalance: number }) => (
              <div
                key={rev.id}
                className="group flex items-center justify-between rounded-xl border border-transparent transition-colors hover:border-emerald-100 hover:bg-emerald-50 dark:hover:border-emerald-900/20 dark:hover:bg-emerald-900/10 max-md:p-2 md:rounded-2xl md:p-3"
              >
                <div className="flex items-center max-md:gap-2 md:gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 transition-transform group-hover:scale-150" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 md:text-xs">
                    {rev.name}
                  </span>
                </div>
                <span
                  dir="ltr"
                  className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 md:text-xs"
                >
                  {formatCurrency(Math.abs(rev.netBalance))}
                </span>
              </div>
            ))}
          </div>
          {(data?.revenues.length || 0) > 5 && (
            <div className="border-t border-slate-50 dark:border-slate-800/50 max-md:p-3 md:p-4">
              <button
                onClick={() => {
                  setShowAllRevenues(!showAllRevenues);
                }}
                className="flex min-h-[44px] w-full items-center justify-center text-center text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-700 max-md:gap-2"
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
        <div className="glass-card bento-item flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/50 dark:border-rose-900/20 dark:bg-rose-900/10 max-md:p-4 md:p-5">
            <div className="flex items-center max-md:gap-2 md:gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 md:h-8 md:w-8">
                <TrendingDown size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">
                تحليل المصاريف
              </span>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400 md:text-sm"
            >
              {formatCurrency(data?.totalExpenses || 0)}
            </span>
          </div>
          <div className="flex-1 space-y-3 max-md:p-4 md:space-y-4 md:p-6">
            {displayedExpenses?.map((exp: { id: string; name: string; netBalance: number }) => (
              <div
                key={exp.id}
                className="group flex items-center justify-between rounded-xl border border-transparent transition-colors hover:border-rose-100 hover:bg-rose-50 dark:hover:border-rose-900/20 dark:hover:bg-rose-900/10 max-md:p-2 md:rounded-2xl md:p-3"
              >
                <div className="flex items-center max-md:gap-2 md:gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-300 transition-transform group-hover:scale-150" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 md:text-xs">
                    {exp.name}
                  </span>
                </div>
                <span
                  dir="ltr"
                  className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 md:text-xs"
                >
                  {formatCurrency(Math.abs(exp.netBalance))}
                </span>
              </div>
            ))}
          </div>
          {(data?.expenses.length || 0) > 5 && (
            <div className="border-t border-slate-50 dark:border-slate-800/50 max-md:p-3 md:p-4">
              <button
                onClick={() => {
                  setShowAllExpenses(!showAllExpenses);
                }}
                className="flex min-h-[44px] w-full items-center justify-center text-center text-xs font-bold text-rose-600 transition-colors hover:text-rose-700 max-md:gap-2"
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
