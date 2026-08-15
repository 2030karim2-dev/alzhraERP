import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, Receipt, Package, Wallet } from 'lucide-react';
import { cn } from '../../../core/utils';
import { useNavigate } from 'react-router-dom';

export interface ChecklistItem {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  path: string;
  done: boolean;
  urgent?: boolean;
}

interface DailyChecklistProps {
  items: ChecklistItem[];
  className?: string;
  onToggle?: (id: string) => void;
}

const DailyChecklist: React.FC<DailyChecklistProps> = ({ items, className, onToggle }) => {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => checked.has(i.id)).length;
    const urgent = items.filter(i => i.urgent && !checked.has(i.id)).length;
    return { total, done, urgent, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [items, checked]);

  const handleToggle = (id: string): void => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    onToggle?.(id);
  };

  return (
    <div className={cn('bg-[var(--app-surface)] rounded-2xl max-md:rounded-xl border border-[var(--app-border)] p-4 max-md:p-3 max-md:p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-md:mb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--app-text)]">مهام اليوم</h3>
        </div>
        <div className="flex items-center gap-2">
          {stats.urgent > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
              <AlertTriangle size={10} /> {stats.urgent} عاجل
            </span>
          )}
          <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
            {stats.done}/{stats.total}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-[var(--app-bg)] rounded-full mb-4 max-md:mb-3 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group',
              checked.has(item.id)
                ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'hover:bg-[var(--app-surface-hover)]',
              item.urgent && !checked.has(item.id) && 'bg-rose-50/50 dark:bg-rose-900/10',
            )}
          >
            <button
              onClick={() => handleToggle(item.id)}
              className="flex-shrink-0 text-[var(--app-text-secondary)] hover:text-emerald-500 transition-colors"
              aria-label={checked.has(item.id) ? 'إلغاء الإنجاز' : 'تحديد كمكتمل'}
            >
              {checked.has(item.id) ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : (
                <Circle size={18} />
              )}
            </button>

            <button
              onClick={() => navigate(item.path)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              {item.icon}
              <span className={cn(
                'text-xs font-semibold text-[var(--app-text)] truncate',
                checked.has(item.id) && 'line-through opacity-50',
              )}>
                {item.label}
              </span>
            </button>

            {item.count > 0 && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0',
                item.urgent && !checked.has(item.id)
                  ? 'bg-rose-600 text-white'
                  : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)]',
              )}>
                {item.count}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DEFAULT_CHECKLIST_ITEMS = (counts: {
  todayInvoices: number;
  overduePayments: number;
  lowStock: number;
  pendingReturns: number;
  dueExpenses: number;
}): ChecklistItem[] => [
  {
    id: 'invoices', label: 'فواتير اليوم', count: counts.todayInvoices,
    icon: <Receipt size={14} className="text-blue-500" />,
    path: '/sales', done: counts.todayInvoices === 0, urgent: false,
  },
  {
    id: 'overdue', label: 'مدفوعات متأخرة', count: counts.overduePayments,
    icon: <Wallet size={14} className="text-rose-500" />,
    path: '/reports?tab=debt_report', done: counts.overduePayments === 0, urgent: true,
  },
  {
    id: 'lowstock', label: 'مخزون منخفض', count: counts.lowStock,
    icon: <Package size={14} className="text-amber-500" />,
    path: '/inventory?view=low-stock', done: counts.lowStock === 0, urgent: counts.lowStock > 3,
  },
  {
    id: 'returns', label: 'مرتجعات معلقة', count: counts.pendingReturns,
    icon: <AlertTriangle size={14} className="text-violet-500" />,
    path: '/sales?tab=returns', done: counts.pendingReturns === 0, urgent: false,
  },
  {
    id: 'expenses', label: 'مصروفات مستحقة', count: counts.dueExpenses,
    icon: <Wallet size={14} className="text-orange-500" />,
    path: '/expenses', done: counts.dueExpenses === 0, urgent: false,
  },
];

export default DailyChecklist;
