import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  stats: {
    totalCount: number;
    totalAmount: number;
    salesCount: number;
    salesTotal: number;
    purchaseCount: number;
    purchaseTotal: number;
  };
}

const ReturnsStatsGrid: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
            <RefreshCw size={20} />
          </div>
          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
            إجمالي العمليات
          </span>
        </div>
        <div className="space-y-0.5">
          <h3 className="font-mono text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            {stats.totalCount}
          </h3>
          <p className="text-xs font-semibold text-slate-500">إجمالي عمليات الإرجاع</p>
        </div>
        <div className="mt-3 border-t border-[var(--app-border)] pt-3">
          <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(stats.totalAmount)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
            <TrendingDown size={20} />
          </div>
          <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
            صادر مبيعات
          </span>
        </div>
        <div className="space-y-0.5">
          <h3 className="font-mono text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            {stats.salesCount}
          </h3>
          <p className="text-xs font-semibold text-slate-500">مرتجعات المبيعات</p>
        </div>
        <div className="mt-3 border-t border-[var(--app-border)] pt-3">
          <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.salesTotal)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={20} />
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            وارد مشتريات
          </span>
        </div>
        <div className="space-y-0.5">
          <h3 className="font-mono text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            {stats.purchaseCount}
          </h3>
          <p className="text-xs font-semibold text-slate-500">مرتجعات المشتريات</p>
        </div>
        <div className="mt-3 border-t border-[var(--app-border)] pt-3">
          <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.purchaseTotal)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
            <BarChart3 size={20} />
          </div>
          <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-600">
            متوسط القيمة
          </span>
        </div>
        <div className="space-y-0.5">
          <h3 className="font-mono text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            {
              formatCurrency(stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0).split(
                ' '
              )[0]
            }
          </h3>
          <p className="text-xs font-semibold text-slate-500">متوسط قيمة المرتجع</p>
        </div>
        <div className="mt-3 border-t border-[var(--app-border)] pt-3">
          <span className="text-xs font-bold text-slate-400">لكل حركة مرتجع</span>
        </div>
      </div>
    </div>
  );
};

export default ReturnsStatsGrid;
