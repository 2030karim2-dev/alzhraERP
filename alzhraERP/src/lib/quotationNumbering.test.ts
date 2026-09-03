import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuotationNumber, formatQuotationNumber } from './quotationNumbering';

// Mock supabase client with a generic fluent query-chain recorder that mirrors
// supabase-js v2 chaining (from → select → eq → eq → limit → await).
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('./supabaseClient', () => ({ supabase: { from: mockFrom } }));

interface RecordedCall {
  method: string;
  args: unknown[];
}

const createChainRecorder = (final: { data: unknown; error: { message: string } | null }) => {
  const calls: RecordedCall[] = [];
  const build = (): unknown =>
    new Proxy(
      {},
      {
        get: (_target, prop): unknown => {
          if (typeof prop !== 'string' || prop === 'then') return undefined;
          return (...args: unknown[]) => {
            calls.push({ method: prop, args });
            const isTerminal = prop === 'limit' || prop === 'single' || prop === 'maybeSingle';
            return isTerminal ? Promise.resolve(final) : build();
          };
        },
      }
    );
  return { calls, build };
};

describe('generateQuotationNumber (race-resistant quotation numbering)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts at QP-0001 when the company has no quotations yet', async () => {
    const { calls, build } = createChainRecorder({ data: [], error: null });
    mockFrom.mockImplementation(() => build());

    const result = await generateQuotationNumber('comp-1', 'purchase');

    expect(result).toBe('QP-0001');
    expect(mockFrom).toHaveBeenCalledWith('quotations');
    // [FIX] أُضيف order(created_at desc) قبل limit — أحدث الأرقام أعلى تسلسلاً
    // فيظل الحد 10_000 ذا معنى فوقه بدل عينة اعتباطية.
    expect(calls.map(c => c.method)).toEqual(['select', 'eq', 'eq', 'order', 'limit']);
    expect(calls.find(c => c.method === 'order')?.args).toEqual([
      'created_at',
      { ascending: false },
    ]);
    // Tenant isolation + kind filter must both be applied
    expect(calls.find(c => c.method === 'eq')?.args).toEqual(['company_id', 'comp-1']);
    expect(calls.filter(c => c.method === 'eq')[1]?.args).toEqual(['type', 'purchase']);
  });

  it('continues after the highest existing trailing sequence (max+1, not count+1)', async () => {
    // Numbers deliberately NOT contiguous: proves max-based logic vs old COUNT(*)+1.
    // With count+1 this company would get QP-0004 and collide with the existing one.
    const rows = [{ quotation_number: 'QP-0002' }, { quotation_number: 'QP-0004' }];
    const { build } = createChainRecorder({ data: rows, error: null });
    mockFrom.mockImplementation(() => build());

    const result = await generateQuotationNumber('comp-1', 'purchase');

    expect(result).toBe('QP-0005');
  });

  it('skips gaps inside the sequence instead of reusing an existing number', async () => {
    // QP-0001..QP-0005 exist except QP-0003 which was hard-deleted long ago;
    // reusing QP-0003 would collide with historical paper references.
    const rows = [
      { quotation_number: 'QS-0001' },
      { quotation_number: 'QS-0002' },
      { quotation_number: 'QS-0004' },
      { quotation_number: 'QS-0005' },
    ];
    const { build } = createChainRecorder({ data: rows, error: null });
    mockFrom.mockImplementation(() => build());

    const result = await generateQuotationNumber('comp-9', 'sales');

    expect(result).toBe('QS-0006');
  });

  it('counts soft-deleted quotations so their numbers are never reused', async () => {
    // The query intentionally has NO deleted_at filter — a soft-deleted QP-0007
    // must still block its number because printed/PDF copies reference it.
    const rows = [
      { quotation_number: 'QP-0007' }, // soft-deleted row still visible to this scan
      { quotation_number: 'QP-0008' },
    ];
    const { build } = createChainRecorder({ data: rows, error: null });
    mockFrom.mockImplementation(() => build());

    const result = await generateQuotationNumber('comp-1', 'purchase');

    expect(result).toBe('QP-0009');
  });

  it('ignores legacy numbers without a trailing numeric sequence', async () => {
    const rows = [{ quotation_number: 'QP-LEGACY-A' }, { quotation_number: null }];
    const { build } = createChainRecorder({ data: rows, error: null });
    mockFrom.mockImplementation(() => build());

    const result = await generateQuotationNumber('comp-1', 'purchase');

    expect(result).toBe('QP-0001');
  });

  it('throws an Arabic error when the database query fails (no silent fallback)', async () => {
    const { build } = createChainRecorder({
      data: null,
      error: { message: 'connection reset' },
    });
    mockFrom.mockImplementation(() => build());

    await expect(generateQuotationNumber('comp-1', 'purchase')).rejects.toThrow(
      /تعذر توليد رقم عرض السعر/
    );
  });

  it('formats both kinds with their documented prefixes', () => {
    expect(formatQuotationNumber('purchase', 42)).toBe('QP-0042');
    expect(formatQuotationNumber('sales', 7)).toBe('QS-0007');
  });
});
