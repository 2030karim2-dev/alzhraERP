import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityAuditingHub } from './SecurityAuditingHub';

// Mocks hoisted قبل استيراد الوحدة
const mocks = vi.hoisted(() => ({
  useSecurityLogs: vi.fn(),
  useSecurityMutations: vi.fn(),
  resolveAlert: vi.fn(),
  refetch: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../hooks/useAdminData', () => ({
  useSecurityLogs: mocks.useSecurityLogs,
  useSecurityMutations: mocks.useSecurityMutations,
  SECURITY_LOGS_PAGE_SIZE: 25,
  useAdminUsers: vi.fn(),
  useAdminUsersCount: vi.fn(),
  useUserMutations: vi.fn(),
  useAdminCompanies: vi.fn(),
  useAdminCompaniesCount: vi.fn(),
  useCompanyMutations: vi.fn(),
  useSubscriptionPlans: vi.fn(),
  usePlanMutations: vi.fn(),
  usePlatformMetrics: vi.fn(),
  useSystemConfigs: vi.fn(),
  useConfigMutations: vi.fn(),
  useSuperAdminCount: vi.fn(),
  fetchAllAdminUsers: vi.fn(),
  fetchAllAdminCompanies: vi.fn(),
  fetchAllAdminSecurityAlerts: vi.fn(),
  fetchAllAdminCspReports: vi.fn(),
}));

vi.mock('../../../feedback/store', () => ({
  useFeedbackStore: () => ({ showToast: mocks.showToast }),
}));

const fakeAlerts = [
  {
    id: 7,
    severity: 'high',
    alert_type: 'honeypot_access',
    source_ip: '1.2.3.4',
    user_agent: 'bot',
    user_id: null,
    company_id: null,
    details: { path: '/vault_staging_keys' },
    detected_at: '2026-09-06T10:00:00Z',
    resolved_at: null,
    resolved_by: null,
    resolution_notes: null,
  },
];

const fakeCsp = [
  {
    id: 3,
    document_uri: 'https://erp.example.com/',
    blocked_uri: 'http://evil.test/x.js',
    violated_directive: 'script-src',
    received_at: '2026-09-06T11:00:00Z',
  },
];

const baseLogs = {
  securityAlerts: fakeAlerts,
  securityAlertsTotal: 1,
  isLoadingAlerts: false,
  isErrorAlerts: false,
  alertsError: null,
  cspReports: fakeCsp,
  cspTotal: 1,
  isLoadingCsp: false,
  isErrorCsp: false,
  cspError: null,
  refetch: mocks.refetch,
};

describe('SecurityAuditingHub — دخان بعد نقل الجداول إلى AdminTableShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSecurityLogs.mockReturnValue(baseLogs);
    mocks.useSecurityMutations.mockReturnValue({
      resolveAlert: mocks.resolveAlert,
      isResolvingAlert: false,
    });
  });

  it('يعرض جدول التنبيهات الافتراضي (honeypot) بصفه والترقيم', () => {
    render(<SecurityAuditingHub />);
    expect(screen.getByText('مركز الأمان والتنبيهات')).toBeTruthy();
    expect(screen.getByText('نوع التنبيه')).toBeTruthy();
    expect(screen.getByText('honeypot_access')).toBeTruthy();
    expect(screen.getByText('1.2.3.4')).toBeTruthy();
    // شارة الحالة النشطة
    expect(screen.getByText('نشط')).toBeTruthy();
    // الترقيم
    expect(screen.getByText(/عرض 1 من 1 تنبيه/)).toBeTruthy();
  });

  it('يبدّل إلى جدول CSP عند الضغط على تبويبه', () => {
    render(<SecurityAuditingHub />);
    fireEvent.click(screen.getByText(/تقارير CSP \(/));
    // رؤوس جدول CSP وصفه
    expect(screen.getByText('الصفحة المستهدفة')).toBeTruthy();
    expect(screen.getByText('http://evil.test/x.js')).toBeTruthy();
    expect(screen.getByText('script-src')).toBeTruthy();
    expect(screen.getByText(/عرض 1 من 1 تقرير/)).toBeTruthy();
    // جدول التنبيهات لم يعد معروضاً
    expect(screen.queryByText('honeypot_access')).toBeNull();
  });

  it('يعرض رسالة الحالة الفارغة عند لا تنبيهات', () => {
    mocks.useSecurityLogs.mockReturnValue({
      ...baseLogs,
      securityAlerts: [],
      securityAlertsTotal: 0,
    });
    render(<SecurityAuditingHub />);
    expect(screen.getByText('لا توجد تنبيهات أمنية مطابقة للفلتر المحدد.')).toBeTruthy();
  });
});
