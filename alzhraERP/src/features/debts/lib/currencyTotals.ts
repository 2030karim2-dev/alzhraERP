/**
 * مجاميع الرصيد لشبكة الديون — مجمَّعة بالعملة دائماً.
 *
 * قاعدة محاسبية صارمة: لا يُجمع رصيد عملتين مختلفتين في رقم واحد؛ لذلك تُعاد
 * خريطة (عملة → مجموع) وتُعرض كنص متعدد العملات «1,250 USD · 480,000 YER».
 */
import { formatCurrency } from '../../../core/utils/currencyUtils';
import type { FollowUpDashboardRow } from '../types';

/** مفتاح الصف: الطرف + العملة (قد يملك الطرف رصيداً بأكثر من عملة). */
export const debtRowId = (row: FollowUpDashboardRow): string =>
  `${row.party_id}-${row.currency_code}`;

/** مجموع الرصيد لكل عملة على حدة. */
export const currencyTotals = (rows: FollowUpDashboardRow[]): Map<string, number> => {
  const totals = new Map<string, number>();
  rows.forEach(row => {
    totals.set(row.currency_code, (totals.get(row.currency_code) ?? 0) + row.outstanding_balance);
  });
  return totals;
};

/** عدد العملات المختلفة في مجموعة الصفوف (لتسمية صف الإجمالي). */
export const currencyCount = (rows: FollowUpDashboardRow[]): number => currencyTotals(rows).size;

/** نص المجاميع «1,250 USD · 480,000 YER» — أو «—» عند عدم وجود صفوف. */
export const totalsLabel = (rows: FollowUpDashboardRow[]): string => {
  const totals = currencyTotals(rows);
  if (totals.size === 0) return '—';
  const parts: string[] = [];
  totals.forEach((total, currency) => {
    parts.push(formatCurrency(total, currency));
  });
  return parts.join(' · ');
};
