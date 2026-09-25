/* eslint-disable max-lines-per-function */
import React, { useMemo } from 'react';
import { formatCurrency } from '../../../../core/utils';
import { STATUS_CONFIG } from './statusConfig';
import type { QuotationListRow } from './types';

interface FlatQuotationItem {
  id: string;
  uniqueKey: string;
  quotationNumber: string;
  supplierName: string;
  description: string;
  part_number: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  status: QuotationListRow['status'];
  currencyCode: string;
  createdAt: string;
}

interface DetailedQuotationsTableRowProps {
  item: FlatQuotationItem;
  index: number;
}

const DetailedQuotationsTableRow: React.FC<DetailedQuotationsTableRowProps> = ({ item, index }) => {
  const status = STATUS_CONFIG[item.status];
  return (
    <tr className="transition-colors hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
      <td className="px-3 py-3 font-mono text-xs text-gray-400">{index + 1}</td>
      <td className="px-3 py-3 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
        {item.quotationNumber}
      </td>
      <td className="px-3 py-3 text-xs font-semibold text-gray-800 dark:text-gray-200">
        {item.supplierName}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-medium text-gray-900 dark:text-white">{item.description}</div>
        {item.part_number !== null && (
          <span className="font-mono text-[10px] text-gray-400">
            رقم القطعة: {item.part_number}
          </span>
        )}
      </td>
      <td className="bg-violet-50/20 px-3 py-3 text-center dark:bg-violet-950/10">
        {item.size !== null ? (
          <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 font-mono text-xs font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
            {item.size}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
        {item.quantity}
      </td>
      <td
        className="bg-emerald-50/20 px-3 py-3 text-center font-mono text-xs font-bold text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400"
        dir="ltr"
      >
        {formatCurrency(item.unit_price, item.currencyCode)}
      </td>
      <td
        className="px-3 py-3 text-center font-mono text-xs font-bold text-gray-900 dark:text-white"
        dir="ltr"
      >
        {formatCurrency(
          item.total > 0 ? item.total : item.unit_price * item.quantity,
          item.currencyCode
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}
        >
          {status.icon} {status.label}
        </span>
      </td>
      <td className="px-3 py-3 text-center font-mono text-xs text-gray-400">
        {item.createdAt !== '' ? item.createdAt.split('T')[0] : '—'}
      </td>
    </tr>
  );
};

const DetailedQuotationsTableHeader: React.FC = () => (
  <thead>
    <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-gray-300">
      <th className="w-10 px-3 py-3 text-right text-xs font-bold">#</th>
      <th className="min-w-[110px] px-3 py-3 text-right text-xs font-bold">رقم العرض</th>
      <th className="min-w-[130px] px-3 py-3 text-right text-xs font-bold">المورد</th>
      <th className="min-w-[180px] px-4 py-3 text-right text-xs font-bold">الصنف / البند</th>
      <th className="min-w-[95px] bg-violet-50/60 px-3 py-3 text-center text-xs font-bold text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
        القياس
      </th>
      <th className="w-16 px-3 py-3 text-center text-xs font-bold">الكمية</th>
      <th className="min-w-[120px] bg-emerald-50/60 px-3 py-3 text-center text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
        سعر الوحدة
      </th>
      <th className="min-w-[120px] px-3 py-3 text-center text-xs font-bold">إجمالي السعر</th>
      <th className="min-w-[90px] px-3 py-3 text-center text-xs font-bold">الحالة</th>
      <th className="min-w-[90px] px-3 py-3 text-center text-xs font-bold">التاريخ</th>
    </tr>
  </thead>
);

interface DetailedQuotationsTableProps {
  quotations: QuotationListRow[];
}

export const DetailedQuotationsTable: React.FC<DetailedQuotationsTableProps> = ({ quotations }) => {
  const flatItems = useMemo(
    () =>
      quotations.flatMap(quotation =>
        quotation.items.map((item, idx) => ({
          ...item,
          uniqueKey: `${quotation.id}-${item.id !== '' ? item.id : String(idx)}`,
          quotationNumber: quotation.quotation_number,
          supplierName: quotation.supplier_name,
          status: quotation.status,
          currencyCode: quotation.currency_code,
          createdAt: quotation.created_at,
        }))
      ),
    [quotations]
  );

  if (flatItems.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="font-medium text-gray-500 dark:text-gray-400">
          لا توجد بنود عروض أسعار للعرض
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
      <div className="scroll-x-hint-surface overflow-x-auto">
        <table className="w-full text-sm">
          <DetailedQuotationsTableHeader />
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {flatItems.map((item, index) => (
              <DetailedQuotationsTableRow key={item.uniqueKey} item={item} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DetailedQuotationsTable;
