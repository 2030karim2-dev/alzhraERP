import { useCallback, useMemo, useState } from 'react';
import { useComparisonSuppliers } from './useComparisonSuppliers';
import { useConvertQuotationToPurchase } from './useConvertQuotationToPurchase';
import { useDynamicCurrencyRates } from './useDynamicCurrencyRates';
import {
  buildQuotationComparison,
  type ComparisonSupplier,
  type QuotationComparisonResult,
} from '../services/quotationComparison';

export interface UseQuotationComparisonParams {
  rfqGroupId: string;
  onClose: () => void;
  onConvertToPurchase?: (() => void) | undefined;
}

export interface QuotationComparisonController {
  suppliers: ComparisonSupplier[];
  loading: boolean;
  comparison: QuotationComparisonResult | null;
  dynamicRatesMap: Map<string, number>;
  expanded: boolean;
  normalizeCurrency: boolean;
  actionLoading: string | null;
  toggleExpanded: () => void;
  toggleNormalizeCurrency: () => void;
  handleConvertToPurchase: (quotationId: string) => Promise<void>;
}

/**
 * حالة شاشة مقارنة العروض: جلب البيانات + أسعار الصرف + التوحيد + الاعتماد.
 * كل الاشتقاقات في `useMemo` حتى لا تُعاد المقارنة عند كل إعادة رسم.
 */
export function useQuotationComparison({
  rfqGroupId,
  onClose,
  onConvertToPurchase,
}: UseQuotationComparisonParams): QuotationComparisonController {
  const [expanded, setExpanded] = useState(true);
  const [normalizeCurrency, setNormalizeCurrency] = useState(true);
  const dynamicRatesMap = useDynamicCurrencyRates();
  const { suppliers, loading } = useComparisonSuppliers(rfqGroupId);

  const comparison = useMemo(
    () => buildQuotationComparison(suppliers, normalizeCurrency, dynamicRatesMap),
    [suppliers, normalizeCurrency, dynamicRatesMap]
  );

  const { actionLoading, handleConvertToPurchase } = useConvertQuotationToPurchase({
    suppliers,
    onClose,
    onConvertToPurchase,
  });

  const toggleExpanded = useCallback((): void => {
    setExpanded(value => !value);
  }, []);
  const toggleNormalizeCurrency = useCallback((): void => {
    setNormalizeCurrency(value => !value);
  }, []);

  return {
    suppliers,
    loading,
    comparison,
    dynamicRatesMap,
    expanded,
    normalizeCurrency,
    actionLoading,
    toggleExpanded,
    toggleNormalizeCurrency,
    handleConvertToPurchase,
  };
}
