import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatCurrency, parseNumberFlexible } from '../../../../core/utils';
import type { Invoice, InvoiceItem } from '../../../returns/types';

interface Props {
  invoice: Invoice;
  onReturn: (invoice: Invoice, items: InvoiceItem[]) => void;
  onCancel: () => void;
  onAlert: (alert: { type: 'success' | 'warning' | 'error'; message: string }) => void;
}

const ReturnWizard: React.FC<Props> = ({ invoice, onReturn, onCancel, onAlert }) => {
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});

  const updateReturnQuantity = (itemId: string, qty: number) => {
    const item = invoice?.invoice_items?.find((i: InvoiceItem) => i.id === itemId);
    const maxQty = item?.quantity || 0;
    setReturnItems(prev => ({
      ...prev,
      [itemId]: Math.min(Math.max(0, qty), maxQty),
    }));
  };

  const totalReturnAmount = useMemo(() => {
    if (!invoice) return 0;
    return Object.entries(returnItems).reduce((sum, [itemId, qty]) => {
      const item = invoice.invoice_items?.find((i: InvoiceItem) => i.id === itemId);
      return sum + (item?.unit_price || 0) * qty;
    }, 0);
  }, [returnItems, invoice]);

  const handleReturnSubmit = () => {
    if (!invoice) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = invoice.invoice_items?.find((i: InvoiceItem) => i.id === itemId);
        return {
          ...item,
          quantity: qty,
          returnQuantity: qty,
          unitPrice: item?.unit_price || 0,
          total: (item?.unit_price || 0) * qty,
        };
      });

    if (itemsToReturn.length === 0) {
      onAlert({ type: 'warning', message: 'يرجى اختيار أصناف للإرجاع' });
      return;
    }

    const invalidItems = itemsToReturn.filter(item => {
      const originalItem = invoice.invoice_items?.find((i: InvoiceItem) => i.id === item.id);
      return (item.returnQuantity || 0) > (originalItem?.quantity || 0);
    });

    if (invalidItems.length > 0) {
      onAlert({ type: 'warning', message: 'تحذير: تجاوزت الكمية المتاحة للإرجاع!' });
    } else {
      onAlert({ type: 'success', message: 'جاري إنشاء مرتجع...' });
    }

    onReturn(invoice, itemsToReturn as unknown as InvoiceItem[]);
  };

  return (
    <>
      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
        <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <RotateCcw size={20} />
          <h3 className="font-bold">إرجاع جزئي - بنفس السعر</h3>
        </div>
        <p className="text-sm text-rose-600 dark:text-rose-300">
          يمكنك اختيار أصناف وكميات محددة للإرجاع. سيتم استخدام سعر الفاتورة الأصلي.
        </p>
      </div>

      <div className="mt-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 p-4 dark:border-rose-800 dark:bg-rose-900/10">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
          <RotateCcw size={18} />
          اختيار الأصناف للإرجاع
        </h3>
        <div className="custom-scrollbar max-h-48 space-y-2 overflow-y-auto">
          {invoice.invoice_items?.map((item: InvoiceItem) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                  {item.description}
                </p>
                <p className="text-xs text-gray-500">
                  المتوفر: {item.quantity} ×{' '}
                  {formatCurrency(item.unit_price, invoice.currency_code || 'SAR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={item.quantity}
                  value={returnItems[item.id] || 0}
                  onChange={e => {
                    const parsed = parseNumberFlexible(e.target.value);
                    updateReturnQuantity(item.id, Number.isNaN(parsed) ? 0 : parsed);
                  }}
                  className="w-16 rounded-lg border border-gray-200 p-2 text-center text-sm font-bold dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <span className="text-xs text-gray-500">/ {item.quantity}</span>
              </div>
              <div className="w-24 text-left">
                <span className="font-mono text-sm font-bold text-rose-600">
                  {formatCurrency(
                    (returnItems[item.id] || 0) * item.unit_price,
                    invoice.currency_code ?? 'SAR'
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-rose-200 pt-3 dark:border-rose-700">
          <span className="font-bold text-rose-700 dark:text-rose-400">إجمالي الإرجاع:</span>
          <span className="font-mono text-xl font-bold text-rose-600">
            {formatCurrency(totalReturnAmount, invoice.currency_code ?? 'SAR')}
          </span>
        </div>
        <div className="mt-4 flex w-full gap-2">
          <button
            onClick={onCancel}
            className="w-1/3 rounded-lg bg-gray-200 px-4 py-2 font-bold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            إلغاء
          </button>
          <button
            onClick={handleReturnSubmit}
            className="flex w-2/3 items-center justify-center gap-2 rounded-lg bg-rose-600 py-2 font-bold text-white transition-colors hover:bg-rose-500"
          >
            <RotateCcw size={18} />
            تأكيد الإرجاع
          </button>
        </div>
      </div>
    </>
  );
};

export default ReturnWizard;
