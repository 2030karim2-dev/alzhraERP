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
 * الحالة التي ستُكتب في قاعدة البيانات عند toggle_company_status
 * (تطابق منطق الترحيل 20260904000001) — تُستخدم للعرض التفاؤلي المحلي فقط،
 * ويبقى الخادم مصدر الحقيقة النهائي بعد إعادة الجلب.
 */
export const deriveStatusAfterToggle = (
  company: Pick<AdminCompany, 'subscription_status' | 'plan_id' | 'trial_ends_at'>,
  nextActive: boolean
): AdminCompany['subscription_status'] => {
  if (!nextActive) return 'suspended';

  // إعادة التفعيل تستعيد الحالة الأكثر دلالة بدلاً من فرض active ومسح التجربة
  const prev = company.subscription_status;
  if (prev !== 'suspended' && prev !== 'active') return prev;

  if (company.plan_id !== null) return 'active';

  if (company.trial_ends_at !== null && new Date(company.trial_ends_at).getTime() > Date.now()) {
    return 'trial';
  }

  return 'active';
};

const SUBSCRIPTION_STATUS_LABELS: Record<AdminCompany['subscription_status'], string> = {
  trial: 'تجريبية',
  active: 'نشطة',
  past_due: 'متأخرة السداد',
  cancelled: 'ملغاة',
  suspended: 'موقوفة',
};

/** تسمية عربية موحّدة لحالة الاشتراك (بدل الرموز الإنجليزية داخل الواجهة). */
export const subscriptionStatusLabel = (
  status: AdminCompany['subscription_status']
): string => SUBSCRIPTION_STATUS_LABELS[status];

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
