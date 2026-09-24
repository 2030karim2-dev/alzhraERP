import React from 'react';
import ScannerOverlay from '../../../../ui/base/ScannerOverlay';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';
import AddProductModal from '../AddProductModal';
import type { AuditItemTarget } from './AuditItemsTable';
import type { Product, ProductFormData } from '../../types';

interface AuditSessionModalsProps {
  isScannerOpen: boolean;
  onScan: (barcode: string) => void;
  onCloseScanner: () => void;

  itemToDelete: AuditItemTarget | null;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  isRemovingItem: boolean;

  showBulkConfirm: boolean;
  onCloseBulkConfirm: () => void;
  onConfirmBulkAdd: () => void;
  isPopulatingWarehouse: boolean;

  showFinalizeConfirm: boolean;
  onCloseFinalizeConfirm: () => void;
  onConfirmFinalize: () => void;
  isFinalizing: boolean;
  pendingCount: number;

  showAddProduct: boolean;
  onCloseAddProduct: () => void;
  onCreateProduct: (formData: ProductFormData) => void;
  isSavingProduct: boolean;
  newProductInitialData: Product | null;
}

export const AuditSessionModals: React.FC<AuditSessionModalsProps> = ({
  isScannerOpen,
  onScan,
  onCloseScanner,

  itemToDelete,
  onCloseDeleteModal,
  onConfirmDelete,
  isRemovingItem,

  showBulkConfirm,
  onCloseBulkConfirm,
  onConfirmBulkAdd,
  isPopulatingWarehouse,

  showFinalizeConfirm,
  onCloseFinalizeConfirm,
  onConfirmFinalize,
  isFinalizing,
  pendingCount,

  showAddProduct,
  onCloseAddProduct,
  onCreateProduct,
  isSavingProduct,
  newProductInitialData,
}) => {
  return (
    <>
      {isScannerOpen && <ScannerOverlay onScan={onScan} onClose={onCloseScanner} />}

      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDelete}
        title="إزالة الصنف من الجرد"
        message={
          itemToDelete?.name
            ? `هل أنت متأكد من رغبتك في إزالة "${itemToDelete.name}" من جلسة الجرد الميدانية الحالية؟`
            : 'هل أنت متأكد من رغبتك في إزالة هذا الصنف من جلسة الجرد الميدانية الحالية؟'
        }
        variant="danger"
        confirmLabel="نعم، إزالة الصنف"
        isLoading={isRemovingItem}
      />

      <ConfirmModal
        isOpen={showBulkConfirm}
        onClose={onCloseBulkConfirm}
        onConfirm={onConfirmBulkAdd}
        title="جرد كامل المستودع"
        message="سيتم إضافة جميع منتجات هذا المستودع إلى جلسة الجرد الحالية تلقائياً وبشكل فوري. هل تريد المتابعة؟"
        variant="warning"
        confirmLabel="نعم، أضف كل المنتجات"
        isLoading={isPopulatingWarehouse}
      />

      <ConfirmModal
        isOpen={showFinalizeConfirm}
        onClose={onCloseFinalizeConfirm}
        onConfirm={onConfirmFinalize}
        title="إنهاء واعتماد الجرد"
        message={`تنبيه: يوجد ${pendingCount} صنف لم يتم جرده بعد. عند الاعتماد سيتم ترحيل الفروقات المخزنية نهائياً وإغلاق الجلسة. هل تريد المتابعة؟`}
        variant="warning"
        confirmLabel="نعم، اعتماد وإنهاء الجرد"
        isLoading={isFinalizing}
      />

      <AddProductModal
        isOpen={showAddProduct}
        onClose={onCloseAddProduct}
        onSubmit={onCreateProduct}
        isSubmitting={isSavingProduct}
        initialData={newProductInitialData}
        zIndex="z-[10000]"
      />
    </>
  );
};
