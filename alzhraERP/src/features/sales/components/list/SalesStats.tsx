import React from 'react';
import { DollarSign, FileText, BarChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import StatCard from '../../../../ui/common/StatCard';
import { useSalesStats } from '../../hooks/index';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';
import Spinner from '../../../../ui/base/Spinner';

const SalesStats: React.FC = () => {
  const { data: stats, isLoading, error, refetch } = useSalesStats();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error?.message || null} variant="mini" onRetry={refetch} />;
  }

  if (!stats) return null;

  // [FIX] عرض النمو الحقيقي من البيانات
  const growth = stats.monthlyGrowth;
  const growthLabel = growth === null
    ? 'لا توجد بيانات'
    : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
  const GrowthIcon = growth === null ? Minus : growth >= 0 ? TrendingUp : TrendingDown;
  const growthColor = growth === null ? 'text-gray-400' : growth >= 0 ? 'text-amber-500' : 'text-rose-500';
  const growthBg = growth === null ? 'bg-gray-400' : growth >= 0 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatCard
        title="إجمالي المبيعات"
        value={formatCurrency(stats.totalSales)}
        subtitle="آخر 30 يوماً"
        icon={DollarSign}
        colorClass="text-emerald-500"
        iconBgClass="bg-emerald-500"
      />
      <StatCard
        title="عدد الفواتير"
        value={formatNumberDisplay(stats.invoiceCount)}
        subtitle="آخر 30 يوماً"
        icon={FileText}
        colorClass="text-blue-500"
        iconBgClass="bg-blue-500"
      />
      <StatCard
        title="متوسط الفاتورة"
        value={formatCurrency(stats.avgSale)}
        subtitle="آخر 30 يوماً"
        icon={BarChart}
        colorClass="text-indigo-500"
        iconBgClass="bg-indigo-500"
      />
      <StatCard
        title="النمو الشهري"
        value={growthLabel}
        subtitle="مقارنةً بالشهر الماضي"
        icon={GrowthIcon}
        colorClass={growthColor}
        iconBgClass={growthBg}
      />
    </div>
  );
};

export default SalesStats;
