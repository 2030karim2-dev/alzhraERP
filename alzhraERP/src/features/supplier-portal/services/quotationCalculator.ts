import Decimal from 'decimal.js';
import { safeDecimal, CURRENCY_PRECISION } from '../../../core/utils/decimalUtils';
import type { QuotationItemDraft } from '../types';

export interface CalculatedQuotationTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  itemsCount: number;
}

/**
 * Validates and sanitizes financial inputs before decimal processing (FIN-01)
 */
export const sanitizeFinancialNumber = (
  value: unknown,
  fallback = 0,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return fallback;
  }
  const parsed = Number(value);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
};

/**
 * Calculates a single quotation line item with exact Decimal precision and strict validation
 */
export const calculateQuotationItem = (
  item: Omit<
    QuotationItemDraft,
    'net_unit_price' | 'total_price' | 'discount_amount' | 'tax_amount'
  > & {
    discount_amount?: number;
    tax_amount?: number;
  }
): QuotationItemDraft => {
  // Validate and sanitize numeric fields
  const safeQtyNum = sanitizeFinancialNumber(item.quantity, 1, 0.0001, 1000000);
  const safePriceNum = sanitizeFinancialNumber(item.unit_price, 0, 0, 1000000000);
  const safeDiscPctNum = sanitizeFinancialNumber(item.discount_percentage, 0, 0, 100);

  const qty = safeDecimal(safeQtyNum);
  const unitPrice = safeDecimal(safePriceNum);
  const discountPct = safeDecimal(safeDiscPctNum);

  // Line subtotal: Qty * UnitPrice
  const lineSubtotal = qty.times(unitPrice);

  // Discount Amount: either specified or derived from discount percentage
  const discountAmount =
    item.discount_amount !== undefined && item.discount_amount > 0
      ? Decimal.min(lineSubtotal, safeDecimal(item.discount_amount))
      : lineSubtotal.times(discountPct.dividedBy(100));

  // Net line amount (0% VAT in Yemen)
  const netAmount = Decimal.max(0, lineSubtotal.minus(discountAmount));

  // Line total equals net amount (no tax)
  const lineTotal = netAmount;

  // Net Unit Price per piece
  const netUnitPrice = qty.isZero() ? unitPrice : netAmount.dividedBy(qty);

  return {
    ...item,
    quantity: qty.toNumber(),
    unit_price: unitPrice.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    discount_percentage: discountPct.toNumber(),
    discount_amount: discountAmount.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    net_unit_price: netUnitPrice.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    tax_percentage: 0,
    tax_amount: 0,
    total_price: lineTotal.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
  };
};

/**
 * Aggregates all items in a quotation into deterministic header totals (0% Tax)
 */
export const calculateQuotationTotals = (
  items: QuotationItemDraft[],
  globalDiscountAmount = 0
): CalculatedQuotationTotals => {
  let subtotal = new Decimal(0);
  let totalLineDiscount = new Decimal(0);
  let totalAmount = new Decimal(0);

  items.forEach(item => {
    const calculated = calculateQuotationItem(item);
    const lineSubtotal = safeDecimal(calculated.quantity).times(safeDecimal(calculated.unit_price));
    subtotal = subtotal.plus(lineSubtotal);
    totalLineDiscount = totalLineDiscount.plus(safeDecimal(calculated.discount_amount));
    totalAmount = totalAmount.plus(safeDecimal(calculated.total_price));
  });

  const safeGlobalDisc = safeDecimal(sanitizeFinancialNumber(globalDiscountAmount, 0, 0));
  const totalDiscount = Decimal.min(subtotal, totalLineDiscount.plus(safeGlobalDisc));
  const taxableAmount = Decimal.max(0, subtotal.minus(totalDiscount));
  const finalTotal = taxableAmount;

  return {
    subtotal: subtotal.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    discountAmount: totalDiscount.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    taxableAmount: taxableAmount.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    taxAmount: 0,
    grandTotal: finalTotal.toDecimalPlaces(CURRENCY_PRECISION).toNumber(),
    itemsCount: items.length,
  };
};

/**
 * Public-portal draft line total (qty × price − %discount) using the same
 * sanitize + Decimal pipeline as `calculateQuotationItem`. Keeps the supplier
 * portal's displayed totals consistent with the internal quotation engine
 * instead of ad-hoc floating-point math at the call site.
 */
export const calculatePortalLineTotal = (
  quantity: number,
  unitPrice: number,
  discountPercent: number
): number => {
  const qty = safeDecimal(sanitizeFinancialNumber(quantity, 0, 0, 1000000));
  const price = safeDecimal(sanitizeFinancialNumber(unitPrice, 0, 0, 1000000000));
  const discPct = safeDecimal(sanitizeFinancialNumber(discountPercent, 0, 0, 100));
  const lineSubtotal = qty.times(price);
  const net = lineSubtotal.times(Decimal.max(0, new Decimal(1).minus(discPct.dividedBy(100))));
  return Decimal.max(0, net).toDecimalPlaces(CURRENCY_PRECISION).toNumber();
};
