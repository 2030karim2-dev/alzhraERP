import React from 'react';
import { Layers, Trash2, TrendingUp, AlertCircle, Package, Box, BarChart3 } from 'lucide-react';
import { formatNumberDisplay } from '../../../core/utils';
import { cn } from '../../../core/utils';
import ExcelTable, { type Column } from '../../../ui/common/ExcelTable';
import { useInventoryCategoryMutations } from '../hooks/index';

interface Category {
  id: string;
  name: string;
  productsCount: number;
  totalStock: number;
  totalValue: number;
  hasAlert: boolean;
}

interface Props {
  categories: Category[];
  onFilterProduct: (catName: string) => void;
}

const CategoryExcelGrid: React.FC<Props> = ({ categories, onFilterProduct }) => {
  const { deleteCategory } = useInventoryCategoryMutations();

  const columns: Array<Column<Category>> = [
    {
      header: 'اسم القسم',
      accessor: c => (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              c.hasAlert
                ? 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/30'
                : 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/30'
            )}
          >
            <Layers size={12} />
          </div>
          <span className="text-sm font-bold uppercase tracking-tight text-slate-800 dark:text-white">
            {c.name}
          </span>
          {c.hasAlert && <AlertCircle size={10} className="animate-pulse text-rose-500" />}
        </div>
      ),
      sortKey: 'name',
    },
    {
      header: 'عدد الأصناف',
      accessor: c => (
        <div className="flex items-center justify-center gap-1.5">
          <Package size={10} className="text-blue-500" />
          <span className="font-mono text-[13px] font-bold text-blue-600 dark:text-blue-400">
            {formatNumberDisplay(c.productsCount)}
          </span>
        </div>
      ),
      className: 'text-center',
      width: 'w-32',
      sortKey: 'productsCount',
    },
    {
      header: 'الكمية الكلية',
      accessor: c => (
        <div className="flex items-center justify-center gap-1.5">
          <Box size={10} className="text-emerald-500" />
          <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumberDisplay(c.totalStock)}
          </span>
        </div>
      ),
      className: 'text-center',
      width: 'w-32',
      sortKey: 'totalStock',
    },
    {
      header: 'قيمة المخزون',
      accessor: c => (
        <div className="flex items-center justify-end gap-1.5">
          <span
            dir="ltr"
            className="font-mono text-[13px] font-bold text-slate-700 dark:text-slate-300"
          >
            {Math.round(c.totalValue).toLocaleString('en-US')} ريال
          </span>
          <BarChart3 size={10} className="text-amber-500" />
        </div>
      ),
      className: 'text-left',
      width: 'w-40',
      sortKey: 'totalValue',
    },
    {
      header: 'إجراءات',
      accessor: c => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              onFilterProduct(c.name);
            }}
            className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800/50 dark:bg-blue-900/30 dark:hover:bg-blue-800/50"
            title="تحليل"
          >
            <TrendingUp size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm('هل أنت متأكد من حذف هذا القسم؟')) deleteCategory(c.id);
            }}
            className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-900/30 dark:hover:bg-rose-800/50"
            title="حذف"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
      width: 'w-24',
      className: 'text-center',
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 flex h-full min-h-[480px] flex-1 flex-col duration-500">
      <ExcelTable
        columns={columns}
        data={categories}
        title="جدول الأقسام"
        colorTheme="blue"
        pageSize={100}
        getRowId={c => c.id}
      />
    </div>
  );
};

export default CategoryExcelGrid;
