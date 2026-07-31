import React from 'react';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { useSalesStore } from '../../../sales/store';
import type { PaymentAccount } from './paymentTypes';

interface ItemPriceEditorProps {
    show: boolean;
    onToggle: () => void;
    items: Array<{ name: string; quantity: number; price: number; productId: string }>;
    allItems: Array<{ name: string; quantity: number; price: number; productId: string }>;
    currency: string;
}

export const ItemPriceEditor: React.FC<ItemPriceEditorProps> = ({
    show, onToggle, items, allItems, currency
}) => {
    const { updateItem } = useSalesStore();

    return (
        <div className="border-b border-slate-100 dark:border-slate-800">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
                <span className="flex items-center gap-1.5"><Edit3 size={12} />تعديل أسعار الأصناف</span>
                {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {show && (
                <div className="px-3 pb-3 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/30">
                    {items.map((item) => {
                        const realIdx = allItems.findIndex(i => i.productId === item.productId);
                        return (
                            <div key={item.productId} className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{item.name}</p>
                                    <p className="text-[9px] text-slate-400">×{item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[9px] text-slate-400">سعر:</span>
                                    <input
                                        type="number"
                                        defaultValue={item.price}
                                        onBlur={e => {
                                            const v = parseFloat(e.target.value);
                                            if (!isNaN(v) && v >= 0 && realIdx !== -1) {
                                                updateItem(realIdx, 'price', v);
                                                updateItem(realIdx, 'basePrice', v);
                                            }
                                        }}
                                        className="w-20 text-xs font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 text-center"
                                        dir="ltr"
                                    />
                                    <span className="text-[9px] text-slate-400">{currency}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ItemPriceEditor;