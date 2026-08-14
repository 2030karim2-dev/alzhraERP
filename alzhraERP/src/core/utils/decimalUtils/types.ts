/**
 * @fileoverview Decimal-safe arithmetic — shared types
 * @module core/utils/decimalUtils/types
 */
import Decimal from 'decimal.js';

export type NumericInput = string | number | Decimal | undefined | null;

export interface CalculationResult {
    readonly value: Decimal;
    readonly isValid: boolean;
    readonly errorMessage: string | null;
    readonly calculationHash: string;
}

export interface LineItemCalculation {
    readonly subtotal: Decimal;
    readonly discountAmount: Decimal;
    readonly taxableAmount: Decimal;
    readonly taxAmount: Decimal;
    readonly total: Decimal;
    readonly lineHash: string;
}

export interface JournalBalance {
    readonly debitTotal: Decimal;
    readonly creditTotal: Decimal;
    readonly imbalance: Decimal;
    readonly isBalanced: boolean;
}

export interface SalesItemInput {
    readonly quantity: NumericInput;
    readonly price: NumericInput;
    readonly discount?: NumericInput;
    readonly taxRate?: NumericInput;
}

export interface InvoiceSummaryInput {
    readonly items: ReadonlyArray<SalesItemInput>;
    readonly globalDiscount?: NumericInput;
    readonly globalTaxRate?: NumericInput;
}

export interface InvoiceSummary {
    readonly subtotal: Decimal;
    readonly totalDiscount: Decimal;
    readonly totalTax: Decimal;
    readonly grandTotal: Decimal;
    readonly itemCount: number;
    readonly summaryHash: string;
}

export interface JournalLineInput {
    readonly debit: NumericInput;
    readonly credit: NumericInput;
}

export interface CurrencyConversionInput {
    readonly amount: NumericInput;
    readonly exchangeRate: NumericInput;
    readonly fromCurrency: string;
    readonly toCurrency: string;
}

export interface CurrencyConversionResult {
    readonly originalAmount: Decimal;
    readonly convertedAmount: Decimal;
    readonly exchangeRate: Decimal;
    readonly fromCurrency: string;
    readonly toCurrency: string;
    readonly conversionHash: string;
}
