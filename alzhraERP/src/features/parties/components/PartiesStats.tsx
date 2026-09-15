import React from 'react';
import { Users, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import type { PartyStats, PartyType } from '../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface Props {
  stats: PartyStats;
  type: PartyType;
}

const PartiesStats: React.FC<Props> = ({ stats, type }) => {
  const { t } = useTranslation();
  const isCustomer = type === 'customer';

  const totalRec = stats.totalReceivable ?? 0;
  const totalPay = stats.totalPayable ?? 0;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
      {/* Card 1: Count & Status */}
      <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {isCustomer ? t('total_customers') : t('total_suppliers')}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Users size={15} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatNumberDisplay(stats.totalCount)}
          </span>
          <span className="text-[10px] text-slate-400">جهة</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[10px] dark:border-slate-800">
          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {formatNumberDisplay(stats.activeCount)} نشط
          </span>
          {stats.blockedCount > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {formatNumberDisplay(stats.blockedCount)} محظور
              </span>
            </>
          )}
        </div>
      </div>

      {/* Card 2: Receivables (لنا) */}
      <div className="group relative overflow-hidden rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-3.5 shadow-sm transition-all hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            {isCustomer ? 'مستحقات لنا (مدين)' : 'أرصدة مدينة لنا'}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="mt-2">
          <span
            dir="ltr"
            className="font-mono text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300"
          >
            {formatCurrency(totalRec)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1 border-t border-emerald-100/80 pt-2 text-[10px] text-emerald-700/80 dark:border-emerald-900/40 dark:text-emerald-400">
          <span>مبالغ مطلوبة لصالح المنشأة</span>
        </div>
      </div>

      {/* Card 3: Payables (علينا / أمانات) */}
      <div className="group relative overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/40 p-3.5 shadow-sm transition-all hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
            {isCustomer ? 'أمانات / دفعات مقدمة (دائن)' : 'مستحقات للموردين (دائن)'}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <TrendingDown size={15} />
          </div>
        </div>
        <div className="mt-2">
          <span
            dir="ltr"
            className="font-mono text-xl font-bold tracking-tight text-amber-700 dark:text-amber-300"
          >
            {formatCurrency(totalPay)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1 border-t border-amber-100/80 pt-2 text-[10px] text-amber-700/80 dark:border-amber-900/40 dark:text-amber-400">
          <span>التزامات أو أرصدة دائنة</span>
        </div>
      </div>

      {/* Card 4: Net Balance & Multi-Currency */}
      <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            صافي الرصيد الإجمالي
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Wallet size={15} />
          </div>
        </div>
        <div className="mt-2">
          <span
            dir="ltr"
            className={cn(
              'font-mono text-xl font-bold tracking-tight',
              stats.totalBalance >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {formatCurrency(stats.totalBalance)}
          </span>
        </div>
        {stats.byCurrency && stats.byCurrency.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
            {stats.byCurrency.slice(0, 3).map(c => (
              <span
                key={c.currency}
                dir="ltr"
                className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {formatCurrency(c.balance, c.currency)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartiesStats;
