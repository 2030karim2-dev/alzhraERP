import React from 'react';
import { PackageX } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';

interface StagnantProductsTableProps {
  data: StagnantProductRow[];
}

/** صف منتج راكد (نفاد حركة). */
interface StagnantProductRow {
  name: string;
  stock_quantity?: number;
  stock?: number;
  lastSold?: string | null;
}

export const StagnantProductsTable: React.FC<StagnantProductsTableProps> = ({ data }) => {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-amber-100 bg-[var(--app-surface)] shadow-sm dark:border-amber-900/30 max-md:rounded-xl">
      <div className="absolute left-0 top-0 h-full w-1 bg-amber-500"></div>
      <div className="flex items-center justify-between border-b border-amber-50 bg-amber-50/30 p-5 dark:border-amber-900/20 dark:bg-slate-800/50">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-500">
            <PackageX size={18} />
            الأصناف الراكدة (تكدس رأس المال)
          </h3>
          <p className="ml-6 mt-1 text-[10px] text-slate-500">
            منتجات لم تتحرك منذ فترة طويلة وتكلف مساحة وأموال
          </p>
        </div>
      </div>
      <div className="flex min-h-[380px] flex-1 flex-col p-0">
        <ExcelTable
          data={data}
          columns={[
            {
              header: 'المنتج',
              accessor: (row: StagnantProductRow) => row.name,
              className: 'font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap',
            },
            {
              header: 'المخزون المتكدس',
              accessor: (row: StagnantProductRow) => (
                <span className="rounded-lg bg-amber-50 px-3 py-1 font-mono font-bold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  {row.stock_quantity || row.stock}
                </span>
              ),
              className: 'text-center w-32',
            },
            {
              header: 'آخر حركة',
              accessor: (row: StagnantProductRow) => {
                if (!row.lastSold || row.lastSold === 'Never')
                  return (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">
                      لا يوجد مبيعات مطلقاً
                    </span>
                  );
                return (
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {new Date(row.lastSold).toLocaleDateString('en-GB')}
                  </span>
                );
              },
              className: 'text-center w-32',
            },
          ]}
          colorTheme="orange"
          showSearch={false}
          emptyMessage="ممتاز! لا توجد منتجات راكدة حالياً."
        />
      </div>
    </div>
  );
};
