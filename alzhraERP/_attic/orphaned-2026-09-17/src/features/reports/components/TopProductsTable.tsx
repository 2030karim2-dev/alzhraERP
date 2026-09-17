import React from 'react';
import { TrendingUp } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency } from '../../../core/utils';

interface TopProductsTableProps {
  data: TopProductRow[];
}

/** صف منتج ضمن الأكثر حركة ومبيعاً. */
interface TopProductRow {
  name: string;
  abcCategory?: string;
  qtySold: number;
  revenue: number;
}

export const TopProductsTable: React.FC<TopProductsTableProps> = ({ data }) => {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800 max-md:rounded-xl lg:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <TrendingUp size={18} className="text-emerald-500" />
            المنتجات الأكثر حركة ومبيعاً
          </h3>
          <p className="ml-6 mt-1 text-[10px] text-slate-500">
            أعلى الأصناف من حيث الكمية المباعة والإيرادات
          </p>
        </div>
      </div>
      <div className="flex min-h-[380px] flex-1 flex-col p-0">
        <ExcelTable
          data={data}
          columns={[
            {
              header: 'المنتج',
              accessor: (row: TopProductRow) => row.name,
              width: '250px',
              className: 'font-bold text-slate-800 dark:text-slate-200',
            },
            {
              header: 'التصنيف',
              accessor: (row: TopProductRow) => (
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-bold shadow-sm ${row.abcCategory === 'A' ? 'bg-emerald-100 text-emerald-800' : row.abcCategory === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}
                >
                  {row.abcCategory || '-'}
                </span>
              ),
              width: '80px',
              className: 'text-center',
            },
            {
              header: 'الكمية المباعة',
              accessor: (row: TopProductRow) => (
                <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {row.qtySold}
                </span>
              ),
              className: 'text-center',
            },
            {
              header: 'الإيرادات',
              accessor: (row: TopProductRow) => (
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {formatCurrency(row.revenue)}
                </span>
              ),
              className: 'text-left',
            },
          ]}
          showSearch={false}
          colorTheme="blue"
          emptyMessage="لا توجد بيانات مبيعات لهذه الفترة."
        />
      </div>
    </div>
  );
};
