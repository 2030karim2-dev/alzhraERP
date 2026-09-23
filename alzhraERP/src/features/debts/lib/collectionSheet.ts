/**
 * ورقة التحصيل الميداني — بناء CSV نقي من صفوف المتابعة.
 * تُصدَّر بـ BOM ليفتح Excel الملف بترميز UTF-8 صحيح (عربية سليمة).
 */
import type { FollowUpDashboardRow } from '../types';
import { classificationLabel, escalationLabel, reminderStatusLabel } from './constants';

const CSV_HEADERS = [
  'العميل',
  'الهاتف',
  'العملة',
  'الرصيد',
  'المتأخر',
  'أقدم استحقاق',
  'أيام التأخير',
  'التصنيف',
  'مرحلة التصعيد',
  'حالة التذكير',
  'آخر تذكير',
  'وعود قائمة',
  'مبلغ الوعود',
] as const;

/** تهيئة حقل CSV: تغليف بعلامات اقتباس عند وجود فاصلة/اقتباس/سطر جديد. */
const csvCell = (value: string | number | null | undefined): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** خلايا صف واحد بترتيب الترويسة (منفصلة لخفض التعقيد ومنع التحويلات الزائدة). */
const buildRowCells = (row: FollowUpDashboardRow): Array<string | number> => [
  row.party_name,
  row.party_phone ?? '',
  row.currency_code,
  row.outstanding_balance.toFixed(2),
  row.overdue_amount.toFixed(2),
  row.oldest_due_date ?? '',
  row.days_overdue,
  classificationLabel(row.classification),
  escalationLabel(row.escalation_stage),
  reminderStatusLabel(row.reminder_status),
  row.last_reminded_at !== null ? row.last_reminded_at.slice(0, 10) : '',
  row.pending_promise_count,
  row.pending_promise_amount.toFixed(2),
];

export const buildCollectionSheetCsv = (rows: FollowUpDashboardRow[]): string => {
  const lines = rows.map(row => buildRowCells(row).map(csvCell).join(','));

  return `\uFEFF${[CSV_HEADERS.join(','), ...lines].join('\r\n')}`;
};

/** اسم ملف الورقة بصيغة آمنة (بلا رموز ممنوعة في أنظمة الملفات). */
export const collectionSheetFileName = (
  date: string = new Date().toISOString().slice(0, 10)
): string => `collection-sheet-${date}.csv`;
