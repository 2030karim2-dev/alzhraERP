import React, { useMemo } from 'react';
import { Trash2, Plus, Box, PackageSearch } from 'lucide-react';
import ProductExcelGrid from '../ProductExcelGrid';
import type { Product } from '../../types';

interface Props {
    items: Array<{ product: Product, qty: number }>;
    onRemove: (id: string) => void;
    onUpdateQty: (id: string, qty: number) => void;
    searchResults?: Product[];
    searchQuery?: string;
    onAddItem?: (p: Product) => void;
}

const TransferItemsList: React.FC<Props> = ({ 
    items, 
    onRemove, 
    onUpdateQty,
    searchResults = [],
    searchQuery = '',
    onAddItem
}) => {
    
    // Map items to Product format for ProductExcelGrid
    const mappedProducts = useMemo(() => {
        return items.map(item => ({
            ...item.product,
            // We use a custom property for the transfer quantity to avoid confusion with stock_quantity
            transfer_qty: item.qty 
        }));
    }, [items]);

    const extraColumns = useMemo(() => [
        { 
            header: 'الكمية المحولة', 
            accessorKey: 'transfer_qty',
            accessor: (row: Product & { transfer_qty?: number }) => (
                <div className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-center">
                    {row.transfer_qty}
                </div>
            ),
            isEditable: true,
            width: 'w-24'
        },
        {
            header: '',
            accessorKey: 'remove_action',
            accessor: (row: Product & { transfer_qty?: number }) => (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(row.id);
                    }} 
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors group"
                >
                    <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                </button>
            ),
            width: 'w-10',
            align: 'center' as const
        }
    ], [onRemove]);

    const handleCellUpdate = (rowIndex: number, columnKey: string, value: unknown) => {
        if (columnKey === 'transfer_qty') {
            const rowId = mappedProducts[rowIndex].id;
            const newQty = parseInt(String(value), 10) || 1;
            onUpdateQty(rowId, newQty);
        }
    };

    const hasSearch = searchQuery.length > 1;

    return (
        <div className="flex flex-col h-full bg-[var(--app-surface)] border-2 border-[var(--app-border)] rounded-xl overflow-hidden shadow-lg relative">
             <div className="px-3 py-2 bg-[var(--app-bg)] border-b-2 border-[var(--app-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-blue-600" />
                    <h3 className="text-[11px] font-black text-[var(--app-text)] uppercase tracking-tight">
                        قائمة الأصناف المحولة ({items.length})
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">
                        وضع الإدخل السريع
                    </span>
                </div>
             </div>
             
             <div className="flex-1 min-h-0 relative">
                {/* Search Results Overlay Inside Table Container */}
                {hasSearch && (
                    <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <div className="absolute top-0 inset-x-0 mx-auto max-w-[95%] mt-2 bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-2xl rounded-xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
                            <div className="p-2 border-b dark:border-slate-800 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-between">
                                <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                    <PackageSearch size={14} />
                                    نتائج البحث عن: "{searchQuery}"
                                </span>
                                <span className="text-[8px] font-bold text-gray-500">{searchResults.length} صنف وجد</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                {searchResults.length > 0 ? (
                                    <table className="w-full text-right border-collapse">
                                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 whitespace-nowrap">اسم المنتج</th>
                                                <th className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 whitespace-nowrap">رقم المنتج</th>
                                                <th className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 whitespace-nowrap">الشركة الصانعة</th>
                                                <th className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 whitespace-nowrap">المقاس</th>
                                                <th className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 whitespace-nowrap">الكمية الموجودة</th>
                                                <th className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 text-center whitespace-nowrap w-10">إضافة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {searchResults.map((p: Product) => (
                                                <tr 
                                                    key={p.id} 
                                                    onClick={() => onAddItem?.(p)}
                                                    className="group hover:bg-blue-50/80 dark:hover:bg-blue-900/20 cursor-pointer transition-all duration-150"
                                                >
                                                    <td className="px-3 py-2">
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate max-w-[200px]" title={p.name_ar || p.name}>
                                                            {p.name_ar || p.name}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                            {p.part_number || p.sku || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] block" title={p.brand || p.manufacturer || '-'}>
                                                            {p.brand || p.manufacturer || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[80px] block" title={p.size || '-'}>
                                                            {p.size || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 min-w-[40px]">
                                                            {p.stock_quantity ?? 0}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="mx-auto w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform shadow-sm">
                                                            <Plus size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-2">
                                        <PackageSearch size={32} className="text-gray-300 dark:text-slate-700" />
                                        <p className="text-xs font-black text-gray-400">عذراً، لا توجد نتائج مطابقة لبحثك</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <ProductExcelGrid
                    products={mappedProducts}
                    isLoading={false}
                    hideActions={true}
                    hideBulkActions={true}
                    extraColumns={extraColumns}
                    onCellUpdate={handleCellUpdate}
                    title="أصناف المناقلة"
                    subtitle="الأصناف المضافة لعملية التحويل الحالية"
                    colorTheme="blue"
                    visibleColumns={['name', 'part_number', 'brand', 'size']}
                />
            </div>
        </div>
    );
};

export default TransferItemsList;
