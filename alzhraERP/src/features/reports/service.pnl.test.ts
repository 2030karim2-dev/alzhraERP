import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsService } from './service';

// Unification guard: reportsService.getProfitAndLoss must DELEGATE to the
// accounting service (single source of truth) instead of issuing its own
// duplicate report_profit_loss RPC, while preserving the exact camelCase
// output contract consumed by the Reports feature components.
const { getFinancialsMock } = vi.hoisted(() => ({ getFinancialsMock: vi.fn() }));

vi.mock('../accounting/services/reportService', () => ({
  reportService: { getFinancials: getFinancialsMock },
}));

vi.mock('../../lib/supabaseClient', () => ({ supabase: {} }));

describe('reportsService.getProfitAndLoss — delegates to accounting source of truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFinancialsMock.mockResolvedValue({
      incomeStatement: {
        revenues: [
          { account_id: 'a1', code: '4001', name: 'إيرادات مبيعات', type: 'revenue', total_debit: 0, total_credit: 5000, net_balance: 5000, currency_code: 'SAR' },
          { account_id: 'a2', code: '4100', name: 'مردودات', type: 'revenue', total_debit: 300, total_credit: 0, net_balance: -300, currency_code: 'SAR' },
        ],
        expenses: [
          { account_id: 'a3', code: '5001', name: 'رواتب', type: 'expense', total_debit: 2700, total_credit: 0, net_balance: 2700, currency_code: 'SAR' },
        ],
        totalRevenue: 4700,
        totalExpense: 2700,
        netIncome: 2000,
      },
      balanceSheet: {},
    });
  });

  it('maps snake_case financials to the historical camelCase contract', async () => {
    const result = await reportsService.getProfitAndLoss('c1', '2026-01-01', '2026-06-30');

    expect(getFinancialsMock).toHaveBeenCalledWith('c1', undefined, '2026-01-01', '2026-06-30');

    expect(result.revenues).toHaveLength(2);
    expect(result.revenues[0]).toEqual({
      id: 'a1', code: '4001', name: 'إيرادات مبيعات', type: 'revenue',
      totalDebit: 0, totalCredit: 5000, netBalance: 5000,
    });
    expect(result.expenses[0]).toMatchObject({ id: 'a3', netBalance: 2700 });
    expect(result.totalRevenues).toBe(4700);
    expect(result.totalExpenses).toBe(2700);
    expect(result.netProfit).toBe(2000);
  });
});
