import React from 'react';
import type { CommissionCalculation } from '../types';
import { calculationStatusLabels } from './commissionLabels';

export function ReportSummary({ totals }: { totals: { commission: number; sales: number; collected: number } }): React.JSX.Element {
  const cards: Array<{ label: string; value: number; color: string }> = [
    { label: 'إجمالي العمولة', value: totals.commission, color: 'text-emerald-700' },
    { label: 'المبيعات الصافية', value: totals.sales, color: 'text-[var(--app-text)]' },
    { label: 'المبلغ المحصل', value: totals.collected, color: 'text-[var(--app-text)]' },
  ];
  return <section className="grid gap-3 sm:grid-cols-3">{cards.map(card => <div key={card.label} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4"><p className="text-xs text-[var(--app-text-secondary)]">{card.label}</p><p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value.toLocaleString('ar-SA')}</p></div>)}</section>;
}

export function ReportTable({ rows }: { rows: CommissionCalculation[] }): React.JSX.Element {
  const headings = ['الموظف', 'المبيعات الصافية', 'المحصل', 'الفواتير', 'العمولة', 'الحالة'];
  return <section className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]"><table className="w-full min-w-[720px] text-right text-sm"><thead className="border-b border-[var(--app-border)] bg-[var(--app-bg)]"><tr>{headings.map(heading => <th key={heading} className="px-4 py-3 font-semibold text-[var(--app-text)]">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[var(--app-border)]">{rows.map(row => <tr key={row.id}><td className="px-4 py-3 font-mono text-xs text-[var(--app-text-secondary)]">{row.user_id}</td><td className="px-4 py-3 text-[var(--app-text)]">{row.net_sales.toLocaleString('ar-SA')}</td><td className="px-4 py-3 text-[var(--app-text)]">{row.collected_amount.toLocaleString('ar-SA')}</td><td className="px-4 py-3 text-[var(--app-text)]">{row.invoice_count}</td><td className="px-4 py-3 font-semibold text-emerald-700">{row.total_commission.toLocaleString('ar-SA')}</td><td className="px-4 py-3 text-[var(--app-text-secondary)]">{calculationStatusLabels[row.status]}</td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--app-text-secondary)]">لا توجد نتائج قابلة للعرض لهذه الفترة.</td></tr>}</tbody></table></section>;
}
