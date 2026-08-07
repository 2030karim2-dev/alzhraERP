/**
 * SafeOptional — مرافق آمن للوصول إلى الخصائص
 * Usage: safe(sortConfig, 'direction', 'asc')
 */

/** آمن للوصول إلى خاصية قد تكون null/undefined */
export function safeAccess<T, K extends keyof NonNullable<T>>(
  obj: T,
  key: K,
  fallback: NonNullable<T>[K]
): NonNullable<T>[K] {
  if (obj == null) return fallback;
  const val = (obj as NonNullable<T>)[key];
  return val != null ? val : fallback;
}

/** فحص أن القيمة ليست null/undefined قبل الاستخدام */
export function isPresent<T>(value: T | null | undefined): value is NonNullable<T> {
  return value != null;
}

/** إرجاع القيمة الافتراضية إذا كانت null/undefined */
export function orDefault<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

export default { safeAccess, isPresent, orDefault };
