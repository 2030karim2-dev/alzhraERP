/**
 * أدوات طابور مهام التحصيل — منطق عرض نقي (بلا React وبلا Supabase).
 * التصنيف والأولوية والتصعيد تُحسب في SQL؛ هنا التسميات والترتيب والمجاميع فقط.
 */
import { formatCurrency } from '../../../core/utils/currencyUtils';
import type { DebtTaskQueueRow } from '../types';

/** تسمية عربية لنوع المهمة (switch صريح — بلا فهرسة كائن بمفتاح متغيّر). */
export const taskTypeLabel = (taskType: string): string => {
  switch (taskType) {
    case 'due_today':
      return 'مستحق اليوم';
    case 'promise_due':
      return 'وعد مستحق';
    case 'broken_promise':
      return 'وعد مخلَف';
    case 'follow_up':
      return 'إجراء مجدول';
    case 'critical_debt':
      return 'دين حرج';
    case 'failed_message':
      return 'رسالة فاشلة';
    default:
      return taskType;
  }
};

/** رتبة الاستعجال للترتيب (الأصغر أعجل). */
export const urgencyRank = (urgency: string | null): number => {
  switch (urgency) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    default:
      return 2;
  }
};

/** فئات لونية لوسم الاستعجال. */
export const urgencyClasses = (urgency: string | null): string => {
  switch (urgency) {
    case 'critical':
      return 'border border-rose-500/20 bg-rose-500/10 text-rose-600';
    case 'high':
      return 'border border-amber-500/20 bg-amber-500/10 text-amber-600';
    default:
      return 'border border-sky-500/20 bg-sky-500/10 text-sky-600';
  }
};

/** تسمية أولوية الإسناد. */
export const assignmentPriorityLabel = (priority: string | null): string => {
  switch (priority) {
    case 'urgent':
      return 'عاجلة';
    case 'high':
      return 'عالية';
    case 'low':
      return 'منخفضة';
    default:
      return 'متوسطة';
  }
};

/** ترتيب المهام: الاستعجال ثم الاستحقاق ثم الاسم (دالة نقية). */
export const sortTasks = (tasks: DebtTaskQueueRow[]): DebtTaskQueueRow[] =>
  [...tasks].sort((a, b) => {
    const byUrgency = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (byUrgency !== 0) return byUrgency;
    const aDue = a.due_at ?? '';
    const bDue = b.due_at ?? '';
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return a.party_name.localeCompare(b.party_name);
  });

/**
 * يستخرج معرّف النشاط من مهمة مجدولة (task_id بصيغة act:<uuid>).
 * المهام غير المجدولة (فواتير/وعود) تُعيد null لأنها تُغلق تلقائياً.
 */
export const activityIdFromTaskId = (taskId: string): string | null => {
  if (!taskId.startsWith('act:')) return null;
  const id = taskId.slice(4);
  return id === '' ? null : id;
};

/** عدد المهام المتأخرة. */
export const countOverdue = (tasks: DebtTaskQueueRow[]): number =>
  tasks.filter(task => task.is_overdue).length;

/** مجاميع المبالغ لكل عملة — لا يُجمع مبلغان بعملتين مختلفتين أبداً. */
export const sumAmountByCurrency = (tasks: DebtTaskQueueRow[]): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const task of tasks) {
    if (task.amount === null || task.currency_code === null) continue;
    totals.set(task.currency_code, (totals.get(task.currency_code) ?? 0) + task.amount);
  }
  return totals;
};

/** وصف المجاميع لكل عملة بشكل مقروء. */
export const totalsLabel = (totals: Map<string, number>): string => {
  if (totals.size === 0) return '—';
  const parts: string[] = [];
  totals.forEach((value, currency) => {
    parts.push(formatCurrency(value, currency, { maximumFractionDigits: 2 }));
  });
  return parts.join(' · ');
};
