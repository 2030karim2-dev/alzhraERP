import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS } from '../../../core/constants';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import Icon from '../../common/Icon';
import { IconColor } from '../../../core/types';
import { cn } from '../../../core/utils';
import { useAuthStore } from '../../../features/auth/store';
import { prefetchRoute } from '../../../core/utils/routePrefetcher';

// This map contains all the Tailwind classes so they are not purged
// Premium Gradients & Shadows for Active States
const buttonThemes: Record<IconColor, { active: string; hover: string; }> = {
  purple: { active: 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg shadow-purple-500/30', hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  green: { active: 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/30', hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20' },
  blue: { active: 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30', hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
  sky: { active: 'bg-gradient-to-r from-sky-500 to-sky-400 shadow-lg shadow-sky-500/30', hover: 'hover:bg-sky-50 dark:hover:bg-sky-900/20' },
  orange: { active: 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg shadow-orange-500/30', hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  red: { active: 'bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/30', hover: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
  indigo: { active: 'bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-500/30', hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
  pink: { active: 'bg-gradient-to-r from-pink-600 to-pink-500 shadow-lg shadow-pink-500/30', hover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20' },
  teal: { active: 'bg-gradient-to-r from-teal-500 to-teal-400 shadow-lg shadow-teal-500/30', hover: 'hover:bg-teal-50 dark:hover:bg-teal-900/20' },
  yellow: { active: 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-lg shadow-yellow-500/30', hover: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
  slate: { active: 'bg-gradient-to-r from-slate-700 to-slate-600 shadow-lg shadow-slate-500/30', hover: 'hover:bg-slate-200 dark:hover:bg-slate-700' },
  emerald: { active: 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/30', hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20' },
};

interface SidebarNavProps {
  isCollapsed: boolean;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ isCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const { user } = useAuthStore();

  const filteredItems = MENU_ITEMS.filter(item => {
    // Only show items if user has permission. 
    // Basic check: if 'isOwner' is true, user must be 'owner'.
    // Can be expanded with AuthorizeActionUsecase if needed for finer grain.
    if (item.isOwner) {
      const role = user?.role?.toLowerCase();
      return role === 'owner' || role === 'admin';
    }
    return true;
  });

  return (
    <nav className="flex-1 overflow-y-auto p-2 md:p-3 space-y-0.5 md:space-y-1 scrollbar-hide">
      {filteredItems.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === item.path
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        const theme = buttonThemes[item.color];

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
            title={isCollapsed ? t(item.labelKey) : ''}
            aria-label={t(item.labelKey)}
            className={cn(
              'w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2.5 rounded-xl text-[10px] md:text-xs font-semibold transition-all duration-300 group active:scale-95',
              isActive
                ? `${theme.active} text-white`
                : `text-[var(--app-text-secondary)] ${theme.hover}`,
              !isActive && (dir === 'rtl' ? 'hover:-translate-x-1' : 'hover:translate-x-1'),
              isCollapsed ? 'justify-center px-0' : ''
            )}
          >
            <Icon
              icon={item.icon}
              size={isCollapsed ? 18 : 16}
              color={item.color}
              className={cn(
                'flex-shrink-0',
                isActive && '!text-white' // Override color to white on active state
              )}
            />

            {!isCollapsed && (
              <span className={cn(
                'animate-in fade-in duration-200 whitespace-nowrap overflow-hidden',
                isActive ? 'text-white' : 'text-[var(--app-text)] group-hover:text-blue-600 dark:group-hover:text-blue-400'
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
