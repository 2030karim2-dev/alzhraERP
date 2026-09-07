import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminHeader } from '../components/layout/AdminHeader';
import { AdminTabs } from '../components/layout/AdminTabs';
import { MetricsOverview } from '../components/dashboard/MetricsOverview';
import { CompaniesTable } from '../components/companies/CompaniesTable';
import { PlansManager } from '../components/subscriptions/PlansManager';
import { GlobalUsersDirectory } from '../components/users/GlobalUsersDirectory';
import { TelemetryCenter } from '../components/telemetry/TelemetryCenter';
import { SecurityAuditingHub } from '../components/security/SecurityAuditingHub';
import { SystemPlatformSettings } from '../components/settings/SystemPlatformSettings';
import { usePlatformMetrics } from '../hooks/useAdminData';
import { ROUTES } from '../../../core/routes/paths';
import { ADMIN_TAB_ITEM, resolveAdminTab } from '../components/layout/adminTabsMeta';
import type { AdminTab } from '../types';

/**
 * AdminHubPage — مركز تحكم المنصة (Super Admin).
 *
 * التنقل مُستضاف في URL (مسار فرعي اختياري بعد /admin) بدل حالة محلية، فيصبح:
 *  - كل تبويب له رابط قابل للمشاركة (deep-linkable).
 *  - أزرار Back/Forward في المتصفح تعمل بشكل صحيح.
 *  - إعادة تحميل الصفحة لا تفقد الموضع الحالي.
 */
export const AdminHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const activeTab = resolveAdminTab(tabParam);

  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
    refetch: refetchMetrics,
  } = usePlatformMetrics();

  const handleNavigate = (nextTab: AdminTab): void => {
    if (nextTab === activeTab) return;
    void navigate(ROUTES.ADMIN.ROOT + ADMIN_TAB_ITEM[nextTab].pathSuffix);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      {/* Top Header */}
      <AdminHeader />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-5">
        {/* Navigation Tabs Bar — تُحدَّد من الـ URL وتوجّه عبر الـ URL */}
        <AdminTabs
          activeTab={activeTab}
          metrics={metrics}
          isMetricsLoading={isMetricsLoading}
          onNavigate={handleNavigate}
          onRefresh={() => refetchMetrics()}
        />

        {/* Tab Content Display */}
        <div className="animate-in fade-in duration-200" key={activeTab}>
          {activeTab === 'overview' && (
            <MetricsOverview
              metrics={metrics}
              isLoading={isMetricsLoading}
              isError={isMetricsError}
              onRetry={() => refetchMetrics()}
              onNavigateTab={handleNavigate}
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
