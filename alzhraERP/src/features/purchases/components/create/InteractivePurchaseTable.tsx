// ============================================
// InteractivePurchaseTable — جدول أصناف فاتورة الشراء
// تم الاستفادة من useColumnResize المشتركة لإزالة الكود المكرر
// ============================================
import React, { useEffect, useRef } from 'react';
import { usePurchaseStore } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { Plus } from 'lucide-react';
import ProductSelectionModal from '../../../sales/components/create/ProductSelectionModal';
import { useColumnResize } from '../../../../ui/common/hooks/useColumnResize';
import { PurchaseTableHeader, PurchaseTableBody, PurchaseTableToolbar } from './PurchaseInvoiceTableParts';
import { usePurchaseTableKeyboard } from './usePurchaseTableKeyboard';

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
    const { discountEnabled } = useDiscountStore();

    const tableRef = useRef<HTMLTableElement>(null);
    // ── Column Resize (مشتركة) ──────────────────────────────────
    const { colWidths, onResizeMouseDown } = useColumnResize({
        storageKey: 'purchase_col_widths',
        defaultWidths: PURCHASE_DEFAULT_WIDTHS,
    });

    // ── Init rows ───────────────────────────────────────────────
    useEffect(() => {
        if (items.length === 0) initializeItems(6);
    }, [initializeItems, items.length]);

    const { modalState, setModalState, handleOpenSearch, handleProductSelect, handleKeyDown } = usePurchaseTableKeyboard({ tableRef, itemCount: items.length, showDiscount, setProductForRow, addItem });

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="flex flex-col border-y-2 max-md:border-y border-blue-600 bg-[var(--app-surface)] overflow-hidden">
            <PurchaseTableToolbar discountEnabled={discountEnabled} showDiscount={showDiscount} onToggleDiscount={() => { toggleColumn('showDiscount'); }} />

            <div className="overflow-x-auto custom-scrollbar scroll-x-hint-solid max-md:-mx-0.5">
                <table ref={tableRef} className="w-full border-collapse table-fixed min-w-[860px] max-md:min-w-[540px]">
                    <PurchaseTableHeader colWidths={colWidths} showDiscount={showDiscount} onResizeMouseDown={onResizeMouseDown} />
                    <PurchaseTableBody items={items} showDiscount={showDiscount} onOpenSearch={handleOpenSearch} onKeyDown={handleKeyDown} onUpdate={updateItem} onRemove={removeItem} />
                </table>
            </div>

            <div className="flex bg-blue-600 border-t-2 max-md:border-t border-blue-700">
                <button onClick={addItem} className="flex-1 py-2 max-md:py-1 text-[10px] max-md:text-[10px] font-bold text-white hover:bg-blue-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 max-md:gap-1 active:scale-95">
                    <Plus size={14} className="max-md:w-3 max-md:h-3" strokeWidth={4} /> إضافة سطر جديد
                </button>
            </div>

            <ProductSelectionModal
                isOpen={modalState.isOpen}
                onClose={() => { setModalState((current) => ({ ...current, isOpen: false })); }}
                onSelect={handleProductSelect}
                initialQuery={modalState.query}
            />
        </div>
    );
};

export default InteractivePurchaseTable;
