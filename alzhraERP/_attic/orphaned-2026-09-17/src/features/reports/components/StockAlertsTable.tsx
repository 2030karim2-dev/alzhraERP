import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';

/** صف تنبيه نفاذ المخزون الحرج. */
interface StockAlertRow {
  name: string;
  stock_quantity: number;
  dailyVelocity?: number;
  daysRemaining: number;
}

interface StockAlertsTableProps {
  data: StockAlertRow[];
}

export const StockAlertsTable: React.FC<StockAlertsTableProps> = ({ data }) => {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-rose-100 bg-[var(--app-surface)] shadow-sm dark:border-rose-900/30 max-md:rounded-xl">
      <div className="absolute left-0 top-0 h-full w-1 bg-rose-500"></div>
      <div className="flex items-center justify-between border-b border-rose-50 bg-rose-50/30 p-5 dark:border-rose-900/20 dark:bg-slate-800/50">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
            <AlertTriangle size={18} />
            تنبيهات النفاذ الحرجة
          </h3>
          <p className="ml-6 mt-1 text-[10px] text-slate-500">
            منتجات سريعة الحركة على وشك النفاذ خلال أيام معدودة
          </p>
        </div>
        {data.length > 0 && (
          <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-[10px] font-bold text-rose-700 shadow-sm dark:border-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
            {data.length} تنبيهات
          </span>
        )}
      </div>
      <div className="flex min-h-[380px] flex-1 flex-col p-0">
        <ExcelTable
          data={data}
          columns={[
            {
              header: 'المنتج',
              accessor: (row: StockAlertRow) => row.name,
              className: 'font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap',
            },
            {
              header: 'المخزون',
              accessor: (row: StockAlertRow) => (
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {row.stock_quantity}
                </span>
              ),
              className: 'text-center w-20',
            },
            {
              header: 'الاستهلاك',
              accessor: (row: StockAlertRow) => (
                <span className="font-mono text-xs text-slate-500">
                  {(row.dailyVelocity || 0).toFixed(1)} /يوم
                </span>
              ),
              className: 'text-center w-24',
            },
            {
              header: 'ينفذ خلال',
              accessor: (row: StockAlertRow) => {
                const days = row.daysRemaining || 0;
                const isUrgent = days < 3;
                return (
                  <span
                    className={`inline-flex min-w-[60px] items-center justify-center rounded-lg border px-2 py-1 text-xs font-bold shadow-sm ${isUrgent ? 'animate-pulse border-rose-600 bg-rose-500 text-white' : 'border-amber-200 bg-amber-100 text-amber-800'}`}
                  >
                    {days} أيام
                  </span>
                );
              },
              className: 'text-center w-24',
            },
          ]}
          colorTheme="orange"
          showSearch={false}
          emptyMessage="لا توجد منتجات حرجة حالياً، المخزون في مستويات آمنة."
        />
      </div>
    </div>
  );
};
