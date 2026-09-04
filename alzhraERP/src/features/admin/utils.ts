import type { AdminCompany } from './types';

/**
 * حساب نسبة التوفير من الكاش لخدمات الذكاء الاصطناعي
 * النسبة = hits / (misses + hits)
 */
const asPositive = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export const calcCacheHitRate = (totalRequests: number, cacheHits: number): number => {
  const requests = asPositive(totalRequests);
  const hits = asPositive(cacheHits);
  const total = requests + hits;
  return total > 0 ? Math.round((hits / total) * 100) : 0;
};

/**
 * هل الفترة التجريبية لا تزال سارية؟
 * (تطابق منطق الخادم في 20260904000007 — تجربة منتهية أو غير محددة ليست "حية")
 */
const isTrialLive = (trial_ends_at: string | null): boolean =>
  trial_ends_at !== null && new Date(trial_ends_at).getTime() > Date.now();

const deriveInactiveStatus = (
  prev: AdminCompany['subscription_status']
): AdminCompany['subscription_status'] =>
  prev === 'cancelled' || prev === 'past_due' ? prev : 'suspended';

const deriveActiveStatus = (
  company: Pick<AdminCompany, 'plan_id' | 'trial_ends_at'>
): AdminCompany['subscription_status'] => {
  if (company.plan_id !== null) return 'active';
  if (company.trial_ends_at !== null) {
    return isTrialLive(company.trial_ends_at) ? 'trial' : 'past_due';
  }
  return 'active';
};

/**
 * الحالة التي ستُكتب في قاعدة البيانات عند toggle_company_status
 * (تطابق منطق الترحيلين 20260904000001 و 20260904000007 مع تحسين
 * 20260904000009) — تُستخدم للعرض التفاؤلي المحلي فقط، ويبقى الخادم مصدر
 * الحقيقة النهائي بعد إعادة الجلب.
 */
export const deriveStatusAfterToggle = (
  company: Pick<AdminCompany, 'subscription_status' | 'plan_id' | 'trial_ends_at'>,
  nextActive: boolean
): AdminCompany['subscription_status'] => {
  const prev = company.subscription_status;

  if (!nextActive) {
    return deriveInactiveStatus(prev);
  }

  if (prev !== 'suspended' && prev !== 'active') {
    if (prev === 'trial' && !isTrialLive(company.trial_ends_at)) return 'past_due';
    return prev;
  }

  return deriveActiveStatus(company);
};

/**
 * هل يُسمح بتمديد الفترة التجريبية لهذه المنشأة؟
 * الشرط: المنشأة نشطة (`is_active`) وحالتها ليست موقوفة أو ملغاة — إعادة
 * تفعيل المنشأة قرار مستقل عبر toggle_company_status، ولا يجوز أن يعيد
 * "تمديد التجربة" تفعيل منشأة معلّقة/ملغاة تلقائياً (تطابق الخادم في
 * 20260904000009).
 */
export const canExtendCompanyTrial = (
  company: Pick<AdminCompany, 'is_active' | 'subscription_status'>
): boolean =>
  company.is_active &&
  company.subscription_status !== 'cancelled' &&
  company.subscription_status !== 'suspended';

/** تسمية عربية موحّدة لحالة الاشتراك (بدل الرموز الإنجليزية داخل الواجهة). */
export const subscriptionStatusLabel = (status: AdminCompany['subscription_status']): string => {
  switch (status) {
    case 'trial':
      return 'تجريبية';
    case 'active':
      return 'نشطة';
    case 'past_due':
      return 'متأخرة السداد';
    case 'cancelled':
      return 'ملغاة';
    case 'suspended':
      return 'موقوفة';
    default:
      return status;
  }
};

/**
 * تسمية العرض النهائية لمنشأة في واجهة الإدارة:
 * - النشطة تعرض حالتها الفعلية (نشطة/تجريبية/متأخرة/ملغاة).
 * - غير النشطة التي حالتها 'active'/'trial' (قيم قديمة/حدودية) تُعرض "موقوفة"،
 *   أما غير النشطة بحالة ملغاة/متأخرة محفوظة فتعرض حالتها الحقيقية (ملغاة/متأخرة)
 *   مع أيقونة حظر — تطابق دلالات toggle_company_status بعد 20260904000009.
 */
export const companyStatusLabel = (
  company: Pick<AdminCompany, 'is_active' | 'subscription_status'>
): string => {
  if (!company.is_active) {
    if (company.subscription_status === 'active' || company.subscription_status === 'trial') {
      return 'موقوفة';
    }
    return subscriptionStatusLabel(company.subscription_status);
  }
  return subscriptionStatusLabel(company.subscription_status);
};

const escapeCsvCell = (cell: string | number | null | undefined): string => {
  if (cell === null || cell === undefined) return '';
  const text = String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * بناء ملف CSV مع BOM (حتى يفتح Excel العربي بشكل صحيح).
 */
export const toCsv = (
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string => {
  const lines: string[] = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
};

/**
 * تنزيل محتوى CSV عبر Blob في المتصفح.
 */
export const downloadCsvFile = (fileName: string, csvContent: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * تحويل تاريخ ISO (UTC) إلى قيمة صالحة لحقل <input type="datetime-local">
 * بتوقيت المتصفح المحلي. (toISOString يعيد UTC دائماً؛ استخدامه مباشرة في
 * الحقل كان يسبب انحرافاً مضاعفاً للمنطقة الزمنية عند كل فتح/حفظ).
 */
export const toLocalDateTimeInputValue = (iso: string | null | undefined): string => {
  if (iso === null || iso === undefined || iso.trim() === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${String(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
};

/**
 * تحويل قيمة حقل datetime-local (تُفسَّر كتوقيت محلي وفق مواصفة ES) إلى ISO/UTC.
 * يعيد null عند الفراغ أو قيمة غير صالحة.
 */
export const localDateTimeInputValueToIso = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value.trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
