import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Plus, Minus, Edit3, Store, AlertTriangle, CornerDownLeft } from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { EditPriceInline } from './EditPriceInline';
import type { SalesCartItem } from '../../../sales/store';

interface ExcelCartTableProps {
  items: SalesCartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
  editingPriceId: string | null;
  setEditingPriceId: (id: string | null) => void;
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

  // Auto focus the quantity cell when a new item is added
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && items.length > 0) {
      setFocusedCell({ row: items.length - 1, col: 3 });
    } else if (focusedCell.row >= items.length && items.length > 0) {
      setFocusedCell(prev => ({ ...prev, row: items.length - 1 }));
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length, focusedCell.row]);

  // Scroll active cell into view
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
        setEditingPriceId(currentItem.productId);
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
  };

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
          <thead className="sticky top-0 z-20 border-b border-slate-300 bg-slate-100 shadow-xs dark:border-slate-700 dark:bg-slate-800">
            <tr className="text-[10px] font-bold text-slate-600 dark:text-slate-300 md:text-[11px]">
              <th className="w-9 select-none border-l border-slate-300 bg-slate-200/70 py-2 text-center dark:border-slate-700 dark:bg-slate-850">
                #
              </th>
              <th className="border-l border-slate-300 px-2 py-2 text-right dark:border-slate-700">
                اسم الصنف
              </th>
              <th className="w-24 border-l border-slate-300 px-1 py-2 text-right dark:border-slate-700">
                رقم القطعة
              </th>
              <th className="w-24 border-l border-slate-300 px-1 py-2 text-center dark:border-slate-700">
                الكمية
              </th>
              <th className="w-24 border-l border-slate-300 px-1 py-2 text-left dark:border-slate-700">
                السعر
              </th>
              <th className="w-24 border-l border-slate-300 px-1 py-2 text-left dark:border-slate-700">
                الإجمالي
              </th>
              <th className="w-9 py-2 text-center">✕</th>
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
                    'transition-colors',
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

                  {/* Col 1: Product Name */}
                  <td
                    ref={isCellActive(1) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 1 })}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 p-1.5 align-top dark:border-slate-700/80',
                      isCellActive(1) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <div className="flex flex-col">
                      <span
                        className="line-clamp-2 text-xs font-bold leading-snug text-slate-800 dark:text-slate-100"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      {item.warehouse_distribution && item.warehouse_distribution.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.warehouse_distribution.map((wd, i) => (
                            <span
                              key={i}
                              className={cn(
                                'py-0.2 inline-flex items-center gap-0.5 rounded border px-1 text-[10px]',
                                wd.quantity > 0
                                  ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                  : 'border-rose-200 bg-rose-100 text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              )}
                            >
                              <Store size={9} />
                              <span className="max-w-[65px] truncate">{wd.warehouse_name}</span>
                              <span className="font-mono font-bold">
                                ({formatNumberDisplay(wd.quantity)})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      {isOverStock && (
                        <div className="mt-1 flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                          <AlertTriangle size={10} />
                          <span>يتجاوز المتاح ({totalAvailable})</span>
                        </div>
                      )}
                      {isLowStock && !isOverStock && (
                        <div className="mt-1 flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          <AlertTriangle size={10} />
                          <span>المتبقي: {totalAvailable}</span>
                        </div>
                      )}
                    </div>
                    {isCellActive(1) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 2: Part Number */}
                  <td
                    ref={isCellActive(2) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 2 })}
                    className={cn(
                      'relative cursor-pointer break-all border-b border-l border-slate-200 p-1.5 align-top font-mono text-xs text-slate-600 dark:border-slate-700/80 dark:text-slate-400',
                      isCellActive(2) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <span>{item.partNumber || item.sku || '-'}</span>
                    {isCellActive(2) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 3: Quantity (Editable) */}
                  <td
                    ref={isCellActive(3) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 3 })}
                    onDoubleClick={() => {
                      setEditingQtyRow(rowIdx);
                      setQtyInputValue(String(item.quantity));
                    }}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 p-1 text-center align-middle dark:border-slate-700/80',
                      isCellActive(3) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    {editingQtyRow === rowIdx ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          autoFocus
                          value={qtyInputValue}
                          onChange={e => setQtyInputValue(e.target.value)}
                          onBlur={() => commitQty(rowIdx)}
                          className="w-full rounded border border-blue-500 bg-white py-1 text-center font-mono text-xs font-black text-blue-600 shadow-xs outline-none dark:bg-slate-950 dark:text-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => commitQty(rowIdx)}
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <CornerDownLeft size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1 px-1">
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
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                          title={item.quantity === 1 ? 'حذف' : 'تقليل'}
                        >
                          {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span className="min-w-[24px] font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onUpdateQuantity(item.productId, item.quantity + 1);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                          title="زيادة"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                    {isCellActive(3) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 4: Price (Editable) */}
                  <td
                    ref={isCellActive(4) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 4 })}
                    onDoubleClick={() => setEditingPriceId(item.productId)}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 p-1 text-left align-middle dark:border-slate-700/80',
                      isCellActive(4) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    {editingPriceId === item.productId ? (
                      <EditPriceInline
                        productId={item.productId}
                        currentPrice={item.price}
                        onDone={() => setEditingPriceId(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-1 px-1">
                        <span
                          dir="ltr"
                          className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200"
                        >
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingPriceId(item.productId);
                          }}
                          className="p-0.5 text-slate-400 opacity-60 transition-opacity hover:text-blue-600 hover:opacity-100"
                          title="تعديل السعر"
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
                    )}
                    {isCellActive(4) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 5: Total */}
                  <td
                    ref={isCellActive(5) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 5 })}
                    className={cn(
                      'relative cursor-pointer border-b border-l border-slate-200 p-1.5 text-left align-middle dark:border-slate-700/80',
                      isCellActive(5) &&
                        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
                    )}
                  >
                    <span
                      dir="ltr"
                      className="block font-mono text-xs font-black text-slate-900 dark:text-slate-100"
                    >
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    {isCellActive(5) && (
                      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
                    )}
                  </td>

                  {/* Col 6: Actions / Delete */}
                  <td
                    ref={isCellActive(6) ? activeCellRef : undefined}
                    onClick={() => setFocusedCell({ row: rowIdx, col: 6 })}
                    className={cn(
                      'relative cursor-pointer border-b border-slate-200 p-1 text-center align-middle dark:border-slate-700/80',
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
                      className="mx-auto flex items-center justify-center rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="حذف من السلة (Del)"
                    >
                      <Trash2 size={13} />
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

      {/* Excel Status & Keyboard Shortcuts Helper Bar */}
      <div className="flex shrink-0 select-none items-center justify-between border-t border-slate-300 bg-slate-100/90 px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            سطر {focusedCell.row + 1} من {items.length}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>{items.reduce((sum, item) => sum + item.quantity, 0)} قطعة</span>
        </div>
        <div className="hidden items-center gap-1.5 text-[10px] sm:flex">
          <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ↑ ↓ ← → تنقل
          </span>
          <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            + / - كمية
          </span>
          <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Enter تعديل
          </span>
          <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Del حذف
          </span>
        </div>
      </div>
    </div>
  );
};
