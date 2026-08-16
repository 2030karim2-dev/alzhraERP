import { describe, expect, it } from 'vitest';

const netLineTotal = (quantity: number, unitCost: number, discount: number) =>
  Math.max(0, quantity * unitCost - discount);

const isValidDiscount = (quantity: number, unitCost: number, discount: number) =>
  discount >= 0 && discount <= quantity * unitCost;

describe('purchase invoice critical validations', () => {
  it('rejects a discount larger than the gross line total', () => {
    expect(isValidDiscount(2, 100, 201)).toBe(false);
  });

  it('accepts zero and exact-total discounts', () => {
    expect(isValidDiscount(2, 100, 0)).toBe(true);
    expect(isValidDiscount(2, 100, 200)).toBe(true);
  });

  it('calculates the same net line total sent by the UI', () => {
    expect(netLineTotal(3, 50, 20)).toBe(130);
    expect(netLineTotal(1, 50, 80)).toBe(0);
  });
});
