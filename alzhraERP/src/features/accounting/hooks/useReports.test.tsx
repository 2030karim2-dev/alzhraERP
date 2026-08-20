import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLedger, useTrialBalance, useFinancials, useAuditJournals } from './useReports';

// Mocked auth store: user belongs to company 'c1'
const store = vi.hoisted(() => ({ user: { id: 'user-1', company_id: 'c1' } }));

vi.mock('../../auth/store', () => ({
  useAuthStore: () => ({ user: store.user }),
}));

vi.mock('../../branches/hooks/useBranchFilter', () => ({
  useBranchFilter: () => ({ branchId: null }),
}));

vi.mock('../services/index', () => ({
  accountingService: {
    getLedger: vi.fn(),
    getTrialBalance: vi.fn(),
    getFinancials: vi.fn(),
  },
}));

vi.mock('../api/reportsApi', () => ({
  reportsApi: { getAuditJournals: vi.fn() },
}));

import { accountingService } from '../services/index';
import { reportsApi } from '../api/reportsApi';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the ledger through accountingService with company + branch + dates', async () => {
    vi.mocked(accountingService.getLedger).mockResolvedValue([
      { date: '2026-08-19', journal_entry_id: 'j1', entry_number: 1, description: 'x', debit_amount: 100, credit_amount: 0, balance: 100, accountType: 'asset' },
    ]);

    const { result } = renderHook(() => useLedger('acc1', '2026-01-01', '2026-12-31'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(accountingService.getLedger).toHaveBeenCalledWith('c1', 'acc1', null, '2026-01-01', '2026-12-31');
    expect(result.current.data).toHaveLength(1);
  });

  it('does not fetch when no account is selected', async () => {
    const { result } = renderHook(() => useLedger(null), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isFetched).toBe(false));
    expect(accountingService.getLedger).not.toHaveBeenCalled();
  });
});

describe('useTrialBalance', () => {
  it('fetches the trial balance for the user company', async () => {
    vi.mocked(accountingService.getTrialBalance).mockResolvedValue([]);

    const { result } = renderHook(() => useTrialBalance('2026-01-01', '2026-08-19'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(accountingService.getTrialBalance).toHaveBeenCalledWith('c1', null, '2026-01-01', '2026-08-19');
  });
});

describe('useFinancials', () => {
  it('fetches financials (P&L + balance sheet) for the user company', async () => {
    vi.mocked(accountingService.getFinancials).mockResolvedValue(null);

    const { result } = renderHook(() => useFinancials('2026-01-01', '2026-08-19'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(accountingService.getFinancials).toHaveBeenCalledWith('c1', null, '2026-01-01', '2026-08-19');
  });
});

describe('useAuditJournals', () => {
  it('stays disabled until enabled=true', async () => {
    vi.mocked(reportsApi.getAuditJournals).mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useAuditJournals(false), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isFetched).toBe(false));
    expect(reportsApi.getAuditJournals).not.toHaveBeenCalled();
  });

  it('fetches non-void journals when enabled', async () => {
    vi.mocked(reportsApi.getAuditJournals).mockResolvedValue({ data: [{ id: 'j1' }], error: null });

    const { result } = renderHook(() => useAuditJournals(true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reportsApi.getAuditJournals).toHaveBeenCalledWith('c1', null);
  });
});
