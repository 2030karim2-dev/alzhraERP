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
import {
  PurchaseTableHeader,
  PurchaseTableBody,
  PurchaseTableToolbar,
} from './PurchaseInvoiceTableParts';
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
    items,
    initializeItems,
    addItem,
    updateItem,
    setProductForRow,
    removeItem,
    showDiscount,
    toggleColumn,
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

  const { modalState, setModalState, handleOpenSearch, handleProductSelect, handleKeyDown } =
    usePurchaseTableKeyboard({
      tableRef,
      itemCount: items.length,
      showDiscount,
      setProductForRow,
      addItem,
    });

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col overflow-hidden border-y-2 border-blue-600 bg-[var(--app-surface)] max-md:border-y">
      <PurchaseTableToolbar
        discountEnabled={discountEnabled}
        showDiscount={showDiscount}
        onToggleDiscount={() => {
          toggleColumn('showDiscount');
        }}
      />

      <div className="custom-scrollbar scroll-x-hint-solid overflow-x-auto max-md:-mx-0.5">
        <table
          ref={tableRef}
          className="w-full min-w-[860px] table-fixed border-collapse max-md:min-w-[540px]"
        >
          <PurchaseTableHeader
            colWidths={colWidths}
            showDiscount={showDiscount}
            onResizeMouseDown={onResizeMouseDown}
          />
          <PurchaseTableBody
            items={items}
            showDiscount={showDiscount}
            onOpenSearch={handleOpenSearch}
            onKeyDown={handleKeyDown}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        </table>
      </div>

      <div className="flex border-t-2 border-blue-700 bg-blue-600 max-md:border-t">
        <button
          onClick={addItem}
          className="flex flex-1 items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-blue-700 active:scale-95 max-md:gap-1 max-md:py-1 max-md:text-[10px]"
        >
          <Plus size={14} className="max-md:h-3 max-md:w-3" strokeWidth={4} /> إضافة سطر جديد
        </button>
      </div>

      <ProductSelectionModal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState(current => ({ ...current, isOpen: false }));
        }}
        onSelect={handleProductSelect}
        initialQuery={modalState.query}
        mode="purchase"
      />
    </div>
  );
};

export default InteractivePurchaseTable;
