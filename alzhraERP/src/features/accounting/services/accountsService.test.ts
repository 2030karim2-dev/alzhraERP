import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountsService } from './accountsService';

const { accountsApiMock, supabaseMock } = vi.hoisted(() => ({
  accountsApiMock: {
    getAccounts: vi.fn(),
    createAccount: vi.fn(),
    insertAccounts: vi.fn(),
    deleteAccount: vi.fn(),
  },
  supabaseMock: { rpc: vi.fn(), from: vi.fn() },
}));

vi.mock('../api/accountsApi', () => ({ accountsApi: accountsApiMock }));
vi.mock('../../../lib/supabaseClient', () => ({ supabase: supabaseMock }));

describe('accountsService.getAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalises the trial-balance sign per account type (credit-normal accounts positive)', async () => {
    const accounts = [
      { id: 'a-asset', company_id: 'c1', code: '1100', name_ar: 'مدينون', type: 'asset', currency_code: 'SAR', is_system: true, parent_id: null, allow_posting: true },
      { id: 'a-liab', company_id: 'c1', code: '2100', name_ar: 'دائنون', type: 'liability', currency_code: 'SAR', is_system: true, parent_id: null, allow_posting: true },
      { id: 'a-rev', company_id: 'c1', code: '4100', name_ar: 'مبيعات', type: 'revenue', currency_code: 'SAR', is_system: true, parent_id: null, allow_posting: true },
    ];
    accountsApiMock.getAccounts.mockResolvedValue({ data: accounts, error: null });
    supabaseMock.rpc.mockResolvedValue({
      data: [
        { account_id: 'a-asset', balance: 500 },
        { account_id: 'a-liab', balance: -300 },
        { account_id: 'a-rev', balance: -100 },
      ],
      error: null,
    });

    const result = await accountsService.getAccounts('c1', { includeBalances: true });

    // asset keeps its debit (positive) balance
    expect(result.find((a) => a.id === 'a-asset')?.balance).toBe(500);
    // liability is credit-normal -> -(-300) = +300
    expect(result.find((a) => a.id === 'a-liab')?.balance).toBe(300);
    // revenue is credit-normal -> -(-100) = +100
    expect(result.find((a) => a.id === 'a-rev')?.balance).toBe(100);
  });

  it('keeps asset/expense debit balances positive', async () => {
    const accounts = [
      { id: 'a-exp', company_id: 'c1', code: '5100', name_ar: 'تكلفة البضاعة', type: 'expense', currency_code: 'SAR', is_system: true, parent_id: null, allow_posting: true },
    ];
    accountsApiMock.getAccounts.mockResolvedValue({ data: accounts, error: null });
    supabaseMock.rpc.mockResolvedValue({
      data: [{ account_id: 'a-exp', balance: 777 }],
      error: null,
    });

    const result = await accountsService.getAccounts('c1', { includeBalances: true });
    expect(result[0].balance).toBe(777);
  });

  it('returns 0 balance when the trial balance RPC is not requested', async () => {
    const accounts = [
      { id: 'a-asset', company_id: 'c1', code: '1100', name_ar: 'مدينون', type: 'asset', currency_code: 'SAR', is_system: true, parent_id: null, allow_posting: true },
    ];
    accountsApiMock.getAccounts.mockResolvedValue({ data: accounts, error: null });

    const result = await accountsService.getAccounts('c1');
    expect(result[0].balance).toBe(0);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

