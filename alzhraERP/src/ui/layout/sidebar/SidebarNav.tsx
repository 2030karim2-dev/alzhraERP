import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS } from '../../../core/constants';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { cn } from '../../../core/utils';
import { useAuthStore } from '../../../features/auth/store';
import { useAllPermissions } from '../../../core/hooks/usePermission';
import { prefetchRoute } from '../../../core/utils/routePrefetcher';

interface SidebarNavProps {
  isCollapsed: boolean;
}

interface ItemTheme {
  badgeBg: string;
  badgeBorder: string;
  iconColor: string;
  activeBadge: string;
  activeItemBg: string;
  activeItemText: string;
  hoverBadge: string;
}

const ITEM_THEMES: Record<string, ItemTheme> = {
  dashboard: {
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/15',
    badgeBorder: 'border-purple-200/60 dark:border-purple-800/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    activeBadge: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-400/30',
    activeItemBg: 'bg-purple-500/10 dark:bg-purple-500/15 border-purple-200 dark:border-purple-800/60',
    activeItemText: 'text-purple-950 dark:text-purple-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/30',
  },
  chat: {
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    badgeBorder: 'border-blue-200/60 dark:border-blue-800/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    activeBadge: 'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/30',
    activeItemBg: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-200 dark:border-blue-800/60',
    activeItemText: 'text-blue-950 dark:text-blue-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30',
  },
  sales: {
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeBorder: 'border-emerald-200/60 dark:border-emerald-800/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    activeBadge: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/30',
    activeItemBg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-800/60',
    activeItemText: 'text-emerald-950 dark:text-emerald-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30',
  },
  bonds: {
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    badgeBorder: 'border-amber-200/60 dark:border-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    activeBadge: 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/30',
    activeItemBg: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-200 dark:border-amber-800/60',
    activeItemText: 'text-amber-950 dark:text-amber-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30',
  },
  debts: {
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    badgeBorder: 'border-rose-200/60 dark:border-rose-800/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    activeBadge: 'bg-gradient-to-tr from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/30',
    activeItemBg: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-200 dark:border-rose-800/60',
    activeItemText: 'text-rose-950 dark:text-rose-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-rose-500/20 dark:group-hover:bg-rose-500/30',
  },
  clients: {
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/15',
    badgeBorder: 'border-teal-200/60 dark:border-teal-800/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    activeBadge: 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/30 ring-2 ring-teal-400/30',
    activeItemBg: 'bg-teal-500/10 dark:bg-teal-500/15 border-teal-200 dark:border-teal-800/60',
    activeItemText: 'text-teal-950 dark:text-teal-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-teal-500/20 dark:group-hover:bg-teal-500/30',
  },
  suppliers: {
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    badgeBorder: 'border-indigo-200/60 dark:border-indigo-800/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    activeBadge: 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/30',
    activeItemBg: 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-800/60',
    activeItemText: 'text-indigo-950 dark:text-indigo-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-indigo-500/20 dark:group-hover:bg-indigo-500/30',
  },
  supplier_portal: {
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    badgeBorder: 'border-cyan-200/60 dark:border-cyan-800/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    activeBadge: 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/30',
    activeItemBg: 'bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-800/60',
    activeItemText: 'text-cyan-950 dark:text-cyan-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-cyan-500/20 dark:group-hover:bg-cyan-500/30',
  },
  inventory: {
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/15',
    badgeBorder: 'border-orange-200/60 dark:border-orange-800/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    activeBadge: 'bg-gradient-to-tr from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-400/30',
    activeItemBg: 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-200 dark:border-orange-800/60',
    activeItemText: 'text-orange-950 dark:text-orange-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-orange-500/20 dark:group-hover:bg-orange-500/30',
  },
  expenses: {
    badgeBg: 'bg-red-500/10 dark:bg-red-500/15',
    badgeBorder: 'border-red-200/60 dark:border-red-800/40',
    iconColor: 'text-red-600 dark:text-red-400',
    activeBadge: 'bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400/30',
    activeItemBg: 'bg-red-500/10 dark:bg-red-500/15 border-red-200 dark:border-red-800/60',
    activeItemText: 'text-red-950 dark:text-red-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-red-500/20 dark:group-hover:bg-red-500/30',
  },
  accounting: {
    badgeBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    badgeBorder: 'border-violet-200/60 dark:border-violet-800/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    activeBadge: 'bg-gradient-to-tr from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-400/30',
    activeItemBg: 'bg-violet-500/10 dark:bg-violet-500/15 border-violet-200 dark:border-violet-800/60',
    activeItemText: 'text-violet-950 dark:text-violet-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-violet-500/20 dark:group-hover:bg-violet-500/30',
  },
  commissions: {
    badgeBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15',
    badgeBorder: 'border-fuchsia-200/60 dark:border-fuchsia-800/40',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    activeBadge: 'bg-gradient-to-tr from-fuchsia-600 to-pink-600 text-white shadow-md shadow-fuchsia-500/30 ring-2 ring-fuchsia-400/30',
    activeItemBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15 border-fuchsia-200 dark:border-fuchsia-800/60',
    activeItemText: 'text-fuchsia-950 dark:text-fuchsia-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-fuchsia-500/20 dark:group-hover:bg-fuchsia-500/30',
  },
  pos: {
    badgeBg: 'bg-pink-500/10 dark:bg-pink-500/15',
    badgeBorder: 'border-pink-200/60 dark:border-pink-800/40',
    iconColor: 'text-pink-600 dark:text-pink-400',
    activeBadge: 'bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/30 ring-2 ring-pink-400/30',
    activeItemBg: 'bg-pink-500/10 dark:bg-pink-500/15 border-pink-200 dark:border-pink-800/60',
    activeItemText: 'text-pink-950 dark:text-pink-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-pink-500/20 dark:group-hover:bg-pink-500/30',
  },
  vin: {
    badgeBg: 'bg-sky-500/10 dark:bg-sky-500/15',
    badgeBorder: 'border-sky-200/60 dark:border-sky-800/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    activeBadge: 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-400/30',
    activeItemBg: 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-200 dark:border-sky-800/60',
    activeItemText: 'text-sky-950 dark:text-sky-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-sky-500/20 dark:group-hover:bg-sky-500/30',
  },
  purchases: {
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeBorder: 'border-emerald-200/60 dark:border-emerald-800/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    activeBadge: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/30',
    activeItemBg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-800/60',
    activeItemText: 'text-emerald-950 dark:text-emerald-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30',
  },
  reports: {
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    badgeBorder: 'border-blue-200/60 dark:border-blue-800/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    activeBadge: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/30',
    activeItemBg: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-200 dark:border-blue-800/60',
    activeItemText: 'text-blue-950 dark:text-blue-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30',
  },
  settings: {
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/15',
    badgeBorder: 'border-slate-200/60 dark:border-slate-700/60',
    iconColor: 'text-slate-600 dark:text-slate-300',
    activeBadge: 'bg-gradient-to-tr from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white shadow-md shadow-slate-500/30 ring-2 ring-slate-400/30',
    activeItemBg: 'bg-slate-500/10 dark:bg-slate-500/15 border-slate-200 dark:border-slate-700',
    activeItemText: 'text-slate-900 dark:text-slate-100 font-black',
    hoverBadge: 'group-hover:scale-110 group-hover:bg-slate-500/20 dark:group-hover:bg-slate-500/30',
  },
};

const defaultTheme: ItemTheme = {
  badgeBg: 'bg-slate-500/10 dark:bg-slate-500/15',
  badgeBorder: 'border-slate-200/60 dark:border-slate-700/60',
  iconColor: 'text-slate-600 dark:text-slate-300',
  activeBadge: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md',
  activeItemBg: 'bg-slate-500/10 dark:bg-slate-500/15 border-slate-200 dark:border-slate-700',
  activeItemText: 'text-slate-900 dark:text-slate-100 font-black',
  hoverBadge: 'group-hover:scale-110',
};

const SidebarNav: React.FC<SidebarNavProps> = ({ isCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { permissions, isLoading } = useAllPermissions();

  const isOwner = user?.role?.toLowerCase() === 'owner';

  const filteredItems = MENU_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    if (isOwner) return true;
    if (isLoading) return false;
    return permissions.includes(item.requiredPermission);
  });

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar-hide">
      {filteredItems.map((item) => {
        const isActive =
          item.path === '/'
            ? location.pathname === item.path
            : location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

        const theme = ITEM_THEMES[item.id] || defaultTheme;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.path)}
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
            title={isCollapsed ? t(item.labelKey) : ''}
            aria-label={t(item.labelKey)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 group text-start relative border',
              isActive
                ? cn(
                    theme.activeItemBg,
                    'shadow-sm'
                  )
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100',
              isCollapsed ? 'justify-center px-0' : ''
            )}
          >
            {/* Active Pill Indicator on edge */}
            {isActive && (
              <span
                className={cn(
                  'absolute right-0 top-2 bottom-2 w-1 rounded-l-full',
                  theme.activeBadge.split(' ')[0] || 'bg-blue-600'
                )}
              />
            )}

            {/* Vibrant Interactive Icon Badge */}
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 border shadow-xs',
                isActive
                  ? theme.activeBadge
                  : cn(theme.badgeBg, theme.badgeBorder, theme.iconColor, theme.hoverBadge)
              )}
            >
              <IconComponent
                size={isCollapsed ? 18 : 16}
                className={cn(
                  'transition-transform duration-200 group-hover:rotate-3 group-active:scale-90',
                  isActive ? 'text-white' : ''
                )}
              />
            </div>

            {/* Label */}
            {!isCollapsed && (
              <span
                className={cn(
                  'whitespace-nowrap overflow-hidden transition-transform duration-200 group-hover:translate-x-0.5',
                  isActive
                    ? theme.activeItemText
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white'
                )}
              >
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
