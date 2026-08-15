import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { PurchaseInvoiceItem } from '../../store';

interface ProductCellProps {
    item: PurchaseInvoiceItem;
    index: number;
    onOpenSearch: (index: number, query?: string) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, index: number, field: keyof PurchaseInvoiceItem) => void;
}

export const PurchaseProductCell: React.FC<ProductCellProps> = ({ item, index, onOpenSearch, onKeyDown }) => (
    <td className="p-0 border-l dark:border-slate-800">
        <div className="flex items-center px-2 max-md:px-0.5">
            <input
                type="text"
                value={item.name}
                data-row-index={index}
                data-col-field="name"
                onKeyDown={(event) => { onKeyDown(event, index, 'name'); }}
                onClick={() => { onOpenSearch(index, item.name || ''); }}
                readOnly
                className="flex-1 p-2 max-md:p-0.5 bg-transparent outline-none text-right font-bold text-[11px] max-md:text-[8px] text-blue-900 dark:text-slate-100 cursor-pointer placeholder:text-blue-200"
                placeholder="اختر صنفاً..."
            />
            <Search size={12} className="w-3 h-3 max-md:w-2.5 max-md:h-2.5 text-blue-300 opacity-0 group-hover:opacity-100 max-md:opacity-100" />
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
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, index: number, field: keyof PurchaseInvoiceItem) => void;
}

export const PurchaseNumericCell: React.FC<NumericCellProps> = ({ value, field, index, placeholder, className = '', onChange, onKeyDown }) => (
    <td className="p-0 border-l dark:border-slate-800">
        <input
            type="number"
            value={value || ''}
            onChange={(event) => { onChange(index, field, parseFloat(event.target.value) || 0); }}
            onKeyDown={(event) => { onKeyDown(event, index, field); }}
            data-row-index={index}
            data-col-field={field}
            className={`w-full h-full min-h-7 max-md:min-h-6 p-2 max-md:p-0.5 bg-transparent outline-none text-center font-mono font-bold text-[11px] max-md:text-[8px] ${className}`}
            placeholder={placeholder}
        />
    </td>
);

interface TotalCellProps {
    item: PurchaseInvoiceItem;
    showDiscount: boolean;
}

export const PurchaseTotalCell: React.FC<TotalCellProps> = ({ item, showDiscount }) => (
    <td dir="ltr" className="p-2 max-md:p-0.5 text-left font-mono font-bold text-[11px] max-md:text-[8px] text-blue-900 dark:text-white bg-blue-50/50 dark:bg-slate-950/30">
        {((item.quantity * item.costPrice) - (showDiscount ? item.discount : 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </td>
);

interface RemoveCellProps {
    onRemove: () => void;
}

export const PurchaseRemoveCell: React.FC<RemoveCellProps> = ({ onRemove }) => (
    <td className="p-0 bg-blue-50/30">
        <button onClick={onRemove} aria-label="حذف السطر" className="w-full h-full min-h-7 max-md:min-h-6 flex items-center justify-center text-rose-300 hover:text-rose-600 transition-colors">
            <Trash2 size={12} className="max-md:w-2.5 max-md:h-2.5" />
        </button>
    </td>
);
