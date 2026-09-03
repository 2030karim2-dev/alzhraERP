/**
 * [AUDIT-FIX] توزيع خصم فاتورة على البنود بشكل تناسبي وتحويل أسعار الوحدات إلى
 * صافية قبل الإرسال إلى commit_sales_invoice_v2.
 *
 * الخلفية: دالة الاعتماد الخادمية لا تقبل `discount` إطلاقاً وتُهمله، فكان
 * الإجمالي المخزَّن أعلى من «الصافي» الذي تعرضه الواجهة. بتوزيع الخصم على
 * unit_price للبنود (بعد تقريب 4 منازل) يطابق المبلغ المخزَّن إجمالي الواجهة.
 */

export interface NetUnitLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const roundTo4 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

/**
 * توزيع الخصم الكلي على البنود بنسبة (قيمة البند / الإجمالي) مع سقف للخصم عند
 * قيمة الفاتورة كاملة (لا يمكن أن يصبح إجمالي البند سالباً).
 *
 * @returns نسخة جديدة من البنود بأسعار وحدات صافية (تُترك البنود بلا خصم كما هي)
 */
export const netUnitPrices = (
  items: readonly NetUnitLine[],
  invoiceDiscount: number
): NetUnitLine[] => {
  const safeDiscount =
    Number.isFinite(invoiceDiscount) && invoiceDiscount > 0 ? invoiceDiscount : 0;

  if (safeDiscount <= 0) return items.map(item => ({ ...item }));

  const subtotal = items.reduce((sum, item) => {
    const qty = item.quantity > 0 ? item.quantity : 0;
    const unit = item.unitPrice > 0 ? item.unitPrice : 0;
    return sum + qty * unit;
  }, 0);

  if (subtotal <= 0) return items.map(item => ({ ...item }));

  const cappedDiscount = Math.min(safeDiscount, subtotal);

  return items.map(item => {
    const qty = item.quantity > 0 ? item.quantity : 0;
    const unit = item.unitPrice > 0 ? item.unitPrice : 0;
    const lineGross = qty * unit;
    if (qty <= 0 || lineGross <= 0) return { ...item };
    const lineShare = lineGross / subtotal;
    const netLine = lineGross - cappedDiscount * lineShare;
    return { ...item, unitPrice: roundTo4(Math.max(0, netLine) / qty) };
  });
};
