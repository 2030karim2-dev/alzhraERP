import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useNotificationStore, type AppNotification } from '../store';
import { useAuthStore } from '../../auth/store';
import { useI18nStore } from '../../../lib/i18nStore';
import { cn } from '../../../core/utils';
import { Bell, Trash2, X, ExternalLink, Volume2, VolumeX, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSoundStore } from '../store';
import NotificationItem from './NotificationItem';
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  sendTestDesktopNotification,
  isDesktopNotificationSupported,
} from '../desktopNotificationService';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'unread' | 'urgent';

const NotificationDropdown: React.FC<Props> = ({ isOpen, onClose }) => {
  const { dir } = useI18nStore();
  const {
    getCompanyNotifications,
    getCompanyUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
    setDesktopEnabled,
  } = useNotificationStore();
  const { user } = useAuthStore();
  const companyId = user?.company_id || '';
  const { isSoundEnabled, toggleSound, playNotificationSound } = useSoundStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission>(() =>
    getDesktopNotificationPermission()
  );

  // Company-scoped notifications
  const allNotifications = useMemo(
    () => getCompanyNotifications(companyId),
    [getCompanyNotifications, companyId]
  );
  const unreadCount = useMemo(
    () => getCompanyUnreadCount(companyId),
    [getCompanyUnreadCount, companyId]
  );

  const urgentCount = useMemo(
    () =>
      allNotifications.filter(
        n => !n.isRead && (n.type === 'warning' || n.type === 'error' || n.priority === 'urgent')
      ).length,
    [allNotifications]
  );

  // Filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return allNotifications.filter(n => !n.isRead);
    }
    if (activeTab === 'urgent') {
      return allNotifications.filter(
        n => n.type === 'warning' || n.type === 'error' || n.priority === 'urgent'
      );
    }
    return allNotifications;
  }, [allNotifications, activeTab]);

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
    if (!isOpen) {
      setIsConfirmingClear(false);
    }
  }, [isOpen]);

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  const handleActionClick = (notifId: string, link?: string) => {
    markAsRead(notifId);
    if (link) {
      navigate(link);
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead(companyId);
  };

  const handleExecuteClearAll = () => {
    clearAll(companyId);
    setIsConfirmingClear(false);
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleEnableDesktop = async () => {
    const res = await requestDesktopNotificationPermission();
    setDesktopPerm(res);
    if (res === 'granted') {
      setDesktopEnabled(true);
      void sendTestDesktopNotification();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div id="alzhra-notification-portal">
      {/* Backdrop for mobile */}
      <div
        className="animate-in fade-in backdrop-blur-xs fixed inset-0 z-[9998] bg-black/25 duration-200 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dropdownRef}
        className={cn(
          'fixed left-3 right-3 top-16 z-[9999] max-h-[82vh] md:top-[54px] md:max-h-[620px] md:w-[440px]',
          'rounded-2xl bg-[var(--app-surface)] shadow-2xl shadow-black/25 dark:shadow-black/60',
          'flex flex-col overflow-hidden border border-[var(--app-border)]',
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
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-gray-50/70 px-4 py-3 backdrop-blur-md dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
              <Bell size={17} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white md:text-sm">
                  الإشعارات
                </h3>
                {unreadCount > 0 && (
                  <span className="py-0.2 rounded-full bg-blue-600 px-1.5 text-[10px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} إشعار جديد بحاجة للمتابعة`
                  : 'جميع التنبيهات محدثة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Sound Toggle */}
            <button
              ref={firstFocusableRef}
              onClick={() => {
                toggleSound();
                if (!isSoundEnabled) {
                  void playNotificationSound('normal', true);
                }
              }}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={isSoundEnabled ? 'تعطيل نغمة التنبيه' : 'تفعيل نغمة التنبيه'}
              aria-label={isSoundEnabled ? 'تعطيل نغمة التنبيه' : 'تفعيل نغمة التنبيه'}
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
                className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 focus:outline-none dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                title="تحديد الكل كمقروء"
                aria-label="تحديد الكل كمقروء"
              >
                <CheckCheck size={16} />
              </button>
            )}

            {/* Clear all trigger */}
            {allNotifications.length > 0 && (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 focus:outline-none dark:hover:bg-rose-950/30"
                title="حذف جميع الإشعارات"
                aria-label="حذف جميع الإشعارات"
              >
                <Trash2 size={15} />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Inline Clear Confirmation Bar */}
        {isConfirmingClear && (
          <div className="animate-in slide-in-from-top-1 flex items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 duration-150 dark:border-rose-900/60 dark:bg-rose-950/50">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
              هل أنت متأكد من مسح جميع الإشعارات؟
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleExecuteClearAll}
                className="rounded bg-rose-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-rose-700"
              >
                نعم، احذف
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="rounded bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Quick Filter Tabs */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--app-border)] bg-gray-50/40 px-3 py-1.5 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            الكل ({allNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
              activeTab === 'unread'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <span>غير مقروء</span>
            {unreadCount > 0 && (
              <span className="py-0.2 rounded-full bg-blue-100 px-1.5 text-[10px] font-black text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('urgent')}
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
              activeTab === 'urgent'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <span>تنبيهات هامة</span>
            {urgentCount > 0 && (
              <span className="py-0.2 rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                {urgentCount}
              </span>
            )}
          </button>
        </div>

        {/* Desktop Notification Quick Activation Bar */}
        {isDesktopNotificationSupported() && desktopPerm !== 'granted' && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/90 px-3 py-2 dark:border-indigo-900/50 dark:bg-indigo-950/60">
            <div className="flex items-center gap-2">
              <span className="text-xs">🔔</span>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                تفعيل التنبيه فوق جميع تطبيقات سطح المكتب
              </span>
            </div>
            <button
              type="button"
              onClick={handleEnableDesktop}
              className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              تفعيل الآن ✓
            </button>
          </div>
        )}

        {/* Notifications Scroll List */}
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500">
                <Bell size={28} />
              </div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 md:text-sm">
                {activeTab === 'unread'
                  ? 'لا توجد إشعارات غير مقروءة'
                  : activeTab === 'urgent'
                    ? 'لا توجد تنبيهات هامة حالياً'
                    : 'سجل الإشعارات فارغ'}
              </h4>
              <p className="mt-1 max-w-[220px] text-xs text-gray-500 dark:text-slate-400">
                ستظهر التنبيهات الدورية وعمليات النظام فور حدوثها
              </p>
            </div>
          ) : (
            <div>
              {filteredNotifications.map(notif => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onClick={() => handleNotificationClick(notif)}
                  onDelete={e => handleDeleteNotification(e, notif.id)}
                  onActionClick={link => handleActionClick(notif.id, link)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--app-border)] bg-gray-50/90 px-4 py-2.5 backdrop-blur-md dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-xs">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
              {allNotifications.length} إشعار مسجل
            </span>
            <button
              onClick={() => {
                navigate('/settings?tab=notifications');
                onClose();
              }}
              className="flex items-center gap-1 font-bold text-blue-600 transition-colors hover:text-blue-700 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>إعدادات الإشعارات</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationDropdown;
