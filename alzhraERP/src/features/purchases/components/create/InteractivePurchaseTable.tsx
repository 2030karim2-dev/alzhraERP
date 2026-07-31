// ============================================
// InteractivePurchaseTable — جدول أصناف فاتورة الشراء
// تم الاستفادة من useColumnResize المشتركة لإزالة الكود المكرر
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import { usePurchaseStore, type PurchaseInvoiceItem } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import type { Product } from '../../../inventory/types';
import { Plus, Trash2, Settings, Search } from 'lucide-react';
import { cn } from '../../../../core/utils';
import ProductSelectionModal from '../../../sales/components/create/ProductSelectionModal';
import { useColumnResize } from '../../../../ui/common/hooks/useColumnResize';

const PURCHASE_DEFAULT_WIDTHS = {
    index: 40,
    name: 350,
    partNumber: 130,
    brand: 110,
    quantity: 70,
    costPrice: 90,
    discount: 80,
    total: 120,
};

const InteractivePurchaseTable: React.FC = () => {
    const {
        items, initializeItems, addItem, updateItem, setProductForRow, removeItem,
        showDiscount, toggleColumn
    } = usePurchaseStore();

    const tableRef = useRef<HTMLTableElement>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; rowIndex: number; query: string }>({
        isOpen: false, rowIndex: 0, query: ''
    });

    // ── Column Resize (مشتركة) ──────────────────────────────────
    const { colWidths, onResizeMouseDown } = useColumnResize({
        storageKey: 'purchase_col_widths',
        defaultWidths: PURCHASE_DEFAULT_WIDTHS,
    });

    // ── Init rows ───────────────────────────────────────────────
    useEffect(() => {
        if (items.length === 0) initializeItems(6);
    }, [initializeItems, items.length]);

    // ── Handlers ───────────────────────────────────────────────
    const handleOpenSearch = (index: number, query = '') => {
        setModalState({ isOpen: true, rowIndex: index, query });
    };

    const handleProductSelect = (product: Product) => {
        setProductForRow(modalState.rowIndex, product);
        setModalState({ ...modalState, isOpen: false });
        setTimeout(() => {
            const nextCell = tableRef.current?.querySelector(
                `[data-row-index="${modalState.rowIndex}"][data-col-field="quantity"]`
            ) as HTMLInputElement;
            nextCell?.focus();
            if (nextCell) nextCell.select();
        }, 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof PurchaseInvoiceItem) => {
        if (!tableRef.current) return;

        if (field === 'name' && (e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey))) {
            e.preventDefault();
            handleOpenSearch(rowIndex, e.key.length === 1 ? e.key : '');
            return;
        }

        const fieldsOrder: Array<keyof PurchaseInvoiceItem> = ['name', 'quantity', 'costPrice'];
        if (showDiscount) fieldsOrder.push('discount');
        const colIndex = fieldsOrder.indexOf(field);

        const moveFocus = (row: number, colField: keyof PurchaseInvoiceItem) => {
            const nextCell = tableRef.current?.querySelector(
                `[data-row-index="${row}"][data-col-field="${colField}"]`
            ) as HTMLInputElement;
            nextCell?.focus();
            if (nextCell instanceof HTMLInputElement) nextCell.select();
        };

        switch (e.key) {
            case 'ArrowUp':   e.preventDefault(); moveFocus(Math.max(0, rowIndex - 1), field); break;
            case 'ArrowDown': e.preventDefault(); moveFocus(Math.min(items.length - 1, rowIndex + 1), field); break;
            case 'Enter':
                e.preventDefault();
                if (rowIndex === items.length - 1 && field === 'costPrice') {
                    addItem();
                    setTimeout(() => moveFocus(rowIndex + 1, 'name'), 50);
                } else {
                    moveFocus(rowIndex + 1, field);
                }
                break;
            case 'Tab': {
                e.preventDefault();
                const nextColIndex = e.shiftKey ? colIndex - 1 : colIndex + 1;
                if (nextColIndex >= 0 && nextColIndex < fieldsOrder.length) {
                    moveFocus(rowIndex, fieldsOrder[nextColIndex]);
                } else if (!e.shiftKey && rowIndex === items.length - 1) {
                    addItem();
                    setTimeout(() => moveFocus(rowIndex + 1, fieldsOrder[0]), 50);
                } else if (!e.shiftKey) {
                    moveFocus(rowIndex + 1, fieldsOrder[0]);
                } else if (e.shiftKey && rowIndex > 0) {
                    moveFocus(rowIndex - 1, fieldsOrder[fieldsOrder.length - 1]);
                }
                break;
            }
            default: return;
        }
    };

    // ── Resize handle element ───────────────────────────────────
    const ResizeHandle = ({ field }: { field: string }) => (
        <div
            onMouseDown={(e) => onResizeMouseDown(e, field)}
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-300 transition-colors z-20"
        />
    );

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="flex flex-col border-y-2 border-blue-600 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-1.5 flex justify-end gap-2 bg-blue-600 dark:bg-slate-950 border-b dark:border-slate-800">
                <div className="flex bg-white/10 p-0.5 rounded-none border border-white/20">
                    {useDiscountStore.getState().discountEnabled && (
                        <button
                            onClick={() => toggleColumn('showDiscount')}
                            className={cn("px-3 py-1 text-[9px] font-bold uppercase transition-all", showDiscount ? "bg-white text-blue-600" : "text-blue-100")}
                        >
                            إظهار الخصم
                        </button>
                    )}
                </div>
                <div className="p-1.5 text-white/50"><Settings size={14} /></div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table ref={tableRef} className="w-full border-collapse table-fixed min-w-max">
                    <thead>
                        <tr className="bg-blue-600 text-[10px] font-black text-white uppercase tracking-widest text-right">
                            <th style={{ width: colWidths.index }} className="relative p-2 text-center border-l border-white/10">#</th>
                            <th style={{ width: colWidths.name }} className="relative p-2 border-l border-white/10 pr-4">
                                وصف الصنف المورد <ResizeHandle field="name" />
                            </th>
                            <th style={{ width: colWidths.partNumber }} className="relative p-2 text-center border-l border-white/10">
                                رقم القطعة <ResizeHandle field="partNumber" />
                            </th>
                            <th style={{ width: colWidths.brand }} className="relative p-2 text-center border-l border-white/10">
                                الشركة الصانعة <ResizeHandle field="brand" />
                            </th>
                            <th style={{ width: colWidths.quantity }} className="relative p-2 text-center border-l border-white/10">
                                الكمية <ResizeHandle field="quantity" />
                            </th>
                            <th style={{ width: colWidths.costPrice }} className="relative p-2 text-center border-l border-white/10">
                                سعر التكلفة <ResizeHandle field="costPrice" />
                            </th>
                            {showDiscount && (
                                <th style={{ width: colWidths.discount }} className="relative p-2 text-center border-l border-white/10">
                                    الخصم <ResizeHandle field="discount" />
                                </th>
                            )}
                            <th style={{ width: colWidths.total }} className="relative p-2 text-left pr-4">
                                الإجمالي <ResizeHandle field="total" />
                            </th>
                            <th className="p-2 w-8 text-center bg-blue-700" />
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                        {items.map((item, index) => (
                            <tr key={item.id} className="group hover:bg-blue-50 dark:hover:bg-blue-900/5 transition-colors">
                                <td className="p-2 text-center text-[10px] font-mono font-bold text-blue-300 border-l dark:border-slate-800">{index + 1}</td>
                                <td className="p-0 border-l dark:border-slate-800">
                                    <div className="flex items-center px-2">
                                        <input
                                            type="text"
                                            value={item.name}
                                            data-row-index={index}
                                            data-col-field="name"
                                            onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                                            onClick={() => handleOpenSearch(index, item.name || '')}
                                            readOnly
                                            className="flex-1 p-2 bg-transparent outline-none text-right font-bold text-[11px] text-blue-900 dark:text-slate-100 cursor-pointer placeholder:text-blue-200"
                                            placeholder="اختر صنفاً..."
                                        />
                                        <Search size={12} className="text-blue-300 opacity-0 group-hover:opacity-100" />
                                    </div>
                                </td>
                                <td className="p-2 border-l dark:border-slate-800 text-center text-[10px] font-mono font-bold text-gray-500">{item.partNumber || '---'}</td>
                                <td className="p-2 border-l dark:border-slate-800 text-center text-[10px] font-bold text-blue-600">{item.brand || '---'}</td>
                                <td className="p-0 border-l dark:border-slate-800">
                                    <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')} data-row-index={index} data-col-field="quantity"
                                        className="w-full h-full p-2 bg-transparent outline-none text-center font-mono font-bold text-[11px] focus:bg-blue-50 dark:focus:bg-slate-800" placeholder="0" />
                                </td>
                                <td className="p-0 border-l dark:border-slate-800">
                                    <input type="number" value={item.costPrice || ''} onChange={(e) => updateItem(index, 'costPrice', parseFloat(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'costPrice')} data-row-index={index} data-col-field="costPrice"
                                        className="w-full h-full p-2 bg-transparent outline-none text-center font-mono font-bold text-[11px] text-rose-600 focus:bg-rose-50 dark:focus:bg-slate-800" placeholder="0.00" />
                                </td>
                                {showDiscount && (
                                    <td className="p-0 border-l dark:border-slate-800">
                                        <input type="number" value={item.discount || ''} onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                            onKeyDown={(e) => handleKeyDown(e, index, 'discount')} data-row-index={index} data-col-field="discount"
                                            className="w-full h-full p-2 bg-transparent outline-none text-center font-mono font-bold text-[11px] focus:bg-amber-50 dark:focus:bg-slate-800" />
                                    </td>
                                )}
                                <td dir="ltr" className="p-2 text-left font-mono font-bold text-[11px] text-blue-900 dark:text-white bg-blue-50/50 dark:bg-slate-950/30">
                                    {((Number(item.quantity) * Number(item.costPrice)) - (showDiscount ? Number(item.discount || 0) : 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-0 bg-blue-50/30">
                                    <button onClick={() => removeItem(index)} className="w-full h-full flex items-center justify-center text-rose-300 hover:text-rose-600 transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex bg-blue-600 border-t-2 border-blue-700">
                <button onClick={addItem} className="flex-1 py-2.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95">
                    <Plus size={14} strokeWidth={4} /> إضافة سطر جديد (New Purchase Row)
                </button>
            </div>

            <ProductSelectionModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                onSelect={handleProductSelect}
                initialQuery={modalState.query}
            />
        </div>
    );
};

export default InteractivePurchaseTable;
