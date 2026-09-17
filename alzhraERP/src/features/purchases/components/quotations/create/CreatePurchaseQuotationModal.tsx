import React from 'react';
import { FileText } from 'lucide-react';
import Modal from '../../../../../ui/base/Modal';
import ProductSelectionModal from '../../../../sales/components/create/ProductSelectionModal';
import { useAuthStore } from '../../../../auth/store';
import { usePurchaseQuotationForm } from './usePurchaseQuotationForm';
import { QuotationFormFields, QuotationModalFooter } from './QuotationFormSections';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  rfqGroupId?: string;
}

/**
 * نافذة «تسجيل عرض سعر مورد» — طبقة عرض خالص.
 *
 * كل الحالة والمنطق في `usePurchaseQuotationForm`، وكل الأجزاء البصرية في
 * `./SupplierSection` و`./QuotationItemsTable` و`./QuotationFormSections`،
 * والمنطق النقي في `./draft`. الواجهة العامة للمكوّن لم تتغير.
 */
const CreatePurchaseQuotationModal: React.FC<Props> = ({ onClose, onSuccess, rfqGroupId }) => {
  const { user } = useAuthStore();
  const form = usePurchaseQuotationForm({
    companyId: user?.company_id,
    userId: user?.id,
    rfqGroupId,
    onSuccess,
  });

  const isRfqAddendum = rfqGroupId !== undefined && rfqGroupId !== '';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      icon={FileText}
      title="تسجيل عرض سعر مورد"
      description={isRfqAddendum ? 'إضافة رد مورد لطلب عرض سعر قائم' : 'تسجيل عرض سعر جديد من مورد'}
      size="xl"
      footer={
        <QuotationModalFooter
          saving={form.saving}
          canSave={form.hasValidItem}
          onClose={onClose}
          onSave={() => {
            void form.handleSave();
          }}
        />
      }
    >
      <QuotationFormFields form={form} />
      <ProductSelectionModal
        isOpen={form.items.productModal.isOpen}
        onClose={form.items.closeProductSearch}
        onSelect={form.items.applyProduct}
        initialQuery={form.items.productModal.query}
        mode="purchase"
      />
    </Modal>
  );
};

export default CreatePurchaseQuotationModal;
