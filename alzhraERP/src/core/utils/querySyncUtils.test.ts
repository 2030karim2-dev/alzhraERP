import { describe, it, expect, vi } from 'vitest';
import { invalidateFinancialQueries } from './querySyncUtils';
import type { QueryClient } from '@tanstack/react-query';

describe('invalidateFinancialQueries', () => {
  it('should invalidate accounts, parties, debts, and journals by default', async () => {
    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueryClient;

    await invalidateFinancialQueries(mockQueryClient, 'company-123');

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['accounts', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['account_balances', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parties', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['party_statement_v3'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['debts', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['journals', 'company-123'],
    });
  });

  it('should include sales and bonds when opted-in', async () => {
    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueryClient;

    await invalidateFinancialQueries(mockQueryClient, 'company-123', {
      sales: true,
      bonds: true,
      accounts: false,
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['sales', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['sales_stats', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bonds', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bond_stats', 'company-123'],
    });
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['accounts', 'company-123'],
    });
  });

  it('should safely bail out when companyId is not provided', async () => {
    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueryClient;

    await invalidateFinancialQueries(mockQueryClient, null);
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
