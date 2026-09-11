import { Edit, Trash2, Package, Star } from 'lucide-react';
import type { Product } from '../../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../../core/utils';
import type { Column } from '../../../../ui/common/ExcelTable';

interface GetProductColumnsProps {
  onEdit?: ((p: Product) => void) | undefined;
  onDeleteRequest?: ((p: Product) => void) | undefined;
  onToggleCore?: ((p: Product, newStatus: boolean) => void) | undefined;
  hideActions?: boolean;
  extraColumns?: Array<Column<Product>>;
  visibleColumns?: string[] | undefined;
}

export const getProductColumns = ({
  onEdit,
  onDeleteRequest,
  onToggleCore,
  hideActions = false,
  extraColumns = [],
  visibleColumns,
}: GetProductColumnsProps): Array<Column<Product>> => {
  const baseColumns: Array<Column<Product>> = [
    {
      header: 'استراتيجي ⭐',
      accessor: p => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleCore?.(p, !p.is_core);
          }}
          disabled={!onToggleCore}
          className={cn(
            'mx-auto flex items-center justify-center rounded-lg p-1 transition-all active:scale-95',
            p.is_core
              ? 'border border-amber-200 bg-amber-50 text-amber-500 shadow-sm hover:text-amber-600 dark:border-amber-800/60 dark:bg-amber-950/40'
              : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400 dark:text-slate-600 dark:hover:bg-slate-800/60'
          )}
          title={
            p.is_core
              ? 'صنف استراتيجي ⭐ - انقر لإزالته من القائمة الاستراتيجية'
              : 'إضافة الصنف إلى المنتجات الاستراتيجية ⭐'
          }
        >
          <Star size={16} className={cn(p.is_core && 'fill-amber-400 text-amber-500')} />
        </button>
      ),
      width: 'w-16',
      className: 'text-center',
      sortKey: 'is_core',
    },
    {
      header: 'اسم القطعة',
      accessor: p => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            <Package size={12} />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
              {p.name_ar || p.name}
            </span>
            {p.brand && (
              <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400">
                {p.brand}
              </span>
            )}
          </div>
        </div>
      ),
      sortKey: 'name',
    },
    {
      header: 'رقم القطعة',
      accessor: p => (
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[12px] font-bold text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
          {p.part_number || '—'}
        </span>
      ),
      width: 'w-32',
      sortKey: 'part_number',
    },
    {
      header: 'الشركة الصانعة',
      accessor: p => (
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
          {p.brand || '—'}
        </span>
      ),
      width: 'w-24',
      sortKey: 'brand',
    },
    {
      header: 'المقاس',
      accessor: p => (
        <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500">
          {p.size || '—'}
        </span>
      ),
      width: 'w-20',
      sortKey: 'size',
    },
    {
      header: 'التصنيف',
      accessor: p => (
        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
          {p.category || 'عام'}
        </span>
      ),
      width: 'w-24',
      sortKey: 'category',
    },
    {
      header: 'المخزن/الرف',
      accessor: p => (
        <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          {p.location || '—'}
        </span>
      ),
      width: 'w-48',
      sortKey: 'location',
    },
    {
      header: 'المخزون',
      accessor: p => (
        <span
          className={cn(
            'rounded-md px-2 py-0.5 font-mono text-sm font-bold',
            p.isLowStock
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
          )}
        >
          {formatNumberDisplay(p.stock_quantity)}
        </span>
      ),
      className: 'text-center',
      width: 'w-24',
      sortKey: 'stock_quantity',
    },
    {
      header: 'التكلفة',
      accessor: p => (
        <span
          dir="ltr"
          className="font-mono text-[13px] font-bold text-gray-700 dark:text-gray-300 md:text-sm"
        >
          {formatCurrency(p.cost_price)}
        </span>
      ),
      className: 'text-left',
      width: 'w-28',
      sortKey: 'cost_price',
      accessorKey: 'cost_price',
      isEditable: true,
    },
    {
      header: 'سعر البيع',
      accessor: p => (
        <span
          dir="ltr"
          className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400 md:text-base"
        >
          {formatCurrency(p.sale_price ?? p.selling_price ?? 0)}
        </span>
      ),
      className: 'text-left',
      width: 'w-28',
      sortKey: 'selling_price',
      accessorKey: 'selling_price',
      isEditable: true,
    },
  ];

  const filteredBaseColumns = visibleColumns
    ? baseColumns.filter(col => visibleColumns.includes(col.sortKey || col.accessorKey || ''))
    : baseColumns;

  const finalColumns = [...filteredBaseColumns, ...extraColumns];

  if (!hideActions) {
    finalColumns.push({
      header: 'إجراءات',
      accessor: p => (
        <div className="flex items-center justify-center gap-2">
          {onEdit && (
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(p);
              }}
              className="group flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-blue-600 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800/50 dark:bg-blue-900/30 dark:hover:bg-blue-800/50"
              title="تعديل بيانات المنتج"
            >
              <Edit size={12} />
              <span className="hidden text-[10px] font-bold group-hover:inline">تعديل</span>
            </button>
          )}
          {onDeleteRequest && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDeleteRequest(p);
              }}
              className="group flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-600 shadow-sm transition-all hover:bg-rose-600 hover:text-white hover:shadow-md hover:shadow-rose-500/20 active:scale-95 dark:border-rose-900/50 dark:bg-rose-900/30 dark:hover:bg-rose-700"
              title="حذف المنتج نهائياً (لا يمكن التراجع)"
            >
              <Trash2 size={12} />
              <span className="hidden text-[10px] font-bold group-hover:inline">حذف</span>
            </button>
          )}
        </div>
      ),
      width: 'w-28',
      className: 'text-center',
    });
  }

  return finalColumns;
};
