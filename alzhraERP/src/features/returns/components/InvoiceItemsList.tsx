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
  onSelectAll?: (selectAll: boolean) => void;
}

const InvoiceItemsList: React.FC<InvoiceItemsListProps> = ({
  items,
  returnQuantities,
  selectedItems,
  onItemSelect,
  onQuantityChange,
  onSelectAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isAllSelected = useMemo(() => {
    return (
      items.length > 0 &&
      items.every(
        item => selectedItems[item.id] && (returnQuantities[item.id] || 0) === item.quantity
      )
    );
  }, [items, selectedItems, returnQuantities]);

  // Keyboard Navigation state
  const [focusedRow, setFocusedRow] = useState<number>(0);
  // 0: Checkbox, 1: Quantity Input
  const [_focusedCol, setFocusedCol] = useState<number>(0);
  const itemRefs = useRef<Array<Array<HTMLInputElement | null>>>([]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      item =>
        (item.description || '').toLowerCase().includes(term) ||
        (item.product_id || '').toLowerCase().includes(term) ||
        (item.unit_price?.toString() || '').includes(term)
    );
  }, [items, searchTerm]);

  // Initialize refs array based on filtered items
  // ملاحظة: يجب استدعاء كل الـ Hooks قبل أي return شرطي (قاعدة Hooks)
  useEffect(() => {
    itemRefs.current = itemRefs.current
      .slice(0, filteredItems.length)
      .map((row: Array<HTMLInputElement | null>) => (row ? row.slice(0, 2) : [null, null]));
    while (itemRefs.current.length < filteredItems.length) {
      itemRefs.current.push([null, null]);
    }
  }, [filteredItems.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500 dark:bg-slate-800 max-md:p-4">
        <Package size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">لا توجد أصناف في هذه الفاتورة</p>
      </div>
    );
  }

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number,
    item: InvoiceItem,
    _maxQty: number
  ) => {
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
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
      {/* Search Box & Quick Return All */}
      <div className="flex flex-col items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800 max-md:p-3 sm:flex-row">
        <div className="relative w-full flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
            }}
            placeholder="البحث بالاسم، الكود، أو السعر..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-700"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {onSelectAll && (
          <button
            type="button"
            onClick={() => {
              onSelectAll(!isAllSelected);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
              isAllSelected
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            }`}
          >
            <RotateCcw
              size={14}
              className={isAllSelected ? 'rotate-180 transition-transform' : ''}
            />
            <span>{isAllSelected ? 'إلغاء تحديد الكل' : 'إرجاع كامل المنتجات بالفاتورة'}</span>
          </button>
        )}
      </div>
      {searchTerm && (
        <div className="border-b border-gray-200 bg-blue-50/50 px-3 py-1.5 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-800/80">
          تم العثور على {filteredItems.length} من أصل {items.length} صنف
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-12 items-center gap-2 bg-gray-100 p-3 text-xs font-bold text-gray-600 dark:bg-slate-800 dark:text-slate-300 max-md:gap-2 max-md:p-3">
        <div className="col-span-1 flex items-center justify-center text-center">
          {onSelectAll ? (
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={e => {
                onSelectAll(e.target.checked);
              }}
              title="تحديد وإرجاع كامل المنتجات بالفاتورة"
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          ) : (
            '#'
          )}
        </div>
        <div className="col-span-4">المنتج</div>
        <div className="col-span-2 text-center">الكمية</div>
        <div className="col-span-2 text-center">السعر</div>
        <div className="col-span-3 text-center">الإرجاع</div>
      </div>

      {/* Items List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 max-md:p-4">
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
                className={`grid grid-cols-12 items-center gap-2 border-b border-gray-100 p-3 transition-colors dark:border-slate-700 max-md:gap-2 max-md:p-3 ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                } ${focusedRow === index ? 'ring-2 ring-inset ring-indigo-500/50' : ''}`}
              >
                {/* Checkbox */}
                <div className="col-span-1 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => {
                      onItemSelect(item.id, e.target.checked);
                    }}
                    ref={el => {
                      if (itemRefs.current[index]) itemRefs.current[index][0] = el;
                    }}
                    onFocus={() => {
                      setFocusedRow(index);
                      setFocusedCol(0);
                    }}
                    onKeyDown={e => {
                      handleKeyDown(e, index, 0, item, maxQty);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 outline-none transition-shadow focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                    tabIndex={0}
                  />
                </div>

                {/* Product Name */}
                <div className="col-span-4">
                  <p
                    className="truncate text-sm font-bold text-gray-900 dark:text-white"
                    title={item.description}
                  >
                    {item.description || 'منتج بدون اسم'}
                  </p>
                  <p className="text-xs text-gray-400">كود: {item.product_id || '-'}</p>
                </div>

                {/* Original Quantity */}
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center rounded border border-slate-200 bg-gray-100 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {item.quantity}
                  </span>
                </div>

                {/* Unit Price */}
                <div className="col-span-2 text-center">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
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
                      onChange={e => {
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
                      ref={el => {
                        if (itemRefs.current[index]) itemRefs.current[index][1] = el;
                      }}
                      onFocus={() => {
                        setFocusedRow(index);
                        setFocusedCol(1);
                      }}
                      onKeyDown={e => {
                        handleKeyDown(e, index, 1, item, maxQty);
                      }}
                      className="w-16 rounded border border-gray-300 bg-[var(--app-surface)] p-1 text-center text-sm font-bold text-slate-900 placeholder-transparent outline-none transition-all hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-100 max-md:p-1"
                      tabIndex={0}
                    />
                    <span className="font-mono text-xs text-gray-400">/ {maxQty}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 max-md:gap-2">
            <RotateCcw size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
              الأصناف المحددة: {Object.values(selectedItems).filter(Boolean).length}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
            الإجمالي المرتجع:{' '}
            {formatCurrency(
              items.reduce((sum, item) => {
                const qty = returnQuantities[item.id] || 0;
                return sum + qty * item.unit_price;
              }, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceItemsList;
