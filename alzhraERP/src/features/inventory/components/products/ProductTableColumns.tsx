import { Edit, Trash2, Package } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../../core/utils';
import { Column } from '../../../../ui/common/ExcelTable';

interface GetProductColumnsProps {
    onEdit?: ((p: Product) => void) | undefined;
    onDeleteRequest?: ((p: Product) => void) | undefined;
    hideActions?: boolean;
    extraColumns?: Column<Product>[];
}

export const getProductColumns = ({ 
    onEdit, 
    onDeleteRequest, 
    hideActions = false,
    extraColumns = [] 
}: GetProductColumnsProps): Column<Product>[] => {
    const baseColumns: Column<Product>[] = [
        {
            header: 'اسم القطعة',
            accessor: (p) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Package size={12} />
                    </div>
                    <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">{p.name_ar || p.name}</span>
                        {p.brand && <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400">{p.brand}</span>}
                    </div>
                </div>
            ),
            sortKey: 'name'
        },
        {
            header: 'رقم القطعة',
            accessor: (p) => (
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                    {p.part_number || '—'}
                </span>
            ),
            width: 'w-32',
            sortKey: 'part_number'
        },
        {
            header: 'الشركة الصانعة',
            accessor: (p) => (
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {p.brand || '—'}
                </span>
            ),
            width: 'w-24',
            sortKey: 'brand'
        },
        {
            header: 'المقاس',
            accessor: (p) => (
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                    {p.size || '—'}
                </span>
            ),
            width: 'w-20',
            sortKey: 'size'
        },
        {
            header: 'التصنيف',
            accessor: (p) => (
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                    {p.category || 'عام'}
                </span>
            ),
            width: 'w-24',
            sortKey: 'category'
        },
        {
            header: 'المخزن/الرف',
            accessor: (p) => (
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                    {p.location || '—'}
                </span>
            ),
            width: 'w-48',
            sortKey: 'location'
        },
        {
            header: 'المخزون',
            accessor: (p) => (
                <span className={cn(
                    "font-bold font-mono text-sm px-2 py-0.5 rounded-md",
                    p.isLowStock
                        ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
                        : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                )}>
                    {formatNumberDisplay(p.stock_quantity)}
                </span>
            ),
            className: 'text-center',
            width: 'w-24',
            sortKey: 'stock_quantity'
        },
        {
            header: 'التكلفة',
            accessor: (p) => <span dir="ltr" className="font-mono font-bold text-gray-700 dark:text-gray-300">{formatCurrency(p.cost_price)}</span>,
            className: 'text-left',
            width: 'w-28',
            sortKey: 'cost_price',
            accessorKey: 'cost_price',
            isEditable: true,
        },
        {
            header: 'سعر البيع',
            accessor: (p) => <span dir="ltr" className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{formatCurrency(p.sale_price ?? p.selling_price ?? 0)}</span>,
            className: 'text-left',
            width: 'w-28',
            sortKey: 'selling_price',
            accessorKey: 'selling_price',
            isEditable: true,
        },
    ];

    const finalColumns = [...baseColumns, ...extraColumns];

    if (!hideActions) {
        finalColumns.push({
            header: 'إجراءات',
            accessor: (p) => (
                <div className="flex justify-center items-center gap-2">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                            className="flex items-center gap-1 px-2 py-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-all border border-blue-100 dark:border-blue-800/50 active:scale-95 group"
                            title="تعديل بيانات المنتج"
                        >
                            <Edit size={12} />
                            <span className="text-[9px] font-bold hidden group-hover:inline">تعديل</span>
                        </button>
                    )}
                    {onDeleteRequest && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(p); }}
                            className="flex items-center gap-1 px-2 py-1.5 text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-lg hover:bg-rose-600 hover:text-white dark:hover:bg-rose-700 transition-all border border-rose-200 dark:border-rose-900/50 active:scale-95 group shadow-sm hover:shadow-rose-500/20 hover:shadow-md"
                            title="حذف المنتج نهائياً (لا يمكن التراجع)"
                        >
                            <Trash2 size={12} />
                            <span className="text-[9px] font-bold hidden group-hover:inline">حذف</span>
                        </button>
                    )}
                </div>
            ),
            width: 'w-28',
            className: 'text-center'
        });
    }

    return finalColumns;
};
