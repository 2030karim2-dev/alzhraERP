import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, AlertTriangle, Package, Wallet } from 'lucide-react';
import SparklineChart from '../../ui/base/SparklineChart';
import { cn } from '../../core/utils';

export interface GlanceMetric {
  label: string;
  value: number;
  change: number;
  sparkline: number[];
  icon: React.ReactNode;
  color: string;
  format?: 'currency' | 'number' | 'percent';
}

interface QuickGlanceDashboardProps {
  metrics: GlanceMetric[];
  className?: string;
}

const formatValue = (value: number, format?: string): string => {
  if (format === 'currency') return `${value.toLocaleString('en-US')} ريال`;
  if (format === 'percent') return `${value}%`;
  return value.toLocaleString('en-US');
};

const QuickGlanceDashboard: React.FC<QuickGlanceDashboardProps> = ({ metrics, className }) => {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3', className)}>
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="bg-[var(--app-surface)] rounded-2xl p-4 border border-[var(--app-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', metric.color)}>
              {metric.icon}
            </div>
            <SparklineChart data={metric.sparkline} width={50} height={22} showValue={false} />
          </div>
          <p className="text-[10px] font-semibold text-[var(--app-text-secondary)] uppercase tracking-wider mb-1">
            {metric.label}
          </p>
          <p className="text-base md:text-lg font-black text-[var(--app-text)] font-mono tracking-tight">
            {formatValue(metric.value, metric.format)}
          </p>
          <div className={cn(
            'flex items-center gap-1 mt-1.5 text-[10px] font-bold',
            metric.change >= 0 ? 'text-emerald-500' : 'text-rose-500',
          )}>
            {metric.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(metric.change)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DEFAULT_GLANCE_METRICS = (stats: {
  sales: number; salesChange: number; salesSpark: number[];
  profit: number; profitChange: number; profitSpark: number[];
  debts: number; debtsChange: number; debtsSpark: number[];
  expenses: number; expensesChange: number; expensesSpark: number[];
  inventory: number; inventoryChange: number; inventorySpark: number[];
  netCash: number; netCashChange: number; netCashSpark: number[];
}): GlanceMetric[] => [
  {
    label: 'المبيعات', value: stats.sales, change: stats.salesChange, sparkline: stats.salesSpark,
    icon: <ShoppingCart size={16} className="text-white" />, color: 'bg-blue-600', format: 'currency',
  },
  {
    label: 'الأرباح', value: stats.profit, change: stats.profitChange, sparkline: stats.profitSpark,
    icon: <DollarSign size={16} className="text-white" />, color: 'bg-emerald-600', format: 'currency',
  },
  {
    label: 'الديون', value: stats.debts, change: stats.debtsChange, sparkline: stats.debtsSpark,
    icon: <AlertTriangle size={16} className="text-white" />, color: 'bg-amber-600', format: 'currency',
  },
  {
    label: 'المصروفات', value: stats.expenses, change: stats.expensesChange, sparkline: stats.expensesSpark,
    icon: <Wallet size={16} className="text-white" />, color: 'bg-rose-600', format: 'currency',
  },
  {
    label: 'المخزون', value: stats.inventory, change: stats.inventoryChange, sparkline: stats.inventorySpark,
    icon: <Package size={16} className="text-white" />, color: 'bg-violet-600', format: 'number',
  },
  {
    label: 'الصافي', value: stats.netCash, change: stats.netCashChange, sparkline: stats.netCashSpark,
    icon: <Users size={16} className="text-white" />, color: 'bg-indigo-600', format: 'currency',
  },
];

export default QuickGlanceDashboard;
