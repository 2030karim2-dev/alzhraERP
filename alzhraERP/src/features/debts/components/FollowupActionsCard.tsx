import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarClock } from 'lucide-react';
import { ROUTES } from '../../../core/routes/paths';
import { useDebtFollowupActions } from '../hooks/useDebtQueries';
import type { DebtFollowupAction } from '../types';

/** تسمية أولوية الإجراء — switch صريح (بلا فهرسة كائن بمفتاح متغيّر). */
const priorityLabel = (priority: string | null): string => {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'عالية';
    case 'low':
      return 'منخفضة';
    default:
      return 'متوسطة';
  }
};

const priorityClass = (priority: string | null): string => {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-600';
    case 'low':
      return 'border-slate-500/20 bg-slate-500/10 text-slate-500';
    default:
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600';
  }
};

/** تاريخ مختصر — الخادم يُرسل scheduled_at بصيغة ISO. */
const shortDate = (value: string | null): string =>
  value !== null && value !== '' ? value.slice(0, 10) : '—';

const ActionRow: React.FC<{ action: DebtFollowupAction }> = ({ action }) => (
  <li className="flex items-center justify-between gap-3 px-4 py-2.5 max-md:px-3 max-md:py-2">
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${action.is_overdue ? 'bg-rose-500' : 'bg-sky-500'}`}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-[var(--app-text)]">{action.party_name}</p>
        <p className="truncate text-[10px] text-[var(--app-text-secondary)]">
          {action.subject} · {shortDate(action.scheduled_at)}
          {action.is_overdue ? ' · متأخر' : ''}
        </p>
      </div>
    </div>
    <span
      className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${priorityClass(action.priority)}`}
    >
      {priorityLabel(action.priority)}
    </span>
  </li>
);

/**
 * S1: الإجراءات المجدولة المستحقة (customer_activities.status = pending).
 * تعرض «الإجراء التالي» الذي يسجّله المحصّل عند أي تواصل، وهو ما لم تكن
 * أي شاشة تعرضه سابقاً («كتابة بلا قارئ» في log_collection_activity).
 * عرض فقط — لا استدعاء مباشر لـ Supabase (الطبقات: Hook → Service → API).
 */
const FollowupActionsCard: React.FC = () => {
  const { data: actions, isLoading } = useDebtFollowupActions();
  const list = actions ?? [];
  const overdueCount = list.filter(action => action.is_overdue).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] p-4 max-md:p-2.5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
          <span className="rounded-lg bg-sky-600 p-1.5 text-white">
            <CalendarClock size={14} />
          </span>
          إجراءات متابعة مجدولة
        </h3>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              <AlertTriangle size={11} />
              {overdueCount} متأخر
            </span>
          )}
          <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
            {list.length} إجراء
          </span>
          <Link
            to={ROUTES.DASHBOARD.DEBTS_FOLLOWUP}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
          >
            المتابعة
            <ArrowLeft size={11} />
          </Link>
        </div>
      </div>
      {isLoading ? (
        <div className="h-16 animate-pulse" />
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-xs text-[var(--app-text-secondary)] max-md:p-5">
          لا توجد إجراءات متابعة مستحقة اليوم — جدول الإجراء التالي عند تسجيل أي تواصل.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--app-border)]">
          {list.map(action => (
            <ActionRow key={action.action_id} action={action} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default FollowupActionsCard;
