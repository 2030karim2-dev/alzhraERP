import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Handshake,
  Send,
  FileSpreadsheet,
  Settings2,
} from 'lucide-react';
import { cn } from '../../../core/utils';
import { ROUTES } from '../../../core/routes/paths';
import { usePermission } from '../../../core/hooks/usePermission';

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
  { to: ROUTES.DASHBOARD.DEBTS_PROMISES, label: 'الوعود', icon: Handshake },
  { to: ROUTES.DASHBOARD.DEBTS_OUTBOX, label: 'الرسائل', icon: Send },
  { to: ROUTES.DASHBOARD.DEBTS_STATEMENTS, label: 'كشوف الحساب', icon: FileSpreadsheet },
  { to: ROUTES.DASHBOARD.DEBTS_SETTINGS, label: 'الإعدادات', icon: Settings2, permission: 'debts:manage' },
];

const DebtsLayout: React.FC = () => {
  const { hasPermission: canManage, isLoading: permissionLoading } = usePermission('debts:manage');
  const { hasPermission: canRead, isLoading: readLoading } = usePermission('debts:read');

  // Keep tabs visible while the permission check is loading to avoid flashing.
  const showManage = permissionLoading || canManage;
  const tabs = SERVICE_TABS.filter((t) => !t.permission || showManage);

  // Module-level gate: a member without debts:read gets a clear message
  // instead of a wall of failed queries.
  if (!readLoading && !canRead) {
    return (
      <div className="p-10 max-md:p-6 text-center">
        <div className="inline-flex flex-col items-center gap-3 p-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] max-w-md">
          <span className="text-3xl">🔒</span>
          <h2 className="font-bold text-sm text-[var(--app-text)]">لا تملك صلاحية الوصول لبيانات الديون</h2>
          <p className="text-[11px] text-[var(--app-text-secondary)] leading-relaxed">
            صلاحية <code dir="ltr" className="font-mono text-blue-600">debts:read</code> مطلوبة لعرض هذا القسم.
            يرجى التواصل مع مدير النظام.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-md:space-y-3 p-4 max-md:p-2.5 md:p-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-[var(--app-text)]">
            📍 الديون والتحصيل
          </h1>
          <p className="text-[10px] md:text-xs text-[var(--app-text-secondary)] mt-0.5">
            متابعة الديون، التذكير عبر واتساب، الوعود وكشوف الحساب
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5 md:gap-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            {...(tab.end !== undefined ? { end: tab.end } : {})}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-[11px] md:text-xs font-bold transition-all',
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
