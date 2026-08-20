import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsApi } from './api';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: mockFrom } }));

describe('reportsApi.getDebtAgingInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ages by due_date and includes partially_paid invoices (regression: was issue_date + missing partially_paid)', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const inFilter = vi.fn(() => ({ order }));
    const isFilter = vi.fn(() => ({ in: inFilter }));
    const eqType = vi.fn(() => ({ is: isFilter }));
    const eqCompany = vi.fn(() => ({ eq: eqType }));
    const select = vi.fn(() => ({ eq: eqCompany }));
    mockFrom.mockReturnValue({ select });

    const result = await reportsApi.getDebtAgingInvoices('c1');

    expect(mockFrom).toHaveBeenCalledWith('invoices');
    const selectArg = select.mock.calls[0][0] as string;
    expect(selectArg).toContain('due_date');
    expect(selectArg).toContain('issue_date');
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'c1');
    expect(eqType).toHaveBeenCalledWith('type', 'sale');
    // Partially paid invoices MUST be included in the aging report.
    expect(inFilter).toHaveBeenCalledWith('status', ['posted', 'partially_paid']);
    // Ordering follows the DUE date, not the issue date.
    expect(order).toHaveBeenCalledWith('due_date', { ascending: true });
    expect(result.error).toBeNull();
  });
});
