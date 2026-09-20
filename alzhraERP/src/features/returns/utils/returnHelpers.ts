// ============================================================
// دوال مساعدة نقية لنظام المرتجعات
// تهدف إلى توحيد منطق بناء عناصر المرتجع ومعالجة الكميات
// والمفاتيح المستخدمة (مفتاح موحد = id سطر الفاتورة)
// ============================================================

import type { InvoiceItem } from '../types';

/** فحص ما إذا كانت السلسلة النصية عبارة عن UUID خام */
export const isUuid = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * استخراج الاسم المعروض للصنف بسلسلة أولويات ذكية:
 * 1. الاسم العربي المعتمد من جدول المنتجات p.name_ar
 * 2. اسم السطر إذا لم يكن UUID
 * 3. وصف السطر إذا لم يكن UUID
 * 4. رقم القطعة أو رمز الصنف
 * 5. نص بديل 'صنف بدون اسم'
 */
export const getItemDisplayName = (item: {
  description?: string | null;
  name?: string | null;
  product?: {
    name_ar?: string | null;
    sku?: string | null;
    part_number?: string | null;
    brand?: string | null;
  } | null;
}): string => {
  if (item.product?.name_ar && item.product.name_ar.trim().length > 0) {
    return item.product.name_ar.trim();
  }
  if (item.name && item.name.trim().length > 0 && !isUuid(item.name)) {
    return item.name.trim();
  }
  if (item.description && item.description.trim().length > 0 && !isUuid(item.description)) {
    return item.description.trim();
  }
  if (item.product?.part_number && item.product.part_number.trim().length > 0) {
    return item.product.part_number.trim();
  }
  if (item.product?.sku && item.product.sku.trim().length > 0) {
    return item.product.sku.trim();
  }
  return 'صنف بدون اسم';
};

/**
 * استخراج الكود المعروض للصنف (رقم القطعة أو SKU بدلاً من UUID)
 */
export const getItemDisplayCode = (item: {
  product_id?: string | null;
  productId?: string | null;
  product?: {
    part_number?: string | null;
    sku?: string | null;
  } | null;
}): string => {
  if (item.product?.part_number && item.product.part_number.trim().length > 0) {
    return item.product.part_number.trim();
  }
  if (item.product?.sku && item.product.sku.trim().length > 0) {
    return item.product.sku.trim();
  }
  const pid = item.productId || item.product_id;
  if (pid && !isUuid(pid)) {
    return pid;
  }
  return '-';
};

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
  product?: InvoiceItem['product'];
}

/**
 * بناء عنصر مرتجع من سطر فاتورة مع كمية الإرجاع.
 * المفتاح الموحد هو `invoiceItem.id` (معرّف سطر الفاتورة) وليس
 * `product_id` لأن معرّف السطر فريد داخل الفاتورة بينما قد يتكرر المنتج.
 */
export const buildReturnItem = (
  invoiceItem: InvoiceItem,
  returnQuantity: number
): ReturnItemDraft => ({
  id: invoiceItem.id,
  productId: invoiceItem.product_id || invoiceItem.id,
  name: getItemDisplayName(invoiceItem),
  quantity: invoiceItem.quantity,
  unitPrice: invoiceItem.unit_price,
  costPrice: invoiceItem.cost_price ?? 0,
  returnQuantity,
  maxQuantity: invoiceItem.quantity,
  product: invoiceItem.product,
});

/** إضافة عنصر مع منع التكرار (بالمفتاح الموحد). */
export const mergeReturnItem = (
  items: ReturnItemDraft[],
  item: ReturnItemDraft
): ReturnItemDraft[] => {
  if (items.some(i => i.id === item.id)) return items;
  return [...items, item];
};

/** حذف عنصر بالمفتاح الموحد. */
export const removeReturnItem = (items: ReturnItemDraft[], itemId: string): ReturnItemDraft[] =>
  items.filter(i => i.id !== itemId);

/** تحديث كمية الإرجاع لعنصر بالمفتاح الموحد مع كبح الكمية بسقف الكمية المباعة. */
export const setReturnQuantity = (
  items: ReturnItemDraft[],
  itemId: string,
  quantity: number
): ReturnItemDraft[] =>
  items.map(i =>
    i.id === itemId ? { ...i, returnQuantity: Math.min(Math.max(0, quantity), i.maxQuantity) } : i
  );

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
export const toReturnPayloadItems = (
  items: Array<{
    productId?: string;
    product_id?: string;
    name?: string;
    quantity?: number;
    returnQuantity?: number;
    unitPrice?: number;
    unit_price?: number;
    costPrice?: number;
    cost_price?: number;
  }>
): Array<Record<string, number | string>> => {
  return (items ?? []).map(item => {
    const quantity = Number(item.quantity ?? item.returnQuantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    const productId = item.productId ?? item.product_id ?? '';
    return {
      product_id: productId,
      name: item.name ?? productId,
      quantity,
      unit_price: unitPrice,
      cost_price: Number(item.costPrice ?? item.cost_price ?? 0),
      line_total: quantity * unitPrice,
    };
  });
};
