import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purchaseQuotationsApi } from './quotationsApi';
import type { CreatePurchaseQuotationDTO } from '../types/quotation';

// Atomicity regression guard: quotation header + items MUST go out in ONE
// PostgREST request (nested related-resource insert), otherwise a failure
// between the two writes leaves an orphaned quotation with no items.
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
const { mockGenerateNumber } = vi.hoisted(() => ({ mockGenerateNumber: vi.fn() }));

vi.mock('../../../lib/supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('../../../lib/quotationNumbering', () => ({
  generateQuotationNumber: mockGenerateNumber,
}));

interface RecordedCall {
  method: string;
  args: unknown[];
}

const createInsertRecorder = (final: { data: unknown; error: { message: string } | null }) => {
  const calls: RecordedCall[] = [];
  const build = (): unknown =>
    new Proxy(
      {},
      {
        get: (_target, prop): unknown => {
          if (typeof prop !== 'string' || prop === 'then') return undefined;
          return (...args: unknown[]) => {
            calls.push({ method: prop, args });
            const isTerminal = prop === 'single' || prop === 'maybeSingle';
            return isTerminal ? Promise.resolve(final) : build();
          };
        },
      },
    );
  return { calls, build };
};

const baseDto = (overrides: Partial<CreatePurchaseQuotationDTO> = {}): CreatePurchaseQuotationDTO => ({
  partyId: 'party-1',
  issueDate: '2026-08-26',
  items: [
    { productId: 'prod-1', description: 'قطعة أصلية', quantity: 2, unitPrice: 100 },
    { productId: '', description: 'خدمة تركيب', quantity: 1, unitPrice: 50, discountPercent: 10 },
  ],
  ...overrides,
});

describe('purchaseQuotationsApi.createQuotation — atomic write & safe numbering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateNumber.mockResolvedValue('QP-0042');
  });

  it('inserts header AND items in a single nested request (atomicity guard)', async () => {
    const insertedRow = { id: 'q-1', quotation_number: 'QP-0042', rfq_group_id: 'rfq-1' };
    const { calls, build } = createInsertRecorder({ data: insertedRow, error: null });
    mockFrom.mockImplementation(() => build());

    const result = await purchaseQuotationsApi.createQuotation(
      'comp-1',
      'user-1',
      baseDto(),
    );

    const fromTable = mockFrom.mock.calls[0]?.[0];
    expect(fromTable).toBe('quotations');

    // Exactly ONE write entry point: insert() called once carrying the items array
    const insertCall = calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    expect(calls.filter((c) => c.method === 'insert')).toHaveLength(1);

    const payload = insertCall?.args[0] as Record<string, unknown>;
    expect(payload['quotation_number']).toBe('QP-0042');
    expect(payload['type']).toBe('purchase');
    expect(payload['company_id']).toBe('comp-1');
    expect(payload['created_by']).toBe('user-1');

    const nestedItems = payload['quotation_items'] as Array<Record<string, unknown>>;
    expect(nestedItems).toHaveLength(2);
    expect(nestedItems[0]).toMatchObject({
      product_id: 'prod-1',
      quantity: 2,
      unit_price: 100,
      total: 200,
      sort_order: 0,
      company_id: 'comp-1',
    });
    // Discount line total = 50 * (1 - 10%) rounded to 2 decimals
    expect(nestedItems[1]).toMatchObject({ total: 45, discount_percent: 10, sort_order: 1 });

    expect(result).toEqual(insertedRow);
  });

  it('propagates the database error instead of leaving an orphaned quotation', async () => {
    const { build } = createInsertRecorder({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });
    mockFrom.mockImplementation(() => build());

    await expect(
      purchaseQuotationsApi.createQuotation('comp-1', 'user-1', baseDto()),
    ).rejects.toThrow(/duplicate key/);
  });

  it('refuses to save a quotation with zero items (client-side fail-fast)', async () => {
    await expect(
      purchaseQuotationsApi.createQuotation('comp-1', 'user-1', baseDto({ items: [] })),
    ).rejects.toThrow(/بدون أصناف/);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('delegates numbering to the shared race-resistant generator', async () => {
    const { build } = createInsertRecorder({
      data: { id: 'q-2', quotation_number: 'QP-0042', rfq_group_id: 'rfq-2' },
      error: null,
    });
    mockFrom.mockImplementation(() => build());

    await purchaseQuotationsApi.createQuotation('comp-1', 'user-1', baseDto());

    expect(mockGenerateNumber).toHaveBeenCalledWith('comp-1', 'purchase');
  });
});
