import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSalesStore, type SalesCartItem } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import type { Product } from '../../../inventory/types';
import { Plus, Settings } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { logger } from '../../../../core/utils/logger';
import { STORAGE_KEYS } from '../../../../core/constants';
import ProductSelectionModal from './ProductSelectionModal';
import InvoiceRow from './InvoiceRow';

const InteractiveInvoiceTable: React.FC = () => {
  const { items, setProductForRow, addItem, updateItem, removeItem, showDiscount, toggleColumn } =
    useSalesStore();

  const tableRef = useRef<HTMLTableElement>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    rowIndex: number;
    query: string;
  }>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });

  // Column Resizing Logic
  const initialWidths = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICE_COL_WIDTHS);
      return saved
        ? JSON.parse(saved)
        : {
            index: 40,
            description: 350,
            quantity: 100,
            price: 120,
            discount: 100,
            total: 140,
          };
    } catch {
      return { index: 40, description: 350, quantity: 100, price: 120, discount: 100, total: 140 };
    }
  })();

  const [colWidths, setColWidths] = useState<Record<string, number>>(initialWidths);

  useEffect(() => {
    // [FIX] التخزين قد يرمي QuotaExceededError في وضع التصفح الخاص أو عند
    // امتلاء الحصة — كان ينهار داخل useEffect فيسقط نموذج الفاتورة كله.
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICE_COL_WIDTHS, JSON.stringify(colWidths));
    } catch (err) {
      logger.warn('InteractiveInvoiceTable', 'Failed to persist column widths', err);
    }
  }, [colWidths]);

  const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent, field: string) => {
    resizingRef.current = {
      field,
      startX: e.pageX,
      startWidth: colWidths[field],
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { field, startX, startWidth } = resizingRef.current;
    const delta = e.pageX - startX;
    setColWidths(prev => ({
      ...prev,
      [field]: Math.max(50, startWidth + delta),
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onMouseMove]);

  const handleOpenSearch = useCallback((index: number, query = '') => {
    setModalState({ isOpen: true, rowIndex: index, query });
  }, []);

  const handleProductSelect = (product: Product) => {
    setProductForRow(modalState.rowIndex, product);
    setModalState(prev => ({ ...prev, isOpen: false }));

    // Auto-focus quantity after selection
    setTimeout(() => {
      const nextCell =
        tableRef.current?.querySelector<HTMLInputElement>(
          `[data-row-index="${modalState.rowIndex}"][data-col-field="quantity"]`
        ) ?? null;
      nextCell?.focus();
      nextCell?.select();
    }, 50);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: keyof SalesCartItem
  ) => {
    if (!tableRef.current) return;

    if (
      field === 'name' &&
      (e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey))
    ) {
      e.preventDefault();
      handleOpenSearch(rowIndex, e.key.length === 1 ? e.key : '');
      return;
    }

    const navigationFields: Array<keyof SalesCartItem | 'total'> = ['name', 'quantity', 'price'];
    if (showDiscount) navigationFields.push('discount');
    navigationFields.push('total');

    const colIndex = navigationFields.indexOf(field);

    const moveFocus = (row: number, colField: keyof SalesCartItem | 'total') => {
      const nextCell =
        tableRef.current?.querySelector<HTMLInputElement>(
          `[data-row-index="${row}"][data-col-field="${colField}"]`
        ) ?? null;
      nextCell?.focus();
      if (nextCell) nextCell.select();
    };

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(Math.max(0, rowIndex - 1), field);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(Math.min(items.length - 1, rowIndex + 1), field);
        break;
      case 'Enter':
        e.preventDefault();
        if (
          rowIndex === items.length - 1 &&
          field === navigationFields[navigationFields.length - 1]
        ) {
          addItem();
          setTimeout(() => {
            moveFocus(rowIndex + 1, 'name');
          }, 50);
        } else {
          moveFocus(rowIndex + 1, field);
        }
        break;
      case 'Tab':
        e.preventDefault();
        const nextColIndex = e.shiftKey ? colIndex - 1 : colIndex + 1;
        if (nextColIndex >= 0 && nextColIndex < navigationFields.length) {
          moveFocus(rowIndex, navigationFields[nextColIndex]);
        } else if (!e.shiftKey && rowIndex === items.length - 1) {
          addItem();
          setTimeout(() => {
            moveFocus(rowIndex + 1, 'name');
          }, 50);
        } else if (!e.shiftKey) {
          moveFocus(rowIndex + 1, navigationFields[0]);
        } else if (e.shiftKey && rowIndex > 0) {
          moveFocus(rowIndex - 1, navigationFields[navigationFields.length - 1]);
        }
        break;
      default:
        return;
    }
  };

  return (
    <div className="flex flex-col overflow-hidden bg-[var(--app-surface)]">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between border-y bg-gray-50 p-1.5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2 px-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
            محتويات الفاتورة
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="flex rounded-lg border bg-gray-100 p-0.5 dark:border-slate-800 dark:bg-slate-800">
            {useDiscountStore.getState().discountEnabled && (
              <button
                onClick={() => {
                  toggleColumn('showDiscount');
                }}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-bold uppercase transition-all',
                  showDiscount
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700'
                    : 'text-gray-400'
                )}
              >
                خصم
              </button>
            )}
          </div>
          <button className="p-2 text-gray-400 transition-colors hover:text-blue-500">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="custom-scrollbar scroll-x-hint overflow-x-auto max-md:-mx-1">
        <table
          ref={tableRef}
          className="w-full min-w-[680px] table-fixed border-collapse max-md:min-w-[540px]"
        >
          <thead>
            <tr className="bg-gray-50/80 text-right text-xs font-bold uppercase tracking-wider text-gray-700 dark:bg-slate-800/40 dark:text-slate-200">
              <th
                style={{ width: colWidths.index }}
                className="relative border-b border-l p-2.5 text-center dark:border-slate-800 max-md:hidden max-md:p-1"
              >
                #
              </th>
              <th
                style={{ width: colWidths.description }}
                className="group relative border-b border-l p-2.5 dark:border-slate-800 max-md:!w-[42%] max-md:p-1.5"
              >
                وصف الصنف
                <div
                  onMouseDown={e => {
                    onMouseDown(e, 'description');
                  }}
                  className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize transition-colors hover:w-1.5 hover:bg-blue-500/50 active:bg-blue-600"
                ></div>
              </th>
              <th
                style={{ width: colWidths.quantity }}
                className="group relative border-b border-l p-2.5 text-center dark:border-slate-800 max-md:!w-[15%] max-md:p-1"
              >
                الكمية
                <div
                  onMouseDown={e => {
                    onMouseDown(e, 'quantity');
                  }}
                  className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize transition-colors hover:w-1.5 hover:bg-blue-500/50 active:bg-blue-600"
                ></div>
              </th>
              <th
                style={{ width: colWidths.price }}
                className="group relative border-b border-l p-2.5 text-center dark:border-slate-800 max-md:!w-[18%] max-md:p-1"
              >
                سعر الوحدة
                <div
                  onMouseDown={e => {
                    onMouseDown(e, 'price');
                  }}
                  className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize transition-colors hover:w-1.5 hover:bg-blue-500/50 active:bg-blue-600"
                ></div>
              </th>
              {showDiscount && (
                <th
                  style={{ width: colWidths.discount }}
                  className="group relative border-b border-l p-2.5 text-center dark:border-slate-800 max-md:!w-[15%] max-md:p-1"
                >
                  الخصم
                  <div
                    onMouseDown={e => {
                      onMouseDown(e, 'discount');
                    }}
                    className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize transition-colors hover:w-1.5 hover:bg-blue-500/50 active:bg-blue-600"
                  ></div>
                </th>
              )}

              <th
                style={{ width: colWidths.total }}
                className="group relative border-b p-2.5 text-left dark:border-slate-800 max-md:!w-[18%] max-md:p-1"
              >
                الإجمالي
                <div
                  onMouseDown={e => {
                    onMouseDown(e, 'total');
                  }}
                  className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize transition-colors hover:w-1.5 hover:bg-blue-500/50 active:bg-blue-600"
                ></div>
              </th>
              <th className="w-10 border-b p-2.5 text-center dark:border-slate-800 max-md:w-8 max-md:p-1"></th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {items.map((item: SalesCartItem, index: number) => (
              <InvoiceRow
                key={item.id}
                item={item}
                index={index}
                showDiscount={showDiscount}
                onUpdate={updateItem}
                onRemove={removeItem}
                onKeyDown={handleKeyDown}
                onOpenSearch={handleOpenSearch}
              />
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 border-t bg-gray-50 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-all hover:bg-gray-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800 max-md:py-1.5"
      >
        <Plus size={14} strokeWidth={3} /> إضافة سطر
      </button>

      <ProductSelectionModal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState(prev => ({ ...prev, isOpen: false }));
        }}
        onSelect={handleProductSelect}
        initialQuery={modalState.query}
      />
    </div>
  );
};

export default InteractiveInvoiceTable;
