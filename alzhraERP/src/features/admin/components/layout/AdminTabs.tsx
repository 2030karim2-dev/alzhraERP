import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../../core/utils';
import type { PlatformMetrics, AdminTab } from '../../types';
import { VALID_ADMIN_TABS, ADMIN_TAB_ITEM } from './adminTabsMeta';

interface AdminTabBadgeProps {
  isActive: boolean;
  badge: number | string | undefined;
}

/** شارة العدّاد داخل التبويب — ضرورية فقط للعدادات، لذلك 10px مسموح (تسمية توضيحية). */
const AdminTabBadge: React.FC<AdminTabBadgeProps> = ({ isActive, badge }) => {
  if (badge === undefined) return null;
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[10px] font-black',
        isActive
          ? 'bg-white/20 text-white'
          : 'border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]'
      )}
    >
      {badge}
    </span>
  );
};

interface AdminTabsProps {
  activeTab: AdminTab;
  metrics: PlatformMetrics | undefined;
  isMetricsLoading: boolean;
  onNavigate: (tab: AdminTab) => void;
  /** تحديث يدوي للمقاييس العامة (اختياري). */
  onRefresh?: (() => void) | undefined;
}

/** شريط التبويبات الرئيسي لمركز التحكم — يقرأ شارات العدّادات من المقاييس المشتركة. */
export const AdminTabs: React.FC<AdminTabsProps> = ({
  activeTab,
  metrics,
  isMetricsLoading,
  onNavigate,
  onRefresh,
}) => {
  const badgeFor = (id: AdminTab): number | string | undefined => {
    switch (id) {
      case 'companies':
        return metrics?.total_companies;
      case 'users':
        return metrics?.total_users;
      case 'security':
        return metrics?.honeypot_alerts ? String(metrics.honeypot_alerts) : undefined;
      default:
        return undefined;
    }
  };

  return (
    <div className="scrollbar-none flex items-center justify-between overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-xs">
      <div
        className="flex min-w-max items-center gap-1"
        role="tablist"
        aria-label="تبويبات مركز التحكم"
      >
        {Array.from(VALID_ADMIN_TABS).map(id => {
          const item = ADMIN_TAB_ITEM[id as AdminTab];
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              data-tab={item.id}
              onClick={() => {
                onNavigate(item.id);
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
              )}
            >
              <IconComponent size={14} aria-hidden="true" />
              <span>{item.label}</span>
              <AdminTabBadge isActive={isActive} badge={badgeFor(item.id)} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isMetricsLoading}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-blue-500 disabled:opacity-60"
            title="تحديث الإحصائيات العامة"
            aria-label="تحديث الإحصائيات العامة"
          >
            <RefreshCw size={13} className={isMetricsLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        )}
      </div>
    </div>
  );
};
