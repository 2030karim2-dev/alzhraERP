import React, { useState, useMemo } from 'react';
import { Bell, Trash2, Archive, Package, AlertTriangle, DollarSign, Receipt } from 'lucide-react';
import { cn } from '../../../core/utils';
import EmptyState from '../../../ui/base/EmptyState';

export interface Notification {
  id: string; title: string; message: string;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'inventory' | 'debt' | 'invoice' | 'system';
  link?: string; timestamp: Date; read: boolean; archived: boolean;
}

interface NotificationsCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onClearAll: () => void;
  onNavigate?: (link: string) => void;
  className?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  inventory: <Package size={12} />, debt: <DollarSign size={12} />,
  invoice: <Receipt size={12} />, system: <AlertTriangle size={12} />,
};

const categoryColors: Record<string, string> = {
  inventory: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
  debt: 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20',
  invoice: 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
  system: 'border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20',
};

const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  notifications, onMarkRead, onMarkAllRead, onDelete, onArchive, onClearAll, onNavigate, className,
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = notifications;
    if (filter === 'unread') items = items.filter(n => !n.read);
    if (filter === 'warning') items = items.filter(n => n.type === 'warning' || n.type === 'error');
    if (filter === 'archived') items = items.filter(n => n.archived);
    else items = items.filter(n => !n.archived);
    return items;
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const warningCount = notifications.filter(n => (n.type === 'warning' || n.type === 'error') && !n.archived).length;

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unread', label: 'غير مقروء', count: unreadCount },
    { key: 'warning', label: 'تنبيهات', count: warningCount },
    { key: 'archived', label: 'مؤرشفة' },
  ];

  return (
    <div className={cn('rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--app-text)]">الإشعارات</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white text-[10px] font-black">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} className="p-1.5 text-[10px] font-bold text-[var(--accent)] hover:bg-[var(--app-surface-hover)] rounded-lg transition-colors">
            قراءة الكل
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--app-border)] overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all',
              filter === tab.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]')}>
            {tab.label}{tab.count !== undefined && tab.count > 0 && <span className="text-[9px] opacity-80">({tab.count})</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClearAll} className="p-1 text-[10px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 size={12} /></button>
      </div>

      <div className="max-h-[50dvh] overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="py-8"><EmptyState variant="default" title="لا توجد إشعارات" description="كل شيء على ما يرام!" /></div>
        ) : (
          <div className="divide-y divide-[var(--app-border)]">
            {filtered.map(notif => (
              <div key={notif.id} onClick={() => { onMarkRead(notif.id); setExpandedId(expandedId === notif.id ? null : notif.id); }}
                className={cn('px-3 py-3 transition-colors cursor-pointer group', !notif.read && 'bg-blue-50/30 dark:bg-blue-900/10', notif.archived && 'opacity-60')}>
                <div className="flex items-start gap-2">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border', categoryColors[notif.category])}>
                    {categoryIcons[notif.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn('text-xs font-bold text-[var(--app-text)] truncate', !notif.read && 'text-[var(--accent)]')}>{notif.title}</p>
                      {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-[var(--app-text-secondary)] mt-0.5 line-clamp-2">{notif.message}</p>
                    <span className="text-[9px] text-[var(--app-text-secondary)] opacity-60 mt-1 block">
                      {new Date(notif.timestamp).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </span>
                    {expandedId === notif.id && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--app-border)] animate-in fade-in duration-200">
                        {notif.link && <button onClick={e => { e.stopPropagation(); onNavigate?.(notif.link!); }} className="text-[10px] font-bold text-[var(--accent)] hover:underline">عرض التفاصيل</button>}
                        <div className="flex-1" />
                        <button onClick={e => { e.stopPropagation(); onArchive(notif.id); }} className="p-1 text-[10px] text-[var(--app-text-secondary)] hover:text-[var(--accent)]"><Archive size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); onDelete(notif.id); }} className="p-1 text-[10px] text-[var(--app-text-secondary)] hover:text-rose-500"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsCenter;

type FilterTab = 'all' | 'unread' | 'warning' | 'archived';