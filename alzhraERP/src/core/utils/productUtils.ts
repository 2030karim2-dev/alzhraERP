/**
 * أدوات مساعدة مركزية للمنتجات وبنود الفواتير والمعاملات
 * تضمن استخراج أسماء ورموز الأصناف وفق أولويات صارمة
 * وتمنع نهائياً تسريب معرّفات الـ UUID الخام في الواجهات أو الطباعة أو التقارير.
 */

/**
 * فحص ما إذا كانت القيمة عبارة عن UUID خام (مثل: 51e12d3b-6709-40c2-99ae-80cd03e6f562)
 */
export const isRawUuid = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

export interface DisplayableItemInput {
  name?: string | null;
  description?: string | null;
  product?: {
    name_ar?: string | null;
    name?: string | null;
    sku?: string | null;
    part_number?: string | null;
    brand?: string | null;
  } | null;
  product_id?: string | null;
  productId?: string | null;
  sku?: string | null;
  part_number?: string | null;
  partNumber?: string | null;
}

/**
 * استخراج الاسم المعروض للصنف بسلسلة أولويات ذكية ومحمية ضد الـ UUID:
 * 1. الاسم العربي المعتمد من جدول المنتجات (product.name_ar أو product.name)
 * 2. اسم السطر المباشر (item.name) إذا لم يكن UUID
 * 3. وصف السطر (item.description) إذا لم يكن UUID
 * 4. رقم القطعة أو رمز SKU كبديل تعريفي
 * 5. نص بديل 'صنف بدون اسم'
 */
export const getDisplayItemName = (
  item?: DisplayableItemInput | null,
  fallback = 'صنف بدون اسم'
): string => {
  if (!item) return fallback;

  // 1. اسم المنتج المعتمد من جدول المنتجات
  const productName = item.product?.name_ar || item.product?.name;
  if (
    productName &&
    typeof productName === 'string' &&
    productName.trim().length > 0 &&
    !isRawUuid(productName)
  ) {
    return productName.trim();
  }

  // 2. اسم السطر المباشر إن وُجد ولم يكن UUID
  if (
    item.name &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    !isRawUuid(item.name)
  ) {
    return item.name.trim();
  }

  // 3. وصف السطر إن وُجد ولم يكن UUID
  if (
    item.description &&
    typeof item.description === 'string' &&
    item.description.trim().length > 0 &&
    !isRawUuid(item.description)
  ) {
    return item.description.trim();
  }

  // 4. رقم القطعة أو رمز الصنف إذا لم يتوفر اسم
  const partNumber = item.product?.part_number || item.part_number || item.partNumber;
  if (
    partNumber &&
    typeof partNumber === 'string' &&
    partNumber.trim().length > 0 &&
    !isRawUuid(partNumber)
  ) {
    return partNumber.trim();
  }

  const sku = item.product?.sku || item.sku;
  if (sku && typeof sku === 'string' && sku.trim().length > 0 && !isRawUuid(sku)) {
    return sku.trim();
  }

  return fallback;
};

/**
 * استخراج الرمز أو رقم القطعة المعروض للصنف
 */
export const getDisplayItemCode = (
  item?: DisplayableItemInput | null,
  fallback = '---'
): string => {
  if (!item) return fallback;

  const candidate =
    item.product?.part_number ||
    item.part_number ||
    item.partNumber ||
    item.product?.sku ||
    item.sku;

  if (
    candidate &&
    typeof candidate === 'string' &&
    candidate.trim().length > 0 &&
    !isRawUuid(candidate)
  ) {
    return candidate.trim();
  }

  return fallback;
};
