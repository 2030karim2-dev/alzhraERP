import React from 'react';
import { formatCurrency, cn } from '../../../../core/utils';
import { tafqeet } from '../../../../core/utils/tafqeet';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { StatementMovement } from '../../service';

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
    <div className="mt-5 screen:max-md:mt-3 p-5 screen:max-md:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg shadow-blue-500/5 overflow-hidden relative group">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-colors no-print" />

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Status Indicator */}
        <div className="md:col-span-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <Wallet size={14} />
              الخلاصة المالية
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الوضعية الحالية للحساب حتى تاريخ اليوم</p>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight shadow-sm border",
              isDebit
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                : isCredit
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            )}
          >
            {isDebit ? (
              <TrendingUp size={14} className="no-print" />
            ) : isCredit ? (
              <TrendingDown size={14} className="no-print" />
            ) : (
              <div className="w-3 h-3 rounded-full border-2 border-current no-print" />
            )}
            {isDebit ? "رصيد مدين (عليه)" : isCredit ? "رصيد دائن (له)" : "الرصيد مصفر"}
          </div>
        </div>

        {/* Net Balance Amount */}
        <div className="md:col-span-1 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">صافي الرصيد</span>
          <span
            dir="ltr"
            className={cn(
              "text-2xl screen:max-md:text-xl font-bold font-mono tracking-tight",
              isDebit ? "text-emerald-600 dark:text-emerald-400" : isCredit ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"
            )}
          >
            {formatCurrency(finalBalance)}
          </span>
        </div>

        {/* Tafqeet in Arabic */}
        <div className="md:col-span-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 no-print" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">التفقيط (كتابةً)</span>
          </div>
          <div className="p-3.5 screen:max-md:p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
              {finalBalance === 0 ? 'الرصيد مصفر حالياً' : `فقط ${tafqeet(absBalance)} لا غير.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
