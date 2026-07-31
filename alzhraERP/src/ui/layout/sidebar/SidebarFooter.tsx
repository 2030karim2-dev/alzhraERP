
import React from 'react';
import { LogOut, GitBranch } from 'lucide-react';
import { useAuthStore } from '../../../features/auth/store';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useLogout } from '../../../features/auth/hooks';
import LogoutConfirmModal from '../../../features/auth/components/LogoutConfirmModal';
import BranchSwitcher from '../../../features/branches/components/BranchSwitcher';

interface SidebarFooterProps {
  isCollapsed: boolean;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ isCollapsed }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { logout: performLogout, isLoggingOut } = useLogout();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
  const name = user?.full_name || user?.email?.split('@')[0] || 'User';
  const role = user?.role || 'Staff';
  const isManager = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="p-4 border-t border-[var(--app-border)] mt-auto space-y-3">
      {/* Branch Switcher — for managers when expanded */}
      {!isCollapsed && isManager && (
        <BranchSwitcher className="w-full" />
      )}

      {/* Branch Badge — for restricted employees when expanded */}
      {!isCollapsed && !isManager && user?.branch_name && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <GitBranch size={12} className="text-indigo-500 shrink-0" />
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate">{user.branch_name}</span>
        </div>
      )}

      {/* User Info + Logout */}
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center flex-col' : ''} transition-all duration-300`}>
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
          {initial}
        </div>

        {!isCollapsed ? (
          <>
            <div className="flex flex-col overflow-hidden animate-in fade-in duration-300">
              <span className="text-sm font-bold text-[var(--app-text)] truncate" title={name}>{name}</span>
              <span className="text-[10px] text-[var(--app-text-secondary)] capitalize">{role}</span>
            </div>
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="mr-auto p-2 text-[var(--app-text-secondary)] hover:text-red-500 transition-colors"
              title={t('logout')}
              aria-label={t('logout')}
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-2 text-[var(--app-text-secondary)] hover:text-red-500 transition-colors mt-2"
            title={t('logout')}
            aria-label={t('logout')}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={performLogout}
        isLoading={isLoggingOut}
      />
    </div>
  );
};

export default SidebarFooter;