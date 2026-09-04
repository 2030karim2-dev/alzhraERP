import React, { useState } from 'react';
import {
  Building2,
  BarChart3,
  CreditCard,
  Users,
  Activity,
  ShieldAlert,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { AdminHeader } from '../components/layout/AdminHeader';
import { MetricsOverview } from '../components/dashboard/MetricsOverview';
import { CompaniesTable } from '../components/companies/CompaniesTable';
import { PlansManager } from '../components/subscriptions/PlansManager';
import { GlobalUsersDirectory } from '../components/users/GlobalUsersDirectory';
import { TelemetryCenter } from '../components/telemetry/TelemetryCenter';
import { SecurityAuditingHub } from '../components/security/SecurityAuditingHub';
import { SystemPlatformSettings } from '../components/settings/SystemPlatformSettings';
import { usePlatformMetrics } from '../hooks/useAdminData';
import type { AdminTab } from '../types';

export const AdminHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
    refetch: refetchMetrics,
  } = usePlatformMetrics();

  const tabs: Array<{
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string | undefined;
  }> = [
    { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 size={14} /> },
    {
      id: 'companies',
      label: 'المنشآت والشركات',
      icon: <Building2 size={14} />,
      badge: metrics?.total_companies,
    },
    { id: 'subscriptions', label: 'باقات الاشتراك', icon: <CreditCard size={14} /> },
    {
      id: 'users',
      label: 'دليل المستخدمين',
      icon: <Users size={14} />,
      badge: metrics?.total_users,
    },
    { id: 'telemetry', label: 'مراقبة الخدمات والـ AI', icon: <Activity size={14} /> },
    {
      id: 'security',
      label: 'الأمان والتنبيهات',
      icon: <ShieldAlert size={14} />,
      badge: metrics?.honeypot_alerts ? `${metrics.honeypot_alerts}` : undefined,
    },
    { id: 'settings', label: 'إعدادات المنصة والصيانة', icon: <Settings size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      {/* Top Header */}
      <AdminHeader />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-5">
        {/* Navigation Tabs Bar */}
        <div className="scrollbar-none flex items-center justify-between overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-xs">
          <div className="flex min-w-max items-center gap-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => refetchMetrics()}
            className="hidden items-center gap-1 px-2 text-[10px] font-bold text-[var(--app-text-secondary)] hover:text-blue-500 lg:flex"
            title="تحديث الإحصائيات العامة"
          >
            <RefreshCw size={11} className={isMetricsLoading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'overview' && (
            <MetricsOverview
              metrics={metrics}
              isLoading={isMetricsLoading}
              isError={isMetricsError}
              onRetry={() => refetchMetrics()}
              onNavigateTab={tab => {
                setActiveTab(tab);
              }}
            />
          )}

          {activeTab === 'companies' && <CompaniesTable />}

          {activeTab === 'subscriptions' && <PlansManager />}

          {activeTab === 'users' && <GlobalUsersDirectory />}

          {activeTab === 'telemetry' && <TelemetryCenter metrics={metrics} />}

          {activeTab === 'security' && <SecurityAuditingHub />}

          {activeTab === 'settings' && <SystemPlatformSettings />}
        </div>
      </main>
    </div>
  );
};

export default AdminHubPage;
