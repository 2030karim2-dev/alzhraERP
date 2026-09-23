import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Handshake,
  Send,
  FileSpreadsheet,
  Settings2,
} from 'lucide-react';
import { cn } from '../../../core/utils';
import { ROUTES } from '../../../core/routes/paths';
import { usePermission } from '../../../core/hooks/usePermission';
import { useDebtAlerts } from '../hooks/useDebtAlerts';

interface ServiceTab {
  to: string;
  end?: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  /** Optional gate — the tab is hidden unless the user holds this permission. */
  permission?: 'debts:manage';
}

/** Each main service of the debts module is a SEPARATE tab/route. */
const SERVICE_TABS: ServiceTab[] = [
  { to: ROUTES.DASHBOARD.DEBTS, end: true, label: 'نظرة عامة', icon: LayoutDashboard },
  { to: ROUTES.DASHBOARD.DEBTS_FOLLOWUP, label: 'المتابعة', icon: Users },
  { to: ROUTES.DASHBOARD.DEBTS_TASKS, label: 'المهام', icon: ListChecks },
  { to: ROUTES.DASHBOARD.DEBTS_PROMISES, label: 'الوعود', icon: Handshake },
  { to: ROUTES.DASHBOARD.DEBTS_OUTBOX, label: 'الرسائل', icon: Send },
  { to: ROUTES.DASHBOARD.DEBTS_STATEMENTS, label: 'كشوف الحساب', icon: FileSpreadsheet },
  {
    to: ROUTES.DASHBOARD.DEBTS_SETTINGS,
    label: 'الإعدادات',
    icon: Settings2,
    permission: 'debts:manage',
  },
];

const DebtsLayout: React.FC = () => {
  const { hasPermission: canManage, isLoading: permissionLoading } = usePermission('debts:manage');
  const { hasPermission: canRead, isLoading: readLoading } = usePermission('debts:read');

  // تنبيهات الأقساط الحرجة والوعود المخلَفة (وسوم مانعة للتكرار)
  useDebtAlerts();

  // Keep tabs visible while the permission check is loading to avoid flashing.
  const showManage = permissionLoading || canManage;
  const tabs = SERVICE_TABS.filter(t => !t.permission || showManage);

  // Module-level gate: a member without debts:read gets a clear message
  // instead of a wall of failed queries.
  if (!readLoading && !canRead) {
    return (
      <div className="p-10 text-center max-md:p-6">
        <div className="inline-flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8">
          <span className="text-3xl">🔒</span>
          <h2 className="text-sm font-bold text-[var(--app-text)]">
            لا تملك صلاحية الوصول لبيانات الديون
          </h2>
          <p className="text-[11px] leading-relaxed text-[var(--app-text-secondary)]">
            صلاحية{' '}
            <code dir="ltr" className="font-mono text-blue-600">
              debts:read
            </code>{' '}
            مطلوبة لعرض هذا القسم. يرجى التواصل مع مدير النظام.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-md:space-y-3 max-md:p-2.5 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-[var(--app-text)] md:text-xl">
            📍 الديون والتحصيل
          </h1>
          <p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)] md:text-xs">
            متابعة الديون، التذكير عبر واتساب، الوعود وكشوف الحساب
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5 md:gap-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            {...(tab.end !== undefined ? { end: tab.end } : {})}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all md:px-4 md:text-xs',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25'
                  : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
              )
            }
          >
            <tab.icon size={14} />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};

export default DebtsLayout;
