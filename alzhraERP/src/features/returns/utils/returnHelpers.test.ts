import { describe, it, expect } from 'vitest';
import {
    buildReturnItem,
    mergeReturnItem,
    removeReturnItem,
    setReturnQuantity,
    mapReturnStatus,
    sumReturnItems,
    totalReturnQuantity,
    hasReturnableItems,
    toReturnPayloadItems,
    type ReturnItemDraft
} from './returnHelpers';
import type { InvoiceItem } from '../types';

const makeInvoiceItem = (overrides: Partial<InvoiceItem> = {}): InvoiceItem => ({
    id: 'line-1',
    product_id: 'product-1',
    description: 'منتج تجريبي',
    quantity: 10,
    unit_price: 100,
    total: 1000,
    cost_price: 60,
    ...overrides,
});

describe('returnHelpers', () => {
    describe('buildReturnItem', () => {
        it('يستخدم معرف سطر الفاتورة كمفتاح موحد (وليس product_id)', () => {
            const item = buildReturnItem(makeInvoiceItem(), 3);
            expect(item.id).toBe('line-1');
            expect(item.productId).toBe('product-1');
            expect(item.returnQuantity).toBe(3);
            expect(item.maxQuantity).toBe(10);
        });

        it('يستخدم cost_price عند توفره ويكون 0 عند غيابه', () => {
            expect(buildReturnItem(makeInvoiceItem({ cost_price: 60 }), 1).costPrice).toBe(60);
            expect(buildReturnItem(makeInvoiceItem({ cost_price: undefined }), 1).costPrice).toBe(0);
        });

        it('يستخدم id كـ productId احتياطياً عندما يكون product_id فارغاً', () => {
            const item = buildReturnItem(makeInvoiceItem({ product_id: '' }), 2);
            expect(item.productId).toBe('line-1');
        });
    });

    describe('mergeReturnItem / removeReturnItem', () => {
        it('يمنع تكرار الصنف بالمفتاح الموحد', () => {
            const first = buildReturnItem(makeInvoiceItem(), 1);
            const duplicated = buildReturnItem(makeInvoiceItem(), 5);
            const merged = mergeReturnItem([first], duplicated);
            expect(merged).toHaveLength(1);
            expect(merged[0].returnQuantity).toBe(1);
        });

        it('يحذف الصنف بالمفتاح الموحد', () => {
            const items = [buildReturnItem(makeInvoiceItem(), 1), buildReturnItem(makeInvoiceItem({ id: 'line-2' }), 2)];
            const remaining = removeReturnItem(items, 'line-1');
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe('line-2');
        });
    });

    describe('setReturnQuantity', () => {
        it('يحدّث الكمية بالمفتاح الموحد id', () => {
            const items: ReturnItemDraft[] = [
                buildReturnItem(makeInvoiceItem(), 1),
                buildReturnItem(makeInvoiceItem({ id: 'line-2', product_id: 'product-2' }), 2),
            ];
            const updated = setReturnQuantity(items, 'line-1', 7);
            expect(updated.find(i => i.id === 'line-1')?.returnQuantity).toBe(7);
            expect(updated.find(i => i.id === 'line-2')?.returnQuantity).toBe(2);
        });

        it('لا يعدّل شيئاً إذا لم يوجد الصنف', () => {
            const items = [buildReturnItem(makeInvoiceItem(), 1)];
            const updated = setReturnQuantity(items, 'ghost', 5);
            expect(updated).toEqual(items);
        });
    });

    describe('mapReturnStatus', () => {
        it('يعيّن accepted -> posted', () => {
            expect(mapReturnStatus('accepted')).toBe('posted');
        });
        it('يعيّن rejected -> void', () => {
            expect(mapReturnStatus('rejected')).toBe('void');
        });
        it('يعيّن processing وأي قيمة أخرى -> draft', () => {
            expect(mapReturnStatus('processing')).toBe('draft');
            expect(mapReturnStatus('anything')).toBe('draft');
        });
    });

    describe('المجاميع', () => {
        const items: ReturnItemDraft[] = [
            buildReturnItem(makeInvoiceItem(), 3),
            buildReturnItem(makeInvoiceItem({ id: 'line-2', product_id: 'product-2', unit_price: 50 }), 2),
        ];

        it('sumReturnItems يجمع القيم', () => {
            expect(sumReturnItems(items)).toBe(3 * 100 + 2 * 50);
        });

        it('totalReturnQuantity يتجاهل القيم السالبة/الصفرية', () => {
            const withZero = [...items, buildReturnItem(makeInvoiceItem({ id: 'line-3' }), 0)];
            expect(totalReturnQuantity(withZero)).toBe(5);
        });

        it('hasReturnableItems يفحص وجود كمية صالحة', () => {
            expect(hasReturnableItems(items)).toBe(true);
            expect(hasReturnableItems([buildReturnItem(makeInvoiceItem(), 0)])).toBe(false);
            expect(hasReturnableItems([])).toBe(false);
        });
    });

    describe('toReturnPayloadItems', () => {
        it('يحوّل أصناف camelCase إلى snake_case مع حساب line_total', () => {
            const payload = toReturnPayloadItems([
                { productId: 'product-1', name: 'منتج واحد', quantity: 3, unitPrice: 100, costPrice: 60 },
            ]);
            expect(payload).toEqual([
                { product_id: 'product-1', name: 'منتج واحد', quantity: 3, unit_price: 100, cost_price: 60, line_total: 300 },
            ]);
        });

        it('يدعم مفاتيح snake_case كاحتياط ويملأ القيم الناقصة بالأصفار', () => {
            const payload = toReturnPayloadItems([
                { product_id: 'product-2', quantity: 2, unit_price: 50 },
            ]);
            expect(payload[0]).toEqual({
                product_id: 'product-2',
                name: 'product-2',
                quantity: 2,
                unit_price: 50,
                cost_price: 0,
                line_total: 100,
            });
        });

        it('يستخدم returnQuantity عندما تكون quantity غير متاحة', () => {
            const payload = toReturnPayloadItems([
                { productId: 'product-3', returnQuantity: 7, unitPrice: 10 },
            ]);
            expect(payload[0]).toEqual({
                product_id: 'product-3',
                name: 'product-3',
                quantity: 7,
                unit_price: 10,
                cost_price: 0,
                line_total: 70,
            });
        });

        it('يعيد مصفوفة فارغة عند غياب الأصناف', () => {
            expect(toReturnPayloadItems(undefined as never)).toEqual([]);
            expect(toReturnPayloadItems([])).toEqual([]);
        });
    });
});
