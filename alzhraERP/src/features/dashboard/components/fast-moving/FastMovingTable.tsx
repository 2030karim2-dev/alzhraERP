/* eslint-disable max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/restrict-template-expressions */
import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Layers } from 'lucide-react';
import type { TopProduct } from '../TopPerformers';
import { FastMovingTableRow } from './FastMovingTableRow';
import {
  getProductValues,
  type DisplayCurrency,
  type SortDirection,
  type SortField,
} from './types';

interface FastMovingTableProps {
  products: TopProduct[];
  selectedCurrency: DisplayCurrency;
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  maxVal: number;
  expandedRowId: string | null;
  setExpandedRowId: (fn: (prev: string | null) => string | null) => void;
}

export const FastMovingTable: React.FC<FastMovingTableProps> = ({
  products,
  selectedCurrency,
  sortField,
  sortDirection,
  handleSort,
  maxVal,
  expandedRowId,
  setExpandedRowId,
}) => {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="text-amber-400" />
    ) : (
      <ArrowDown size={12} className="text-amber-400" />
    );
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
        <Layers size={36} className="mb-2 text-slate-600" />
        <p className="text-sm font-bold text-slate-300">لا توجد قطع غيار مطابقة للبحث أو الفلترة</p>
        <p className="mt-1 text-xs text-slate-500">
          حاول تغيير خيارات البحث أو الفرز أو الفترة الزمنية المحددة
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-slate-700/90 shadow-lg">
      <table className="w-full border-collapse text-right">
        <thead className="bg-slate-950 text-xs font-bold text-slate-300">
          <tr className="border-b-2 border-slate-700/90">
            <th
              onClick={() => handleSort('index')}
              className="w-12 cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
              title="الترتيب"
            >
              <div className="flex items-center justify-center gap-1">
                <span>#</span>
                {renderSortIcon('index')}
              </div>
            </th>

            <th
              onClick={() => handleSort('name')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center gap-1.5">
                <span>قطعة الغيار والمواصفات</span>
                {renderSortIcon('name')}
              </div>
            </th>

            <th
              onClick={() => handleSort('stock')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>المخزون المتوفر</span>
                {renderSortIcon('stock')}
              </div>
            </th>

            <th
              onClick={() => handleSort('quantity')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>صافي المباع</span>
                {renderSortIcon('quantity')}
              </div>
            </th>

            <th
              onClick={() => handleSort('revenue')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>إجمالي الإيراد</span>
                {renderSortIcon('revenue')}
              </div>
            </th>

            <th
              onClick={() => handleSort('cost')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>إجمالي التكلفة</span>
                {renderSortIcon('cost')}
              </div>
            </th>

            <th
              onClick={() => handleSort('profit')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>مجمل الربح</span>
                {renderSortIcon('profit')}
              </div>
            </th>

            <th
              onClick={() => handleSort('margin')}
              className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>الهامش %</span>
                {renderSortIcon('margin')}
              </div>
            </th>

            <th className="border-l border-slate-700/80 px-3 py-3 text-center">حالة الصنف</th>

            <th className="w-10 px-2 py-3 text-center" title="تفاصيل إضافية">
              <span className="sr-only">تفاصيل</span>
            </th>
          </tr>
        </thead>

        <tbody className="bg-slate-900/60 text-xs">
          {products.map((p, idx) => {
            const rowId = p.id || `prod-${idx}`;
            const vals = getProductValues(p, selectedCurrency);

            return (
              <FastMovingTableRow
                key={rowId}
                product={p}
                idx={idx}
                vals={vals}
                selectedCurrency={selectedCurrency}
                sortField={sortField}
                maxVal={maxVal}
                isExpanded={expandedRowId === rowId}
                onToggleExpand={() => setExpandedRowId(prev => (prev === rowId ? null : rowId))}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
