import React, { useMemo } from 'react';
import { Trash2, Box, PackagePlus } from 'lucide-react';
import ProductExcelGrid from '../ProductExcelGrid';
import type { Product } from '../../types';

interface Props {
    items: Array<{ product: Product; qty: number }>;
    onRemove: (id: string) => void;
    onUpdateQty: (id: string, qty: number) => void;
    fromWarehouseId?: string;
}

const TransferItemsList: React.FC<Props> = ({ 
    items, 
    onRemove, 
    onUpdateQty,
    fromWarehouseId
}) => {
    
    // Map items to Product format for ProductExcelGrid
    const mappedProducts = useMemo(() => {
        return items.map(item => ({
            ...item.product,
            transfer_qty: item.qty 
        }));
    }, [items]);

    const extraColumns = useMemo(() => [
        {
            header: 'المتوفر بالمصدر',
            accessorKey: 'wh_stock',
            accessor: (row: Product & { transfer_qty?: number }) => {
                let whStock = row.stock_quantity ?? 0;
                if (fromWarehouseId && row.warehouse_distribution && row.warehouse_distribution.length > 0) {
                    const dist = row.warehouse_distribution.find((w: any) => w.warehouse_id === fromWarehouseId);
                    if (dist) whStock = Number(dist.quantity) || 0;
                }
                const isShortage = (row.transfer_qty || 1) > whStock;
                return (
                    <div className="flex items-center justify-center">
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${isShortage ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                            {whStock}
                        </span>
                    </div>
                );
            },
            width: '100px',
            align: 'center' as const
        },
        { 
            header: 'الكمية المحولة', 
            accessorKey: 'transfer_qty',
            accessor: (row: Product & { transfer_qty?: number }) => (
                <div className="flex items-center justify-center gap-1.5">
                    <input
                        type="number"
                        min={1}
                        value={row.transfer_qty || 1}
                        onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            onUpdateQty(row.id, val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 h-7 text-center font-mono font-black text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-gray-400 font-bold">قطعة</span>
                </div>
            ),
            isEditable: false,
            width: '120px',
            align: 'center' as const
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
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors group"
                    title="حذف الصنف"
                >
                    <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                </button>
            ),
            width: '50px',
            align: 'center' as const
        }
    ], [onRemove, onUpdateQty, fromWarehouseId]);

    const handleCellUpdate = (rowIndex: number, columnKey: string, value: unknown) => {
        if (columnKey === 'transfer_qty') {
            const rowId = mappedProducts[rowIndex]?.id;
            if (rowId) {
                const newQty = parseInt(String(value), 10) || 1;
                onUpdateQty(rowId, newQty);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl overflow-hidden shadow-sm relative">
             <div className="px-3 py-2 bg-[var(--app-bg)] border-b border-[var(--app-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold text-[var(--app-text)] uppercase tracking-tight">
                        الأصناف المحددة للمناقلة ({items.length})
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        {items.reduce((sum, item) => sum + item.qty, 0)} قطعة إجمالاً
                    </span>
                </div>
             </div>
             
             <div className="flex-1 min-h-0 relative flex flex-col">
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-slate-50/50 dark:bg-slate-900/20">
                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                            <PackagePlus size={28} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                            لم يتم إضافة أي أصناف بعد
                        </h4>
                        <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                            اختر صنفاً من شريط البحث أعلاه أو تصفح أصناف المستودع للبدء بإضافتها إلى أمر المناقلة
                        </p>
                    </div>
                ) : (
                    <ProductExcelGrid
                        products={mappedProducts}
                        isLoading={false}
                        hideActions={true}
                        hideBulkActions={true}
                        extraColumns={extraColumns}
                        onCellUpdate={handleCellUpdate}
                        title="أصناف المناقلة"
                        colorTheme="blue"
                        visibleColumns={['name', 'part_number', 'brand', 'size']}
                    />
                )}
            </div>
        </div>
    );
};

export default TransferItemsList;
