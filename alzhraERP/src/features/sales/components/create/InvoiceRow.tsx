import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { SalesCartItem } from '../../store';

import { normalizeArabicDigits } from '@/core/utils';

interface InvoiceRowProps {
  item: SalesCartItem;
  index: number;
  showDiscount: boolean;
  onUpdate: (index: number, field: keyof SalesCartItem, value: string | number) => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: keyof SalesCartItem | 'total'
  ) => void;
  onRemove: (index: number) => void;
  onOpenSearch: (index: number, query: string) => void;
}

type NumberField = 'quantity' | 'price' | 'discount';

interface NumberInputProps {
  value: number;
  field: NumberField;
  index: number;
  onUpdate: InvoiceRowProps['onUpdate'];
  onKeyDown: InvoiceRowProps['onKeyDown'];
  className?: string;
  placeholder: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  field,
  index,
  onUpdate,
  onKeyDown,
  className = '',
  placeholder,
}) => {
  const [localVal, setLocalVal] = React.useState<string>(
    value !== 0 && value !== undefined && !isNaN(value) ? String(value) : ''
  );

  React.useEffect(() => {
    const num = parseFloat(localVal) || 0;
    if (num !== value) {
      setLocalVal(value !== 0 && value !== undefined && !isNaN(value) ? String(value) : '');
    }
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let raw = normalizeArabicDigits(event.target.value).replace(/[،٫]/g, '.');
    if (raw.includes(',') && !raw.includes('.')) {
      raw = raw.replace(',', '.');
    }
    // Allow empty, partial decimals like '0.', '.5', or valid numeric string
    if (raw === '' || raw === '-' || raw === '.' || /^-?\d*\.?\d*$/.test(raw)) {
      setLocalVal(raw);
      const parsed = parseFloat(raw);
      onUpdate(index, field, isNaN(parsed) ? 0 : parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localVal}
      onChange={handleChange}
      onKeyDown={event => {
        onKeyDown(event, index, field);
      }}
      data-row-index={index}
      data-col-field={field}
      className={`h-full w-full bg-transparent p-2 text-center font-mono text-sm font-bold outline-none max-md:p-1.5 md:text-base ${className}`}
      placeholder={placeholder}
      dir="ltr"
    />
  );
};

interface ProductNameCellProps {
  item: SalesCartItem;
  index: number;
  onKeyDown: InvoiceRowProps['onKeyDown'];
  onOpenSearch: InvoiceRowProps['onOpenSearch'];
}

const ProductNameCell: React.FC<ProductNameCellProps> = ({
  item,
  index,
  onKeyDown,
  onOpenSearch,
}) => (
  <td className="border-l p-0 dark:border-slate-800">
    <div className="group/cell flex items-center px-3 max-md:px-1.5">
      <input
        type="text"
        value={item.name}
        data-row-index={index}
        data-col-field="name"
        onKeyDown={event => {
          onKeyDown(event, index, 'name');
        }}
        onClick={() => {
          onOpenSearch(index, item.name || '');
        }}
        readOnly
        className="flex-1 cursor-pointer bg-transparent py-3 text-right text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 dark:text-slate-100 dark:placeholder:text-slate-600 max-md:py-2"
        placeholder="اختر صنفاً..."
      />
      <Search
        size={14}
        className="text-gray-400 opacity-0 transition-opacity group-hover/cell:opacity-100 max-md:opacity-100"
      />
    </div>
  </td>
);

const InvoiceRow: React.FC<InvoiceRowProps> = ({
  item,
  index,
  showDiscount,
  onUpdate,
  onKeyDown,
  onRemove,
  onOpenSearch,
}) => {
  const total = item.quantity * item.price - (showDiscount ? item.discount || 0 : 0);

  const handleTotalChange = (newTotal: number) => {
    const currentQty = item.quantity || 1;
    const discount = showDiscount ? item.discount || 0 : 0;
    if (item.quantity === 0) {
      onUpdate(index, 'quantity', 1);
      onUpdate(index, 'price', newTotal + discount);
    } else {
      const newPrice = Math.max(0, (newTotal + discount) / currentQty);
      onUpdate(index, 'price', Number(newPrice.toFixed(4)));
    }
  };

  return (
    <tr className="group h-11 transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10 max-md:h-9">
      <td className="border-l p-2 text-center font-mono text-xs font-bold text-gray-400 dark:border-slate-800 dark:text-slate-500 max-md:hidden max-md:p-1">
        {index + 1}
      </td>
      <ProductNameCell
        item={item}
        index={index}
        onKeyDown={onKeyDown}
        onOpenSearch={onOpenSearch}
      />
      <td className="border-l p-0 dark:border-slate-800">
        <NumberInput
          value={item.quantity}
          field="quantity"
          index={index}
          onUpdate={onUpdate}
          onKeyDown={onKeyDown}
          placeholder="0"
          className="text-gray-900 focus:bg-blue-50 dark:text-white dark:focus:bg-slate-800"
        />
      </td>
      <td className="border-l p-0 dark:border-slate-800">
        <NumberInput
          value={item.price}
          field="price"
          index={index}
          onUpdate={onUpdate}
          onKeyDown={onKeyDown}
          className="text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400 dark:focus:bg-slate-800"
          placeholder="0.00"
        />
      </td>
      {showDiscount && (
        <td className="border-l p-0 dark:border-slate-800">
          <NumberInput
            value={item.discount}
            field="discount"
            index={index}
            onUpdate={onUpdate}
            onKeyDown={onKeyDown}
            className="text-rose-500 focus:bg-rose-50 dark:focus:bg-slate-800"
            placeholder="0"
          />
        </td>
      )}
      <td className="border-l bg-gray-50/50 p-0 dark:border-slate-800 dark:bg-slate-800/30">
        <input
          type="number"
          step="any"
          value={total !== 0 ? Number(total.toFixed(2)) : ''}
          onChange={event => {
            let raw = normalizeArabicDigits(event.target.value).replace(/[،٫]/g, '.');
            if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
            handleTotalChange(parseFloat(raw) || 0);
          }}
          onKeyDown={event => {
            onKeyDown(event, index, 'total');
          }}
          data-row-index={index}
          data-col-field="total"
          className="h-full w-full bg-transparent p-2 text-left font-mono text-sm font-bold text-gray-900 outline-none transition-colors focus:bg-blue-50 dark:text-white dark:focus:bg-slate-800 max-md:p-1.5 md:text-base"
          placeholder="0.00"
          dir="ltr"
          title="يمكنك تعديل إجمالي الصنف مباشرة وسيتم تعديل سعر الوحدة تلقائياً"
        />
      </td>
      <td className="p-0">
        <button
          onClick={() => {
            onRemove(index);
          }}
          aria-label="حذف السطر"
          className="flex h-full w-full items-center justify-center text-gray-300 transition-all hover:bg-rose-50 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-rose-950/30"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
};

export default InvoiceRow;
