import { describe, expect, it } from 'vitest';
import {
  validateInvoiceItems,
  validateSalePayload,
  validatePurchasePayload,
  assertValid,
} from './validationUtils';

describe('validateInvoiceItems', () => {
  it('rejects an empty items list', () => {
    const errors = validateInvoiceItems([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('items');
    expect(errors[0].message).toContain('يجب إضافة صنف واحد');
  });

  it('rejects an item without a product', () => {
    const errors = validateInvoiceItems([{ quantity: 1, unitPrice: 100 }]);
    expect(errors.some(e => e.field === 'items[0].productId')).toBe(true);
  });

  it('rejects zero or negative quantity', () => {
    expect(validateInvoiceItems([{ productId: 'p1', quantity: 0, unitPrice: 100 }])).toHaveLength(1);
    expect(validateInvoiceItems([{ productId: 'p1', quantity: -3, unitPrice: 100 }])).toHaveLength(1);
  });

  it('rejects a negative price', () => {
    const errors = validateInvoiceItems([{ productId: 'p1', quantity: 1, unitPrice: -5 }]);
    expect(errors.some(e => e.field === 'items[0].price')).toBe(true);
  });

  it('passes a valid item', () => {
    expect(validateInvoiceItems([{ productId: 'p1', quantity: 2, unitPrice: 50 }])).toHaveLength(0);
  });
});

describe('validateSalePayload', () => {
  it('requires a payment method', () => {
    const errors = validateSalePayload({ items: [{ productId: 'p1', quantity: 1, unitPrice: 100 }] });
    expect(errors.some(e => e.field === 'paymentMethod')).toBe(true);
  });

  it('passes a complete sale payload', () => {
    expect(
      validateSalePayload({ items: [{ productId: 'p1', quantity: 1, unitPrice: 100 }], paymentMethod: 'cash' })
    ).toHaveLength(0);
  });
});

describe('validatePurchasePayload', () => {
  it('requires an issue date', () => {
    const errors = validatePurchasePayload({ items: [{ productId: 'p1', quantity: 1, costPrice: 80 }] });
    expect(errors.some(e => e.field === 'issueDate')).toBe(true);
  });

  it('passes a complete purchase payload', () => {
    expect(
      validatePurchasePayload({ items: [{ productId: 'p1', quantity: 1, costPrice: 80 }], issueDate: '2026-08-20' })
    ).toHaveLength(0);
  });
});

describe('assertValid', () => {
  it('throws when there are validation errors', () => {
    expect(() => assertValid([{ field: 'items', message: 'خطأ في التحقق' }])).toThrow(/خطأ في التحقق/);
  });

  it('does not throw when the payload is valid', () => {
    expect(() => assertValid([])).not.toThrow();
  });
});
