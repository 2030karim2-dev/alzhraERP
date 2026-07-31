import { DollarSign, FileText, BarChart, TrendingUp } from 'lucide-react';
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatCard
        title="إجمالي المبيعات"
        value={formatCurrency(stats.totalSales)}
        icon={DollarSign}
        colorClass="text-emerald-500"
        iconBgClass="bg-emerald-500"
      />
      <StatCard
        title="عدد الفواتير"
        value={formatNumberDisplay(stats.invoiceCount)}
        icon={FileText}
        colorClass="text-blue-500"
        iconBgClass="bg-blue-500"
      />
      <StatCard
        title="متوسط الفاتورة"
        value={formatCurrency(stats.avgSale)}
        icon={BarChart}
        colorClass="text-indigo-500"
        iconBgClass="bg-indigo-500"
      />
      <StatCard
        title="النمو الشهري"
        value="+12.5%"
        icon={TrendingUp}
        colorClass="text-amber-500"
        iconBgClass="bg-amber-500"
      />
    </div>
  );
};

export default SalesStats;
