import React from 'react';
import { Trash2, Plus, Minus, Edit3, Store, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { EditPriceInline } from './EditPriceInline';
import { SalesCartItem } from '../../../sales/store';

interface CartItemRowProps {
    item: SalesCartItem;
    editingPriceId: string | null;
    setEditingPriceId: (id: string | null) => void;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveClick: (productId: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = React.memo(({
    item,
    editingPriceId,
    setEditingPriceId,
    onUpdateQuantity,
    onRemoveClick,
}) => {
    const totalAvailable = (item.warehouse_distribution || []).reduce((sum, wd) => sum + wd.quantity, 0);
    const isOverStock = item.quantity > totalAvailable;
    const isLowStock = totalAvailable > 0 && item.quantity >= totalAvailable;

    return (
        <tr
            className={cn(
                "group hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors animate-in slide-in-from-right-2 duration-200",
                isOverStock && "bg-rose-50/50 dark:bg-rose-900/10"
            )}
        >
            {/* Name & Warehouse Column */}
            <td className="p-2 md:p-3 align-top border-l border-slate-100 dark:border-slate-800/50">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[10px] md:text-xs leading-snug line-clamp-2" title={item.name}>
                    {item.name}
                </h4>
                {item.warehouse_distribution && item.warehouse_distribution.length > 0 && (
                    <div className="w-full flex flex-wrap gap-1 mt-1.5">
                        {item.warehouse_distribution.map((wd, i) => (
                            <span key={i} className={cn(
                                "inline-flex items-center gap-0.5 text-[8px] md:text-[9px] px-1 py-0.5 rounded border",
                                wd.quantity > 0
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                    : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700"
                            )}>
                                <Store size={8} className="md:w-2.5 md:h-2.5" />
                                <span className="truncate max-w-[50px] md:max-w-[70px]" title={wd.warehouse_name}>{wd.warehouse_name}</span>
                                <span className="font-bold font-mono">({formatNumberDisplay(wd.quantity)})</span>
                            </span>
                        ))}
                    </div>
                )}
                {isOverStock && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[8px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-700">
                        <AlertTriangle size={10} />
                        <span>الكمية المطلوبة ({item.quantity}) تتجاوز المتاح ({totalAvailable})</span>
                    </div>
                )}
                {isLowStock && !isOverStock && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[8px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-700">
                        <AlertTriangle size={10} />
                        <span>تقريباً نفذ المخزون ({totalAvailable} متاح)</span>
                    </div>
                )}
            </td>

            {/* Part Number Column */}
            <td className="p-2 md:p-3 align-top text-[10px] md:text-xs text-slate-600 dark:text-slate-400 font-mono border-l border-slate-100 dark:border-slate-800/50 break-all">
                {item.partNumber || '-'}
            </td>

            {/* Quantity Column */}
            <td className="p-2 md:p-3 align-top border-l border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center justify-center gap-2 md:gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 md:p-1.5 w-fit mx-auto">
                    <button
                        onClick={() => {
                            if (item.quantity > 1) onUpdateQuantity(item.productId, item.quantity - 1);
                            else onRemoveClick(item.productId);
                        }}
                        className={cn(
                            "w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center transition-all active:scale-90",
                            item.quantity === 1
                                ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                : "text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                        title={item.quantity === 1 ? "حذف" : "تقليل"}
                    >
                        {item.quantity === 1 ? <Trash2 size={14} className="md:w-4 md:h-4" /> : <Minus size={14} className="md:w-4 md:h-4" />}
                    </button>

                    <span className="w-8 md:w-10 text-center font-mono font-bold text-sm md:text-base text-slate-800 dark:text-slate-100">
                        {item.quantity}
                    </span>

                    <button
                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
                        title="زيادة"
                    >
                        <Plus size={14} className="md:w-4 md:h-4" />
                    </button>
                </div>
            </td>

            {/* Price & Total Column */}
            <td className="p-2 md:p-3 align-top text-left">
                {editingPriceId === item.productId ? (
                    <EditPriceInline
                        productId={item.productId}
                        currentPrice={item.price}
                        onDone={() => setEditingPriceId(null)}
                    />
                ) : (
                    <div className="flex flex-col items-end gap-1">
                        <span dir="ltr" className="text-[11px] md:text-[13px] font-black text-slate-800 dark:text-slate-100 font-mono block">
                            {formatCurrency(item.price * item.quantity)}
                        </span>
                        <button
                            onClick={() => setEditingPriceId(item.productId)}
                            className="text-[9px] md:text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 group/price transition-colors bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50"
                            title="تعديل السعر الوحدة"
                        >
                            <span dir="ltr" className="font-mono">{formatCurrency(item.price)}</span>
                            <Edit3 size={8} className="md:w-2.5 md:h-2.5 opacity-40 group-hover/price:opacity-100" />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
});

CartItemRow.displayName = 'CartItemRow';
