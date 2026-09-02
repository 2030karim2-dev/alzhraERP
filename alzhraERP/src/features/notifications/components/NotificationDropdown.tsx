import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotificationStore, type AppNotification } from '../store';
import { useAuthStore } from '../../auth/store';
import { useI18nStore } from '../../../lib/i18nStore';
import { cn } from '../../../core/utils';
import { Bell, Check, Trash2, X, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSoundStore } from '../store';
import NotificationItem from './NotificationItem';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<Props> = ({ isOpen, onClose }) => {
  const { dir } = useI18nStore();
  const {
    getCompanyNotifications,
    getCompanyUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotificationStore();
  const { user } = useAuthStore();
  const companyId = user?.company_id || '';
  const { isSoundEnabled, toggleSound } = useSoundStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Company-scoped notifications
  const notifications = useMemo(
    () => getCompanyNotifications(companyId),
    [getCompanyNotifications, companyId]
  );
  const unreadCount = useMemo(
    () => getCompanyUnreadCount(companyId),
    [getCompanyUnreadCount, companyId]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      setTimeout(() => firstFocusableRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead(companyId);
  };

  const handleClearAll = () => {
    if (notifications.length > 0 && window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
      clearAll(companyId);
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop for mobile */}
      <div
        className="animate-in fade-in fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm duration-300 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dropdownRef}
        className={cn(
          'fixed left-4 right-4 top-16 z-[9999] max-h-[80vh] md:top-[56px] md:max-h-[600px] md:w-[420px]',
          'rounded-2xl bg-[var(--app-surface)] shadow-2xl shadow-black/20 dark:shadow-black/50',
          'overflow-hidden border border-[var(--app-border)]',
          'animate-in slide-in-from-top-2 fade-in zoom-in-95 duration-200 ease-out',
          dir === 'rtl'
            ? 'md:left-4 md:right-auto md:origin-top-left'
            : 'md:left-auto md:right-4 md:origin-top-right'
        )}
        role="dialog"
        aria-label="قائمة الإشعارات"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-gradient-to-l from-gray-50/80 to-white px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Bell size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">الإشعارات</h3>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} إشعار جديد` : 'لا توجد إشعارات جديدة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Sound Toggle */}
            <button
              ref={firstFocusableRef}
              onClick={toggleSound}
              className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={isSoundEnabled ? 'تعطيل صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
              aria-label={isSoundEnabled ? 'تعطيل صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
            >
              {isSoundEnabled ? (
                <Volume2 size={16} className="text-emerald-500" />
              ) : (
                <VolumeX size={16} />
              )}
            </button>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="rounded-xl p-2 text-emerald-500 transition-all duration-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:hover:bg-emerald-900/20"
                title="تحديد الكل كمقروء"
                aria-label="تحديد الكل كمقروء"
              >
                <Check size={16} />
              </button>
            )}

            {/* Clear all */}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="rounded-xl p-2 text-rose-500 transition-all duration-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:hover:bg-rose-900/20"
                title="حذف جميع الإشعارات"
                aria-label="حذف جميع الإشعارات"
              >
                <Trash2 size={16} />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500/30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Desktop Notification Quick Activation Bar */}
        {typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission !== 'granted' && (
            <div className="flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/90 px-4 py-2 dark:border-indigo-900/60 dark:bg-indigo-950/60">
              <div className="flex items-center gap-2">
                <span className="text-xs">🔔</span>
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                  تفعيل الإشعارات فوق سطح المكتب لجميع البرامج
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await Notification.requestPermission();
                  window.location.reload();
                }}
                className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition-colors hover:bg-indigo-700"
              >
                تفعيل الآن ✓
              </button>
            </div>
          )}

        {/* Notifications List */}
        <div className="custom-scrollbar max-h-[calc(80vh-80px)] overflow-y-auto md:max-h-[480px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-gray-100 to-gray-50 shadow-inner dark:from-slate-800 dark:to-slate-900">
                <Bell size={32} className="text-gray-300 dark:text-slate-600" />
              </div>
              <h4 className="mb-1 text-sm font-bold text-gray-700 dark:text-slate-300">
                لا توجد إشعارات
              </h4>
              <p className="max-w-[200px] text-xs text-gray-400 dark:text-slate-500">
                ستظهر هنا الإشعارات الجديدة عند وصولها
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {/* Unread Notifications Section */}
              {unreadNotifications.length > 0 && (
                <div className="bg-blue-50/30 dark:bg-blue-900/5">
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    إشعارات جديدة ({unreadNotifications.length})
                  </div>
                  {unreadNotifications.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onClick={() => {
                        handleNotificationClick(notif);
                      }}
                      onDelete={e => {
                        handleDeleteNotification(e, notif.id);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Read Notifications Section */}
              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && (
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      مقروءة سابقاً
                    </div>
                  )}
                  {readNotifications.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onClick={() => {
                        handleNotificationClick(notif);
                      }}
                      onDelete={e => {
                        handleDeleteNotification(e, notif.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="sticky bottom-0 border-t border-gray-100 bg-gray-50/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">
                {notifications.length} إشعار
              </span>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-blue-400 dark:hover:text-blue-300"
              >
                إعدادات الإشعارات
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

export default NotificationDropdown;
