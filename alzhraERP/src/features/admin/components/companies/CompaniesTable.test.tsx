import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompaniesTable } from './CompaniesTable';

// Mocks hoisted قبل استيراد الوحدة
const mocks = vi.hoisted(() => ({
  useAdminCompanies: vi.fn(),
  useAdminCompaniesCount: vi.fn(),
  useCompanyMutations: vi.fn(),
  fetchAllAdminCompanies: vi.fn(),
  refetch: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../hooks/useAdminData', () => ({
  useAdminCompanies: mocks.useAdminCompanies,
  useAdminCompaniesCount: mocks.useAdminCompaniesCount,
  useCompanyMutations: mocks.useCompanyMutations,
  useAdminUsers: vi.fn(),
  useAdminUsersCount: vi.fn(),
  useUserMutations: vi.fn(),
  useSubscriptionPlans: vi.fn(),
  usePlanMutations: vi.fn(),
  usePlatformMetrics: vi.fn(),
  useSystemConfigs: vi.fn(),
  useConfigMutations: vi.fn(),
  ADMIN_TABLE_PAGE_SIZE: 25,
  SECURITY_LOGS_PAGE_SIZE: 25,
  fetchAllAdminCompanies: mocks.fetchAllAdminCompanies,
  fetchAllAdminUsers: vi.fn(),
  fetchAllAdminSecurityAlerts: vi.fn(),
  fetchAllAdminCspReports: vi.fn(),
}));

vi.mock('../../../../lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('../../../feedback/store', () => ({
  useFeedbackStore: () => ({ showToast: mocks.showToast }),
}));

const fakeCompanies = [
  {
    id: 'c-1',
    name_ar: 'منشأة النور',
    name_en: 'Al Noor',
    tax_number: '1234567890',
    base_currency: 'SAR',
    owner_id: 'u-9',
    owner_email: 'owner@alnoor.com',
    phone: '0500000000',
    is_active: true,
    subscription_status: 'active' as const,
    trial_ends_at: null,
    plan_id: 'p-1',
    plan_name: 'الباقة المتقدمة',
    user_count: 5,
    branch_count: 2,
    invoice_count: 45,
    created_at: '2026-08-01T00:00:00Z',
  },
];

describe('CompaniesTable — دخان بعد نقل الجدول إلى AdminTableShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAdminCompanies.mockReturnValue({
      data: fakeCompanies,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminCompaniesCount.mockReturnValue({ data: 1 });
    mocks.useCompanyMutations.mockReturnValue({
      toggleStatus: vi.fn(),
      isToggling: false,
      extendTrial: vi.fn(),
      isExtending: false,
      assignPlan: vi.fn(),
      isAssigningPlan: false,
    });
  });

  it('يعرض الجدول بالأعمدة وصف المنشأة وبيانات الترقيم', () => {
    render(<CompaniesTable />);
    // رؤوس الأعمدة
    expect(screen.getByText('المنشأة')).toBeTruthy();
    expect(screen.getByText('الرقم الضريبي')).toBeTruthy();
    // الصف
    expect(screen.getByText('منشأة النور')).toBeTruthy();
    expect(screen.getByText('owner@alnoor.com')).toBeTruthy();
    // الشارة الحالة (نشطة عبر companyStatusLabel) — النص يتكرر مع خيار الفلتر
    expect(screen.getAllByText(/نشطة/).length).toBeGreaterThan(0);
    // الترقيم
    expect(screen.getByText(/عرض 1 من 1 منشأة/)).toBeTruthy();
    expect(screen.getByText(/صفحة 1 من 1/)).toBeTruthy();
  });

  it('يعرض حالة التحميل', () => {
    mocks.useAdminCompanies.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });
    render(<CompaniesTable />);
    expect(screen.getByText(/جاري تحميل البيانات/)).toBeTruthy();
    // الترقيم مخفي أثناء التحميل
    expect(screen.queryByText(/صفحة 1 من 1/)).toBeNull();
  });
});
