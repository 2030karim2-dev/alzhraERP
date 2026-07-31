import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSalesStore, SalesCartItem } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { Product } from '../../../inventory/types';
import { Plus, Settings } from 'lucide-react';
import { cn } from '../../../../core/utils';
import ProductSelectionModal from './ProductSelectionModal';
import InvoiceRow from './InvoiceRow';


const InteractiveInvoiceTable: React.FC = () => {
  const {
    items, setProductForRow, addItem, updateItem, removeItem, showDiscount, toggleColumn
  } = useSalesStore();

  const tableRef = useRef<HTMLTableElement>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; rowIndex: number; query: string }>({
    isOpen: false, rowIndex: 0, query: ''
  });

  // Column Resizing Logic
  const initialWidths = (() => {
    try {
      const saved = localStorage.getItem('invoice_col_widths');
      return saved ? JSON.parse(saved) : {
        index: 40,
        description: 350,
        quantity: 100,
        price: 120,
        discount: 100,
        total: 140,
      };
    } catch { return { index: 40, description: 350, quantity: 100, price: 120, discount: 100, total: 140 }; }
  })();

  const [colWidths, setColWidths] = useState<Record<string, number>>(initialWidths);

  useEffect(() => {
    localStorage.setItem('invoice_col_widths', JSON.stringify(colWidths));
  }, [colWidths]);

  const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent, field: string) => {
    resizingRef.current = {
      field,
      startX: e.pageX,
      startWidth: colWidths[field]
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
      [field]: Math.max(50, startWidth + delta)
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onMouseMove]);

  const handleOpenSearch = useCallback((index: number, query: string = '') => {
    setModalState({ isOpen: true, rowIndex: index, query });
  }, []);

  const handleProductSelect = (product: Product) => {
    setProductForRow(modalState.rowIndex, product);
    setModalState(prev => ({ ...prev, isOpen: false }));

    // Auto-focus quantity after selection
    setTimeout(() => {
      const nextCell = tableRef.current?.querySelector(`[data-row-index="${modalState.rowIndex}"][data-col-field="quantity"]`) as HTMLInputElement;
      nextCell?.focus();
      nextCell?.select();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof SalesCartItem) => {
    if (!tableRef.current) return;

    if (field === 'name' && (e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey))) {
      e.preventDefault();
      handleOpenSearch(rowIndex, e.key.length === 1 ? e.key : '');
      return;
    }

    const navigationFields: (keyof SalesCartItem)[] = ['name', 'quantity', 'price'];
    if (showDiscount) navigationFields.push('discount');

    const colIndex = navigationFields.indexOf(field);

    const moveFocus = (row: number, colField: keyof SalesCartItem) => {
      const nextCell = tableRef.current?.querySelector(`[data-row-index="${row}"][data-col-field="${colField}"]`) as HTMLInputElement;
      nextCell?.focus();
      if (nextCell) nextCell.select();
    };

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); moveFocus(Math.max(0, rowIndex - 1), field); break;
      case 'ArrowDown': e.preventDefault(); moveFocus(Math.min(items.length - 1, rowIndex + 1), field); break;
      case 'Enter':
        e.preventDefault();
        if (rowIndex === items.length - 1 && field === navigationFields[navigationFields.length - 1]) {
          addItem();
          setTimeout(() => moveFocus(rowIndex + 1, 'name'), 50);
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
          setTimeout(() => moveFocus(rowIndex + 1, 'name'), 50);
        } else if (!e.shiftKey) {
          moveFocus(rowIndex + 1, navigationFields[0]);
        } else if (e.shiftKey && rowIndex > 0) {
          moveFocus(rowIndex - 1, navigationFields[navigationFields.length - 1]);
        }
        break;
      default: return;
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-1 flex justify-between items-center bg-gray-50 dark:bg-slate-950 border-y dark:border-slate-800">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">محتويات الفاتورة</span>
        </div>
        <div className="flex gap-1.5">
          <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border dark:border-slate-800">
            {useDiscountStore.getState().discountEnabled && (
              <button onClick={() => toggleColumn('showDiscount')} className={cn("px-4 py-1 text-[9px] font-bold uppercase transition-all rounded-md", showDiscount ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-gray-400")}>خصم</button>
            )}

          </div>
          <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><Settings size={14} /></button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="overflow-x-auto custom-scrollbar">
        <table ref={tableRef} className="w-full border-collapse table-fixed min-w-max">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-slate-800/20 text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">
              <th style={{ width: colWidths.index }} className="relative p-2 border-b border-l dark:border-slate-800 text-center">#</th>
              <th style={{ width: colWidths.description }} className="relative p-2 border-b border-l dark:border-slate-800 group">
                وصف الصنف
                <div onMouseDown={(e) => onMouseDown(e, 'description')} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 hover:w-1.5 active:bg-blue-600"></div>
              </th>
              <th style={{ width: colWidths.quantity }} className="relative p-2 border-b border-l dark:border-slate-800 text-center group">
                الكمية
                <div onMouseDown={(e) => onMouseDown(e, 'quantity')} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 hover:w-1.5 active:bg-blue-600"></div>
              </th>
              <th style={{ width: colWidths.price }} className="relative p-2 border-b border-l dark:border-slate-800 text-center group">
                سعر الوحدة
                <div onMouseDown={(e) => onMouseDown(e, 'price')} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 hover:w-1.5 active:bg-blue-600"></div>
              </th>
              {showDiscount && (
                <th style={{ width: colWidths.discount }} className="relative p-2 border-b border-l dark:border-slate-800 text-center group">
                  الخصم
                  <div onMouseDown={(e) => onMouseDown(e, 'discount')} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 hover:w-1.5 active:bg-blue-600"></div>
                </th>
              )}

              <th style={{ width: colWidths.total }} className="relative p-2 border-b dark:border-slate-800 text-left group">
                الإجمالي
                <div onMouseDown={(e) => onMouseDown(e, 'total')} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 hover:w-1.5 active:bg-blue-600"></div>
              </th>
              <th className="p-2 w-10 text-center border-b dark:border-slate-800"></th>
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

      <button onClick={addItem} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-t dark:border-slate-800">
        <Plus size={14} strokeWidth={3} /> إضافة سطر
      </button>

      <ProductSelectionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleProductSelect}
        initialQuery={modalState.query}
      />
    </div>
  );
};

export default InteractiveInvoiceTable;
