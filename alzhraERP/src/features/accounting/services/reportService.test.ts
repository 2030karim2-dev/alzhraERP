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
    // accountType (account nature) is propagated so the UI can interpret the sign
    expect(result[0].accountType).toBe('liability');
    expect(result[1].accountType).toBe('liability');
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
    // opening-balance row carries the same account nature
    expect(result[0].accountType).toBe('asset');
    expect(result[1].accountType).toBe('asset');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getFinancials — per-account P&L breakdown with graceful legacy fallback
// ─────────────────────────────────────────────────────────────────────────────

const DETAILED_ROWS = [
  { account_id: 'a1', account_code: '4001', account_name: 'إيرادات مبيعات', account_type: 'revenue', total_debit: 0, total_credit: 5000, balance: 5000 },
  { account_id: 'a2', account_code: '4100', account_name: 'مردودات مبيعات', account_type: 'revenue', total_debit: 300, total_credit: 0, balance: -300 },
  { account_id: 'a3', account_code: '5001', account_name: 'رواتب', account_type: 'expense', total_debit: 2000, total_credit: 0, balance: 2000 },
  { account_id: 'a4', account_code: '5200', account_name: 'إيجار', account_type: 'expense', total_debit: 700, total_credit: 0, balance: 700 },
];

const AGGREGATE_ROWS = [
  { category: 'الإيرادات', amount: 4700, type: 'revenue' },
  { category: 'المصروفات', amount: 2700, type: 'expense' },
  { category: 'صافي الربح/الخسارة', amount: 2000, type: 'net_profit' },
];

const BALANCE_SHEET_ROWS = [
  { category: 'الأصول', amount: 9700, type: 'asset' },
  { category: 'الخصوم', amount: 5000, type: 'liability' },
  { category: 'حقوق الملكية', amount: 2700, type: 'equity' },
];

const dispatchRpc = () =>
  supabaseMock.rpc.mockImplementation((fnName: string) => {
    if (fnName === 'report_profit_loss_detailed') {
      return Promise.resolve({ data: DETAILED_ROWS, error: null });
    }
    if (fnName === 'report_profit_loss') {
      return Promise.resolve({ data: AGGREGATE_ROWS, error: null });
    }
    if (fnName === 'report_balance_sheet') {
      return Promise.resolve({ data: BALANCE_SHEET_ROWS, error: null });
    }
    return Promise.resolve({ data: null, error: { message: `unexpected rpc ${fnName}` } });
  });

describe('reportService.getFinancials — detailed P&L with safe fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds per-account revenue/expense lists from report_profit_loss_detailed', async () => {
    dispatchRpc();

    const result = await reportService.getFinancials('c1', null, '2026-01-01', '2026-12-31');

    const calls = supabaseMock.rpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('report_profit_loss_detailed');
    expect(calls).not.toContain('report_profit_loss');

    const inc = result.incomeStatement;
    expect(inc.revenues).toHaveLength(2);
    expect(inc.expenses).toHaveLength(2);
    // Per-account detail flows straight into the UI list items
    expect(inc.revenues[0]).toMatchObject({ account_id: 'a1', code: '4001', name: 'إيرادات مبيعات', net_balance: 5000 });
    expect(inc.revenues[1].net_balance).toBe(-300); // returns shown negative under credit-normal convention
    // Totals are sums over the detailed accounts: 4700 / 2700 → net 2000
    expect(inc.totalRevenue).toBe(4700);
    expect(inc.totalExpense).toBe(2700);
    expect(inc.netIncome).toBe(2000);
  });

  it('falls back to the aggregate RPC only when the detailed function does not exist yet', async () => {
    supabaseMock.rpc.mockImplementation((fnName: string) => {
      if (fnName === 'report_profit_loss_detailed') {
        return Promise.resolve({
          data: null,
          error: { message: 'function public.report_profit_loss_detailed(uuid, date, date, uuid) does not exist', code: '42883' },
        });
      }
      if (fnName === 'report_profit_loss') {
        return Promise.resolve({ data: AGGREGATE_ROWS, error: null });
      }
      if (fnName === 'report_balance_sheet') {
        return Promise.resolve({ data: BALANCE_SHEET_ROWS, error: null });
      }
      return Promise.resolve({ data: null, error: { message: `unexpected rpc ${fnName}` } });
    });

    const result = await reportService.getFinancials('c1');

    const calls = supabaseMock.rpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('report_profit_loss');
    const inc = result.incomeStatement;
    // Single synthetic rows exactly like the pre-migration behaviour
    expect(inc.revenues).toHaveLength(1);
    expect(inc.revenues[0]).toMatchObject({ account_id: 'revenue-total', net_balance: 4700 });
    expect(inc.totalRevenue).toBe(4700);
    expect(inc.totalExpense).toBe(2700);
    expect(inc.netIncome).toBe(2000);
  });

  it('propagates real failures (network etc.) instead of silently degrading', async () => {
    supabaseMock.rpc.mockImplementation((fnName: string) => {
      if (fnName === 'report_profit_loss_detailed') {
        return Promise.resolve({ data: null, error: { message: 'Failed to fetch' } });
      }
      return Promise.resolve({ data: null, error: { message: 'should not be reached' } });
    });

    await expect(reportService.getFinancials('c1')).rejects.toThrow(/Failed to fetch/);
    const calls = supabaseMock.rpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).not.toContain('report_profit_loss');
  });
});


