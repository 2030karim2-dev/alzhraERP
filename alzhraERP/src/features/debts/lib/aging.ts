/**
 * شرائح أعمار الديون — وحدة نقية مشتركة بين بطاقة النظرة العامة
 * وفلتر لوحة المتابعة وتقرير التقادم في Reports.
 *
 * **المصدر المرجعي للأرقام هو الخادم** (`days_overdue = CURRENT_DATE - due_date`
 * داخل `get_debt_followup_dashboard`): هذه الدوال لا تُعيد حساب الفرق الزمني
 * من كائنات `Date` في المتصفح (توقيت محلي ± انزياح UTC)، بل تُصنّف فقط
 * قيمة `days_overdue` الجاهزة القادمة من الـ RPC في الشريحة الصحيحة.
 * تسميات الشرائح مطابقة لتقرير التقادم في Reports.
 */

export type AgingKey = 'b0_30' | 'b31_60' | 'b61_90' | 'b90_plus';

export const AGING_ORDER: AgingKey[] = ['b0_30', 'b31_60', 'b61_90', 'b90_plus'];

export interface AgingMeta {
  label: string;
  /** أربع درجات لونية متوافقة مع لوحة ألوان تقرير التقادم. */
  colorClass: string;
  barClass: string;
}

export const AGING_META: Record<AgingKey, AgingMeta> = {
  b0_30: {
    label: 'حالية (0-30)',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
  },
  b31_60: {
    label: 'متأخرة (31-60)',
    colorClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'bg-amber-500',
  },
  b61_90: {
    label: 'متأخرة (61-90)',
    colorClass: 'text-orange-600 dark:text-orange-400',
    barClass: 'bg-orange-500',
  },
  b90_plus: {
    label: 'حرجة (+90)',
    colorClass: 'text-rose-600 dark:text-rose-400',
    barClass: 'bg-rose-500',
  },
};

/** شريحة أيام التأخير — حدّ أعلى شامل (0-30 · 31-60 · 61-90 · +90). */
export const bucketForDays = (days: number | null | undefined): AgingKey => {
  const d = days ?? 0;
  if (!Number.isFinite(d) || d <= 30) return 'b0_30';
  if (d <= 60) return 'b31_60';
  if (d <= 90) return 'b61_90';
  return 'b90_plus';
};

/** lookup آمن بالخريطة — يمنع تنبيهات فهرسة الكائنات بمفتاح متغيّر. */
const AGING_META_BY_KEY = new Map<AgingKey, AgingMeta>([
  ['b0_30', AGING_META.b0_30],
  ['b31_60', AGING_META.b31_60],
  ['b61_90', AGING_META.b61_90],
  ['b90_plus', AGING_META.b90_plus],
]);

export const getAgingMeta = (key: AgingKey): AgingMeta =>
  AGING_META_BY_KEY.get(key) ?? AGING_META.b0_30;

/** هل المدخل مفتاح شريحة صالح (يُستخدم في قراءة فلتر الرابط)؟ */
export const isAgingKey = (value: string | null | undefined): value is AgingKey =>
  value === 'b0_30' || value === 'b31_60' || value === 'b61_90' || value === 'b90_plus';
