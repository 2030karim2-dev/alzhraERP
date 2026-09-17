import React from 'react';
import { PriceCell } from './PriceCell';
import type {
  ComparisonItemMeta,
  ComparisonSupplier,
  QuotationPriceRange,
} from '../../../services/quotationComparison';

interface ComparisonItemRowProps {
  description: string;
  itemMeta: ComparisonItemMeta | undefined;
  priceRange: QuotationPriceRange | undefined;
  suppliers: ComparisonSupplier[];
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}

/** خلية وصف البند: الوصف + رقم القطعة. */
const DescriptionCell = ({
  description,
  itemMeta,
}: {
  description: string;
  itemMeta: ComparisonItemMeta | undefined;
}): React.ReactElement => {
  const partNumber = itemMeta?.part_number ?? null;
  return (
    <td className="sticky right-0 z-10 bg-[var(--app-surface)] px-4 py-3">
      <div className="font-medium text-gray-800 dark:text-gray-200">{description}</div>
      {partNumber !== null && partNumber !== '' && (
        <span className="font-mono text-[10px] text-gray-400">رقم القطعة: {partNumber}</span>
      )}
    </td>
  );
};

/** خلية القياس/المقاس للبند. */
const SizeCell = ({
  itemMeta,
}: {
  itemMeta: ComparisonItemMeta | undefined;
}): React.ReactElement => {
  const size = itemMeta?.size ?? null;
  return (
    <td className="px-3 py-3 text-center">
      {size !== null && size !== '' ? (
        <span className="inline-flex items-center rounded bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          {size}
        </span>
      ) : (
        <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
      )}
    </td>
  );
};

/** صف بند واحد عبر كل عروض الموردين. */
export const ComparisonItemRow = ({
  description,
  itemMeta,
  priceRange,
  suppliers,
  normalizeCurrency,
  dynamicRatesMap,
}: ComparisonItemRowProps): React.ReactElement => (
  <tr className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50">
    <DescriptionCell description={description} itemMeta={itemMeta} />
    <SizeCell itemMeta={itemMeta} />
    {suppliers.map(supplier => (
      <td key={supplier.id} className="px-4 py-3 text-center">
        <PriceCell
          item={supplier.quotation_items.find(item => item.description === description)}
          priceRange={priceRange}
          supplierId={supplier.id}
          currencyCode={supplier.currency_code}
          exchangeRate={supplier.exchange_rate}
          normalizeCurrency={normalizeCurrency}
          dynamicRatesMap={dynamicRatesMap}
        />
      </td>
    ))}
  </tr>
);
