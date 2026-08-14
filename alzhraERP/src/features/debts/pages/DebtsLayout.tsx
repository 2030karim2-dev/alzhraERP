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

interface ServiceTab {
  to: string;
  end?: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

/** Each main service of the debts module is a SEPARATE tab/route. */
const SERVICE_TABS: ServiceTab[] = [
  { to: ROUTES.DASHBOARD.DEBTS, end: true, label: 'نظرة عامة', icon: LayoutDashboard },
  { to: ROUTES.DASHBOARD.DEBTS_FOLLOWUP, label: 'المتابعة', icon: Users },
  { to: ROUTES.DASHBOARD.DEBTS_PROMISES, label: 'الوعود', icon: Handshake },
  { to: ROUTES.DASHBOARD.DEBTS_OUTBOX, label: 'الرسائل', icon: Send },
  { to: ROUTES.DASHBOARD.DEBTS_STATEMENTS, label: 'كشوف الحساب', icon: FileSpreadsheet },
  { to: ROUTES.DASHBOARD.DEBTS_SETTINGS, label: 'الإعدادات', icon: Settings2 },
];

const DebtsLayout: React.FC = () => (
  <div className="space-y-4 p-4 md:p-6">
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
      {SERVICE_TABS.map((tab) => (
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

export default DebtsLayout;
