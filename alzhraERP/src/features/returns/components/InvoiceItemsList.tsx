import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, RotateCcw, Search, X } from 'lucide-react';
import type { InvoiceItem } from '../types';
import { formatCurrency } from '../../../core/utils';

interface InvoiceItemsListProps {
    items: InvoiceItem[];
    invoiceCurrency?: string;
    returnQuantities: Record<string, number>;
    selectedItems: Record<string, boolean>;
    onItemSelect: (itemId: string, selected: boolean, initialQty?: number) => void;
    onQuantityChange: (itemId: string, quantity: number, maxQty?: number) => void;
}

const InvoiceItemsList: React.FC<InvoiceItemsListProps> = ({
    items,
    returnQuantities,
    selectedItems,
    onItemSelect,
    onQuantityChange,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Keyboard Navigation state
    const [focusedRow, setFocusedRow] = useState<number>(0);
    // 0: Checkbox, 1: Quantity Input
    const [_focusedCol, setFocusedCol] = useState<number>(0);
    const itemRefs = useRef<Array<Array<HTMLInputElement | null>>>([]);


    // Filter items based on search term
    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item =>
            (item.description || '').toLowerCase().includes(term) ||
            (item.product_id || '').toLowerCase().includes(term) ||
            (item.unit_price?.toString() || '').includes(term)
        );
    }, [items, searchTerm]);

    // Initialize refs array based on filtered items
    // ملاحظة: يجب استدعاء كل الـ Hooks قبل أي return شرطي (قاعدة Hooks)
    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, filteredItems.length).map((row: Array<HTMLInputElement | null>) => row ? row.slice(0, 2) : [null, null]);
        while (itemRefs.current.length < filteredItems.length) {
            itemRefs.current.push([null, null]);
        }
    }, [filteredItems.length]);

    if (items.length === 0) {
        return (
            <div className="p-8 max-md:p-4 text-center text-gray-500 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد أصناف في هذه الفاتورة</p>
            </div>
        );
    }

    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number, item: InvoiceItem, _maxQty: number) => {
        let newRow = rowIndex;
        let newCol = colIndex;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                newRow = Math.max(0, rowIndex - 1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                newRow = Math.min(filteredItems.length - 1, rowIndex + 1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                newCol = Math.min(1, colIndex + 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                newCol = Math.max(0, colIndex - 1);
                break;
            case 'Enter':
            case ' ': // Spacebar for toggle
                if (colIndex === 0) {
                    e.preventDefault();
                    onItemSelect(item.id, !selectedItems[item.id]);
                }
                return;
            default:
                return;
        }

        if (newRow !== rowIndex || newCol !== colIndex) {
            setFocusedRow(newRow);
            setFocusedCol(newCol);

            // Focus the actual DOM element
            const inputRef = itemRefs.current[newRow]?.[newCol];
            if (inputRef) {
                inputRef.focus();
                // Select all text if it's the number input
                if (inputRef.type === 'number') {
                    inputRef.select();
                }
            }
        }
    };

    return (
        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {/* Search Box */}
            <div className="p-3 max-md:p-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); }}
                        placeholder="البحث بالاسم، الكود، أو السعر..."
                        className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                {searchTerm && (
                    <p className="text-xs text-gray-500 mt-1">
                        تم العثور على {filteredItems.length} من أصل {items.length} صنف
                    </p>
                )}
            </div>

            {/* Header */}
            <div className="grid grid-cols-12 gap-2 max-md:gap-2 p-3 max-md:p-3 bg-gray-100 dark:bg-slate-800 text-xs font-bold text-gray-600 dark:text-slate-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-4">المنتج</div>
                <div className="col-span-2 text-center">الكمية</div>
                <div className="col-span-2 text-center">السعر</div>
                <div className="col-span-3 text-center">الإرجاع</div>
            </div>

            {/* Items List */}
            <div className="max-h-80 overflow-y-auto">
                {filteredItems.length === 0 ? (
                    <div className="p-8 max-md:p-4 text-center text-gray-500">
                        <Search size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">لا توجد نتائج للبحث</p>
                    </div>
                ) : (
                    filteredItems.map((item, index) => {
                        const isSelected = selectedItems[item.id] || false;
                        const returnQty = returnQuantities[item.id] || 0;
                        const maxQty = item.quantity;

                        return (
                            <div
                                key={`${item.id}-${item.product_id}-${index}`}
                                className={`grid grid-cols-12 gap-2 max-md:gap-2 p-3 max-md:p-3 border-b border-gray-100 dark:border-slate-700 items-center transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                    } ${focusedRow === index ? 'ring-2 ring-inset ring-indigo-500/50' : ''}`}
                            >
                                {/* Checkbox */}
                                <div className="col-span-1 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => { onItemSelect(item.id, e.target.checked); }}
                                        ref={el => { if (itemRefs.current[index]) itemRefs.current[index][0] = el; }}
                                        onFocus={() => { setFocusedRow(index); setFocusedCol(0); }}
                                        onKeyDown={(e) => { handleKeyDown(e, index, 0, item, maxQty); }}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-shadow outline-none"
                                        tabIndex={0}
                                    />
                                </div>

                                {/* Product Name */}
                                <div className="col-span-4">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={item.description}>
                                        {item.description || 'منتج بدون اسم'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        كود: {item.product_id || '-'}
                                    </p>
                                </div>

                                {/* Original Quantity */}
                                <div className="col-span-2 text-center">
                                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                        {item.quantity}
                                    </span>
                                </div>

                                {/* Unit Price */}
                                <div className="col-span-2 text-center">
                                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {formatCurrency(item.unit_price)}
                                    </span>
                                </div>

                                {/* Return Quantity */}
                                <div className="col-span-3">
                                    <div className="flex items-center gap-1 max-md:gap-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max={maxQty}
                                            value={returnQty === 0 ? '' : returnQty}
                                            onChange={(e) => {
                                                const rawVal = e.target.value;
                                                const val = Math.min(Math.max(0, parseInt(rawVal) || 0), maxQty);

                                                // إصلاح فقدان الكمية: عند كتابة كمية لصنف غير محدد بعد،
                                                // نضيف الصنف مباشرة بالكمية المدخلة بدلاً من الكمية الافتراضية 1
                                                if (val > 0 && !isSelected) {
                                                    onItemSelect(item.id, true, val);
                                                } else if (val === 0 && isSelected) {
                                                    onItemSelect(item.id, false);
                                                } else {
                                                    onQuantityChange(item.id, val, maxQty);
                                                }
                                            }}
                                            ref={el => { if (itemRefs.current[index]) itemRefs.current[index][1] = el; }}
                                            onFocus={() => { setFocusedRow(index); setFocusedCol(1); }}
                                            onKeyDown={(e) => { handleKeyDown(e, index, 1, item, maxQty); }}
                                            className="w-16 p-1 max-md:p-1 text-center text-sm border rounded font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-[var(--app-surface)] border-gray-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-transparent hover:border-indigo-400"
                                            tabIndex={0}
                                        />
                                        <span className="text-xs text-gray-400 font-mono">/ {maxQty}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Summary */}
            <div className="p-3 max-md:p-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 max-md:gap-2">
                        <RotateCcw size={16} className="text-blue-600" />
                        <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
                            الأصناف المحددة: {Object.values(selectedItems).filter(Boolean).length}
                        </span>
                    </div>
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
                        الإجمالي المرتجع: {
                            formatCurrency(
                                items.reduce((sum, item) => {
                                    const qty = returnQuantities[item.id] || 0;
                                    return sum + (qty * item.unit_price);
                                }, 0)
                            )
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};

export default InvoiceItemsList;
