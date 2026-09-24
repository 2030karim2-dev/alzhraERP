/**
 * Date-bucket helpers — حساب فرق الأيام بدلالة التاريخ المحلي (YYYY-MM-DD)
 * بلا كائنات `Date` ولا انزياح UTC ليلاً في GMT+2/+3.
 *
 * **الاستخدام:** تقرير التقادم (Reports/DebtAgingReport) وفلتر شرائح المتابعة
 * في الديون يشتركان في `bucketForDays` من `debts/lib/aging` للحدود، وهذه
 * الدوال توفّر حساب `daysDiff` المحلي المتوافق مع `CURRENT_DATE - due_date`
 * في الخادم (H-3: مصدر واحد للحدود 30/60/90 في كامل الواجهة).
 */

/** يحوّل مفتاح تاريخ (YYYY-MM-DD أو ISO) إلى عدد الأيام منذ الحقبة (UTC date-only). */
const toDayNumber = (value: string): number | null => {
  const datePart = value.length >= 10 ? value.slice(0, 10) : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

/**
 * فرق الأيام (اليوم المحلي − تاريخ الاستحقاق) بدلالة date-only:
 * موجب = متأخر، سالب = لم يحن بعد. تاريخ غير صالح → 0 (شريحة «حالية»).
 */
export const daysDiffLocal = (dueKey: string, todayKey: string): number => {
  const due = toDayNumber(dueKey);
  const today = toDayNumber(todayKey);
  if (due === null || today === null) return 0;
  return today - due;
};
