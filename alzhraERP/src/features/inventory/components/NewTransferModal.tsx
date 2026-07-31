import React from 'react';
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
        fromWh, setFromWh,
        toWh, setToWh,
        notes, setNotes,
        selectedItems,
        productQuery, setProductQuery,
        handleAddItem,
        handleRemoveItem,
        handleUpdateQty,
        handleSubmit,
        isTransferring,
        isValid
    } = useNewTransfer(onClose);

    const { products } = useProducts(productQuery);

    if (!isOpen) return null;

    const footerContent = (
        <>
            <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
            <Button
                onClick={handleSubmit}
                isLoading={isTransferring}
                disabled={!isValid}
                variant="success"
                className="flex-1"
            >
                تأكيد المناقلة
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={ArrowLeftRight}
            title="مناقلة بضاعة بين المستودعات"
            description="تحويل كميات من فرع إلى آخر وتحديث الأرصدة"
            footer={footerContent}
            size="full"
        >
            <div className="flex flex-col h-full space-y-1">
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
                />

                <div className="flex-1 min-h-0 relative">
                    <TransferItemsList 
                        items={selectedItems}
                        onRemove={handleRemoveItem}
                        onUpdateQty={handleUpdateQty}
                        searchResults={products || []}
                        searchQuery={productQuery}
                        onAddItem={handleAddItem}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase mr-1 flex items-center gap-1.5">
                        <FileText size={12} />
                        ملاحظات
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ملاحظات إضافية حول عملية المناقلة..."
                        className="w-full bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                        rows={2}
                    ></textarea>
                </div>
            </div>
        </Modal>
    );
};

export default NewTransferModal;