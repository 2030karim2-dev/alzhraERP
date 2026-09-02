import React, { useEffect, useMemo } from 'react';
import { ArrowLeftRight, FileText } from 'lucide-react';
import { useWarehouses } from '../hooks/useInventoryManagement';
import { useProducts } from '../hooks/useProducts';
import { useNewTransfer } from '../hooks/useNewTransfer';
import Button from '../../../ui/base/Button';
import Modal from '../../../ui/base/Modal';
import TransferWarehousePicker from './transfers/TransferWarehousePicker';
import TransferProductSearch from './transfers/TransferProductSearch';
import TransferItemsList from './transfers/TransferItemsList';

interface NewTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewTransferModal: React.FC<NewTransferModalProps> = ({ isOpen, onClose }) => {
  const { data: warehouses } = useWarehouses();
  const {
    fromWh,
    setFromWh,
    toWh,
    setToWh,
    notes,
    setNotes,
    selectedItems,
    productQuery,
    setProductQuery,
    handleAddItem,
    handleRemoveItem,
    handleUpdateQty,
    handleSubmit,
    isTransferring,
    isValid,
  } = useNewTransfer(onClose);

  // Fetch all products into memory for lightning-fast instant search & picker
  const { products } = useProducts('');

  // Auto-select initial warehouses if available and not selected
  useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      if (!fromWh) {
        setFromWh(warehouses[0].id);
      }
      if (!toWh && warehouses.length > 1) {
        setToWh(warehouses[1].id);
      }
    }
  }, [warehouses, fromWh, toWh, setFromWh, setToWh]);

  const selectedProductIds = useMemo(() => {
    return new Set(selectedItems.map(i => i.product.id));
  }, [selectedItems]);

  if (!isOpen) return null;

  const footerContent = (
    <>
      <Button variant="outline" onClick={onClose} className="flex-1">
        إلغاء
      </Button>
      <Button
        onClick={handleSubmit}
        isLoading={isTransferring}
        disabled={!isValid}
        variant="success"
        className="flex-1"
      >
        تأكيد المناقلة ({selectedItems.length} صنف)
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={ArrowLeftRight}
      title="مناقلة بضاعة بين المستودعات"
      description="تحويل كميات من فرع إلى آخر وتحديث الأرصدة فورياً"
      footer={footerContent}
      size="full"
    >
      <div className="flex h-full flex-col space-y-2">
        <TransferWarehousePicker
          warehouses={warehouses}
          fromWh={fromWh}
          setFromWh={setFromWh}
          toWh={toWh}
          setToWh={setToWh}
        />

        <TransferProductSearch
          query={productQuery}
          setQuery={setProductQuery}
          products={products || []}
          fromWarehouseId={fromWh}
          onAddItem={handleAddItem}
          selectedProductIds={selectedProductIds}
        />

        <div className="relative flex min-h-[320px] flex-1 flex-col">
          <TransferItemsList
            items={selectedItems}
            onRemove={handleRemoveItem}
            onUpdateQty={handleUpdateQty}
            fromWarehouseId={fromWh}
          />
        </div>

        <div className="space-y-1">
          <label className="mr-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500">
            <FileText size={12} />
            ملاحظات أو سبب المناقلة
          </label>
          <textarea
            value={notes}
            onChange={e => {
              setNotes(e.target.value);
            }}
            placeholder="أدخل أي ملاحظات خاصة بأمر المناقلة (اختياري)..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            rows={2}
          ></textarea>
        </div>
      </div>
    </Modal>
  );
};

export default NewTransferModal;
