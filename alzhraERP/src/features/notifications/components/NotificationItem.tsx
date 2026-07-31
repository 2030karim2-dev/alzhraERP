import React from 'react';
import { X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AppNotification } from '../store';
import { typeConfig, NotificationType } from './notificationConfig';

interface NotificationItemProps {
    notif: AppNotification;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notif, onClick, onDelete }) => {
    const config = typeConfig[notif.type as NotificationType] || typeConfig.info;
    const Icon = config.icon;

    return (
        <div
            onClick={onClick}
            className={`
        group relative p-4 md:p-5 cursor-pointer transition-all duration-300 ease-out
        hover:bg-gray-50 dark:hover:bg-slate-800/50
        ${!notif.isRead ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/50 dark:bg-slate-900/30'}
      `}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            aria-label={`${notif.title}: ${notif.message}`}
        >
            <div className="flex gap-3">
                {/* Icon */}
                <div className={`
          flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
          ${config.bgColor} border ${config.borderColor}
          transition-transform duration-200 group-hover:scale-110
        `}>
                    <Icon size={18} className={config.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`
              text-xs font-bold leading-tight
              ${!notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'}
            `}>
                            {notif.title}
                        </h4>

                        {/* Delete button - visible on hover */}
                        <button
                            onClick={onDelete}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 
                         hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20
                         transition-all duration-200 focus:opacity-100 focus:outline-none"
                            aria-label="حذف الإشعار"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    <p className={`
            text-[11px] mt-1 leading-relaxed line-clamp-2
            ${!notif.isRead ? 'text-gray-600 dark:text-slate-300' : 'text-gray-400 dark:text-slate-500'}
          `}>
                        {notif.message}
                    </p>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 dark:text-slate-500">
                        <Clock size={10} />
                        <span>
                            {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: ar })}
                        </span>
                    </div>
                </div>

                {/* Unread indicator */}
                {!notif.isRead && (
                    <div className={`
            flex-shrink-0 w-2.5 h-2.5 rounded-full ${config.dotColor}
            animate-pulse shadow-sm shadow-current
          `} />
                )}
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-l from-blue-500/0 via-blue-500/0 to-blue-500/5 
                      dark:from-blue-500/0 dark:via-blue-500/0 dark:to-blue-500/10
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        </div>
    );
};

export default NotificationItem;
