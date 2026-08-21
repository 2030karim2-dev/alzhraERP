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
    <div className="mt-6 screen:max-md:mt-3 p-6 screen:max-md:p-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl shadow-xl shadow-blue-500/5 overflow-hidden relative group">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-colors no-print" />

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Status Indicator */}
        <div className="md:col-span-1 space-y-4">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Wallet size={14} />
              الخلاصة المالية
            </h3>
            <p className="text-xs font-bold text-gray-400">الوضعية الحالية للحساب حتى تاريخ اليوم</p>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-tighter shadow-sm border",
              isDebit
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : isCredit
                ? "bg-rose-50 text-rose-700 border-rose-100"
                : "bg-gray-50 text-gray-600 border-gray-100"
            )}
          >
            {isDebit ? (
              <TrendingUp size={14} className="no-print" />
            ) : isCredit ? (
              <TrendingDown size={14} className="no-print" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-current no-print" />
            )}
            {isDebit ? "رصيد مدين (عليه)" : isCredit ? "رصيد دائن (له)" : "الرصيد مصفر"}
          </div>
        </div>

        {/* Net Balance Amount */}
        <div className="md:col-span-1 bg-gray-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">صافي الرصيد</span>
          <span
            dir="ltr"
            className={cn(
              "text-3xl screen:max-md:text-2xl font-bold font-mono tracking-tighter",
              isDebit ? "text-emerald-600" : isCredit ? "text-rose-600" : "text-gray-800"
            )}
          >
            {formatCurrency(finalBalance)}
          </span>
        </div>

        {/* Tafqeet in Arabic */}
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 no-print" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">التفقيط (كتابةً)</span>
          </div>
          <div className="p-4 screen:max-md:p-2.5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
              {finalBalance === 0 ? 'الرصيد مصفر حالياً' : `فقط ${tafqeet(absBalance)} لا غير.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
