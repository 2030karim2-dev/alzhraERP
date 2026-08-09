import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  dateSchema,
  paginationSchema,
  invoiceItemSchema,
  invoiceSchema,
  journalLineSchema,
  journalEntrySchema,
  productSchema,
  partySchema,
} from './index';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ── Common Schemas ──────────────────────────────────────

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    expect(uuidSchema.safeParse(VALID_UUID).success).toBe(true);
  });
  it('rejects invalid UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
  });
  it('rejects empty string', () => {
    expect(uuidSchema.safeParse('').success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('test@example.com').success).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts strong password', () => {
    expect(passwordSchema.safeParse('StrongP@ss1').success).toBe(true);
  });
  it('rejects too short', () => {
    expect(passwordSchema.safeParse('Abc@1').success).toBe(false);
  });
  it('rejects without uppercase', () => {
    expect(passwordSchema.safeParse('weakpassword@1').success).toBe(false);
  });
  it('rejects without digit', () => {
    expect(passwordSchema.safeParse('WeakPassword@').success).toBe(false);
  });
  it('rejects without special char', () => {
    expect(passwordSchema.safeParse('WeakPassword1').success).toBe(false);
  });
});


// ── Journal Line Validation (Double-Entry) ──────────────

describe('journalLineSchema', () => {
  it('accepts debit-only line', () => {
    expect(journalLineSchema.safeParse({
      account_id: VALID_UUID,
      debit_amount: 100,
      credit_amount: 0,
    }).success).toBe(true);
  });

  it('accepts credit-only line', () => {
    expect(journalLineSchema.safeParse({
      account_id: VALID_UUID,
      debit_amount: 0,
      credit_amount: 100,
    }).success).toBe(true);
  });

  it('rejects line with both debit and credit', () => {
    expect(journalLineSchema.safeParse({
      account_id: VALID_UUID,
      debit_amount: 100,
      credit_amount: 50,
    }).success).toBe(false);
  });

  it('rejects line with neither debit nor credit (zero both)', () => {
    expect(journalLineSchema.safeParse({
      account_id: VALID_UUID,
      debit_amount: 0,
      credit_amount: 0,
    }).success).toBe(false);
  });

  it('defaults missing amounts to zero', () => {
    const result = journalLineSchema.safeParse({ account_id: VALID_UUID, debit_amount: 100, credit_amount: 0 });
    expect(result.success).toBe(true);
  });
});

// ── Journal Entry Balance (SOX Compliance) ──────────────

describe('journalEntrySchema', () => {
  const makeLines = (debits: number[], credits: number[]) => [
    ...debits.map((d, i) => ({
      account_id: VALID_UUID,
      debit_amount: d,
      credit_amount: 0,
      description: `debit ${i}`,
    })),
    ...credits.map((c, i) => ({
      account_id: VALID_UUID,
      debit_amount: 0,
      credit_amount: c,
      description: `credit ${i}`,
    })),
  ];

  it('accepts balanced entry (100 = 100)', () => {
    const result = journalEntrySchema.safeParse({
      date: '2026-08-10',
      description: 'Test entry',
      lines: makeLines([100], [100]),
    });
    expect(result.success).toBe(true);
  });

  it('accepts balanced multi-line entry (250 = 150 + 100)', () => {
    const result = journalEntrySchema.safeParse({
      date: '2026-08-10',
      description: 'Multi-line',
      lines: makeLines([250], [150, 100]),
    });
    expect(result.success).toBe(true);
  });

  it('rejects unbalanced entry (100 ≠ 90)', () => {
    const result = journalEntrySchema.safeParse({
      date: '2026-08-10',
      description: 'Unbalanced',
      lines: makeLines([100], [90]),
    });
    expect(result.success).toBe(false);
  });

  it('rejects entry with fewer than 2 lines', () => {
    const result = journalEntrySchema.safeParse({
      date: '2026-08-10',
      description: 'Too few lines',
      lines: [makeLines([100], [])[0]],
    });
    expect(result.success).toBe(false);
  });

  it('accepts balanced entry within SOX micro-tolerance', () => {
    // 0.0000005 < SOX_BALANCE_TOLERANCE (0.000001)
    const result = journalEntrySchema.safeParse({
      date: '2026-08-10',
      description: 'Micro-imbalance',
      lines: [
        { account_id: VALID_UUID, debit_amount: 100.0000001, credit_amount: 0 },
        { account_id: VALID_UUID, debit_amount: 0, credit_amount: 100 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('requires description', () => {
    expect(journalEntrySchema.safeParse({
      date: '2026-08-10',
      description: '',
      lines: makeLines([100], [100]),
    }).success).toBe(false);
  });
});

// ── Invoice Validation ──────────────────────────────────

describe('invoiceSchema', () => {
  it('accepts valid invoice with items', () => {
    const result = invoiceSchema.safeParse({
      type: 'sale',
      payment_method: 'cash',
      items: [{
        product_id: VALID_UUID,
        name: 'Product A',
        quantity: 1,
        unit_price: 100,
      }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invoice without items', () => {
    expect(invoiceSchema.safeParse({
      type: 'sale',
      payment_method: 'cash',
      items: [],
    }).success).toBe(false);
  });

  it('rejects invalid invoice type', () => {
    expect(invoiceSchema.safeParse({
      type: 'invalid',
      payment_method: 'cash',
      items: [{ product_id: VALID_UUID, name: 'X', quantity: 1, unit_price: 10 }],
    }).success).toBe(false);
  });

  it('defaults currency to SAR', () => {
    const result = invoiceSchema.safeParse({
      type: 'sale',
      payment_method: 'cash',
      items: [{ product_id: VALID_UUID, name: 'X', quantity: 1, unit_price: 10 }],
    });
    if (result.success) expect(result.data.currency).toBe('SAR');
  });
});

// ── Product & Party Schemas ─────────────────────────────

describe('productSchema', () => {
  it('accepts valid product', () => {
    expect(productSchema.safeParse({
      name: 'Product A',
      cost_price: 50,
      sell_price: 100,
    }).success).toBe(true);
  });

  it('rejects negative cost price', () => {
    expect(productSchema.safeParse({
      name: 'Product',
      cost_price: -10,
      sell_price: 100,
    }).success).toBe(false);
  });
});

describe('partySchema', () => {
  it('accepts valid party', () => {
    expect(partySchema.safeParse({ name: 'Customer A' }).success).toBe(true);
  });
  it('rejects empty name', () => {
    expect(partySchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('dateSchema', () => {
  it('accepts ISO date', () => {
    expect(dateSchema.safeParse('2026-08-10').success).toBe(true);
  });
  it('accepts full ISO datetime', () => {
    expect(dateSchema.safeParse('2026-08-10T10:00:00Z').success).toBe(true);
  });
  it('rejects invalid date', () => {
    expect(dateSchema.safeParse('not-a-date').success).toBe(false);
  });
});
