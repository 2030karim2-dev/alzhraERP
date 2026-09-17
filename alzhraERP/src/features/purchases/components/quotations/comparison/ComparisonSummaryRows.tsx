import React from 'react';
import { formatCurrency } from '../../../../../core/utils';
import { getRateToSAR, type ComparisonSupplier } from '../../../services/quotationComparison';

interface ComparisonTotalCellProps {
  supplier: ComparisonSupplier;
  isCheapest: boolean;
  normalizeCurrency: boolean;
  normalizedTotal: number;
}

/** خلية إجمالي عرض مورد (مع المكافئ بالريال عند تعدد العملات). */
const ComparisonTotalCell = ({
  supplier,
  isCheapest,
  normalizeCurrency,
  normalizedTotal,
}: ComparisonTotalCellProps): React.ReactElement => {
  const isForeign = supplier.currency_code.toUpperCase() !== 'SAR';
  const totalColor = isCheapest
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-gray-800 dark:text-gray-200';
  return (
    <td className="px-4 py-3 text-center">
      <div className="flex flex-col items-center">
        <span className={`font-mono text-base font-bold ${totalColor}`} dir="ltr">
          {formatCurrency(supplier.total_amount, supplier.currency_code)}
        </span>
        {normalizeCurrency && isForeign && (
          <span
            className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-400"
            dir="ltr"
          >
            ≈ {formatCurrency(normalizedTotal, 'SAR')}
          </span>
        )}
      </div>
    </td>
  );
};

interface ComparisonTermsRowProps {
  label: string;
  termKey: 'delivery_terms' | 'payment_terms';
  suppliers: ComparisonSupplier[];
}

/** صف ملخّص لشرط نصّي (تسليم/دفع) عبر كل العروض. */
export const ComparisonTermsRow = ({
  label,
  termKey,
  suppliers,
}: ComparisonTermsRowProps): React.ReactElement => (
  <tr className="bg-gray-50 dark:bg-slate-800/30">
    <td className="sticky right-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600 dark:bg-slate-800/30 dark:text-gray-400">
      {label}
    </td>
    <td className="bg-gray-50 px-3 py-3 dark:bg-slate-800/30"></td>
    {suppliers.map(supplier => (
      <td
        key={supplier.id}
        className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400"
      >
        {supplier[termKey] ?? '—'}
      </td>
    ))}
  </tr>
);

interface ComparisonTotalRowProps {
  suppliers: ComparisonSupplier[];
  cheapestId: string;
  normalizedTotals: Map<string, number>;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}

/** صف «إجمالي العرض» مع الإجماليات المعايرة لكل مورد. */
export const ComparisonTotalRow = ({
  suppliers,
  cheapestId,
  normalizedTotals,
  normalizeCurrency,
  dynamicRatesMap,
}: ComparisonTotalRowProps): React.ReactElement => (
  <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/30">
    <td className="sticky right-0 z-10 bg-gray-50 px-4 py-3 font-bold text-gray-800 dark:bg-slate-800/30 dark:text-gray-200">
      إجمالي العرض
    </td>
    <td className="bg-gray-50 px-3 py-3 dark:bg-slate-800/30"></td>
    {suppliers.map(supplier => {
      const rate = getRateToSAR(supplier.currency_code, supplier.exchange_rate, dynamicRatesMap);
      return (
        <ComparisonTotalCell
          key={supplier.id}
          supplier={supplier}
          isCheapest={supplier.id === cheapestId}
          normalizeCurrency={normalizeCurrency}
          normalizedTotal={normalizedTotals.get(supplier.id) ?? supplier.total_amount * rate}
        />
      );
    })}
  </tr>
);
