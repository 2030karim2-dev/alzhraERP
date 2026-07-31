import React, { useState, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useSalesStore } from '../../sales/store';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { CartHeader } from './cart/CartHeader';
import { CartItemRow } from './cart/CartItemRow';
import { CartTotals } from './cart/CartTotals';

interface POSCartProps {
    onPay: () => void;
    onSuspend: () => void;
}

export const POSCart: React.FC<POSCartProps> = ({ onPay, onSuspend }) => {
    const { items, updateQuantity, removeItem } = useSalesStore();
    const validItems = Array.isArray(items) ? items.filter((i) => i.productId) : [];
    const { t } = useTranslation();
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);

    const handleRemoveClick = useCallback((productId: string) => {
        removeItem(productId);
    }, [removeItem]);

    const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
        updateQuantity(productId, quantity);
    }, [updateQuantity]);

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900 select-none">
            <CartHeader itemCount={validItems.length} onSuspend={onSuspend} />

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {validItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 dark:text-slate-800 p-6 gap-3">
                        <ShoppingCart size={48} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-center text-slate-300 dark:text-slate-700">
                            {t('waiting_for_items')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col w-full h-full">
                        <table className="w-full text-right border-collapse table-fixed">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                                <tr className="text-[9px] md:text-[11px] text-slate-500 font-bold uppercase">
                                    <th className="p-2 md:p-3 w-4/12 text-right">اسم القطعة</th>
                                    <th className="p-2 md:p-3 w-3/12 text-right">رقم القطعة</th>
                                    <th className="p-2 md:p-3 w-3/12 text-center">الكمية</th>
                                    <th className="p-2 md:p-3 w-2/12 text-left">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {validItems.map((item) => (
                                    <CartItemRow
                                        key={item.productId}
                                        item={item}
                                        editingPriceId={editingPriceId}
                                        setEditingPriceId={setEditingPriceId}
                                        onUpdateQuantity={handleUpdateQuantity}
                                        onRemoveClick={handleRemoveClick}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CartTotals onPay={onPay} canPay={validItems.length > 0} />
        </div>
    );
};
