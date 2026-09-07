import React, { useState, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useSalesStore } from '../../sales/store';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { CartHeader } from './cart/CartHeader';
import { ExcelCartTable } from './cart/ExcelCartTable';
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

      <div className="min-h-0 flex-1 overflow-hidden">
        {validItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-slate-200 dark:text-slate-800 max-md:gap-3 max-md:p-3">
            <ShoppingCart size={48} strokeWidth={1} />
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300 dark:text-slate-700">
              {t('waiting_for_items')}
            </p>
          </div>
        ) : (
          <ExcelCartTable
            items={validItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveClick={handleRemoveClick}
            editingPriceId={editingPriceId}
            setEditingPriceId={setEditingPriceId}
          />
        )}
      </div>

      <CartTotals onPay={onPay} canPay={validItems.length > 0} isProcessing={isProcessing} />
    </div>
  );
};
