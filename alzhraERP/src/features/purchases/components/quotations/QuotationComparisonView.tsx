import React from 'react';
import {
  ComparisonEmptyState,
  ComparisonHeader,
  ComparisonLoadingState,
  ComparisonTable,
  MixedCurrencyBanner,
  RecommendationsBar,
} from './comparison';
import { useQuotationComparison } from '../../hooks/useQuotationComparison';

interface Props {
  rfqGroupId: string;
  onClose: () => void;
  onConvertToPurchase?: () => void;
}

/**
 * شاشة مقارنة عروض أسعار الموردين لمجموعة طلب عرض سعر.
 *
 * هذه الطبقة عرض خالص: كل الجلب والحساب في
 * `hooks/useQuotationComparison` و`services/quotationComparison`،
 * وكل الأجزاء البصرية في `./comparison/*`.
 */
const QuotationComparisonView: React.FC<Props> = ({ rfqGroupId, onClose, onConvertToPurchase }) => {
  const comparison = useQuotationComparison({ rfqGroupId, onClose, onConvertToPurchase });

  if (comparison.loading) return <ComparisonLoadingState />;
  if (comparison.comparison === null) return <ComparisonEmptyState />;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
      <ComparisonHeader
        suppliersCount={comparison.suppliers.length}
        expanded={comparison.expanded}
        onToggle={comparison.toggleExpanded}
        onClose={onClose}
        isMixedCurrencies={comparison.comparison.isMixedCurrencies}
        normalizeCurrency={comparison.normalizeCurrency}
        onToggleNormalize={comparison.toggleNormalizeCurrency}
      />
      {comparison.comparison.isMixedCurrencies && (
        <MixedCurrencyBanner
          currencies={comparison.comparison.currencies}
          normalizeCurrency={comparison.normalizeCurrency}
          onToggleNormalize={comparison.toggleNormalizeCurrency}
        />
      )}
      {comparison.expanded && (
        <>
          <ComparisonTable
            suppliers={comparison.suppliers}
            comparison={comparison.comparison}
            actionLoading={comparison.actionLoading}
            normalizeCurrency={comparison.normalizeCurrency}
            dynamicRatesMap={comparison.dynamicRatesMap}
            onConvert={comparison.handleConvertToPurchase}
          />
          <RecommendationsBar
            suppliers={comparison.suppliers}
            cheapestId={comparison.comparison.cheapestId}
            isMixedCurrencies={comparison.comparison.isMixedCurrencies}
            normalizeCurrency={comparison.normalizeCurrency}
            dynamicRatesMap={comparison.dynamicRatesMap}
          />
        </>
      )}
    </div>
  );
};

export default QuotationComparisonView;
