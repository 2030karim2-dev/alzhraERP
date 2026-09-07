import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Plus, Minus, AlertTriangle, CornerDownLeft } from 'lucide-react';
import {
  cn,
  formatCurrency,
  normalizeArabicDigits,
  parseNumberFlexible,
  convertCurrency,
} from '../../../../core/utils';
import { useColumnResize } from '../../../../ui/common/hooks/useColumnResize';
import { useSalesStore, type SalesCartItem } from '../../../sales/store';

interface PriceCellInputProps {
  productId: string;
  price: number;
  rowIndex: number;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const PriceCellInput: React.FC<PriceCellInputProps> = React.memo(
  ({ productId, price, rowIndex, onFocus, onKeyDown }) => {
    const { items, updateItem, currency, exchangeRate, exchangeOperator } = useSalesStore();
    const [localVal, setLocalVal] = useState<string>(
      price !== 0 && !isNaN(price) ? String(price) : ''
    );
    const isFocusedRef = useRef(false);

    useEffect(() => {
      if (!isFocusedRef.current) {
        setLocalVal(price !== 0 && !isNaN(price) ? String(price) : '');
      }
    }, [price]);

    const commitPrice = useCallback(
      (val: string) => {
        const num = parseNumberFlexible(val);
        if (!isNaN(num) && num >= 0) {
          const idx = items.findIndex(i => i.productId === productId);
          if (idx !== -1) {
            let basePrice = num;
            if (currency !== 'SAR') {
              try {
                basePrice = convertCurrency(num, exchangeRate, 'toBase', exchangeOperator);
              } catch {
                return;
              }
            }
            updateItem(idx, 'price', num);
            updateItem(idx, 'basePrice', basePrice);
          }
        } else {
          setLocalVal(price !== 0 && !isNaN(price) ? String(price) : '');
        }
      },
      [currency, exchangeOperator, exchangeRate, items, productId, updateItem, price]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = normalizeArabicDigits(e.target.value).replace(/[،٫]/g, '.');
      if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
      if (raw === '' || raw === '.' || /^\d*\.?\d*$/.test(raw)) {
        setLocalVal(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed >= 0) {
          commitPrice(raw);
        }
      }
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        value={localVal}
        onFocus={e => {
          isFocusedRef.current = true;
          onFocus();
          e.target.select();
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          commitPrice(localVal);
        }}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        data-row-index={rowIndex}
        data-col-field="price"
        className="h-full w-full bg-transparent px-1 py-0.5 text-left font-mono text-[11px] font-bold text-slate-800 outline-none transition-colors hover:bg-slate-100/60 focus:bg-blue-50/80 focus:text-blue-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:focus:bg-blue-950/40 dark:focus:text-blue-300"
        placeholder="0.00"
        dir="ltr"
      />
    );
  }
);
PriceCellInput.displayName = 'PriceCellInput';

interface ExcelCartTableProps {
  items: SalesCartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
  editingPriceId?: string | null;
  setEditingPriceId?: (id: string | null) => void;
}

export const ExcelCartTable: React.FC<ExcelCartTableProps> = ({
  items,
  onUpdateQuantity,
  onRemoveClick,
  editingPriceId,
  setEditingPriceId,
}) => {
  // Navigation: col indices: 1: name, 2: partNumber, 3: quantity, 4: price, 5: total, 6: actions
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number }>({ row: 0, col: 3 });
  const [editingQtyRow, setEditingQtyRow] = useState<number | null>(null);
  const [qtyInputValue, setQtyInputValue] = useState<string>('');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);
  const prevItemsLengthRef = useRef(items.length);

  // Column resizing with localStorage persistence
  const { colWidths, onResizeMouseDown } = useColumnResize({
    storageKey: 'pos_active_cart_col_widths',
    defaultWidths: {
      index: 26,
      name: 130,
      partNumber: 75,
      quantity: 65,
      price: 60,
      total: 65,
      action: 26,
    },
    minWidth: 20,
    isRTL: true,
  });

  // Auto focus the quantity cell when a new item is added
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && items.length > 0) {
      setFocusedCell({ row: items.length - 1, col: 3 });
    } else if (focusedCell.row >= items.length && items.length > 0) {
      setFocusedCell(prev => ({ ...prev, row: items.length - 1 }));
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length, focusedCell.row]);

  // Scroll active cell into view safely
  useEffect(() => {
    if (typeof activeCellRef.current?.scrollIntoView === 'function') {
      activeCellRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [focusedCell]);

  const commitQty = useCallback(
    (rowIdx: number) => {
      const num = parseFloat(qtyInputValue);
      if (!isNaN(num) && num > 0) {
        onUpdateQuantity(items[rowIdx].productId, num);
      } else if (num === 0) {
        onRemoveClick(items[rowIdx].productId);
      }
      setEditingQtyRow(null);
    },
    [qtyInputValue, items, onUpdateQuantity, onRemoveClick]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) return;

    // If inline price is editing, let it handle its own keys
    if (editingPriceId) return;

    // If currently editing quantity inline
    if (editingQtyRow !== null) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitQty(editingQtyRow);
        if (editingQtyRow < items.length - 1) {
          setFocusedCell({ row: editingQtyRow + 1, col: 3 });
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditingQtyRow(null);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        commitQty(editingQtyRow);
        setFocusedCell(prev => ({
          row: prev.row,
          col: e.shiftKey ? Math.max(1, prev.col - 1) : Math.min(6, prev.col + 1),
        }));
        return;
      }
      return;
    }

    const { row, col } = focusedCell;
    const maxRow = items.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (row < maxRow) {
        setFocusedCell({ row: row + 1, col });
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (row > 0) {
        setFocusedCell({ row: row - 1, col });
      }
      return;
    }

    // In RTL sheet, ArrowLeft moves leftwards (increasing col index towards actions)
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (col < 6) {
        setFocusedCell({ row, col: col + 1 });
      }
      return;
    }

    // ArrowRight moves rightwards (decreasing col index towards item name)
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (col > 1) {
        setFocusedCell({ row, col: col - 1 });
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (col > 1) {
          setFocusedCell({ row, col: col - 1 });
        } else if (row > 0) {
          setFocusedCell({ row: row - 1, col: 6 });
        }
      } else {
        if (col < 6) {
          setFocusedCell({ row, col: col + 1 });
        } else if (row < maxRow) {
          setFocusedCell({ row: row + 1, col: 1 });
        }
      }
      return;
    }

    const currentItem = items[row];
    if (!currentItem) return;

    // Quick increment/decrement with + / = / -
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      onUpdateQuantity(currentItem.productId, currentItem.quantity + 1);
      return;
    }

    if (e.key === '-') {
      e.preventDefault();
      if (currentItem.quantity > 1) {
        onUpdateQuantity(currentItem.productId, currentItem.quantity - 1);
      } else {
        onRemoveClick(currentItem.productId);
      }
      return;
    }

    // Delete item
    if (e.key === 'Delete' || (e.key === 'Backspace' && col === 6)) {
      e.preventDefault();
      onRemoveClick(currentItem.productId);
      return;
    }

    // Enter or F2 to edit
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      if (col === 3) {
        setEditingQtyRow(row);
        setQtyInputValue(String(currentItem.quantity));
        return;
      }
      if (col === 4) {
        const priceInput = tableContainerRef.current?.querySelector<HTMLInputElement>(
          `input[data-row-index="${row}"][data-col-field="price"]`
        );
        priceInput?.focus();
        priceInput?.select();
        return;
      }
      if (col === 6) {
        onRemoveClick(currentItem.productId);
        return;
      }
    }

    // If focused on Quantity cell and user starts typing a digit
    if (col === 3 && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setEditingQtyRow(row);
      setQtyInputValue(e.key);
      return;
    }

    // If focused on Price cell and user starts typing a digit
    if (col === 4 && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const priceInput = tableContainerRef.current?.querySelector<HTMLInputElement>(
        `input[data-row-index="${row}"][data-col-field="price"]`
      );
      if (priceInput) {
        priceInput.focus();
        priceInput.select();
      }
      return;
    }
  };

  const handlePriceInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, row: number) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        if (row < items.length - 1) {
          setFocusedCell({ row: row + 1, col: 4 });
          const nextInput = tableContainerRef.current?.querySelector<HTMLInputElement>(
            `input[data-row-index="${row + 1}"][data-col-field="price"]`
          );
          nextInput?.focus();
          nextInput?.select();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (row > 0) {
          setFocusedCell({ row: row - 1, col: 4 });
          const prevInput = tableContainerRef.current?.querySelector<HTMLInputElement>(
            `input[data-row-index="${row - 1}"][data-col-field="price"]`
          );
          prevInput?.focus();
          prevInput?.select();
        }
      } else if (e.key === 'Escape') {
        e.currentTarget.blur();
        tableContainerRef.current?.focus();
      }
    },
    [items.length]
  );

  return (
    <div
      ref={tableContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex h-full w-full select-none flex-col bg-[var(--app-surface)] outline-none"
      data-testid="excel-cart-container"
    >
      <div className="custom-scrollbar flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse border border-slate-300 text-right dark:border-slate-700/80">
          <colgroup>
            <col style={{ width: colWidths.index ?? 26 }} />
            <col style={{ width: colWidths.name ?? 130 }} />
            <col style={{ width: colWidths.partNumber ?? 75 }} />
            <col style={{ width: colWidths.quantity ?? 65 }} />
            <col style={{ width: colWidths.price ?? 60 }} />
            <col style={{ width: colWidths.total ?? 65 }} />
            <col style={{ width: colWidths.action ?? 26 }} />
          </colgroup>
          <thead className="sticky top-0 z-20 border-b border-slate-300 bg-slate-100 shadow-xs dark:border-slate-700 dark:bg-slate-800">
            <tr className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {/* Col 0: Index Header */}
              <th className="select-none border-l border-slate-300 bg-slate-200/70 py-1.5 text-center dark:border-slate-700 dark:bg-slate-850">
                #
              </th>

              {/* Col 1: Name Header (Resizable) */}
              <th className="relative select-none border-l border-slate-300 px-1.5 py-1.5 text-right dark:border-slate-700">
                <span className="truncate">الصنف</span>
                <div
                  onMouseDown={e => onResizeMouseDown(e, 'name')}
                  className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-blue-500 active:bg-blue-600"
                  title="اسحب لتغيير العرض"
                />
              </th>

              {/* Col 2: Part Number Header (Resizable) */}
              <th className="relative select-none border-l border-slate-300 px-1 py-1.5 text-right dark:border-slate-700">
                <span className="truncate">رقم القطعة</span>
                <div
                  onMouseDown={e => onResizeMouseDown(e, 'partNumber')}
                  className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-blue-500 active:bg-blue-600"
                  title="اسحب لتغيير العرض"
                />
              </th>

              {/* Col 3: Quantity Header (Resizable) */}
              <th className="relative select-none border-l border-slate-300 px-1 py-1.5 text-center dark:border-slate-700">
                <span>الكمية</span>
                <div
                  onMouseDown={e => onResizeMouseDown(e, 'quantity')}
                  className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-blue-500 active:bg-blue-600"
                  title="اسحب لتغيير العرض"
                />
              </th>

              {/* Col 4: Price Header (Resizable) */}
              <th className="relative select-none border-l border-slate-300 px-1 py-1.5 text-left dark:border-slate-700">
                <span>السعر</span>
                <div
                  onMouseDown={e => onResizeMouseDown(e, 'price')}
                  className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-blue-500 active:bg-blue-600"
                  title="اسحب لتغيير العرض"
                />
              </th>

              {/* Col 5: Total Header (Resizable) */}
              <th className="relative select-none border-l border-slate-300 px-1 py-1.5 text-left dark:border-slate-700">
                <span>الإجمالي</span>
                <div
                  onMouseDown={e => onResizeMouseDown(e, 'total')}
                  className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-blue-500 active:bg-blue-600"
                  title="اسحب لتغيير العرض"
                />
              </th>

              {/* Col 6: Actions Header */}
              <th className="py-1.5 text-center">✕</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80">
            {items.map((item, rowIdx) => {
              const totalAvailable = (item.warehouse_distribution || []).reduce(
                (sum, wd) => sum + wd.quantity,
                0
              );
              const isOverStock = item.quantity > totalAvailable;
              const isLowStock = totalAvailable > 0 && item.quantity >= totalAvailable;
              const isRowActive = focusedCell.row === rowIdx;

              const isCellActive = (colIdx: number) => isRowActive && focusedCell.col === colIdx;

              return (
                <tr
                  key={item.productId}
                  className={cn(
                    'h-7 transition-colors',
                    isRowActive
                      ? 'bg-blue-50/30 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30',
                    isOverStock && 'bg-rose-50/50 dark:bg-rose-900/15'
                  )}
                >
                  {/* Col 0: Excel Row Header (#) */}
                  <td
                    onClick={() => setFocusedCell({ row: rowIdx, col: 1 })}
                    className={cn(
                      'cursor-pointer select-none border-b border-l border-slate-200 py-1 text-center font-mono text-[10px] dark:border-slate-700/80',
                      isRowActive
                        ? 'bg-blue-600 font-black text-white dark:bg-blue-600'
                        : 'bg-slate-100/80 font-bold text-slate-500 dark:bg-slate-850 dark:text-slate-400'
                    )}
                  >
                    {rowIdx + 1}
                  </td>

                  {/* Col 1: Product Name (Compact Single-line) */}
                  <td
                    ref={isCellActive(1) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 1 })}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 px-1.5 py-1 align-middle dark:border-slate-700/80',
                      isCellActive(1) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <div className="flex items-center gap-1 overflow-hidden">
                      {isOverStock && (
                        <span
                          title={`الكمية تتجاوز المتاح (${totalAvailable})`}
                          className="flex shrink-0 items-center"
                        >
                          <AlertTriangle size={11} className="text-rose-500" />
                        </span>
                      )}
                      {isLowStock && !isOverStock && (
                        <span
                          title={`المتبقي: ${totalAvailable}`}
                          className="flex shrink-0 items-center"
                        >
                          <AlertTriangle size={11} className="text-amber-500" />
                        </span>
                      )}
                      <span
                        className="truncate text-[11px] font-bold leading-tight text-slate-800 dark:text-slate-100"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>
                    {isCellActive(1) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 2: Part Number (Compact) */}
                  <td
                    ref={isCellActive(2) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 2 })}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 px-1 py-1 align-middle font-mono text-[10px] text-slate-500 dark:border-slate-700/80 dark:text-slate-400',
                      isCellActive(2) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <span className="block truncate">{item.partNumber || item.sku || '-'}</span>
                    {isCellActive(2) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 3: Quantity (Compact & Editable) */}
                  <td
                    ref={isCellActive(3) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 3 })}
                    onDoubleClick={() => {
                      setEditingQtyRow(rowIdx);
                      setQtyInputValue(String(item.quantity));
                    }}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 px-0.5 py-0.5 text-center align-middle dark:border-slate-700/80',
                      isCellActive(3) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    {editingQtyRow === rowIdx ? (
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          autoFocus
                          value={qtyInputValue}
                          onChange={e => setQtyInputValue(e.target.value)}
                          onBlur={() => commitQty(rowIdx)}
                          className="w-full rounded border border-blue-500 bg-white py-0.5 text-center font-mono text-xs font-black text-blue-600 shadow-xs outline-none dark:bg-slate-950 dark:text-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => commitQty(rowIdx)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <CornerDownLeft size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-0.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (item.quantity > 1) {
                              onUpdateQuantity(item.productId, item.quantity - 1);
                            } else {
                              onRemoveClick(item.productId);
                            }
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                          title={item.quantity === 1 ? 'حذف' : 'تقليل'}
                        >
                          {item.quantity === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
                        </button>
                        <span className="min-w-[18px] font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onUpdateQuantity(item.productId, item.quantity + 1);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                          title="زيادة"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    )}
                    {isCellActive(3) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 4: Price (Natural Excel Input like Sales Invoice) */}
                  <td
                    ref={isCellActive(4) ? activeCellRef : undefined}
                    onClick={() => {
                      setFocusedCell({ row: rowIdx, col: 4 });
                      setEditingPriceId?.(item.productId);
                    }}
                    className={cn(
                      'relative border-b border-l border-slate-200 p-0 text-left align-middle dark:border-slate-700/80',
                      isCellActive(4) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <PriceCellInput
                      productId={item.productId}
                      price={item.price}
                      rowIndex={rowIdx}
                      onFocus={() => {
                        setFocusedCell({ row: rowIdx, col: 4 });
                        setEditingPriceId?.(item.productId);
                      }}
                      onKeyDown={e => handlePriceInputKeyDown(e, rowIdx)}
                    />
                    {isCellActive(4) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 5: Total (Compact) */}
                  <td
                    ref={isCellActive(5) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 5 })}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 px-1 py-0.5 text-left align-middle dark:border-slate-700/80',
                      isCellActive(5) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <span
                      dir="ltr"
                      className="block truncate font-mono text-[10px] font-black text-slate-900 dark:text-slate-100"
                    >
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    {isCellActive(5) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 6: Actions / Delete (Compact) */}
                  <td
                    ref={isCellActive(6) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 6 })}
                    className={cn(
                      'relative cursor-pointer border-b border-slate-200 py-0.5 text-center align-middle dark:border-slate-700/80',
                      isCellActive(6) &&
                        'z-10 bg-rose-50/50 ring-2 ring-inset ring-rose-500 dark:bg-rose-950/30 dark:ring-rose-400'
                    )}
                  >
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveClick(item.productId);
                      }}
                      className="mx-auto flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="حذف من السلة (Del)"
                    >
                      <Trash2 size={11} />
                    </button>
                    {isCellActive(6) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-rose-500" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
