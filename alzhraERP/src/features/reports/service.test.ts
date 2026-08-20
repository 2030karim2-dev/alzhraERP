import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsService } from './service';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { rpc: vi.fn(), from: vi.fn() } }));

vi.mock('../../lib/supabaseClient', () => ({ supabase: supabaseMock }));

/** Mock `supabase.from('companies').select(...).eq(...).maybeSingle()` */
const mockCompany = (baseCurrency: string) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { base_currency: baseCurrency }, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  supabaseMock.from.mockReturnValue({ select });
  return { maybeSingle, select, eq };
};

describe('reportsService.getDebtReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls report_debts (not report_debt_aging) and maps summary + debts in base currency', async () => {
    mockCompany('SAR');
    supabaseMock.rpc.mockResolvedValue({
      data: {
        summary: { receivables: 1000, payables: 400 },
        debts: [
          { id: 'p1', name: 'عميل أ', type: 'customer', remaining_amount: 600 },
          { id: 'p2', name: 'مورد ب', type: 'supplier', remaining_amount: -400 },
          { id: 'p3', name: 'جهة مزدوجة', type: 'both', remaining_amount: 400 },
          { id: 'p4', name: 'مورد دائن', type: 'both', remaining_amount: -50 },
        ],
      },
      error: null,
    });

    const result = await reportsService.getDebtReport('c1');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('report_debts', { p_company_id: 'c1' });
    expect(result.summary.receivables).toBe(1000);
    expect(result.summary.payables).toBe(400);
    expect(result.summary.currency).toBe('SAR');

    // 'both' rows are split by the sign of the balance.
    expect(result.debts).toHaveLength(4);
    const bothPositive = result.debts.find((d) => d.id === 'p3');
    const bothNegative = result.debts.find((d) => d.id === 'p4');
    expect(bothPositive?.type).toBe('customer');
    expect(bothNegative?.type).toBe('supplier');
    // Supplier rows keep the NEGATIVE remaining_amount (DebtReportView filters < 0).
    expect(bothNegative?.remaining_amount).toBe(-50);
    // Debts are expressed in the company's base currency.
    expect(bothPositive?.currency).toBe('SAR');
  });

  it('uses the company base currency for the summary and rows', async () => {
    mockCompany('USD');
    supabaseMock.rpc.mockResolvedValue({
      data: {
        summary: { receivables: 100, payables: 20 },
        debts: [{ id: 'p1', name: 'عميل', type: 'customer', remaining_amount: 100 }],
      },
      error: null,
    });

    const result = await reportsService.getDebtReport('c1');

    expect(result.summary.currency).toBe('USD');
    expect(result.debts[0]?.currency).toBe('USD');
  });

  it('returns empty stats when the RPC returns null data', async () => {
    mockCompany('SAR');
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    const result = await reportsService.getDebtReport('c1');

    expect(result.summary.receivables).toBe(0);
    expect(result.summary.payables).toBe(0);
    expect(result.debts).toEqual([]);
  });
});
