
import React from 'react';
import { TrendingDown, TrendingUp, Scale, Wallet, DollarSign } from 'lucide-react';
// Fix: Corrected import path to point to the barrel file.
import { useFinancials } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import StatCard from '../../../../ui/common/StatCard';

const AccountingStats: React.FC = () => {
  const { data: financials, isLoading } = useFinancials();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-slate-800/50 animate-pulse"></div>
        ))}
      </div>
    );
  }

  const netIncome = financials?.incomeStatement?.netIncome || 0;
  const totalRevenue = financials?.incomeStatement?.revenues?.reduce((s: number, r: any) => s + Math.abs(r.net_balance), 0) || 0;
  const totalExpenses = financials?.incomeStatement?.expenses?.reduce((s: number, r: any) => s + r.net_balance, 0) || 0;
  const totalAssets = financials?.balanceSheet?.assets?.reduce((s: number, r: any) => s + r.net_balance, 0) || 0;
  const totalLiabilities = Math.abs(financials?.balanceSheet?.liabilities?.reduce((s: number, r: any) => s + r.net_balance, 0) || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0.5 transition-colors duration-300">
      <StatCard
        title="صافي الربح"
        value={formatCurrency(netIncome)}
        subtext={netIncome >= 0 ? 'أرباح محققة' : 'خسائر'}
        icon={DollarSign}
        colorClass={netIncome >= 0 ? "text-emerald-500" : "text-red-500"}
        iconBgClass={netIncome >= 0 ? "bg-emerald-500" : "bg-red-500"}
        trend={totalRevenue > 0 ? { value: (netIncome / totalRevenue) * 100, isPositive: netIncome >= 0 } : undefined}
      />

      <StatCard
        title="الإيرادات"
        value={formatCurrency(totalRevenue)}
        subtext="الدخل التشغيلي"
        icon={TrendingUp}
        colorClass="text-blue-500"
        iconBgClass="bg-blue-500"
      />

      <StatCard
        title="المصروفات"
        value={formatCurrency(totalExpenses)}
        subtext="التكاليف والنفقات"
        icon={TrendingDown}
        colorClass="text-orange-500"
        iconBgClass="bg-orange-500"
      />

      <StatCard
        title="الأصول"
        value={formatCurrency(totalAssets)}
        subtext="ممتلكات الشركة"
        icon={Wallet}
        colorClass="text-indigo-500"
        iconBgClass="bg-indigo-500"
      />

      <StatCard
        title="الخصوم"
        value={formatCurrency(totalLiabilities)}
        subtext="الالتزامات القائمة"
        icon={Scale}
        colorClass="text-rose-500"
        iconBgClass="bg-rose-500"
      />
    </div>
  );
};

export default AccountingStats;