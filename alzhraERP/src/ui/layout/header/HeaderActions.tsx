
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Moon, Sun, Volume2, VolumeX, LogOut, User as UserIcon, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../../lib/themeStore';
import { useAuthStore } from '../../../features/auth/store';
import { useI18nStore } from '../../../lib/i18nStore';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useNotificationStore, useSoundStore } from '../../../features/notifications/store';
import NotificationDropdown from '../../../features/notifications/components/NotificationDropdown';
import { useNetworkStatus } from '../../../lib/hooks/useNetworkStatus';
import { cn } from '../../../core/utils';
import { syncStore } from '../../../core/lib/sync-store';
import { RefreshCw } from 'lucide-react';
import SyncStatusModal from '../../components/SyncStatusModal';
import LogoutConfirmModal from '../../../features/auth/components/LogoutConfirmModal';
import { useLogout } from '../../../features/auth/hooks';

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

  // Poll for pending sync count
  useEffect(() => {
    const checkPending = async () => {
      const pending = await syncStore.getPending();
      setPendingCount(pending.length);
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const { getCompanyUnreadCount } = useNotificationStore();
  const companyId = user?.company_id || '';
  const unreadCount = useMemo(() => getCompanyUnreadCount(companyId), [getCompanyUnreadCount, companyId]);
  const { isSoundEnabled, toggleSound } = useSoundStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

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
        className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] transition-all active:scale-90 border border-[var(--app-border)]"
        title={theme === 'light' ? t('theme_dark') : t('theme_light')}
      >
        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-yellow-500" />}
      </button>

      {/* Language Toggle (Desktop Friendly) */}
      <button
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] transition-all border border-[var(--app-border)] font-sans text-[10px] font-black uppercase tracking-tighter"
        title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        {lang === 'ar' ? 'En' : 'ع'}
      </button>

      {/* Sound Toggle */}
      <button
        onClick={toggleSound}
        className="hidden sm:flex w-7 h-7 md:w-8 md:h-8 items-center justify-center rounded-lg bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] transition-all active:scale-90 border border-[var(--app-border)]"
        title={isSoundEnabled ? t('sound_disable') || 'تعطيل الصوت' : t('sound_enable') || 'تفعيل الصوت'}
        aria-label={isSoundEnabled ? 'تعطيل صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
        aria-pressed={isSoundEnabled}
      >
        {isSoundEnabled ? (
          <Volume2 size={14} className="text-emerald-500" />
        ) : (
          <VolumeX size={14} className="text-gray-400" />
        )}
      </button>

      {/* Sync Status Button */}
      {pendingCount > 0 && (
        <button
          onClick={() => setIsSyncModalOpen(true)}
          className="relative w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all active:scale-95 border border-amber-200 dark:border-amber-800"
          title={`${pendingCount} عمليات بانتظار المزامنة`}
        >
          <RefreshCw size={14} className={cn(pendingCount > 0 && "animate-spin-slow")} />
          <span className={cn(
            "absolute -top-1.5 flex items-center justify-center min-w-[14px] h-[14px] bg-amber-600 text-white text-[8px] font-black rounded-full border-2 border-[var(--app-surface)] shadow-sm",
            dir === 'rtl' ? '-left-1.5' : '-right-1.5'
          )}>
            {pendingCount}
          </span>
        </button>
      )}

      {/* Sync Modal */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--accent)] transition-all duration-200 active:scale-95 border border-[var(--app-border)] relative focus:outline-none"
          title={t('notifications')}
          aria-label={`${t('notifications')} ${unreadCount > 0 ? `(${unreadCount} غير مقروء)` : ''}`}
          aria-expanded={isNotifOpen}
          aria-haspopup="true"
        >
          <Bell size={14} className="transition-transform duration-200" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1.5 min-w-[14px] h-[14px] flex items-center justify-center px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-black rounded-full border-2 border-[var(--app-surface)] shadow-sm animate-in fade-in zoom-in duration-200",
              dir === 'rtl' ? '-left-1.5' : '-right-1.5'
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      </div>

      {/* User Profile Dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="ms-1 group relative focus:outline-none rounded-lg"
          title={t('profile') || 'الملف الشخصي'}
          aria-label={t('profile') || 'الملف الشخصي'}
          aria-expanded={isProfileOpen}
        >
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-[10px] border-2 border-[var(--app-surface)] shadow-md shadow-blue-500/25 transform transition-all duration-300 group-hover:rotate-3 group-active:scale-95">
            {userInitial}
          </div>
          {/* Connectivity Status Indicator */}
          <span className={cn(
            "absolute -bottom-0.5 w-3 h-3 border-2 border-[var(--app-surface)] rounded-full transition-colors duration-500",
            dir === 'rtl' ? '-left-0.5' : '-right-0.5',
            status.isOnline
              ? (status.isPoorConnection ? "bg-amber-500 animate-pulse" : "bg-emerald-500")
              : "bg-rose-500"
          )} title={status.isOnline ? (status.isPoorConnection ? 'اتصال ضعيف' : 'متصل') : 'غير متصل'}></span>
        </button>

        {/* Dropdown Menu */}
        {isProfileOpen && (
          <div className={cn(
            "absolute mt-2 w-56 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200",
            dir === 'rtl' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          )}>
            {/* User Info Header */}
            <div className="p-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <p className="text-xs font-black text-gray-800 dark:text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">{user?.email}</p>
            </div>

            <div className="p-1.5">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              >
                <UserIcon size={16} />
                <span>الملف الشخصي</span>
              </button>
              <button
                onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              >
                <Building2 size={16} />
                <span>إعدادات المنشأة</span>
              </button>
            </div>

            <div className="p-1.5 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
              >
                <LogOut size={16} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={performLogout}
        isLoading={isLoggingOut}
      />
    </div>
  );
};

export default HeaderActions;
