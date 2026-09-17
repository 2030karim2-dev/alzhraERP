import React from 'react';
import { formatCurrency } from '../../../../../core/utils';
import {
  getRateToSAR,
  type ComparisonQuotationItem,
  type QuotationPriceRange,
} from '../../../services/quotationComparison';

/** لون السعر: زمردي للأرخص، أحمر للأغلى، ورمادي لما بينهما. */
const resolvePriceColor = (isCheapest: boolean, isMostExpensive: boolean): string => {
  if (isCheapest) return 'text-emerald-600 dark:text-emerald-400';
  if (isMostExpensive) return 'text-rose-500 dark:text-rose-400';
  return 'text-gray-800 dark:text-gray-200';
};

/** هل هذا السعر هو الأعلى في نطاقه (مع مراعاة التوحيد عند تفعيله)؟ */
const isMostExpensivePrice = (
  priceRange: QuotationPriceRange | undefined,
  unitPrice: number,
  normalizedUnitPrice: number,
  normalizeCurrency: boolean
): boolean => {
  if (priceRange === undefined) return false;
  return normalizeCurrency
    ? priceRange.maxNormalized === normalizedUnitPrice &&
        priceRange.maxNormalized !== priceRange.minNormalized
    : priceRange.max === unitPrice && priceRange.max !== priceRange.min;
};

interface PriceCellProps {
  item: ComparisonQuotationItem | undefined;
  priceRange: QuotationPriceRange | undefined;
  supplierId: string;
  currencyCode: string;
  exchangeRate?: number | null | undefined;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}

/** خلية سعر مورد واحد لبند معيّن (تشمل الإجمالي والكمية والمكافئ بالريال). */
export const PriceCell = ({
  item,
  priceRange,
  supplierId,
  currencyCode,
  exchangeRate,
  normalizeCurrency,
  dynamicRatesMap,
}: PriceCellProps): React.ReactElement => {
  if (item === undefined) return <span className="text-gray-300 dark:text-slate-600">—</span>;
  const rate = getRateToSAR(currencyCode, exchangeRate, dynamicRatesMap);
  const isCheapest = priceRange?.minSupplier === supplierId;
  const normalizedUnitPrice = item.unit_price * rate;
  const color = resolvePriceColor(
    isCheapest,
    isMostExpensivePrice(priceRange, item.unit_price, normalizedUnitPrice, normalizeCurrency)
  );
  const itemTotal = item.total > 0 ? item.total : item.unit_price * item.quantity;
  const isForeign = currencyCode.toUpperCase() !== 'SAR';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-mono text-sm font-bold ${color}`} dir="ltr">
        {formatCurrency(item.unit_price, currencyCode)}
      </span>
      {normalizeCurrency && isForeign && (
        <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400" dir="ltr">
          ≈ {formatCurrency(normalizedUnitPrice, 'SAR')}
        </span>
      )}
      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
        <span>الإجمالي:</span>
        <span className="font-mono font-medium" dir="ltr">
          {formatCurrency(itemTotal, currencyCode)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] text-gray-400">الكمية: {item.quantity}</span>
        {isCheapest && (
          <span className="rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            الأقل سعراً
          </span>
        )}
      </div>
    </div>
  );
};
