import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  LogOut,
  User as UserIcon,
  Building2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../../lib/themeStore';
import { useAuthStore } from '../../../features/auth/store';
import { useI18nStore } from '../../../lib/i18nStore';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useNotificationStore, useSoundStore } from '../../../features/notifications/store';
import { useChatStore } from '../../../features/chat/stores/chatStore';
import NotificationDropdown from '../../../features/notifications/components/NotificationDropdown';
import { useNetworkStatus } from '../../../lib/hooks/useNetworkStatus';
import { cn } from '../../../core/utils';
import { syncStore } from '../../../core/lib/sync-store';
import { RefreshCw } from 'lucide-react';
import SyncStatusModal from '../../components/SyncStatusModal';
import LogoutConfirmModal from '../../../features/auth/components/LogoutConfirmModal';
import { useLogout, useIsSuperAdmin } from '../../../features/auth/hooks';
import { ROUTES } from '../../../core/routes/paths';

const HeaderActions: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { lang, dir, setLang } = useI18nStore();
  const { t } = useTranslation();
  const status = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { logout: performLogout, isLoggingOut } = useLogout();
  const { data: isSuperAdmin } = useIsSuperAdmin();

  // Poll for pending sync count
  useEffect(() => {
    const checkPending = async () => {
      const pending = await syncStore.getPending();
      setPendingCount(pending.length);
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const { getCompanyUnreadCount } = useNotificationStore();
  const companyId = user?.company_id || '';
  const unreadCount = useMemo(
    () => getCompanyUnreadCount(companyId),
    [getCompanyUnreadCount, companyId]
  );
  const { isSoundEnabled, toggleSound } = useSoundStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const userInitial = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  // Handle click outside to close notification dropdown
  useEffect(() => {
    if (isNotifOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen, isProfileOpen]);

  // const { logout } = useAuthStore();

  const handleProfileClick = () => {
    navigate('/settings');
    setIsProfileOpen(false);
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsProfileOpen(false);
  };

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface)] active:scale-90 md:h-8 md:w-8"
        title={theme === 'light' ? t('theme_dark') : t('theme_light')}
      >
        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-yellow-500" />}
      </button>

      {/* Language Toggle (Desktop Friendly) */}
      <button
        onClick={() => {
          setLang(lang === 'ar' ? 'en' : 'ar');
        }}
        className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] font-sans text-[10px] font-black uppercase tracking-tighter text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface)] sm:flex"
        title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        {lang === 'ar' ? 'En' : 'ع'}
      </button>

      {/* Sound Toggle */}
      <button
        onClick={toggleSound}
        className="hidden h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface)] active:scale-90 sm:flex md:h-8 md:w-8"
        title={
          isSoundEnabled ? t('sound_disable') || 'تعطيل الصوت' : t('sound_enable') || 'تفعيل الصوت'
        }
        aria-label={isSoundEnabled ? 'تعطيل صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
        aria-pressed={isSoundEnabled}
      >
        {isSoundEnabled ? (
          <Volume2 size={14} className="text-emerald-500" />
        ) : (
          <VolumeX size={14} className="text-[var(--app-text-secondary)]" />
        )}
      </button>

      {/* Sync Status Button */}
      {pendingCount > 0 && (
        <button
          onClick={() => {
            setIsSyncModalOpen(true);
          }}
          className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition-all hover:bg-amber-100 active:scale-95 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 md:h-8 md:w-8"
          title={`${pendingCount} عمليات بانتظار المزامنة`}
        >
          <RefreshCw size={14} className={cn(pendingCount > 0 && 'animate-spin-slow')} />
          <span
            className={cn(
              'absolute -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-amber-600 text-[10px] font-black text-white shadow-sm',
              dir === 'rtl' ? '-left-1.5' : '-right-1.5'
            )}
          >
            {pendingCount}
          </span>
        </button>
      )}

      {/* Sync Modal */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => {
          setIsSyncModalOpen(false);
        }}
      />

      {/* Internal Branch Chat & Collaboration */}
      <button
        onClick={() => navigate('/chat')}
        className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] transition-all duration-200 hover:bg-[var(--app-surface)] hover:text-[var(--accent)] focus:outline-none active:scale-95 md:h-8 md:w-8"
        title="محادثات الفروع والموظفين"
        aria-label="المحادثات والتواصل الداخلي"
      >
        <MessageSquare size={14} className="transition-transform duration-150" />
        {useChatStore.getState().getTotalUnreadCount() > 0 && (
          <span
            className={cn(
              'absolute -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs',
              dir === 'rtl' ? '-left-1.5' : '-right-1.5'
            )}
          >
            {useChatStore.getState().getTotalUnreadCount() > 9
              ? '9+'
              : useChatStore.getState().getTotalUnreadCount()}
          </span>
        )}
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setIsNotifOpen(!isNotifOpen);
          }}
          className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] transition-all duration-200 hover:bg-[var(--app-surface)] hover:text-[var(--accent)] focus:outline-none active:scale-95 md:h-8 md:w-8"
          title={t('notifications')}
          aria-label={`${t('notifications')} ${unreadCount > 0 ? `(${unreadCount} غير مقروء)` : ''}`}
          aria-expanded={isNotifOpen}
          aria-haspopup="true"
        >
          <Bell size={14} className="transition-transform duration-150" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs',
                dir === 'rtl' ? '-left-1.5' : '-right-1.5'
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <NotificationDropdown
          isOpen={isNotifOpen}
          onClose={() => {
            setIsNotifOpen(false);
          }}
        />
      </div>

      {/* User Profile Dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setIsProfileOpen(!isProfileOpen);
          }}
          className="group relative ms-1 rounded-lg focus:outline-none"
          title={t('profile') || 'الملف الشخصي'}
          aria-label={t('profile') || 'الملف الشخصي'}
          aria-expanded={isProfileOpen}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-slate-800 text-xs font-bold text-white transition-colors duration-150 hover:bg-slate-900 dark:bg-slate-700 md:h-8 md:w-8">
            {userInitial}
          </div>
          {/* Connectivity Status Indicator */}
          <span
            className={cn(
              'absolute -bottom-0.5 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] transition-colors duration-500',
              dir === 'rtl' ? '-left-0.5' : '-right-0.5',
              status.isOnline
                ? status.isPoorConnection
                  ? 'animate-pulse bg-amber-500'
                  : 'bg-emerald-500'
                : 'bg-rose-500'
            )}
            title={status.isOnline ? (status.isPoorConnection ? 'اتصال ضعيف' : 'متصل') : 'غير متصل'}
          ></span>
        </button>

        {/* Dropdown Menu */}
        {isProfileOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 z-40 sm:hidden"
              onClick={() => {
                setIsProfileOpen(false);
              }}
            />
            <div
              className={cn(
                'animate-in fade-in slide-in-from-top-2 absolute z-50 mt-2 w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-gray-200/50 duration-200 dark:shadow-black/50',
                dir === 'rtl' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
              )}
            >
              {/* User Info Header */}
              <div className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] p-4">
                <p className="truncate text-xs font-black text-[var(--app-text)]">
                  {user?.full_name}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[var(--app-text-secondary)]">
                  {user?.email}
                </p>
              </div>

              <div className="p-1.5">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      navigate(ROUTES.ADMIN.ROOT);
                      setIsProfileOpen(false);
                    }}
                    className="mb-1.5 flex w-full items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-600 transition-all hover:bg-rose-500/20 dark:text-rose-400"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} />
                      <span>إدارة المنصة (Super Admin)</span>
                    </div>
                    <span className="rounded-sm bg-rose-500 px-1 text-[10px] font-black text-white">
                      PRO
                    </span>
                  </button>
                )}
                <button
                  onClick={handleProfileClick}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--app-text-secondary)] transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
                >
                  <UserIcon size={16} />
                  <span>الملف الشخصي</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--app-text-secondary)] transition-all hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  <Building2 size={16} />
                  <span>إعدادات المنشأة</span>
                </button>
              </div>

              <div className="border-t border-[var(--app-border)] p-1.5">
                <button
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  <LogOut size={16} />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => {
          setIsLogoutModalOpen(false);
        }}
        onConfirm={performLogout}
        isLoading={isLoggingOut}
      />
    </div>
  );
};

export default HeaderActions;
