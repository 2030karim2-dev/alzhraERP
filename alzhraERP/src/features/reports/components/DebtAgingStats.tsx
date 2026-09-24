/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import { Users, ShieldCheck, AlertTriangle } from 'lucide-react';
import StatCard from '../../../ui/common/StatCard';
import { ResponsiveGrid } from './MobileComponents';
import { formatCurrency } from '../../../core/utils';
import type { DebtAgingData } from '../types/debtAging';

interface DebtAgingStatsProps {
  data: DebtAgingData | null | undefined;
}

export const DebtAgingStats: React.FC<DebtAgingStatsProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {/* 4 Buckets Stat Cards */}
      <ResponsiveGrid cols={4}>
        <StatCard
          title="إجمالي المستحقات"
          value={formatCurrency(data?.totalOutstanding || 0)}
          icon={Users}
          colorClass="text-blue-500"
          iconBgClass="bg-blue-500"
        />
        <StatCard
          title="حالية (0-30 يوم)"
          value={formatCurrency(data?.agingBuckets.current || 0)}
          icon={ShieldCheck}
          colorClass="text-emerald-500"
          iconBgClass="bg-emerald-500"
        />
        <StatCard
          title="متأخرة (31-90 يوم)"
          value={formatCurrency(
            (data?.agingBuckets.days30 || 0) + (data?.agingBuckets.days60 || 0)
          )}
          icon={AlertTriangle}
          colorClass="text-amber-500"
          iconBgClass="bg-amber-500"
        />
        <StatCard
          title="حرجة (90+ يوم)"
          value={formatCurrency(data?.agingBuckets.days90 || 0)}
          icon={AlertTriangle}
          colorClass="text-rose-500"
          iconBgClass="bg-rose-500"
        />
      </ResponsiveGrid>

      {/* Alert for critical debts */}
      {(data?.criticalCount || 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20 sm:p-4">
          <AlertTriangle size={18} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
            ⚠️ يوجد {data?.criticalCount} عميل لديهم ديون متأخرة أكثر من 90 يوم بإجمالي{' '}
            {formatCurrency(data?.agingBuckets.days90 || 0)}
          </span>
        </div>
      )}
    </div>
  );
};
