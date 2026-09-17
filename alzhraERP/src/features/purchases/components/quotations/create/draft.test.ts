import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftStorage } from '../../../../../core/utils/draftStorage';
import {
  buildQuotationDraftKey,
  createEmptyItemRow,
  isQuotationDraftDirty,
  restoreQuotationDraft,
  type PurchaseQuotationDraft,
} from './draft';

const key = 'purchase_quotation:company:user:general';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 17, 0, 30));
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('quotation draft restoration', () => {
  it('separates keys by company, user and RFQ', () => {
    expect(buildQuotationDraftKey(undefined, 'user', 'rfq')).toBeNull();
    expect(buildQuotationDraftKey('', 'user', 'rfq')).toBeNull();
    expect(buildQuotationDraftKey('company', undefined, undefined)).toBe(
      'purchase_quotation:company'
    );
    expect(buildQuotationDraftKey('company', 'user', undefined)).toBe(key);
    expect(buildQuotationDraftKey('company', 'user', 'rfq')).toBe(
      'purchase_quotation:company:user:rfq:rfq'
    );
    expect(buildQuotationDraftKey('other', 'user', undefined)).not.toBe(key);
    expect(buildQuotationDraftKey('company', 'other', undefined)).not.toBe(key);
  });

  it('uses the local calendar date and a fresh empty row without a draft', () => {
    const restored = restoreQuotationDraft(null);
    expect(restored).toMatchObject({
      hasDraft: false,
      issueDate: '2026-09-17',
      currencyCode: 'SAR',
      party: null,
    });
    expect(restored.items).toEqual([createEmptyItemRow()]);
    expect(restored.items[0]).not.toBe(restoreQuotationDraft(null).items[0]);
  });

  it('restores all saved fields without changing currency, discounts or dates', () => {
    const saved: PurchaseQuotationDraft = {
      items: [
        {
          ...createEmptyItemRow(),
          description: 'قطعة',
          quantity: 3,
          unitPrice: 410,
          discountPercent: 5,
        },
      ],
      partyId: 'supplier',
      partyName: 'المورد',
      partyPhone: '123',
      issueDate: '2026-09-16',
      currencyCode: 'YER',
      deliveryTerms: 'غداً',
      paymentTerms: 'نقداً',
      notes: 'ملاحظة',
    };
    draftStorage.save(key, saved);
    expect(restoreQuotationDraft(key)).toEqual({
      hasDraft: true,
      items: saved.items,
      party: { id: 'supplier', name: 'المورد', phone: '123' },
      issueDate: saved.issueDate,
      currencyCode: 'YER',
      deliveryTerms: 'غداً',
      paymentTerms: 'نقداً',
      notes: 'ملاحظة',
    });
  });

  it('fills missing legacy fields and does not select an unnamed supplier', () => {
    draftStorage.save(key, { items: [], partyId: 'supplier' });
    expect(restoreQuotationDraft(key)).toMatchObject({
      hasDraft: true,
      party: null,
      currencyCode: 'SAR',
      items: [createEmptyItemRow()],
    });
  });

  it('falls back safely for invalid JSON', () => {
    localStorage.setItem(`alz_draft_${key}`, '{broken');
    expect(restoreQuotationDraft(key).hasDraft).toBe(false);
  });

  it('does not treat whitespace-only content as a draft', () => {
    const snapshot = {
      items: [{ ...createEmptyItemRow(), description: '  ' }],
      party: null,
      notes: ' ',
      deliveryTerms: '',
      paymentTerms: '',
    };
    expect(isQuotationDraftDirty(snapshot)).toBe(false);
    expect(isQuotationDraftDirty({ ...snapshot, notes: 'ملاحظة' })).toBe(true);
    expect(
      isQuotationDraftDirty({
        ...snapshot,
        items: [{ ...createEmptyItemRow(), productId: 'product' }],
      })
    ).toBe(true);
  });
});
