import React from 'react';
import { formatCurrency, cn } from '../../../../core/utils';
import { tafqeet } from '../../../../core/utils/tafqeet';
import { Wallet, TrendingUp, TrendingDown, Coins } from 'lucide-react';
import type { StatementMovement } from '../../service';
import type { PartyType } from '../../types';

interface StatementSummaryCardsProps {
  movements: StatementMovement[];
  partyType?: PartyType | undefined;
  activeCurrency?: string;
}

interface CurrencySummary {
  currency: string;
  finalBalance: number;
  totalDebit: number;
  totalCredit: number;
}

export const StatementSummaryCards: React.FC<StatementSummaryCardsProps> = ({
  movements,
  partyType = 'customer',
  activeCurrency = 'ALL',
}) => {
  if (!movements || movements.length === 0) return null;

  // Group latest balance per currency
  const currencySummaries = React.useMemo(() => {
    const map = new Map<string, CurrencySummary>();

    movements.forEach(m => {
      const curr = m.currency || 'SAR';
      if (!map.has(curr)) {
        map.set(curr, {
          currency: curr,
          finalBalance: 0,
          totalDebit: 0,
          totalCredit: 0,
        });
      }
      const existing = map.get(curr)!;
      existing.totalDebit += Number(m.debit) || 0;
      existing.totalCredit += Number(m.credit) || 0;
      // Last entry visited for this currency will be its final running balance
      existing.finalBalance = Number(m.balance) || 0;
    });

    if (activeCurrency !== 'ALL') {
      const single = map.get(activeCurrency);
      return single ? [single] : Array.from(map.values());
    }

    return Array.from(map.values());
  }, [movements, activeCurrency]);

  const isSupplier = partyType === 'supplier';

  return (
    <div className="space-y-4">
      {currencySummaries.map(item => {
        const finalBalance = item.finalBalance;
        const absBalance = Math.abs(finalBalance);
        const isPositive = finalBalance > 0;
        const isNegative = finalBalance < 0;

        const statusText = isSupplier
          ? isPositive
            ? 'مستحق للمورد (له)'
            : isNegative
              ? 'دفعة مقدمة للمورد (عليه)'
              : 'الرصيد مصفر'
          : isPositive
            ? 'رصيد مستحق على العميل (مدين)'
            : isNegative
              ? 'رصيد دائن لصالح العميل (له)'
              : 'الرصيد مصفر';

        const isOwed = isSupplier ? isPositive : !isPositive && finalBalance !== 0;

        return (
          <div
            key={item.currency}
            className="screen:max-md:mt-3 screen:max-md:p-3 group relative overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-lg shadow-blue-500/5 dark:border-slate-800"
          >
            {/* Background Accent */}
            <div className="no-print absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl transition-colors group-hover:bg-blue-500/10" />

            <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              {/* Status Indicator & Movement Totals */}
              <div className="space-y-3 md:col-span-1">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
                    <Wallet size={14} />
                    الخلاصة المالية ({item.currency})
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>
                      إجمالي المدين:{' '}
                      <strong className="font-mono text-emerald-600" dir="ltr">
                        {formatCurrency(item.totalDebit, item.currency)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      إجمالي الدائن:{' '}
                      <strong className="font-mono text-rose-600" dir="ltr">
                        {formatCurrency(item.totalCredit, item.currency)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-tight shadow-sm',
                    finalBalance === 0
                      ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                      : isOwed
                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                  )}
                >
                  {finalBalance > 0 ? (
                    <TrendingUp size={14} className="no-print" />
                  ) : finalBalance < 0 ? (
                    <TrendingDown size={14} className="no-print" />
                  ) : (
                    <Coins size={14} className="no-print text-slate-500" />
                  )}
                  {statusText}
                </div>
              </div>

              {/* Net Balance Amount */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-800/60 md:col-span-1">
                <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  صافي الرصيد ({item.currency})
                </span>
                <span
                  dir="ltr"
                  className={cn(
                    'screen:max-md:text-xl font-mono text-2xl font-bold tracking-tight',
                    finalBalance === 0
                      ? 'text-slate-800 dark:text-slate-100'
                      : isOwed
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {formatCurrency(finalBalance, item.currency)}
                </span>
              </div>

              {/* Tafqeet in Arabic */}
              <div className="space-y-2 md:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="no-print h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    التفقيط المالي باللغة العربية
                  </span>
                </div>
                <div className="screen:max-md:p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <p className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                    {finalBalance === 0
                      ? 'الرصيد مصفر حالياً'
                      : `فقط ${tafqeet(absBalance)} ${item.currency === 'YER' ? 'ريال يمني' : item.currency === 'USD' ? 'دولار أمريكي' : 'ريال سعودي'} لا غير.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
