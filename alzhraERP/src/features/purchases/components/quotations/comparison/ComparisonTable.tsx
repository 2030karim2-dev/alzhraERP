import React from 'react';
import { ComparisonTableHead } from './ComparisonTableHead';
import { ComparisonItemRow } from './ComparisonItemRow';
import { ComparisonTermsRow, ComparisonTotalRow } from './ComparisonSummaryRows';
import { ComparisonActionRow } from './ComparisonActionRow';
import type {
  ComparisonSupplier,
  QuotationComparisonResult,
} from '../../../services/quotationComparison';

interface ComparisonTableProps {
  suppliers: ComparisonSupplier[];
  comparison: QuotationComparisonResult;
  actionLoading: string | null;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
  onConvert: (id: string) => Promise<void>;
}

/** جدول المقارنة الكامل: رأس + صفوف البنود + صفوف الملخّص + صف الإجراء. */
export const ComparisonTable = ({
  suppliers,
  comparison,
  actionLoading,
  normalizeCurrency,
  dynamicRatesMap,
  onConvert,
}: ComparisonTableProps): React.ReactElement => (
  <div className="scroll-x-hint-surface overflow-x-auto">
    <table className="w-full text-sm">
      <ComparisonTableHead suppliers={suppliers} cheapestId={comparison.cheapestId} />
      <tbody>
        {comparison.descriptions.map(description => (
          <ComparisonItemRow
            key={description}
            description={description}
            itemMeta={comparison.itemsMap.get(description)}
            priceRange={comparison.priceMap.get(description)}
            suppliers={suppliers}
            normalizeCurrency={normalizeCurrency}
            dynamicRatesMap={dynamicRatesMap}
          />
        ))}
        <ComparisonTotalRow
          suppliers={suppliers}
          cheapestId={comparison.cheapestId}
          normalizedTotals={comparison.normalizedTotals}
          normalizeCurrency={normalizeCurrency}
          dynamicRatesMap={dynamicRatesMap}
        />
        <ComparisonTermsRow label="شروط التسليم" termKey="delivery_terms" suppliers={suppliers} />
        <ComparisonTermsRow label="شروط الدفع" termKey="payment_terms" suppliers={suppliers} />
        <ComparisonActionRow
          suppliers={suppliers}
          cheapestId={comparison.cheapestId}
          actionLoading={actionLoading}
          onConvert={onConvert}
        />
      </tbody>
    </table>
  </div>
);
