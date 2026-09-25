import React from 'react';
import { formatCurrency } from '../../../../core/utils';
import type { QuotationItemDetail } from './types';

interface QuotationItemRowProps {
  item: QuotationItemDetail;
  index: number;
  currencyCode: string;
}

const QuotationItemRow: React.FC<QuotationItemRowProps> = ({ item, index, currencyCode }) => (
  <tr className="transition-colors hover:bg-gray-50/70 dark:hover:bg-slate-700/30">
    <td className="px-3 py-2.5 font-mono text-gray-400">{index + 1}</td>
    <td className="px-3 py-2.5">
      <div className="font-medium text-gray-800 dark:text-gray-200">{item.description}</div>
      {item.part_number !== null && (
        <span className="font-mono text-[10px] text-gray-400">رقم القطعة: {item.part_number}</span>
      )}
    </td>
    <td className="bg-violet-50/30 px-3 py-2.5 text-center dark:bg-violet-950/10">
      {item.size !== null ? (
        <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
          {item.size}
        </span>
      ) : (
        <span className="text-gray-300 dark:text-slate-600">—</span>
      )}
    </td>
    <td className="px-3 py-2.5 text-center font-mono font-medium text-gray-700 dark:text-gray-300">
      {item.quantity}
    </td>
    <td
      className="bg-emerald-50/30 px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400"
      dir="ltr"
    >
      {formatCurrency(item.unit_price, currencyCode)}
    </td>
    <td
      className="px-3 py-2.5 text-center font-mono font-bold text-gray-900 dark:text-white"
      dir="ltr"
    >
      {formatCurrency(item.total > 0 ? item.total : item.unit_price * item.quantity, currencyCode)}
    </td>
  </tr>
);

interface QuotationItemsTableProps {
  items: QuotationItemDetail[];
  currencyCode: string;
}

export const QuotationItemsTable: React.FC<QuotationItemsTableProps> = ({
  items,
  currencyCode,
}) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
          <th className="w-8 px-3 py-2.5 text-right font-bold">#</th>
          <th className="px-3 py-2.5 text-right font-bold">الصنف / البند</th>
          <th className="min-w-[90px] bg-violet-50/60 px-3 py-2.5 text-center font-bold text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
            القياس
          </th>
          <th className="w-16 px-3 py-2.5 text-center font-bold">الكمية</th>
          <th className="min-w-[100px] bg-emerald-50/60 px-3 py-2.5 text-center font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            سعر الوحدة
          </th>
          <th className="min-w-[110px] px-3 py-2.5 text-center font-bold">إجمالي السعر</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
        {items.map((item, index) => (
          <QuotationItemRow
            key={item.id !== '' ? item.id : String(index)}
            item={item}
            index={index}
            currencyCode={currencyCode}
          />
        ))}
      </tbody>
    </table>
  </div>
);

export default QuotationItemsTable;
