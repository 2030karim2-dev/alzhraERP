/**
 * Currency Utilities for Al-Zahra Smart ERP
 * Unified currency conversion and formatting functions
 * 
 * This module consolidates duplicate currency conversion logic that was
 * previously scattered across multiple files:
 * - src/features/dashboard/service.ts
 * - src/features/dashboard/services/dashboardStats.ts
 * - src/features/dashboard/services/dashboardInsights.ts
 * - src/features/sales/api.ts
 * - src/features/purchases/service.ts
 */

/**
 * Supported currency codes
 */
export type CurrencyCode = 'SAR' | 'YER' | 'USD' | 'OMR' | 'CNY';

/**
 * Currency symbols mapping
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
    SAR: 'ر.س',
    YER: 'ر.ي',
    USD: '$',
    OMR: 'ر.ع',
    CNY: '¥',
    EGP: 'ج.م',
    AED: 'د.إ',
    KWD: 'د.ك',
    BHD: 'د.ب',
    QAR: 'ر.ق',
};

/**
 * Currency conversion parameters
 */
export interface CurrencyConversionParams {
    /** Amount in the source currency */
    amount: number;
    /** Source currency code */
    currencyCode: CurrencyCode;
    /** Exchange rate to base currency (SAR) */
    exchangeRate: number;
    /** Exchange operator: 'multiply' means rate × amount, 'divide' means amount ÷ rate */
    exchangeOperator?: 'multiply' | 'divide';
}

/**
 * Convert an amount from a foreign currency to the base currency (SAR)
 * 
 * @param params - Conversion parameters
 * @returns Amount in base currency (SAR)
 * 
 * @example
 * // Convert 100 USD to SAR with rate 3.75
 * const sarAmount = convertToBaseCurrency({
 *   amount: 100,
 *   currencyCode: 'USD',
 *   exchangeRate: 3.75,
 *   exchangeOperator: 'multiply'
 * });
 * // Returns: 375
 */
export class CurrencyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CurrencyError';
    }
}

export const convertToBaseCurrency = (params: CurrencyConversionParams): number => {
    const { amount, exchangeRate, exchangeOperator = 'multiply' } = params;

    // Validate exchange rate
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new CurrencyError(`Invalid exchange rate: ${exchangeRate}. Must be a positive number.`);
    }

    // If rate is 1, no conversion needed
    if (exchangeRate === 1) {
        return amount;
    }

    // Validate amount
    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    // Prevent division by zero
    if (exchangeOperator === 'divide' && exchangeRate === 0) {
        throw new CurrencyError('Cannot divide by zero exchange rate');
    }

    // Perform conversion based on operator
    const converted = exchangeOperator === 'divide'
        ? amount / exchangeRate
        : amount * exchangeRate;

    // Round to 2 decimal places for currency precision
    // Adding Number.EPSILON compensates for IEEE 754 float representation errors
    // e.g. Math.round(1.005 * 100) / 100 = 1, but Math.round((1.005 + ε) * 100) / 100 = 1.01
    return Math.round((converted + Number.EPSILON) * 100) / 100;
};

/**
 * Convert an amount from base currency (SAR) to a foreign currency
 * 
 * @param params - Conversion parameters
 * @returns Amount in foreign currency
 * 
 * @example
 * // Convert 375 SAR to USD with rate 3.75
 * const usdAmount = convertFromBaseCurrency({
 *   amount: 375,
 *   currencyCode: 'USD',
 *   exchangeRate: 3.75,
 *   exchangeOperator: 'multiply'
 * });
 * // Returns: 100
 */
export const convertFromBaseCurrency = (params: CurrencyConversionParams): number => {
    const { amount, exchangeRate, exchangeOperator = 'multiply' } = params;

    // Validate exchange rate — consistent with convertToBaseCurrency
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new CurrencyError(`Invalid exchange rate: ${exchangeRate}. Must be a positive number.`);
    }

    // If rate is 1, no conversion needed
    if (exchangeRate === 1) {
        return amount;
    }

    // Validate amount
    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    // Prevent division by zero
    if (exchangeOperator === 'divide' && exchangeRate === 0) {
        throw new CurrencyError('Cannot divide by zero exchange rate');
    }

    // Reverse the conversion
    const converted = exchangeOperator === 'divide'
        ? amount * exchangeRate
        : amount / exchangeRate;

    return Math.round((converted + Number.EPSILON) * 100) / 100;
};

/**
 * Format a number as currency with the appropriate symbol
 * 
 * @param amount - The amount to format
 * @param currencyCode - Currency code (default: SAR)
 * @param options - Formatting options
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'SAR'); // '1,234.56 ر.س'
 * formatCurrency(1234.56, 'USD'); // '$1,234.56'
 */
export const formatCurrency = (
    amount: number,
    currencyCode: CurrencyCode = 'SAR',
    options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
    }
): string => {
    const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options || {};

    // Format the number with thousand separators
    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount);

    // Get the currency symbol
    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

    // USD symbol goes before the number
    if (currencyCode === 'USD') {
        return `${symbol}${formattedNumber}`;
    }

    // Other currencies: symbol after the number
    return `${formattedNumber} ${symbol}`;
};

/**
 * Format a number with thousand separators (no currency symbol)
 * 
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Parse a currency string back to a number
 * 
 * @param currencyString - The currency string to parse
 * @returns The numeric value
 * 
 * @example
 * parseCurrency('1,234.56 ر.س'); // 1234.56
 * parseCurrency('$1,234.56'); // 1234.56
 */
export const parseCurrency = (currencyString: string): number => {
    // Remove all known currency symbols and whitespace
    const symbolValues = Object.values(CURRENCY_SYMBOLS);
    let cleaned = currencyString;
    for (const sym of symbolValues) {
        cleaned = cleaned.split(sym).join('');
    }
    cleaned = cleaned.replace(/\s/g, '').replace(/,/g, '');

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Calculate the exchange rate between two currencies
 * 
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rates - Object containing exchange rates to base currency
 * @returns Exchange rate from source to target
 */
export const calculateExchangeRate = (
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    rates: Record<string, number>
): number => {
    // Same currency, no conversion needed
    if (fromCurrency === toCurrency) {
        return 1;
    }

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Cross rate calculation
    return fromRate / toRate;
};

/**
 * Unified currency conversion function
 * Converts an amount between base currency (SAR) and a foreign currency
 * 
 * @param amount - The amount to convert
 * @param rate - The exchange rate (must be > 0)
 * @param direction - 'toBase' converts foreign → SAR, 'fromBase' converts SAR → foreign
 * @returns Converted amount rounded to 2 decimal places
 * @throws CurrencyError if rate is invalid or amount is not finite
 * 
 * @example
 * convertCurrency(100, 3.75, 'toBase');   // 375 (USD → SAR)
 * convertCurrency(375, 3.75, 'fromBase'); // 100 (SAR → USD)
 */
export function convertCurrency(amount: number, rate: number, direction: 'toBase' | 'fromBase'): number {
    if (!Number.isFinite(rate) || rate <= 0) {
        throw new CurrencyError(`Invalid exchange rate: ${rate}. Must be a positive number.`);
    }
    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }
    const converted = direction === 'toBase' ? amount * rate : amount / rate;
    return Math.round((converted + Number.EPSILON) * 100) / 100;
}

/**
 * Helper function to convert invoice/expense amounts to base currency
 * This is a convenience function for the common pattern used in the codebase
 * 
 * @param entity - Entity with amount, currency_code, and exchange_rate fields
 * @returns Amount in base currency (SAR)
 */
export const toBaseCurrency = (entity: {
    amount?: number;
    total_amount?: number;
    currency_code?: string;
    exchange_rate?: number;
    exchange_operator?: string;
}): number => {
    const amount = Number(entity.amount ?? entity.total_amount ?? 0);
    const exchangeRate = Number(entity.exchange_rate ?? 1);
    const exchangeOperator = (entity.exchange_operator as any) || 'multiply';

    if (isNaN(amount)) return 0;

    try {
        return convertToBaseCurrency({
            amount,
            currencyCode: (entity.currency_code as CurrencyCode) || 'SAR',
            exchangeRate,
            exchangeOperator,
        });
    } catch (e) {
        // Fallback to raw amount if conversion fails (e.g. rate is 0 or NaN)
        return amount;
    }
};

/**
 * Batch convert multiple amounts to base currency
 * 
 * @param items - Array of items with amount fields
 * @returns Sum of all amounts in base currency
 */
export const sumInBaseCurrency = (
    items: Array<{
        amount?: number;
        total_amount?: number;
        currency_code?: string;
        exchange_rate?: number;
    }>
): number => {
    return items.reduce((sum, item) => sum + toBaseCurrency(item), 0);
};
