import { useState } from 'react';
import { logger } from '../../../core/utils/logger';
import { purchaseQuotationsApi } from '../api/quotationsApi';
import { usePurchaseStore } from '../store';
import type { ComparisonSupplier } from '../services/quotationComparison';

interface UseConvertQuotationToPurchaseOptions {
  suppliers: ComparisonSupplier[];
  onClose: () => void;
  onConvertToPurchase?: (() => void) | undefined;
}

/**
 * يعتمد عرض مورد: يملأ سلة الشراء ببنود العرض ثم يعلّم حالة العرض «محوّل»،
 * ويغلق الشاشة عند النجاح. يحمي من النقر المزدوج عبر `actionLoading`.
 */
export function useConvertQuotationToPurchase({
  suppliers,
  onClose,
  onConvertToPurchase,
}: UseConvertQuotationToPurchaseOptions): {
  actionLoading: string | null;
  handleConvertToPurchase: (quotationId: string) => Promise<void>;
} {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleConvertToPurchase = async (quotationId: string): Promise<void> => {
    const quotation = suppliers.find(supplier => supplier.id === quotationId);
    if (quotation === undefined) return;
    setActionLoading(quotationId);
    try {
      const { resetCart, setSupplier, bulkLoadItems } = usePurchaseStore.getState();
      resetCart();
      if (quotation.party !== null) {
        setSupplier({ id: quotation.party.id ?? 'temp', name: quotation.party.name });
      }
      if (quotation.quotation_items.length > 0) {
        bulkLoadItems(
          quotation.quotation_items.map(item => ({
            productId: item.product_id ?? '',
            name: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            costPrice: item.unit_price,
          }))
        );
      }
      await purchaseQuotationsApi.updateStatus(quotationId, 'converted');
      onClose();
      if (onConvertToPurchase !== undefined) onConvertToPurchase();
    } catch (error) {
      logger.error('QuotationComparisonView', 'Failed to convert purchase quotation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return { actionLoading, handleConvertToPurchase };
}
