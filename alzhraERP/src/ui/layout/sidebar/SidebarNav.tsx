import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS } from '../../../core/constants';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import Icon from '../../common/Icon';
import { cn } from '../../../core/utils';
import { useAuthStore } from '../../../features/auth/store';
import { useAllPermissions } from '../../../core/hooks/usePermission';
import { prefetchRoute } from '../../../core/utils/routePrefetcher';

interface SidebarNavProps {
  isCollapsed: boolean;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ isCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  // Server-driven visibility: `get_user_permissions()` RPC decides which
  // permission-gated items this user may see (ADR-003 Phase 3).
  const { permissions, isLoading } = useAllPermissions();

  const isOwner = user?.role?.toLowerCase() === 'owner';

  const filteredItems = MENU_ITEMS.filter(item => {
    // Items without a required permission are visible to everyone.
    if (!item.requiredPermission) return true;

    // Owner bypass — `owner` is not seeded in `role_permissions`, so the
    // server reports no permissions for it. This mirrors the server-side
    // `assertPermission()` behavior exactly.
    if (isOwner) return true;

    // Hide permission-gated items until the server confirms access
    // (never flash an unauthorized menu entry).
    if (isLoading) return false;

    return permissions.includes(item.requiredPermission);
  });

  return (
    <nav className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1 scrollbar-hide">
      {filteredItems.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === item.path
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
            title={isCollapsed ? t(item.labelKey) : ''}
            aria-label={t(item.labelKey)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 group text-start',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]',
              isCollapsed ? 'justify-center px-0' : ''
            )}
          >
            <Icon
              icon={item.icon}
              size={isCollapsed ? 18 : 16}
              color={item.color}
              className={cn(
                'flex-shrink-0 transition-colors',
                isActive ? '!text-white' : 'text-[var(--app-text-secondary)] group-hover:text-[var(--app-text)]'
              )}
            />

            {!isCollapsed && (
              <span className={cn(
                'whitespace-nowrap overflow-hidden',
                isActive ? 'text-white font-semibold' : 'text-[var(--app-text)]'
              )}>
                {t(item.labelKey)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default SidebarNav;
