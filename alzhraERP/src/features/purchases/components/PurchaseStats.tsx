
import React from 'react';
import { FileText, TrendingDown, AlertCircle, CreditCard } from 'lucide-react';
import StatCard from '../../../ui/common/StatCard';
import { usePurchaseStats } from '../hooks';
import { formatCurrency, formatNumberDisplay } from '../../../core/utils'; // Import formatNumberDisplay

const PurchaseStats: React.FC = () => {
  const { data: stats, isLoading } = usePurchaseStats();

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl"></div>)}
    </div>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <StatCard
        title="فواتير الفترة"
        value={formatNumberDisplay(stats?.invoiceCount || 0)}
        icon={FileText}
        colorClass="text-gray-500"
        iconBgClass="bg-gray-500"
      />

      <StatCard
        title="إجمالي المشتريات"
        value={formatCurrency(stats?.totalPurchases || 0)}
        icon={TrendingDown}
        colorClass="text-blue-500"
        iconBgClass="bg-blue-500"
      />

      <StatCard
        title="فواتير آجلة"
        value={formatNumberDisplay(stats?.pendingPaymentCount || 0)}
        icon={AlertCircle}
        colorClass="text-amber-500"
        iconBgClass="bg-amber-500"
      />

      <StatCard
        title="إجمالي المديونية"
        value={formatCurrency(stats?.totalDebt || 0)}
        icon={CreditCard}
        colorClass="text-red-500"
        iconBgClass="bg-red-500"
      />
    </div>
  );
};

export default PurchaseStats;
