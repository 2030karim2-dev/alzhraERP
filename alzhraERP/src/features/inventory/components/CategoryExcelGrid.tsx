import React from 'react';
import { Layers, Trash2, TrendingUp, AlertCircle, Package, Box, BarChart3 } from 'lucide-react';
import { formatNumberDisplay } from '../../../core/utils';
import { cn } from '../../../core/utils';
import ExcelTable, { Column } from '../../../ui/common/ExcelTable';
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

    const columns: Column<Category>[] = [
        {
            header: 'اسم القسم',
            accessor: (c) => (
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                        c.hasAlert
                            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 border-rose-100 dark:border-rose-800"
                            : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-100 dark:border-blue-800"
                    )}>
                        <Layers size={12} />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-tight">{c.name}</span>
                    {c.hasAlert && <AlertCircle size={10} className="text-rose-500 animate-pulse" />}
                </div>
            ),
            sortKey: 'name',
        },
        {
            header: 'عدد الأصناف',
            accessor: (c) => (
                <div className="flex items-center gap-1.5 justify-center">
                    <Package size={10} className="text-blue-500" />
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatNumberDisplay(c.productsCount)}</span>
                </div>
            ),
            className: 'text-center',
            width: 'w-32',
            sortKey: 'productsCount'
        },
        {
            header: 'الكمية الكلية',
            accessor: (c) => (
                <div className="flex items-center gap-1.5 justify-center">
                    <Box size={10} className="text-emerald-500" />
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatNumberDisplay(c.totalStock)}</span>
                </div>
            ),
            className: 'text-center',
            width: 'w-32',
            sortKey: 'totalStock'
        },
        {
            header: 'قيمة المخزون',
            accessor: (c) => (
                <div className="flex items-center gap-1.5 justify-end">
                    <span dir="ltr" className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {Math.round(c.totalValue).toLocaleString()} ريال
                    </span>
                    <BarChart3 size={10} className="text-amber-500" />
                </div>
            ),
            className: 'text-left',
            width: 'w-40',
            sortKey: 'totalValue'
        },
        {
            header: 'إجراءات',
            accessor: (c) => (
                <div className="flex justify-center items-center gap-2">
                    <button
                        onClick={() => onFilterProduct(c.name)}
                        className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors border border-blue-100 dark:border-blue-800/50"
                        title="تحليل"
                    >
                        <TrendingUp size={13} />
                    </button>
                    <button
                        onClick={() => { if (confirm('هل أنت متأكد من حذف هذا القسم؟')) deleteCategory(c.id); }}
                        className="p-1.5 text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-800/50 transition-colors border border-rose-100 dark:border-rose-800/50"
                        title="حذف"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            ),
            width: 'w-24',
            className: 'text-center'
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ExcelTable
                columns={columns}
                data={categories}
                title="جدول الأقسام"
                colorTheme="blue"
                pageSize={100}
                getRowId={(c) => c.id}
            />
        </div>
    );
};

export default CategoryExcelGrid;
