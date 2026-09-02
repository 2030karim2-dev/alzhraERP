import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purchasesApi } from './api';
import type { SupplierPaymentData } from './types';

// Regression guard: supplier disbursement bonds used to hardcode chart-of-accounts
// code '1010' — failing outright when it did not exist and making bank/other-currency
// payments impossible. The account must now come from the caller or the active
// cashbox registry, with Arabic error messages.
const { mockRpc, mockGetCashboxes } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetCashboxes: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({ supabase: { rpc: mockRpc } }));
vi.mock('../accounting/api/treasuryApi', () => ({
  treasuryApi: { getCashboxes: mockGetCashboxes },
}));

const basePayment = (overrides: Partial<SupplierPaymentData> = {}): SupplierPaymentData => ({
  supplierId: 'supplier-1',
  amount: 1500,
  date: '2026-08-26',
  notes: 'دفعة تحت الحساب',
  ...overrides,
});

describe('purchasesApi.createSupplierPayment — treasury account resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: { bond_id: 'bond-1' }, error: null });
  });

  it('uses the explicitly selected treasury account without any lookup', async () => {
    const result = await purchasesApi.createSupplierPayment(
      basePayment({ treasuryAccountId: 'acc-explicit' }),
      'comp-1',
      'user-1'
    );

    expect(mockGetCashboxes).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [, params] = mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(params.p_cash_account_id).toBe('acc-explicit');
    expect(params.p_bond_type).toBe('payment');
    expect(params.p_counterparty_id).toBe('supplier-1');
    expect(result).toEqual({ data: { bond_id: 'bond-1' }, error: null });
  });

  it('falls back to the first active cashbox linked to a ledger account', async () => {
    mockGetCashboxes.mockResolvedValue({
      data: [
        { id: 'cb-1', account_id: 'acc-cashbox-1' },
        { id: 'cb-2', account_id: 'acc-cashbox-2' },
      ],
      error: null,
    });

    await purchasesApi.createSupplierPayment(basePayment(), 'comp-1', 'user-1');

    expect(mockGetCashboxes).toHaveBeenCalledWith('comp-1');
    const [, params] = mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(params.p_cash_account_id).toBe('acc-cashbox-1');
  });

  it('skips cashboxes that are not linked to a ledger account', async () => {
    mockGetCashboxes.mockResolvedValue({
      data: [
        { id: 'cb-orphan', account_id: null },
        { id: 'cb-good', account_id: 'acc-linked' },
      ],
      error: null,
    });

    await purchasesApi.createSupplierPayment(basePayment(), 'comp-1', 'user-1');

    const [, params] = mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(params.p_cash_account_id).toBe('acc-linked');
  });

  it('fails with an Arabic message when no treasury account can be resolved', async () => {
    mockGetCashboxes.mockResolvedValue({
      data: [{ id: 'cb-orphan', account_id: null }],
      error: null,
    });

    await expect(
      purchasesApi.createSupplierPayment(basePayment(), 'comp-1', 'user-1')
    ).rejects.toThrow(/لا يوجد صندوق نشط مرتبط بحساب/);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('throws when the bond RPC fails instead of reporting a false success', async () => {
    mockGetCashboxes.mockResolvedValue({
      data: [{ id: 'cb-1', account_id: 'acc-1' }],
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'fiscal_year_closed: السنة المالية مغلقة' },
    });

    await expect(
      purchasesApi.createSupplierPayment(basePayment(), 'comp-1', 'user-1')
    ).rejects.toThrow(/السنة المالية مغلقة/);
  });
});
