import React from 'react';
import { formatCurrency, cn } from '../../../../core/utils';
import { tafqeet } from '../../../../core/utils/tafqeet';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import type { StatementMovement } from '../../service';

interface StatementSummaryCardsProps {
  movements: StatementMovement[];
}

export const StatementSummaryCards: React.FC<StatementSummaryCardsProps> = ({ movements }) => {
  if (!movements || movements.length === 0) return null;

  const lastEntry = movements[movements.length - 1];
  const finalBalance = lastEntry?.balance || 0;
  const isDebit = finalBalance > 0;
  const isCredit = finalBalance < 0;
  const absBalance = Math.abs(finalBalance);

  return (
    <div className="screen:max-md:mt-3 screen:max-md:p-3 group relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-lg shadow-blue-500/5 dark:border-slate-800">
      {/* Background Accent */}
      <div className="no-print absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl transition-colors group-hover:bg-blue-500/10" />

      <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-3">
        {/* Status Indicator */}
        <div className="space-y-3 md:col-span-1">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
              <Wallet size={14} />
              الخلاصة المالية
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              الوضعية الحالية للحساب حتى تاريخ اليوم
            </p>
          </div>

          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-tight shadow-sm',
              isDebit
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                : isCredit
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
            )}
          >
            {isDebit ? (
              <TrendingUp size={14} className="no-print" />
            ) : isCredit ? (
              <TrendingDown size={14} className="no-print" />
            ) : (
              <div className="no-print h-3 w-3 rounded-full border-2 border-current" />
            )}
            {isDebit ? 'رصيد مدين (عليه)' : isCredit ? 'رصيد دائن (له)' : 'الرصيد مصفر'}
          </div>
        </div>

        {/* Net Balance Amount */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-800/60 md:col-span-1">
          <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            صافي الرصيد
          </span>
          <span
            dir="ltr"
            className={cn(
              'screen:max-md:text-xl font-mono text-2xl font-bold tracking-tight',
              isDebit
                ? 'text-emerald-600 dark:text-emerald-400'
                : isCredit
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-800 dark:text-slate-100'
            )}
          >
            {formatCurrency(finalBalance)}
          </span>
        </div>

        {/* Tafqeet in Arabic */}
        <div className="space-y-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="no-print h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              التفقيط (كتابةً)
            </span>
          </div>
          <div className="screen:max-md:p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <p className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-100">
              {finalBalance === 0 ? 'الرصيد مصفر حالياً' : `فقط ${tafqeet(absBalance)} لا غير.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
