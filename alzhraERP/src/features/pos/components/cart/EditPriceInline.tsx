import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useSalesStore } from '../../../../features/sales/store';
import { convertCurrency } from '../../../../core/utils/currencyUtils';

export const EditPriceInline: React.FC<{
  productId: string;
  currentPrice: number;
  onDone: () => void;
}> = React.memo(({ productId, currentPrice, onDone }) => {
  const [value, setValue] = useState(String(currentPrice));
  const { items, updateItem, currency, exchangeRate, exchangeOperator } = useSalesStore();

  const commit = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      const idx = items.findIndex(i => i.productId === productId);
      if (idx !== -1) {
        // [FIX] السعر المُدخل بعملة السلة؛ basePrice يجب أن يبقى بالعملة الأساس.
        // الكتابة بنفس القيمة كانت تفسد سعر الأساس بعامل سعر الصرف، فتعود
        // التعديلات لقيم خاطئة عند أي تغيير عملة لاحق.
        let basePrice = num;
        if (currency !== 'SAR') {
          try {
            basePrice = convertCurrency(num, exchangeRate, 'toBase', exchangeOperator);
          } catch {
            // سعر صرف غير صالح: نُبقي basePrice القديم ونطبّق تعديل السعر الظاهر فقط
            onDone();
            return;
          }
        }
        updateItem(idx, 'price', num);
        updateItem(idx, 'basePrice', basePrice);
      }
    }
    onDone();
  };

  return (
    <div
      className="mt-0.5 flex items-center gap-1"
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <input
        type="number"
        value={value}
        autoFocus
        onChange={e => {
          setValue(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onDone();
        }}
        className="w-20 rounded-md border border-blue-300 bg-blue-50 px-1.5 py-0.5 font-mono text-xs font-black text-blue-700 outline-none focus:ring-1 focus:ring-blue-400 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        dir="ltr"
      />
      <button
        onClick={commit}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
      >
        <Check size={10} />
      </button>
      <button
        onClick={onDone}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-400 text-white transition-colors hover:bg-rose-500"
      >
        <X size={10} />
      </button>
    </div>
  );
});

EditPriceInline.displayName = 'EditPriceInline';
