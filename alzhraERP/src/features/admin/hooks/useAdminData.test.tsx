import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSecurityLogs, useSecurityMutations } from './useAdminData';

// Mocks hoisted قبل استيراد الوحدة — تسجيل المسارات نفسها التي تستوردها useAdminData
const service = vi.hoisted(() => ({
  adminService: {
    getSecurityAlerts: vi.fn(),
    getSecurityAlertsCount: vi.fn(),
    getCspReportsPage: vi.fn(),
    getCspReportsCount: vi.fn(),
    resolveSecurityAlert: vi.fn(),
  },
  showToast: vi.fn(),
}));

vi.mock('../services/adminService', () => ({ adminService: service.adminService }));
vi.mock('../../feedback/store', () => ({
  useFeedbackStore: () => ({ showToast: service.showToast }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSecurityLogs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.adminService.getSecurityAlerts.mockResolvedValue([]);
    service.adminService.getSecurityAlertsCount.mockResolvedValue(0);
    service.adminService.getCspReportsPage.mockResolvedValue([]);
    service.adminService.getCspReportsCount.mockResolvedValue(0);
  });

  it('B1: computes CSP offset from cspPage (not alertsPage) with independent cache keys', async () => {
    // alertsPage=3 → إزاحة التنبيهات 50، أما cspPage=1 فتعني إزاحة CSP = 0
    renderHook(() => useSecurityLogs(3, 'unresolved', 1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(service.adminService.getSecurityAlerts).toHaveBeenCalledWith({
        limit: 25,
        offset: 50,
        resolved: false,
      });
    });
    await waitFor(() => {
      expect(service.adminService.getCspReportsPage).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
      });
    });
  });

  it('B1: rerender with a new cspPage refetches CSP with the new offset', async () => {
    const { rerender } = renderHook(
      ({ alertsPage, cspPage }: { alertsPage: number; cspPage: number }) =>
        useSecurityLogs(alertsPage, 'all', cspPage),
      { initialProps: { alertsPage: 1, cspPage: 1 }, wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(service.adminService.getCspReportsPage).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
      });
    });

    rerender({ alertsPage: 1, cspPage: 2 });
    await waitFor(() => {
      expect(service.adminService.getCspReportsPage).toHaveBeenLastCalledWith({
        limit: 25,
        offset: 25,
      });
    });
  });
});

describe('useSecurityMutations + useSecurityLogs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.adminService.getSecurityAlerts.mockResolvedValue([]);
    service.adminService.getSecurityAlertsCount.mockResolvedValue(5);
    service.adminService.getCspReportsPage.mockResolvedValue([]);
    service.adminService.getCspReportsCount.mockResolvedValue(0);
    service.adminService.resolveSecurityAlert.mockResolvedValue(true);
  });

  it('B2: resolving an alert invalidates the alerts COUNT query (refetch), not only the lists', async () => {
    const useCombined = () => {
      const logs = useSecurityLogs(1, 'unresolved', 1);
      const { resolveAlert } = useSecurityMutations();
      return { logs, resolveAlert };
    };

    const { result } = renderHook(() => useCombined(), { wrapper: createWrapper() });

    // العدّاد جُلب مرة عند التركيب
    await waitFor(() => {
      expect(service.adminService.getSecurityAlertsCount).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.resolveAlert({ alertId: 42, notes: 'تم الحظر' });
    });

    // بعد المعالجة يجب إبطال العدّاد وإعادة جلبه (كان قديماً قبل الإصلاح)
    await waitFor(() => {
      expect(service.adminService.getSecurityAlertsCount).toHaveBeenCalledTimes(2);
    });
    expect(service.adminService.resolveSecurityAlert).toHaveBeenCalledWith(42, 'تم الحظر');
    expect(service.showToast).toHaveBeenCalledWith('تمت معالجة التنبيه الأمني بنجاح', 'success');
  });
});
