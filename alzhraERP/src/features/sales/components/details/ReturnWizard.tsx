import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  invoice: any;
  onReturn: (invoice: any, items: any[]) => void;
  onCancel: () => void;
  onAlert: (alert: { type: 'success' | 'warning' | 'error'; message: string }) => void;
}

const ReturnWizard: React.FC<Props> = ({ invoice, onReturn, onCancel, onAlert }) => {
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});

  const updateReturnQuantity = (itemId: string, qty: number) => {
    const item = invoice?.invoice_items?.find((i: any) => i.id === itemId);
    const maxQty = item?.quantity || 0;
    setReturnItems(prev => ({
      ...prev,
      [itemId]: Math.min(Math.max(0, qty), maxQty)
    }));
  };

  const totalReturnAmount = useMemo(() => {
    if (!invoice) return 0;
    return Object.entries(returnItems).reduce((sum, [itemId, qty]) => {
      const item = invoice.invoice_items?.find((i: any) => i.id === itemId);
      return sum + (item?.unit_price || 0) * qty;
    }, 0);
  }, [returnItems, invoice]);

  const handleReturnSubmit = () => {
    if (!invoice) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = invoice.invoice_items?.find((i: any) => i.id === itemId);
        return {
          ...item,
          quantity: qty,
          returnQuantity: qty,
          unitPrice: item?.unit_price || 0,
          total: (item?.unit_price || 0) * qty
        };
      });

    if (itemsToReturn.length === 0) {
      onAlert({ type: 'warning', message: 'يرجى اختيار أصناف للإرجاع' });
      return;
    }

    const invalidItems = itemsToReturn.filter((item: any) => {
      const originalItem = invoice.invoice_items?.find((i: any) => i.id === item.id);
      return (item.returnQuantity || 0) > (originalItem?.quantity || 0);
    });

    if (invalidItems.length > 0) {
      onAlert({ type: 'warning', message: 'تحذير: تجاوزت الكمية المتاحة للإرجاع!' });
    } else {
      onAlert({ type: 'success', message: 'جاري إنشاء مرتجع...' });
    }

    onReturn(invoice, itemsToReturn);
  };

  return (
    <>
      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-2">
          <RotateCcw size={20} />
          <h3 className="font-bold">إرجاع جزئي - بنفس السعر</h3>
        </div>
        <p className="text-sm text-rose-600 dark:text-rose-300">
          يمكنك اختيار أصناف وكميات محددة للإرجاع. سيتم استخدام سعر الفاتورة الأصلي.
        </p>
      </div>

      <div className="border-2 border-rose-200 dark:border-rose-800 rounded-xl p-4 bg-rose-50/50 dark:bg-rose-900/10 mt-4">
        <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
          <RotateCcw size={18} />
          اختيار الأصناف للإرجاع
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {invoice.invoice_items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
              <div className="flex-1">
                <p className="font-bold text-gray-800 dark:text-slate-200 text-sm">{item.description}</p>
                <p className="text-xs text-gray-500">
                  المتوفر: {item.quantity} × {formatCurrency(item.unit_price, invoice.currency_code || 'SAR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={returnItems[item.id] || 0}
                  onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 0)}
                  className="w-16 p-2 text-center font-bold border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                />
                <span className="text-xs text-gray-500">/ {item.quantity}</span>
              </div>
              <div className="w-24 text-left">
                <span className="font-mono font-bold text-rose-600 text-sm">
                  {formatCurrency((returnItems[item.id] || 0) * item.unit_price, invoice.currency_code || 'SAR')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-700 flex justify-between items-center">
          <span className="font-bold text-rose-700 dark:text-rose-400">إجمالي الإرجاع:</span>
          <span className="font-mono font-bold text-xl text-rose-600">
            {formatCurrency(totalReturnAmount, invoice.currency_code || 'SAR')}
          </span>
        </div>
        <div className="mt-4 flex gap-2 w-full">
            <button
                onClick={onCancel}
                className="py-2 px-4 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold rounded-lg transition-colors w-1/3"
            >
                إلغاء
            </button>
            <button
            onClick={handleReturnSubmit}
            className="w-2/3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
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
