/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import type { AgingPartyRow } from '../types/debtAging';

export function getDebtAgingColumns() {
  return [
    {
      header: 'العميل',
      accessor: (row: AgingPartyRow) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{row.name}</span>
          <span className="text-[11px] text-slate-400">
            أقدم استحقاق: {row.oldestDate ? formatLocalDate(row.oldestDate) : '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'حالية',
      accessor: (row: AgingPartyRow) =>
        row.current > 0 ? (
          <span
            dir="ltr"
            className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400"
          >
            {formatCurrency(row.current)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ),
      width: '100px',
      align: 'center' as const,
    },
    {
      header: '31-60',
      accessor: (row: AgingPartyRow) =>
        row.days30 > 0 ? (
          <span
            dir="ltr"
            className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400"
          >
            {formatCurrency(row.days30)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ),
      width: '100px',
      align: 'center' as const,
    },
    {
      header: '61-90',
      accessor: (row: AgingPartyRow) =>
        row.days60 > 0 ? (
          <span
            dir="ltr"
            className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400"
          >
            {formatCurrency(row.days60)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ),
      width: '100px',
      align: 'center' as const,
    },
    {
      header: '90+',
      accessor: (row: AgingPartyRow) =>
        row.days90 > 0 ? (
          <span
            dir="ltr"
            className="rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            {formatCurrency(row.days90)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ),
      width: '100px',
      align: 'center' as const,
    },
    {
      header: 'الإجمالي',
      accessor: (row: AgingPartyRow) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
          {formatCurrency(row.total)}
        </span>
      ),
      width: '110px',
      align: 'center' as const,
    },
  ];
}
