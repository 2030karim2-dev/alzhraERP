import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportService } from './reportService';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { rpc: vi.fn() } }));

vi.mock('../../../lib/supabaseClient', () => ({ supabase: supabaseMock }));

describe('reportService.getLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes branchId to the get_account_ledger RPC and maps branch_id onto entries', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: {
        openingBalance: 0,
        accountType: 'liability',
        entries: [
          { entry_date: '2026-08-16', entry_number: 1, branch_id: 'b1', description: 'x', debit_amount: 0, credit_amount: 100, balance: 100, currency_code: 'SAR', exchange_rate: 1, foreign_amount: 0 },
          { entry_date: '2026-08-16', entry_number: 2, branch_id: 'b2', description: 'y', debit_amount: 0, credit_amount: 50, balance: 150, currency_code: 'SAR', exchange_rate: 1, foreign_amount: 0 },
        ],
      },
      error: null,
    });

    const result = await reportService.getLedger('c1', 'acc1', 'b1', '2026-01-01', '2026-12-31');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_account_ledger', {
      p_company_id: 'c1',
      p_account_id: 'acc1',
      p_from: '2026-01-01',
      p_to: '2026-12-31',
      p_branch_id: 'b1',
    });
    expect(result).toHaveLength(2);
    expect(result[0].branch_id).toBe('b1');
    expect(result[1].branch_id).toBe('b2');
  });

  it('omits p_branch_id when no branch is selected', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { openingBalance: 0, accountType: 'asset', entries: [] },
      error: null,
    });

    await reportService.getLedger('c1', 'acc1');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_account_ledger', {
      p_company_id: 'c1',
      p_account_id: 'acc1',
    });
  });

  it('prepends an opening-balance row from the RPC openingBalance field (camelCase)', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: {
        openingBalance: 250,
        accountType: 'asset',
        entries: [
          { entry_date: '2026-08-16', entry_number: 1, branch_id: null, description: 'x', debit_amount: 100, credit_amount: 0, balance: 350, currency_code: 'SAR', exchange_rate: 1, foreign_amount: 0 },
        ],
      },
      error: null,
    });

    const result = await reportService.getLedger('c1', 'acc1');
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe('رصيد افتتاحي');
    expect(result[0].balance).toBe(250);
  });
});

