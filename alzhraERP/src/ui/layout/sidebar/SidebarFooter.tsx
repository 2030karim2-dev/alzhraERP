import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, GitBranch, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../features/auth/store';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useLogout, useIsSuperAdmin } from '../../../features/auth/hooks';
import LogoutConfirmModal from '../../../features/auth/components/LogoutConfirmModal';
import BranchSwitcher from '../../../features/branches/components/BranchSwitcher';
import { cn } from '../../../core/utils';
import { ROUTES } from '../../../core/routes/paths';

interface SidebarFooterProps {
  isCollapsed: boolean;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ isCollapsed }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { logout: performLogout, isLoggingOut } = useLogout();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
  const name = user?.full_name || user?.email?.split('@')[0] || 'User';
  const role = user?.role || 'Staff';
  const isManager = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="mt-auto space-y-3 border-t border-[var(--app-border)] p-4">
      {/* Branch Switcher — for managers */}
      {isManager && <BranchSwitcher isCollapsed={isCollapsed} className="w-full" />}

      {/* Branch Badge — for restricted employees */}
      {!isManager && user?.branch_name && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20',
            isCollapsed ? 'mx-auto h-10 w-10 justify-center p-0' : 'px-3 py-1.5'
          )}
          title={user.branch_name}
        >
          <GitBranch size={14} className="shrink-0 text-indigo-500" />
          {!isCollapsed && (
            <span className="truncate text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {user.branch_name}
            </span>
          )}
        </div>
      )}

      {/* Super Admin — إدارة المنصة (يظهر للسوبر أدمن فقط) */}
      {isSuperAdmin === true && (
        <button
          onClick={() => {
            void navigate(ROUTES.ADMIN.ROOT);
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400',
            isCollapsed ? 'mx-auto h-10 w-10 justify-center p-0' : 'px-3 py-1.5'
          )}
          title="مركز تحكم المنصة (Super Admin)"
          aria-label="مركز تحكم المنصة"
        >
          <ShieldCheck size={14} className="shrink-0" />
          {!isCollapsed && <span className="truncate text-xs font-black">إدارة المنصة</span>}
        </button>
      )}

      {/* User Info + Logout */}
      <div
        className={`flex items-center gap-3 ${isCollapsed ? 'flex-col justify-center' : ''} transition-all duration-300`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">
          {initial}
        </div>

        {!isCollapsed ? (
          <>
            <div className="animate-in fade-in flex flex-col overflow-hidden duration-300">
              <span className="truncate text-sm font-bold text-[var(--app-text)]" title={name}>
                {name}
              </span>
              <span className="text-[10px] capitalize text-[var(--app-text-secondary)]">
                {role}
              </span>
            </div>
            <button
              onClick={() => {
                setIsLogoutModalOpen(true);
              }}
              className="mr-auto p-2 text-[var(--app-text-secondary)] transition-colors hover:text-red-500"
              title={t('logout')}
              aria-label={t('logout')}
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setIsLogoutModalOpen(true);
            }}
            className="mt-2 p-2 text-[var(--app-text-secondary)] transition-colors hover:text-red-500"
            title={t('logout')}
            aria-label={t('logout')}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>

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

export default SidebarFooter;
