/**
 * @fileoverview Decimal-safe arithmetic — invoice / journal / currency calculations
 * @module core/utils/decimalUtils/calculations
 */
import Decimal from 'decimal.js';
import type {
  CurrencyConversionInput,
  CurrencyConversionResult,
  InvoiceSummary,
  InvoiceSummaryInput,
  JournalBalance,
  JournalLineInput,
  LineItemCalculation,
  NumericInput,
  SalesItemInput,
} from './types';
import { CURRENCY_PRECISION, SOX_BALANCE_TOLERANCE } from './constants';
import { safeDecimal } from './constructors';
import { generateCalculationHash } from './hashing';

/**
 * Calculates line item totals with full precision
 * SOX-compliant: Maintains audit trail of all intermediate calculations
 */
export const calculateLineItem = (item: SalesItemInput): LineItemCalculation => {
  const qty = safeDecimal(item.quantity);
  const price = safeDecimal(item.price);
  const discount = safeDecimal(item.discount);
  const taxRate = safeDecimal(item.taxRate);

  // Step-by-step calculation for auditability
  const subtotal = qty.times(price);
  const taxableAmount = subtotal.minus(discount);
  const taxAmount = taxableAmount.times(taxRate.dividedBy(100));
  const total = taxableAmount.plus(taxAmount);

  // Generate verification hash
  const lineHash = generateCalculationHash({
    quantity: item.quantity,
    price: item.price,
    discount: item.discount,
    taxRate: item.taxRate,
  });

  return {
    subtotal: subtotal.toDecimalPlaces(CURRENCY_PRECISION),
    discountAmount: discount.toDecimalPlaces(CURRENCY_PRECISION),
    taxableAmount: taxableAmount.toDecimalPlaces(CURRENCY_PRECISION),
    taxAmount: taxAmount.toDecimalPlaces(CURRENCY_PRECISION),
    total: total.toDecimalPlaces(CURRENCY_PRECISION),
    lineHash,
  };
};

/**
 * Calculates complete invoice summary
 */
export const calculateInvoiceSummary = (input: InvoiceSummaryInput): InvoiceSummary => {
  const globalDiscount = safeDecimal(input.globalDiscount);

  const lineCalculations = input.items.map(calculateLineItem);

  const subtotal = lineCalculations.reduce((sum, line) => sum.plus(line.subtotal), new Decimal(0));

  const totalDiscount = lineCalculations
    .reduce((sum, line) => sum.plus(line.discountAmount), new Decimal(0))
    .plus(globalDiscount);

  const totalTax = lineCalculations.reduce((sum, line) => sum.plus(line.taxAmount), new Decimal(0));

  const grandTotal = subtotal.minus(totalDiscount).plus(totalTax);

  const summaryHash = generateCalculationHash({
    subtotal: subtotal.toString(),
    totalDiscount: totalDiscount.toString(),
    totalTax: totalTax.toString(),
    grandTotal: grandTotal.toString(),
  });

  return {
    subtotal: subtotal.toDecimalPlaces(CURRENCY_PRECISION),
    totalDiscount: totalDiscount.toDecimalPlaces(CURRENCY_PRECISION),
    totalTax: totalTax.toDecimalPlaces(CURRENCY_PRECISION),
    grandTotal: grandTotal.toDecimalPlaces(CURRENCY_PRECISION),
    itemCount: input.items.length,
    summaryHash,
  };
};

/**
 * Validates journal entry balance
 * SOX Control: IC-2026-001 Remediation
 */
export const validateJournalBalance = (lines: readonly JournalLineInput[]): JournalBalance => {
  const debitTotal = lines.reduce((sum, line) => sum.plus(safeDecimal(line.debit)), new Decimal(0));

  const creditTotal = lines.reduce(
    (sum, line) => sum.plus(safeDecimal(line.credit)),
    new Decimal(0)
  );

  const imbalance = debitTotal.minus(creditTotal).absoluteValue();
  const isBalanced = imbalance.lessThanOrEqualTo(SOX_BALANCE_TOLERANCE);

  return {
    debitTotal: debitTotal.toDecimalPlaces(CURRENCY_PRECISION),
    creditTotal: creditTotal.toDecimalPlaces(CURRENCY_PRECISION),
    imbalance,
    isBalanced,
  };
};

/**
 * Throws if journal is unbalanced
 */
export const assertJournalBalanced = (
  lines: readonly JournalLineInput[],
  context?: Record<string, unknown>
): void => {
  const balance = validateJournalBalance(lines);

  if (!balance.isBalanced) {
    const error = new Error(
      `Journal entry imbalance detected: ${balance.imbalance.toString()} SAR ` +
        `(Debit: ${balance.debitTotal.toString()}, Credit: ${balance.creditTotal.toString()})`
    );

    // Attach context for logging
    (error as Error & { context: unknown }).context = {
      ...context,
      balance,
      lineCount: lines.length,
    };

    throw error;
  }
};

/**
 * Performs currency conversion with audit trail
 */
export const convertCurrency = (input: CurrencyConversionInput): CurrencyConversionResult => {
  const amount = safeDecimal(input.amount);
  const rate = safeDecimal(input.exchangeRate);

  // Ensure rate is positive and non-zero
  const safeRate = rate.isZero() ? new Decimal(1) : rate.absoluteValue();

  const convertedAmount = amount.times(safeRate);

  const conversionHash = generateCalculationHash({
    amount: input.amount,
    exchangeRate: input.exchangeRate,
  });

  return {
    originalAmount: amount.toDecimalPlaces(CURRENCY_PRECISION),
    convertedAmount: convertedAmount.toDecimalPlaces(CURRENCY_PRECISION),
    exchangeRate: safeRate.toDecimalPlaces(8),
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    conversionHash,
  };
};

// Re-exported for callers that only need the numeric constructors from here.
export type { NumericInput };
