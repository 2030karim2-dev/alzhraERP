// ============================================================
// دوال مساعدة نقية لنظام المرتجعات
// تهدف إلى توحيد منطق بناء عناصر المرتجع ومعالجة الكميات
// والمفاتيح المستخدمة (مفتاح موحد = id سطر الفاتورة)
// ============================================================

import type { InvoiceItem } from '../types';

export interface ReturnItemDraft {
    /** المفتاح الموحد = معرّف سطر الفاتورة (invoice_items.id) */
    id: string;
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    returnQuantity: number;
    maxQuantity: number;
}

/**
 * بناء عنصر مرتجع من سطر فاتورة مع كمية الإرجاع.
 * المفتاح الموحد هو `invoiceItem.id` (معرّف سطر الفاتورة) وليس
 * `product_id` لأن معرّف السطر فريد داخل الفاتورة بينما قد يتكرر المنتج.
 */
export const buildReturnItem = (invoiceItem: InvoiceItem, returnQuantity: number): ReturnItemDraft => ({
    id: invoiceItem.id,
    productId: invoiceItem.product_id || invoiceItem.id,
    name: invoiceItem.description,
    quantity: invoiceItem.quantity,
    unitPrice: invoiceItem.unit_price,
    costPrice: invoiceItem.cost_price ?? 0,
    returnQuantity,
    maxQuantity: invoiceItem.quantity,
});

/** إضافة عنصر مع منع التكرار (بالمفتاح الموحد). */
export const mergeReturnItem = (items: ReturnItemDraft[], item: ReturnItemDraft): ReturnItemDraft[] => {
    if (items.some(i => i.id === item.id)) return items;
    return [...items, item];
};

/** حذف عنصر بالمفتاح الموحد. */
export const removeReturnItem = (items: ReturnItemDraft[], itemId: string): ReturnItemDraft[] =>
    items.filter(i => i.id !== itemId);

/** تحديث كمية الإرجاع لعنصر بالمفتاح الموحد. */
export const setReturnQuantity = (items: ReturnItemDraft[], itemId: string, quantity: number): ReturnItemDraft[] =>
    items.map(i => (i.id === itemId ? { ...i, returnQuantity: quantity } : i));

/**
 * تحويل حالة النموذج (قيم واجهة المستخدم) إلى حالة قاعدة البيانات:
 * accepted -> posted ، rejected -> void ، processing -> draft
 */
export const mapReturnStatus = (status: string): 'posted' | 'draft' | 'void' => {
    if (status === 'accepted') return 'posted';
    if (status === 'rejected') return 'void';
    return 'draft';
};

/** إجمالي قيمة الأصناف المحددة للإرجاع. */
export const sumReturnItems = (items: ReturnItemDraft[]): number =>
    items.reduce((sum, item) => sum + item.returnQuantity * item.unitPrice, 0);

/** إجمالي كمية الأصناف المحددة للإرجاع. */
export const totalReturnQuantity = (items: ReturnItemDraft[]): number =>
    items.reduce((sum, item) => sum + (item.returnQuantity > 0 ? item.returnQuantity : 0), 0);

/** هل توجد أي كمية إرجاع صالحة؟ */
export const hasReturnableItems = (items: ReturnItemDraft[]): boolean =>
    items.some(item => item.returnQuantity > 0);

/**
 * تحويل أصناف المرتجع (على شكل الواجهة) إلى صيغة `p_items` المطلوبة من الـ RPCs
 * (snake_case: product_id, quantity, unit_price, cost_price, line_total).
 * يدعم مفاتيح camelCase (ReturnItemDraft) و snake_case كاحتياط للتوافق،
 * ويحسب line_total تلقائياً لحفظ القيم المالية بشكل صحيح.
 */
export const toReturnPayloadItems = (items: Array<{
    productId?: string;
    product_id?: string;
    quantity?: number;
    returnQuantity?: number;
    unitPrice?: number;
    unit_price?: number;
    costPrice?: number;
    cost_price?: number;
}>): Array<Record<string, number | string>> => {
    return (items ?? []).map((item) => {
        const quantity = Number(item.quantity ?? item.returnQuantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
        return {
            product_id: item.productId ?? item.product_id ?? '',
            quantity,
            unit_price: unitPrice,
            cost_price: Number(item.costPrice ?? item.cost_price ?? 0),
            line_total: quantity * unitPrice,
        };
    });
};
