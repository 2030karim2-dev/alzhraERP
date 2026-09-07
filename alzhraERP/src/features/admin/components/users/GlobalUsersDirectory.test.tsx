import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalUsersDirectory } from './GlobalUsersDirectory';

// Mocks hoisted قبل استيراد الوحدة — تُسجَّل بمسارات الاستيراد نفسها التي يستخدمها المكوّن
const mocks = vi.hoisted(() => ({
  useAdminUsers: vi.fn(),
  useAdminUsersCount: vi.fn(),
  useUserMutations: vi.fn(),
  fetchAllAdminUsers: vi.fn(),
  refetch: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../hooks/useAdminData', () => ({
  useAdminUsers: mocks.useAdminUsers,
  useAdminUsersCount: mocks.useAdminUsersCount,
  useUserMutations: mocks.useUserMutations,
  useAdminCompanies: vi.fn(),
  useAdminCompaniesCount: vi.fn(),
  useCompanyMutations: vi.fn(),
  useSubscriptionPlans: vi.fn(),
  usePlanMutations: vi.fn(),
  usePlatformMetrics: vi.fn(),
  useSystemConfigs: vi.fn(),
  useConfigMutations: vi.fn(),
  ADMIN_TABLE_PAGE_SIZE: 25,
  SECURITY_LOGS_PAGE_SIZE: 25,
  fetchAllAdminUsers: mocks.fetchAllAdminUsers,
  fetchAllAdminCompanies: vi.fn(),
  fetchAllAdminSecurityAlerts: vi.fn(),
  fetchAllAdminCspReports: vi.fn(),
  useSuperAdminCount: vi.fn(() => ({ data: 1 })),
}));

vi.mock('../../../../lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('../../../auth/store', () => ({
  useAuthStore: () => ({ user: { id: 'u-1' } }),
}));

vi.mock('../../../feedback/store', () => ({
  useFeedbackStore: () => ({ showToast: mocks.showToast }),
}));

const fakeUsers = [
  {
    user_id: 'u-1',
    email: 'me@example.com',
    created_at: '2026-08-01T00:00:00Z',
    is_super_admin: true,
    companies_count: 2,
    company_names: ['النور', 'الأمانة'],
  },
  {
    user_id: 'u-2',
    email: 'you@example.com',
    created_at: '2026-08-02T00:00:00Z',
    is_super_admin: false,
    companies_count: 0,
    company_names: [],
  },
];

describe('GlobalUsersDirectory — دخان بعد نقل الجدول إلى AdminTableShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAdminUsers.mockReturnValue({
      data: fakeUsers,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminUsersCount.mockReturnValue({ data: 2 });
    mocks.useUserMutations.mockReturnValue({
      toggleSuperAdmin: vi.fn(),
      isTogglingSuperAdmin: false,
    });
  });

  it('يعرض الجدول بالأعمدة والصفوف وبيانات الترقيم', () => {
    render(<GlobalUsersDirectory />);
    // رؤوس الأعمدة
    expect(screen.getByText('المستخدم')).toBeTruthy();
    expect(screen.getByText('الرتبة في المنصة')).toBeTruthy();
    // الصفوف
    expect(screen.getByText('me@example.com')).toBeTruthy();
    expect(screen.getByText('you@example.com')).toBeTruthy();
    // شارة الحساب الحالي (المستخدم u-1 أنا)
    expect(screen.getByText('(حسابك الحالي)')).toBeTruthy();
    // الترقيم من AdminPagination
    expect(screen.getByText(/عرض 2 من 2 مستخدم/)).toBeTruthy();
    expect(screen.getByText(/صفحة 1 من 1/)).toBeTruthy();
  });

  it('يعرض حالة الحالة الفارغة عند لا صفوف', () => {
    mocks.useAdminUsers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    render(<GlobalUsersDirectory />);
    expect(screen.getByText('لا يوجد مستخدمين مطابقين لمعايير البحث.')).toBeTruthy();
    expect(screen.queryByText('me@example.com')).toBeNull();
  });
});
