import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useTodayTasks } from '../hooks/useDebtQueries';
import PageLoader from '@/ui/base/PageLoader';
import { CalendarCheck, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

const TodayTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: tasks, isLoading } = useTodayTasks();

  if (isLoading) return <PageLoader />;

  const iconMap: Record<string, React.ReactNode> = {
    due_today: <CalendarCheck className="w-4 h-4" />,
    promise_due: <Clock className="w-4 h-4" />,
    broken_promise: <AlertTriangle className="w-4 h-4" />,
    failed_message: <MessageSquare className="w-4 h-4" />,
  };

  const urgencyColors: Record<string, string> = {
    critical: 'border-red-400 bg-red-50 dark:bg-red-900/10',
    high: 'border-orange-400 bg-orange-50 dark:bg-orange-900/10',
    medium: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10',
    low: 'border-gray-300 bg-gray-50 dark:bg-gray-800',
  };

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">📋 {t('today_tasks')}</h1>

      {tasks?.length === 0 && (
        <div className="text-center py-12 text-[var(--app-text-secondary)]">
          <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">{t('no_tasks_today')}</p>
        </div>
      )}

      <div className="space-y-2">
        {tasks?.map((task, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${urgencyColors[task.urgency] || ''}`}>
            <div className="text-[var(--app-text-secondary)]">{iconMap[task.task_type] || <CalendarCheck className="w-4 h-4" />}</div>
            <div className="flex-1">
              <div className="font-medium text-sm">{task.party_name}</div>
              <div className="text-xs text-[var(--app-text-secondary)]">
                {task.reference_info && `${task.reference_info}`}
              </div>
            </div>
            <div className="text-right">
              {task.amount && <div className="font-bold text-sm">{task.currency_code} {new Intl.NumberFormat('ar-SA').format(task.amount)}</div>}
              <div className="text-xs text-[var(--app-text-secondary)]">{t(task.task_type)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodayTasksPage;
