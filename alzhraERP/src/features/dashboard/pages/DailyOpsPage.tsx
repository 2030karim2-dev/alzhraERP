import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, Package, Receipt, Users, Truck, BarChart3, Wrench } from 'lucide-react';
import { cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  { icon: <ShoppingCart size={24} />, label: 'نقطة البيع', path: '/pos', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  { icon: <Receipt size={24} />, label: 'فاتورة جديدة', path: '/sales/new', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
  { icon: <Package size={24} />, label: 'المخزون', path: '/inventory', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  { icon: <Users size={24} />, label: 'العملاء', path: '/parties', color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-900/30' },
  { icon: <Truck size={24} />, label: 'المشتريات', path: '/purchases', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  { icon: <DollarSign size={24} />, label: 'المصروفات', path: '/expenses', color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-900/30' },
  { icon: <BarChart3 size={24} />, label: 'التقارير', path: '/reports', color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30' },
  { icon: <Wrench size={24} />, label: 'جرد سريع', path: '/inventory?quick=1', color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/30' },
];

interface DailySummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const DailySummaryCard: React.FC<DailySummaryCardProps> = ({ label, value, icon, color }) => (
  <div className="bg-[var(--app-surface)] rounded-2xl p-4 border border-[var(--app-border)]">
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
      {icon}
    </div>
    <p className="text-[10px] font-semibold text-[var(--app-text-secondary)] uppercase tracking-wider">{label}</p>
    <p className="text-lg font-black text-[var(--app-text)] font-mono">{value}</p>
  </div>
);

interface DailyOpsPageProps {
  summary: {
    todaySales: string;
    todayInvoices: number;
    lowStockItems: number;
    pendingDebts: string;
  };
  className?: string;
}

const DailyOpsPage: React.FC<DailyOpsPageProps> = ({ summary, className }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={cn('p-4 space-y-5', className)}>
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-black text-[var(--app-text)]">{t('daily_operations') || 'العمليات اليومية'}</h1>
        <p className="text-xs text-[var(--app-text-secondary)] mt-1">وصول سريع لجميع الإجراءات اليومية</p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 gap-3">
        <DailySummaryCard
          label="مبيعات اليوم" value={summary.todaySales}
          icon={<ShoppingCart size={16} className="text-white" />} color="bg-blue-600"
        />
        <DailySummaryCard
          label="فواتير اليوم" value={String(summary.todayInvoices)}
          icon={<Receipt size={16} className="text-white" />} color="bg-emerald-600"
        />
        <DailySummaryCard
          label="مخزون منخفض" value={String(summary.lowStockItems)}
          icon={<Package size={16} className="text-white" />} color="bg-amber-600"
        />
        <DailySummaryCard
          label="ديون معلقة" value={summary.pendingDebts}
          icon={<DollarSign size={16} className="text-white" />} color="bg-rose-600"
        />
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-sm font-bold text-[var(--app-text)] mb-3">{t('quick_actions') || 'إجراءات سريعة'}</h3>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 active:scale-95 hover:shadow-md"
            >
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-all', action.bgColor, action.color)}>
                {action.icon}
              </div>
              <span className="text-[10px] font-bold text-[var(--app-text-secondary)] text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyOpsPage;
