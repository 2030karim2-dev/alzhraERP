import React from 'react';
import { X, Clock, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { AppNotification } from '../store';
import { typeConfig, categoryConfig } from './notificationConfig';
import { useI18nStore } from '../../../lib/i18nStore';
import { cn } from '../../../core/utils';

interface NotificationItemProps {
  notif: AppNotification;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onActionClick?: (link?: string, actionFn?: () => void) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notif,
  onClick,
  onDelete,
  onActionClick,
}) => {
  const { lang } = useI18nStore();
  const config = typeConfig[notif.type] || typeConfig.info;
  const category = notif.category ? categoryConfig[notif.category] : null;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer border-b border-gray-100 p-3 transition-all duration-200 ease-out dark:border-slate-800/60 md:p-3.5',
        'hover:bg-gray-50/80 dark:hover:bg-slate-800/40',
        !notif.isRead
          ? 'bg-blue-50/20 dark:bg-blue-900/10'
          : 'bg-transparent opacity-85 hover:opacity-100'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`${notif.title}: ${notif.message}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Type Icon */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border',
            config.bgColor,
            config.borderColor,
            'transition-transform duration-150 group-hover:scale-105'
          )}
        >
          <Icon size={16} className={config.iconColor} />
        </div>

        {/* Main Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h4
                className={cn(
                  'truncate text-xs font-bold leading-tight',
                  !notif.isRead
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-slate-300'
                )}
              >
                {notif.title}
              </h4>

              {/* Category Badge */}
              {category && (
                <span
                  className={cn(
                    'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold',
                    category.badgeBg,
                    category.border
                  )}
                >
                  {category.label}
                </span>
              )}

              {/* Priority badge if urgent */}
              {notif.priority === 'urgent' && (
                <span className="shrink-0 rounded border border-rose-200 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
                  عاجل
                </span>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={onDelete}
              className="rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 focus:opacity-100 focus:outline-none group-hover:opacity-100 dark:hover:bg-rose-900/20 max-md:opacity-100"
              aria-label="حذف الإشعار"
            >
              <X size={13} />
            </button>
          </div>

          <p
            className={cn(
              'mt-1 line-clamp-2 text-xs leading-relaxed',
              !notif.isRead
                ? 'font-medium text-gray-700 dark:text-slate-300'
                : 'text-gray-500 dark:text-slate-400'
            )}
          >
            {notif.message}
          </p>

          {/* Quick Actions (if any) */}
          {notif.actions && notif.actions.length > 0 && (
            <div className="mt-2 flex items-center gap-2 pt-1">
              {notif.actions.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (act.onClick) act.onClick();
                    if (onActionClick) onActionClick(act.link);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
                    act.isPrimary
                      ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200'
                  )}
                >
                  <span>{act.label}</span>
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          )}

          {/* Footer Metadata */}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500">
            <div className="flex items-center gap-1">
              <Clock size={11} />
              <span>
                {formatDistanceToNow(notif.timestamp, {
                  addSuffix: true,
                  ...(lang === 'ar' ? { locale: ar } : {}),
                })}
              </span>
            </div>
            {!notif.isRead && (
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
