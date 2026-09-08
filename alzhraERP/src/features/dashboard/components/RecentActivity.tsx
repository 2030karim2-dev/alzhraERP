import React from 'react';
import { Clock, ShoppingBag, FileText, UserPlus, Receipt } from 'lucide-react';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { ensureLatinDigits } from '../../../core/utils/currencyUtils';
import type { RecentActivityItem } from '../models';

interface Props {
  activities?: RecentActivityItem[];
}

const ACTIVITY_STYLES: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  violet: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  orange: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  gray: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
};

const formatActivityTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return '';

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(timeStr.trim());
  if (isDateOnly) {
    const [year, month, day] = timeStr.trim().split('-').map(Number);
    return `${day}/${month}/${year}`;
  }

  const todayStr = formatLocalDate();
  const itemDateStr = formatLocalDate(d);

  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = formatLocalDate(yDate);

  const timePart = ensureLatinDigits(
    d.toLocaleTimeString('ar-SA-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );

  if (itemDateStr === todayStr) {
    return `اليوم ${timePart}`;
  }
  if (itemDateStr === yesterdayStr) {
    return `أمس ${timePart}`;
  }

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getIcon = (type: string) => {
  switch (type) {
    case 'sale':
      return ShoppingBag;
    case 'expense':
      return Receipt;
    case 'customer':
      return UserPlus;
    default:
      return FileText;
  }
};

const RecentActivity: React.FC<Props> = ({ activities = [] }) => {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs max-md:p-3">
      <div>
        <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--app-text)]">
            <Clock size={15} className="text-[var(--app-text-secondary)]" />
            <span>أحدث النشاطات</span>
          </h3>
          <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
            {activities.length} عمليات
          </span>
        </div>

        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--app-text-secondary)]">
              لا توجد نشاطات مسجلة حديثاً
            </div>
          ) : (
            activities.map(item => {
              const Icon = getIcon(item.type);
              const style = ACTIVITY_STYLES[item.color || 'gray'] || ACTIVITY_STYLES.gray;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-[var(--app-surface-hover)]"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-xs font-bold text-[var(--app-text)]">
                        {item.title}
                      </h4>
                      {item.time && (
                        <span
                          className="shrink-0 font-mono text-[10px] font-medium text-[var(--app-text-secondary)]"
                          dir="ltr"
                        >
                          {formatActivityTime(item.time)}
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--app-text-secondary)]">
                        {item.desc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
