import { describe, expect, it } from 'vitest';
import { calculateAuditStats } from './auditStats';

describe('calculateAuditStats', () => {
  it('returns zero totals for an empty session', () => {
    expect(calculateAuditStats([])).toEqual({
      total: 0,
      counted: 0,
      pending: 0,
      discrepancies: 0,
      matched: 0,
      discrepancyValue: 0,
    });
  });

  it('distinguishes uncounted items from a counted zero and preserves signed differences', () => {
    const items = [
      { counted_quantity: null, expected_quantity: 4 },
      { counted_quantity: undefined, expected_quantity: 4 },
      { counted_quantity: '', expected_quantity: 4 },
      { counted_quantity: 0, expected_quantity: 2, products: { cost_price: 10 } },
      { counted_quantity: '3', expected_quantity: 3 },
      { counted_quantity: 5, expected_quantity: 3, purchase_price: 4 },
    ];
    expect(calculateAuditStats(items)).toEqual({
      total: 6,
      counted: 3,
      pending: 3,
      discrepancies: 2,
      matched: 1,
      discrepancyValue: -12,
    });
    expect(items[3]?.counted_quantity).toBe(0);
  });

  it('uses cost price before purchase price and rounds the final value', () => {
    expect(
      calculateAuditStats([
        {
          counted_quantity: 2,
          expected_quantity: 1,
          products: { cost_price: 0, purchase_price: 99 },
        },
        { counted_quantity: 2, expected_quantity: 1, products: { purchase_price: 1.235 } },
      ]).discrepancyValue
    ).toBe(1.24);
  });
});
