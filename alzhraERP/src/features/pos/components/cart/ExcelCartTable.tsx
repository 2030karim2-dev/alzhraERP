import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useColumnResize } from '../../../../ui/common/hooks/useColumnResize';
import type { SalesCartItem } from '../../../sales/store';
import { ExcelCartTableHeader } from './ExcelCartTableHeader';
import { ExcelCartTableRow } from './ExcelCartTableRow';

export interface ExcelCartTableProps {
  items: SalesCartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
  editingPriceId?: string | null;
  setEditingPriceId?: (id: string | null) => void;
  isCrossBranch?: boolean;
}

export const ExcelCartTable: React.FC<ExcelCartTableProps> = ({
  items,
  onUpdateQuantity,
  onRemoveClick,
  editingPriceId,
  setEditingPriceId,
  isCrossBranch,
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
          <ExcelCartTableHeader onResizeMouseDown={onResizeMouseDown} />
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80">
            {items.map((item, rowIdx) => {
              const isRowActive = focusedCell.row === rowIdx;
              const isCellActive = (colIdx: number) => isRowActive && focusedCell.col === colIdx;

              return (
                <ExcelCartTableRow
                  key={item.productId}
                  item={item}
                  rowIdx={rowIdx}
                  isRowActive={isRowActive}
                  isCellActive={isCellActive}
                  activeCellRef={activeCellRef}
                  isCrossBranch={isCrossBranch}
                  isEditingQty={editingQtyRow === rowIdx}
                  qtyInputValue={qtyInputValue}
                  handlers={{
                    onCellClick: col => {
                      setFocusedCell({ row: rowIdx, col });
                      if (col === 4) {
                        setEditingPriceId?.(item.productId);
                      }
                    },
                    onCellDoubleClick: col => {
                      if (col === 3) {
                        setEditingQtyRow(rowIdx);
                        setQtyInputValue(String(item.quantity));
                      }
                    },
                    onQtyInputChange: setQtyInputValue,
                    onCommitQty: () => {
                      commitQty(rowIdx);
                    },
                    onUpdateQuantity,
                    onRemoveClick,
                    onPriceFocus: () => {
                      setFocusedCell({ row: rowIdx, col: 4 });
                      setEditingPriceId?.(item.productId);
                    },
                    onPriceKeyDown: e => {
                      handlePriceInputKeyDown(e, rowIdx);
                    },
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
