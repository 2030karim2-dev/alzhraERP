import React from 'react';
import {
  Wallet,
  AlertTriangle,
  CalendarClock,
  Handshake,
  ShieldAlert,
  MessageCircleX,
  BellRing,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import StatCard from '../../../ui/common/StatCard';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { useDebtAnalytics, useDebtTodayTasks } from '../hooks/useDebtQueries';
import { useCompany } from '../../settings/hooks';
import { TASK_TYPE_META } from '../lib/constants';
import AIDebtAdvisor from '../components/AIDebtAdvisor';
import type { DebtAnalytics, TodayTask } from '../types';

/** Safe numeric coercion for values that arrive from a JSON payload. */
const asNumber = (value: number | undefined): number => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const LoadingCard: React.FC = () => (
  <div className="h-24 max-md:h-16 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] animate-pulse" />
);

interface StatRow {
  title: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  colorClass: string;
  iconBgClass: string;
}

const buildStatRows = (a: DebtAnalytics, baseCurrency: string): StatRow[] => [
  {
    title: 'إجمالي المديونية',
    value: formatCurrency(asNumber(a.total_receivables), baseCurrency),
    subtext: `${asNumber(a.total_debtors)} عميل مدين`,
    icon: Wallet,
    colorClass: 'text-blue-600',
    iconBgClass: 'bg-blue-500',
  },
  {
    title: 'متأخر',
    value: formatCurrency(asNumber(a.overdue_receivables), baseCurrency),
    subtext: 'فواتير تجاوزت الاستحقاق',
    icon: AlertTriangle,
    colorClass: 'text-orange-600',
    iconBgClass: 'bg-orange-500',
  },
  {
    title: 'مستحق اليوم',
    value: formatCurrency(asNumber(a.due_today), baseCurrency),
    subtext: 'يحتاج متابعة اليوم',
    icon: CalendarClock,
    colorClass: 'text-amber-600',
    iconBgClass: 'bg-amber-500',
  },
  {
    title: 'وعود قائمة',
    value: `${asNumber(a.pending_promises)}`,
    subtext: formatCurrency(asNumber(a.pending_promises_amount), baseCurrency),
    icon: Handshake,
    colorClass: 'text-emerald-600',
    iconBgClass: 'bg-emerald-500',
  },
  {
    title: 'وعود مخلَفة',
    value: `${asNumber(a.broken_promises)}`,
    subtext: formatCurrency(asNumber(a.broken_promises_amount), baseCurrency),
    icon: ShieldAlert,
    colorClass: 'text-rose-600',
    iconBgClass: 'bg-rose-500',
  },
  {
    title: 'بحاجة تذكير',
    value: `${asNumber(a.needs_reminder)}`,
    subtext: 'لم يُذكَّروا خلال النافذة',
    icon: BellRing,
    colorClass: 'text-sky-600',
    iconBgClass: 'bg-sky-500',
  },
  {
    title: 'رسائل فاشلة (24 ساعة)',
    value: `${asNumber(a.failed_messages_24h)}`,
    subtext: `إجمالي ${asNumber(a.failed_messages)} رسالة فاشلة`,
    icon: MessageCircleX,
    colorClass: 'text-red-600',
    iconBgClass: 'bg-red-500',
  },
  {
    title: 'رسائل مرسلة',
    value: `${asNumber(a.sent_messages)}`,
    subtext: 'سجل كامل للتذكيرات',
    icon: Send,
    colorClass: 'text-violet-600',
    iconBgClass: 'bg-violet-500',
  },
];

const StatsGrid: React.FC<{ analytics: DebtAnalytics | null; isLoading: boolean; baseCurrency: string }> = ({
  analytics,
  isLoading,
  baseCurrency,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-md:gap-1.5 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    );
  }
  const rows = buildStatRows(analytics ?? ({} as DebtAnalytics), baseCurrency);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-md:gap-1.5 md:gap-4">
      {rows.map((s) => (
        <StatCard
          key={s.title}
          title={s.title}
          value={s.value}
          subtext={s.subtext}
          icon={s.icon}
          colorClass={s.colorClass}
          iconBgClass={s.iconBgClass}
        />
      ))}
    </div>
  );
};

const urgencyClass = (urgency: string): string =>
  urgency === 'critical'
    ? 'bg-rose-500'
    : urgency === 'high'
      ? 'bg-amber-500'
      : 'bg-sky-500';

const TaskRow: React.FC<{ task: TodayTask }> = ({ task }) => (
  <li className="flex items-center justify-between gap-3 px-4 max-md:px-2.5 py-3 max-md:py-2 hover:bg-[var(--app-surface-hover)] transition-colors">
    <div className="flex items-center gap-3 min-w-0">
      <span className={`shrink-0 w-2 h-2 rounded-full ${urgencyClass(task.urgency)}`} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--app-text)] truncate">{task.party_name}</p>
        <p className="text-[10px] text-[var(--app-text-secondary)]">
          {TASK_TYPE_META[task.task_type]?.label ?? task.task_type} · {task.reference_info}
        </p>
      </div>
    </div>
    <span className="shrink-0 text-xs font-bold font-mono text-[var(--app-text)]">
      {task.amount != null ? formatCurrency(Number(task.amount), task.currency_code) : '—'}
    </span>
  </li>
);

const TodayTasksCard: React.FC<{ tasks: TodayTask[] }> = ({ tasks }) => (
  <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm overflow-hidden">
    <div className="p-4 max-md:p-2.5 border-b border-[var(--app-border)] flex items-center justify-between">
      <h3 className="font-bold text-sm text-[var(--app-text)] flex items-center gap-2">
        <span className="p-1.5 bg-amber-500 text-white rounded-lg">
          <CalendarClock size={14} />
        </span>
        مهام اليوم
      </h3>
      <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">{tasks.length} مهمة</span>
    </div>
    {tasks.length === 0 ? (
      <div className="p-10 max-md:p-5 text-center text-sm text-[var(--app-text-secondary)]">
        لا توجد مهام مستحقة اليوم 🎉
      </div>
    ) : (
      <ul className="divide-y divide-[var(--app-border)]">
        {tasks.map((task, i) => (
          <TaskRow key={`${task.task_type}-${task.party_id}-${i}`} task={task} />
        ))}
      </ul>
    )}
  </div>
);

const CurrencyBreakdown: React.FC<{ byCurrency: DebtAnalytics['by_currency'] }> = ({
  byCurrency,
}) => {
  const list = byCurrency ?? [];
  if (list.length === 0) return null;
  return (
    <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm p-4 max-md:p-2.5">
      <h3 className="font-bold text-sm text-[var(--app-text)] mb-3 max-md:mb-2">التوزيع حسب العملة</h3>
      <div className="flex flex-wrap gap-3 max-md:gap-1.5">
        {list.map((c) => (
          <div
            key={c.currency}
            className="px-4 max-md:px-2.5 py-3 max-md:py-2 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)]"
          >
            <span className="block text-[10px] font-bold text-[var(--app-text-secondary)]">
              {c.currency}
            </span>
            <span className="block text-lg max-md:text-base font-bold font-mono text-blue-600">
              {formatCurrency(asNumber(c.balance), c.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const OverviewPage: React.FC = () => {
  const { data: analytics, isLoading } = useDebtAnalytics();
  const { data: tasks } = useDebtTodayTasks();
  const { data: company } = useCompany();
  const baseCurrency = company?.base_currency || 'SAR';

  const a = (analytics ?? {}) as DebtAnalytics;

  return (
    <div className="space-y-5 max-md:space-y-3">
      <AIDebtAdvisor />
      <StatsGrid analytics={analytics ?? null} isLoading={isLoading} baseCurrency={baseCurrency} />
      <TodayTasksCard tasks={tasks ?? []} />
      <CurrencyBreakdown byCurrency={a.by_currency} />
    </div>
  );
};

export default OverviewPage;

