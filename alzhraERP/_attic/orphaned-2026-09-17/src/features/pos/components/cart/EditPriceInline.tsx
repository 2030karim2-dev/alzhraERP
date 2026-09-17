import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useSalesStore } from '../../../../features/sales/store';
import {
  convertCurrency,
  parseNumberFlexible,
  normalizeArabicDigits,
} from '../../../../core/utils';

export const EditPriceInline: React.FC<{
  productId: string;
  currentPrice: number;
  onDone: () => void;
}> = React.memo(({ productId, currentPrice, onDone }) => {
  const [value, setValue] = useState(String(currentPrice));
  const { items, updateItem, currency, exchangeRate, exchangeOperator } = useSalesStore();

  const commit = () => {
    const num = parseNumberFlexible(value);
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
    <div className="flex w-full items-center gap-0.5" onClick={e => e.stopPropagation()}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        autoFocus
        onFocus={e => e.target.select()}
        onChange={e => {
          let raw = normalizeArabicDigits(e.target.value).replace(/[،٫]/g, '.');
          if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
          if (raw === '' || raw === '.' || /^\d*\.?\d*$/.test(raw)) {
            setValue(raw);
          }
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onDone();
          }
        }}
        className="w-full min-w-0 rounded border border-blue-400 bg-white px-1 py-0.5 font-mono text-[11px] font-black text-blue-700 outline-none ring-1 ring-blue-500 dark:border-blue-600 dark:bg-slate-900 dark:text-blue-300"
        dir="ltr"
      />
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          commit();
        }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
        title="تأكيد (Enter)"
      >
        <Check size={10} />
      </button>
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          onDone();
        }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-rose-400 text-white transition-colors hover:bg-rose-500"
        title="إلغاء (Esc)"
      >
        <X size={10} />
      </button>
    </div>
  );
});

EditPriceInline.displayName = 'EditPriceInline';
