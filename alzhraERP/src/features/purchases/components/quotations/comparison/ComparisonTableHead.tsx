import React from 'react';
import { Trophy } from 'lucide-react';
import type { ComparisonSupplier } from '../../../services/quotationComparison';

interface SupplierHeaderCellProps {
  supplier: ComparisonSupplier;
  isCheapest: boolean;
}

/** رأس عمود مورد واحد: الاسم + العملة + شارة «الأوفر». */
const SupplierHeaderCell = ({
  supplier,
  isCheapest,
}: SupplierHeaderCellProps): React.ReactElement => (
  <th className="min-w-[150px] px-4 py-3 text-center text-xs font-bold">
    <div className="flex flex-col items-center gap-1">
      <span
        className={
          isCheapest
            ? 'font-bold text-emerald-600 dark:text-emerald-400'
            : 'text-gray-700 dark:text-gray-300'
        }
      >
        {supplier.party?.name ?? 'مورد غير محدد'}
      </span>
      <div className="flex items-center gap-1">
        <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          {supplier.currency_code}
        </span>
        {isCheapest && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Trophy size={10} /> الأوفر
          </span>
        )}
      </div>
    </div>
  </th>
);

/** رأس جدول المقارنة: عمودا البند/القياس + عمود لكل مورد. */
export const ComparisonTableHead = ({
  suppliers,
  cheapestId,
}: {
  suppliers: ComparisonSupplier[];
  cheapestId: string;
}): React.ReactElement => (
  <thead>
    <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
      <th className="sticky right-0 z-10 min-w-[170px] bg-gray-50 px-4 py-3 text-right text-xs font-bold text-gray-700 dark:bg-slate-800/50 dark:text-gray-300">
        المنتج / البند
      </th>
      <th className="min-w-[90px] bg-gray-50 px-3 py-3 text-center text-xs font-bold text-gray-700 dark:bg-slate-800/50 dark:text-gray-300">
        القياس
      </th>
      {suppliers.map(supplier => (
        <SupplierHeaderCell
          key={supplier.id}
          supplier={supplier}
          isCheapest={supplier.id === cheapestId}
        />
      ))}
    </tr>
  </thead>
);
