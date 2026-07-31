
import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import { SalesCartItem } from '../../store';

interface InvoiceRowProps {
    item: SalesCartItem;
    index: number;
    showDiscount: boolean;

    onUpdate: (index: number, field: keyof SalesCartItem, value: string | number) => void;
    onRemove: (index: number) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof SalesCartItem) => void;
    onOpenSearch: (index: number, query: string) => void;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({
    item,
    index,
    showDiscount,

    onUpdate,
    onRemove,
    onKeyDown,
    onOpenSearch
}) => {
    return (
        <tr className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
            <td className="p-2 text-center text-[10px] font-mono font-bold text-gray-300 dark:text-slate-600 border-l dark:border-slate-800">
                {index + 1}
            </td>

            <td className="p-0 border-l dark:border-slate-800">
                <div className="flex items-center px-3 group/cell">
                    <input
                        type="text"
                        value={item.name}
                        data-row-index={index}
                        data-col-field="name"
                        onKeyDown={(e) => onKeyDown(e, index, 'name')}
                        onClick={() => onOpenSearch(index, (item.name || ''))}
                        readOnly
                        className="flex-1 py-3 bg-transparent outline-none text-right font-bold text-[11px] text-gray-800 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-slate-600 cursor-pointer"
                        placeholder="انقر للبحث عن صنف..."
                    />
                    <Search size={12} className="text-gray-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                </div>
            </td>

            <td className="p-0 border-l dark:border-slate-800">
                <input type="number" value={item.quantity || ''} onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)} onKeyDown={(e) => onKeyDown(e, index, 'quantity')} data-row-index={index} data-col-field="quantity" className="w-full h-full p-2 bg-transparent outline-none text-center font-mono font-bold text-[11px] focus:bg-blue-50 dark:focus:bg-slate-800" placeholder="0" />
            </td>
            <td className="p-0 border-l dark:border-slate-800">
                <input type="number" value={item.price || ''} onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)} onKeyDown={(e) => onKeyDown(e, index, 'price')} data-row-index={index} data-col-field="price" className="w-full h-full p-2 bg-transparent outline-none text-center font-mono font-bold text-[11px] text-emerald-600 focus:bg-emerald-50 dark:focus:bg-slate-800" placeholder="0.00" />
            </td>

            {showDiscount && (
                <td className="p-0 border-l dark:border-slate-800">
                    <input type="number" value={item.discount || ''} onChange={(e) => onUpdate(index, 'discount', parseFloat(e.target.value) || 0)} onKeyDown={(e) => onKeyDown(e, index, 'discount')} data-row-index={index} data-col-field="discount" className="w-full h-full p-2 bg-transparent outline-none text-center font-mono font-bold text-[11px] text-rose-500 focus:bg-rose-50 dark:focus:bg-slate-800" placeholder="0" />
                </td>
            )}

            <td dir="ltr" className="p-2 text-left font-mono font-bold text-[11px] text-gray-800 dark:text-white bg-gray-50/50 dark:bg-slate-800/30">
                {((Number(item.quantity) * Number(item.price)) - (showDiscount ? Number(item.discount || 0) : 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>

            <td className="p-0">
                <button onClick={() => onRemove(index)} className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all">
                    <Trash2 size={12} />
                </button>
            </td>
        </tr>
    );
};

export default InvoiceRow;
