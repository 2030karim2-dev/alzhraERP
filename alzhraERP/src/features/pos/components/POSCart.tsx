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
  isProcessing?: boolean | undefined;
}

export const POSCart: React.FC<POSCartProps> = ({ onPay, onSuspend, isProcessing }) => {
  const { items, updateQuantity, removeItem } = useSalesStore();
  const validItems = Array.isArray(items) ? items.filter(i => i.productId) : [];
  const { t } = useTranslation();
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);

  const handleRemoveClick = useCallback(
    (productId: string) => {
      removeItem(productId);
    },
    [removeItem]
  );

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) => {
      updateQuantity(productId, quantity);
    },
    [updateQuantity]
  );

  return (
    <div className="flex min-h-0 flex-1 select-none flex-col overflow-hidden bg-[var(--app-surface)]">
      <CartHeader itemCount={validItems.length} onSuspend={onSuspend} />

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {validItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-slate-200 dark:text-slate-800 max-md:gap-3 max-md:p-3">
            <ShoppingCart size={48} strokeWidth={1} />
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300 dark:text-slate-700">
              {t('waiting_for_items')}
            </p>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">
            <table className="w-full table-fixed border-collapse text-right">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <tr className="text-[10px] font-bold uppercase text-slate-500 md:text-[11px]">
                  <th className="w-4/12 p-2 text-right max-md:p-2 md:p-3">اسم القطعة</th>
                  <th className="w-3/12 p-2 text-right max-md:p-2 md:p-3">رقم القطعة</th>
                  <th className="w-3/12 p-2 text-center max-md:p-2 md:p-3">الكمية</th>
                  <th className="w-2/12 p-2 text-left max-md:p-2 md:p-3">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {validItems.map(item => (
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

      <CartTotals onPay={onPay} canPay={validItems.length > 0} isProcessing={isProcessing} />
    </div>
  );
};
