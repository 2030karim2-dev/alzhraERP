import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { SalesCartItem } from '../../store';

interface InvoiceRowProps {
    item: SalesCartItem;
    index: number;
    showDiscount: boolean;
    onUpdate: (index: number, field: keyof SalesCartItem, value: string | number) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof SalesCartItem) => void;
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

const NumberInput: React.FC<NumberInputProps> = ({ value, field, index, onUpdate, onKeyDown, className = '', placeholder }) => (
    <input
        type="number"
        value={value || ''}
        onChange={(event) => { onUpdate(index, field, parseFloat(event.target.value) || 0); }}
        onKeyDown={(event) => { onKeyDown(event, index, field); }}
        data-row-index={index}
        data-col-field={field}
        className={`w-full h-full p-2 max-md:p-1.5 bg-transparent outline-none text-center font-mono font-bold text-[11px] ${className}`}
        placeholder={placeholder}
    />
);

interface ProductNameCellProps {
    item: SalesCartItem;
    index: number;
    onKeyDown: InvoiceRowProps['onKeyDown'];
    onOpenSearch: InvoiceRowProps['onOpenSearch'];
}

const ProductNameCell: React.FC<ProductNameCellProps> = ({ item, index, onKeyDown, onOpenSearch }) => (
    <td className="p-0 border-l dark:border-slate-800">
        <div className="flex items-center px-3 max-md:px-1.5 group/cell">
            <input
                type="text"
                value={item.name}
                data-row-index={index}
                data-col-field="name"
                onKeyDown={(event) => { onKeyDown(event, index, 'name'); }}
                onClick={() => { onOpenSearch(index, item.name || ''); }}
                readOnly
                className="flex-1 py-3 max-md:py-2 bg-transparent outline-none text-right font-bold text-[11px] text-gray-800 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-slate-600 cursor-pointer"
                placeholder="انقر للبحث عن صنف..."
            />
            <Search size={12} className="text-gray-400 opacity-0 group-hover/cell:opacity-100 max-md:opacity-100 transition-opacity" />
        </div>
    </td>
);

const InvoiceRow: React.FC<InvoiceRowProps> = ({ item, index, showDiscount, onUpdate, onKeyDown, onRemove, onOpenSearch }) => {
    const total = (item.quantity * item.price) - (showDiscount ? (item.discount || 0) : 0);

    return (
        <tr className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
            <td className="p-2 max-md:p-1 text-center text-[10px] max-md:text-[9px] font-mono font-bold text-gray-300 dark:text-slate-600 border-l dark:border-slate-800 max-md:hidden">
                {index + 1}
            </td>
            <ProductNameCell item={item} index={index} onKeyDown={onKeyDown} onOpenSearch={onOpenSearch} />
            <td className="p-0 border-l dark:border-slate-800">
                <NumberInput value={item.quantity} field="quantity" index={index} onUpdate={onUpdate} onKeyDown={onKeyDown} placeholder="0" />
            </td>
            <td className="p-0 border-l dark:border-slate-800">
                <NumberInput value={item.price} field="price" index={index} onUpdate={onUpdate} onKeyDown={onKeyDown} className="text-emerald-600 focus:bg-emerald-50 dark:focus:bg-slate-800" placeholder="0.00" />
            </td>
            {showDiscount && (
                <td className="p-0 border-l dark:border-slate-800">
                    <NumberInput value={item.discount} field="discount" index={index} onUpdate={onUpdate} onKeyDown={onKeyDown} className="text-rose-500 focus:bg-rose-50 dark:focus:bg-slate-800" placeholder="0" />
                </td>
            )}
            <td dir="ltr" className="p-2 max-md:p-1 text-left font-mono font-bold text-[11px] text-gray-800 dark:text-white bg-gray-50/50 dark:bg-slate-800/30">
                {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
            <td className="p-0">
                <button onClick={() => { onRemove(index); }} aria-label="حذف السطر" className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all">
                    <Trash2 size={12} />
                </button>
            </td>
        </tr>
    );
};

export default InvoiceRow;
