import { useCallback, useEffect, useState } from 'react';
import { purchaseQuotationsApi } from '../api/quotationsApi';
import { useAuthStore } from '../../auth/store';
import {
  normalizeComparisonSuppliers,
  type ComparisonSupplier,
} from '../services/quotationComparison';

/**
 * يجلب عروض مجموعة طلب عرض السعر ويطبّعها إلى نموذج المقارنة.
 * لا يغيّر حالة التحميل إطلاقاً عندما تكون المجموعة أو المنشأة غير متاحة.
 */
export function useComparisonSuppliers(rfqGroupId: string): {
  suppliers: ComparisonSupplier[];
  loading: boolean;
} {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const [suppliers, setSuppliers] = useState<ComparisonSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComparison = useCallback(async (): Promise<void> => {
    if (rfqGroupId === '' || companyId === undefined || companyId === '') return;
    setLoading(true);
    try {
      const response = await purchaseQuotationsApi.getComparisonData(rfqGroupId, companyId);
      const rawData: unknown = response.data;
      setSuppliers(normalizeComparisonSuppliers(rawData));
    } finally {
      setLoading(false);
    }
  }, [rfqGroupId, companyId]);

  useEffect(() => {
    void fetchComparison();
  }, [fetchComparison]);

  return { suppliers, loading };
}
