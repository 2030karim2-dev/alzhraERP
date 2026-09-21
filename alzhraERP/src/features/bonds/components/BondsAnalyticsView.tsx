import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useThemeStore } from '@/lib/themeStore';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import BondKpiCards from './BondKpiCards';
import BondTrendChart from './BondTrendChart';
import BondAccountDistributionChart from './BondAccountDistributionChart';
import { useBondsAnalytics } from '../hooks';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

const periodLabels: Record<PeriodType, string> = {
  today: 'اليوم',
  week: 'آخر 7 أيام',
  month: 'هذا الشهر',
  quarter: 'هذا الربع',
  year: 'هذه السنة',
};

interface Props {
  onSwitchToList: () => void;
}

const BondsAnalyticsView: React.FC<Props> = ({ onSwitchToList }) => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Fetch analytics from server — re-fetches when period changes
  const { data: serverAnalytics, isLoading } = useBondsAnalytics(period);

  const safeData = serverAnalytics as Record<string, unknown> | null;

  const analytics = {
    totalAmount: (safeData?.totalAmount as number) || 0,
    count: (safeData?.count as number) || 0,
    avgAmount: (safeData?.avgAmount as number) || 0,
    chartData:
      (safeData?.chartData as Array<{ date: string; amount: number; count: number }>) || [],
    accountData:
      (safeData?.accountData as Array<{ name: string; amount: number; count: number }>) || [],
  };

  const safeTotals = (safeData?.totals as Record<string, number>) || {};
  const totals = {
    receiptCount: safeTotals.receiptCount || 0,
    receiptAmount: safeTotals.receiptAmount || 0,
    paymentCount: safeTotals.paymentCount || 0,
    paymentAmount: safeTotals.paymentAmount || 0,
    netAmount: safeTotals.netAmount || 0,
  };

  return (
    <div className="font-cairo animate-in fade-in flex h-full flex-col bg-[#f8fafc] duration-700 dark:bg-slate-950">
      <MicroHeader
        title="تحليلات السندات"
        icon={BarChart3}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex rounded-2xl border border-slate-200/50 bg-white/50 p-1.5 shadow-inner backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-900/50">
              {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                  }}
                  className={`rounded-xl px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    period === p
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <Button
              onClick={onSwitchToList}
              variant="outline"
              size="sm"
              className="rounded-2xl border-slate-200 font-bold transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              للقائمة
            </Button>
          </div>
        }
      />

      <div className="scrollbar-hide flex-1 overflow-y-auto p-8 pb-20">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="mx-auto max-w-none space-y-10">
            {/* KPI Cards */}
            <BondKpiCards totals={totals} analytics={analytics} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Trend Chart */}
              <BondTrendChart data={analytics.chartData} isDark={isDark} />

              {/* Accounts Chart */}
              <BondAccountDistributionChart data={analytics.accountData} isDark={isDark} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BondsAnalyticsView;
