import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Sun, Moon, AlertTriangle, Activity, Layers } from 'lucide-react';
import { useThemeStore } from '../../../../lib/themeStore';
import { useAuthStore } from '../../../auth/store';
import { useSystemConfigs } from '../../hooks/useAdminData';
import { ROUTES } from '../../../../core/routes/paths';

export const AdminHeader: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { data: configs } = useSystemConfigs();

  const isMaintenance = configs?.maintenance_mode?.enabled;

  return (
    <header className="bg-[var(--app-surface)]/90 sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[var(--app-border)] px-4 backdrop-blur-md transition-colors">
      {/* Brand & Badge */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-tight text-[var(--app-text)]">
              Al-Zahra Platform Cockpit
            </h1>
            <span className="rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-black text-rose-500">
              Super Admin
            </span>
          </div>
          <p className="text-[10px] font-bold text-[var(--app-text-secondary)]">
            مركز التحكم والعمليات العليا للمنصة
          </p>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div className="hidden items-center gap-3 md:flex">
        {isMaintenance ? (
          <div className="flex animate-pulse items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} />
            <span>وضع الصيانة مفعّل للعامة</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
            <Activity size={12} />
            <span>المنصة تعمل بكفاءة تامة</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Switch back to regular ERP */}
        <button
          onClick={() => navigate(ROUTES.DASHBOARD.ROOT)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2.5 py-1.5 text-xs font-bold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface)] hover:text-blue-600"
          title="العودة لنظام إدارة المنشأة"
        >
          <Layers size={14} />
          <span className="hidden sm:inline">نظام المنشأة</span>
          <ArrowLeft size={12} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface)]"
          title={theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
        </button>

        {/* User Chip */}
        <div className="bg-[var(--app-surface-hover)]/60 hidden items-center gap-2 rounded-lg border border-[var(--app-border)] px-2.5 py-1 lg:flex">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="max-w-[150px] truncate text-[10px] font-bold text-[var(--app-text)]">
            {user?.email}
          </span>
        </div>
      </div>
    </header>
  );
};
