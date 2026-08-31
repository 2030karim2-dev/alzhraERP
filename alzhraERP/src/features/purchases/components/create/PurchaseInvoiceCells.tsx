import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { PurchaseInvoiceItem } from '../../store';

interface ProductCellProps {
  item: PurchaseInvoiceItem;
  index: number;
  onOpenSearch: (index: number, query?: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: keyof PurchaseInvoiceItem
  ) => void;
}

export const PurchaseProductCell: React.FC<ProductCellProps> = ({
  item,
  index,
  onOpenSearch,
  onKeyDown,
}) => (
  <td className="border-l p-0 dark:border-slate-800">
    <div className="group/cell flex items-center px-2.5 max-md:px-1">
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
        className="flex-1 cursor-pointer bg-transparent py-2.5 text-right text-sm font-bold text-blue-900 outline-none placeholder:text-blue-300 dark:text-slate-100 dark:placeholder:text-slate-600 max-md:py-1.5"
        placeholder="اختر صنفاً..."
      />
      <Search
        size={14}
        className="text-blue-400 opacity-0 transition-opacity group-hover/cell:opacity-100 max-md:opacity-100"
      />
    </div>
  </td>
);

interface NumericCellProps {
  value: number;
  field: keyof PurchaseInvoiceItem;
  index: number;
  placeholder?: string;
  className?: string;
  onChange: (index: number, field: keyof PurchaseInvoiceItem, value: number) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: keyof PurchaseInvoiceItem
  ) => void;
}

export const PurchaseNumericCell: React.FC<NumericCellProps> = ({
  value,
  field,
  index,
  placeholder,
  className = '',
  onChange,
  onKeyDown,
}) => (
  <td className="border-l p-0 dark:border-slate-800">
    <input
      type="number"
      value={value || ''}
      onChange={event => {
        onChange(index, field, parseFloat(event.target.value) || 0);
      }}
      onKeyDown={event => {
        onKeyDown(event, index, field);
      }}
      data-row-index={index}
      data-col-field={field}
      className={`h-full min-h-8 w-full bg-transparent p-2 text-center font-mono text-sm font-bold outline-none max-md:min-h-7 max-md:p-1 md:text-base ${className}`}
      placeholder={placeholder}
    />
  </td>
);

interface TotalCellProps {
  item: PurchaseInvoiceItem;
  index: number;
  showDiscount: boolean;
  onChange: (index: number, field: keyof PurchaseInvoiceItem, value: number) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: keyof PurchaseInvoiceItem
  ) => void;
}

export const PurchaseTotalCell: React.FC<TotalCellProps> = ({
  item,
  index,
  showDiscount,
  onChange,
  onKeyDown,
}) => {
  const total = item.quantity * item.costPrice - (showDiscount ? item.discount : 0);

  const handleTotalChange = (newTotal: number) => {
    const currentQty = item.quantity || 1;
    const discount = showDiscount ? item.discount || 0 : 0;
    if (item.quantity === 0) {
      onChange(index, 'quantity', 1);
      onChange(index, 'costPrice', newTotal + discount);
    } else {
      const newCost = Math.max(0, (newTotal + discount) / currentQty);
      onChange(index, 'costPrice', Number(newCost.toFixed(4)));
    }
  };

  return (
    <td className="border-l bg-blue-50/50 p-0 dark:border-slate-800 dark:bg-slate-950/30">
      <input
        type="number"
        value={total !== 0 ? Number(total.toFixed(2)) : ''}
        onChange={event => {
          handleTotalChange(parseFloat(event.target.value) || 0);
        }}
        onKeyDown={event => {
          onKeyDown(event, index, 'costPrice');
        }}
        data-row-index={index}
        data-col-field="total"
        className="h-full min-h-8 w-full bg-transparent p-2 text-left font-mono text-sm font-bold text-blue-900 outline-none transition-colors focus:bg-blue-100/70 dark:text-white dark:focus:bg-slate-800 max-md:min-h-7 max-md:p-1 md:text-base"
        placeholder="0.00"
        dir="ltr"
        title="يمكنك تعديل إجمالي الصنف مباشرة وسيتم تعديل سعر التكلفة تلقائياً"
      />
    </td>
  );
};

interface RemoveCellProps {
  onRemove: () => void;
}

export const PurchaseRemoveCell: React.FC<RemoveCellProps> = ({ onRemove }) => (
  <td className="bg-blue-50/30 p-0 dark:bg-slate-900/30">
    <button
      onClick={onRemove}
      aria-label="حذف السطر"
      className="flex h-full min-h-8 w-full items-center justify-center text-rose-300 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 max-md:min-h-7"
    >
      <Trash2 size={15} />
    </button>
  </td>
);
