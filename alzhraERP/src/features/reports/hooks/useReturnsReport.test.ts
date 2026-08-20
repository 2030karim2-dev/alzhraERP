import { describe, it, expect } from 'vitest';
import { normalizeSalesReturn, normalizePurchaseReturn } from './returnsNormalizers';
import type { SalesReturn } from '../../sales/hooks/useSalesReturns';

describe('normalizers المرتجعات', () => {
    const salesSample: SalesReturn = {
        id: 'ret-1',
        invoice_number: 'R-001',
        issue_date: '2026-08-01',
        total_amount: 500,
        status: 'posted',
        notes: 'ملاحظة',
        exchange_rate: 1,
        reference_invoice_id: 'inv-9',
        party: { id: 'p-1', name: 'عميل' },
        invoice_items: [{ id: 'li-1', product_id: 'pr-1', description: 'صنف', quantity: 2, unit_price: 250, total: 500 }],
        created_at: '2026-08-01T10:00:00Z',
    };

    it('normalizeSalesReturn يحوّل سجل المبيعات للنوع الموحد مع return_reason null', () => {
        const row = normalizeSalesReturn(salesSample);
        expect(row.id).toBe('ret-1');
        expect(row.invoice_number).toBe('R-001');
        expect(row.party).toEqual({ name: 'عميل' });
        expect(row.return_reason).toBeNull();
        expect(row.exchange_rate).toBe(1);
        expect(row.invoice_items).toHaveLength(1);
    });

    it('normalizeSalesReturn يتعامل مع القيم الناقصة بأمان', () => {
        const row = normalizeSalesReturn({
            ...salesSample,
            notes: undefined,
            exchange_rate: null,
            party: null,
        });
        expect(row.notes).toBeNull();
        expect(row.exchange_rate).toBeNull();
        expect(row.party).toBeNull();
    });

    it('normalizePurchaseReturn يحوّل سجل المشتريات (created_at = issue_date)', () => {
        const purchaseSample = {
            id: 'pr-1',
            invoice_number: 'P-001',
            issue_date: '2026-08-02',
            total_amount: 800,
            status: 'posted',
            type: 'purchase_return',
            payment_method: 'cash',
            currency_code: 'SAR',
            exchange_rate: 1,
            party: { name: 'مورد' },
            invoice_items: [{ id: 'li-9', cost_price: 100 }],
        };
        const row = normalizePurchaseReturn(purchaseSample);
        expect(row.id).toBe('pr-1');
        expect(row.created_at).toBe('2026-08-02'); // fallback إلى issue_date
        expect(row.return_reason).toBeNull();
        expect(row.notes).toBeNull();
        expect(row.party).toEqual({ name: 'مورد' });
    });
});
