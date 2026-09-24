/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Activity } from 'lucide-react';
import { cn, formatCurrency } from '../../../core/utils';

export interface BondsQuickTotals {
  receiptCount: number;
  receiptAmount: number;
  paymentCount: number;
  paymentAmount: number;
  netAmount: number;
}

export interface BondsQuickAnalytics {
  avgAmount: number;
  count: number;
}

interface BondsQuickKpiBarProps {
  totals: BondsQuickTotals;
  analytics: BondsQuickAnalytics;
}

export const BondsQuickKpiBar: React.FC<BondsQuickKpiBarProps> = ({ totals, analytics }) => {
  return (
    <div className="hidden grid-cols-2 gap-3 px-3 pb-1 pt-3 md:grid md:px-5 lg:grid-cols-4">
      {/* Total Receipts Card */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-sm dark:border-emerald-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            إجمالي المقبوضات
          </span>
          <div className="rounded-lg bg-emerald-50 p-1 text-emerald-600 dark:bg-emerald-900/30">
            <ArrowDownCircle size={15} />
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totals.receiptAmount, 'SAR')}
          </span>
          <span className="font-mono text-[10px] font-bold text-slate-400">
            {totals.receiptCount} سند
          </span>
        </div>
      </div>

      {/* Total Payments Card */}
      <div className="rounded-2xl border border-rose-100 bg-white p-3.5 shadow-sm dark:border-rose-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
            إجمالي المدفوعات
          </span>
          <div className="rounded-lg bg-rose-50 p-1 text-rose-600 dark:bg-rose-900/30">
            <ArrowUpCircle size={15} />
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-mono text-lg font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(totals.paymentAmount, 'SAR')}
          </span>
          <span className="font-mono text-[10px] font-bold text-slate-400">
            {totals.paymentCount} سند
          </span>
        </div>
      </div>

      {/* Net Cash Flow Card */}
      <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-sm dark:border-blue-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
            صافي تدفق السيولة
          </span>
          <div className="rounded-lg bg-blue-50 p-1 text-blue-600 dark:bg-blue-900/30">
            <Wallet size={15} />
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span
            className={cn(
              'font-mono text-lg font-black',
              totals.netAmount >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {formatCurrency(totals.netAmount, 'SAR')}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {totals.netAmount >= 0 ? 'فائض نقدي' : 'عجز نقدي'}
          </span>
        </div>
      </div>

      {/* Average Bond Amount */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">متوسط قيمة السند</span>
          <div className="rounded-lg bg-indigo-50 p-1 text-indigo-600 dark:bg-indigo-900/30">
            <Activity size={15} />
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-mono text-lg font-black text-slate-800 dark:text-slate-100">
            {formatCurrency(analytics.avgAmount, 'SAR')}
          </span>
          <span className="font-mono text-[10px] font-bold text-slate-400">
            إجمالي {analytics.count} سند
          </span>
        </div>
      </div>
    </div>
  );
};
