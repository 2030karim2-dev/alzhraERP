import React, { useMemo } from 'react';
import { Trash2, Plus, Box, PackageSearch } from 'lucide-react';
import ProductExcelGrid from '../ProductExcelGrid';

interface Props {
    items: { product: any, qty: number }[];
    onRemove: (id: string) => void;
    onUpdateQty: (id: string, qty: number) => void;
    searchResults?: any[];
    searchQuery?: string;
    onAddItem?: (p: any) => void;
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
            accessor: (row: any) => (
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
            accessor: (row: any) => (
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

    const handleCellUpdate = (rowIndex: number, columnKey: string, value: any) => {
        if (columnKey === 'transfer_qty') {
            const rowId = mappedProducts[rowIndex].id;
            const newQty = parseInt(value) || 1;
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
                                    searchResults.map((p: any) => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => onAddItem?.(p)} 
                                            className="p-3 border-b last:border-0 dark:border-slate-800 flex justify-between items-center hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <p className="text-xs font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                    {p.name_ar || p.name}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {p.part_number && (
                                                        <span className="text-[9px] font-black font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                                            {p.part_number}
                                                        </span>
                                                    )}
                                                    {p.manufacturer && <span className="text-[9px] font-bold text-gray-400 italic">{p.manufacturer}</span>}
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform shadow-sm">
                                                <Plus size={18} className="text-emerald-600" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-slate-950">
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
                    onCellUpdate={handleCellUpdate as any}
                    title="أصناف المناقلة"
                    subtitle="الأصناف المضافة لعملية التحويل الحالية"
                    colorTheme="blue"
                />
            </div>
        </div>
    );
};

export default TransferItemsList;
