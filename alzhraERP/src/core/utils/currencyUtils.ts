/**
 * Currency Utilities for Al-Zahra Smart ERP
 * Unified currency conversion and formatting functions
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
    amount: number;
    currencyCode: CurrencyCode | string;
    exchangeRate: number;
    exchangeOperator?: 'multiply' | 'divide';
}

export class CurrencyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CurrencyError';
    }
}

export const convertToBaseCurrency = (params: CurrencyConversionParams): number => {
    const { amount, exchangeRate, exchangeOperator = 'multiply' } = params;

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new CurrencyError(`Invalid exchange rate: ${exchangeRate}. Must be a positive number.`);
    }

    if (exchangeRate === 1) {
        return amount;
    }

    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    if (exchangeOperator === 'divide' && exchangeRate === 0) {
        throw new CurrencyError('Cannot divide by zero exchange rate');
    }

    const converted = exchangeOperator === 'divide'
        ? amount / exchangeRate
        : amount * exchangeRate;

    return Math.round((converted + Number.EPSILON) * 100) / 100;
};

export const convertFromBaseCurrency = (params: CurrencyConversionParams): number => {
    const { amount, exchangeRate, exchangeOperator = 'multiply' } = params;

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new CurrencyError(`Invalid exchange rate: ${exchangeRate}. Must be a positive number.`);
    }

    if (exchangeRate === 1) {
        return amount;
    }

    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    if (exchangeOperator === 'divide' && exchangeRate === 0) {
        throw new CurrencyError('Cannot divide by zero exchange rate');
    }

    const converted = exchangeOperator === 'divide'
        ? amount * exchangeRate
        : amount / exchangeRate;

    return Math.round((converted + Number.EPSILON) * 100) / 100;
};

/**
 * Format a number as currency with the appropriate symbol
 * Accepts both CurrencyCode and string for flexibility
 */
export const formatCurrency = (
    amount: number,
    currencyCode: CurrencyCode | string = 'SAR',
    options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
    }
): string => {
    const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options || {};

    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount);

    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

    if (currencyCode === 'USD') {
        return `${symbol}${formattedNumber}`;
    }

    return `${formattedNumber} ${symbol}`;
};

export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
};

export const parseCurrency = (currencyString: string): number => {
    const symbolValues = Object.values(CURRENCY_SYMBOLS);
    let cleaned = currencyString;
    for (const sym of symbolValues) {
        cleaned = cleaned.split(sym).join('');
    }
    cleaned = cleaned.replace(/\s/g, '').replace(/,/g, '');

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateExchangeRate = (
    fromCurrency: CurrencyCode | string,
    toCurrency: CurrencyCode | string,
    rates: Record<string, number>
): number => {
    if (fromCurrency === toCurrency) {
        return 1;
    }

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    return fromRate / toRate;
};

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

export const toBaseCurrency = (entity: {
    amount?: number;
    total_amount?: number;
    currency_code?: string;
    exchange_rate?: number;
    exchange_operator?: string;
}): number => {
    const amount = Number(entity.amount ?? entity.total_amount ?? 0);
    const exchangeRate = Number(entity.exchange_rate ?? 1);
    const exchangeOperator = (entity.exchange_operator as 'multiply' | 'divide') || 'multiply';

    if (isNaN(amount)) return 0;

    try {
        return convertToBaseCurrency({
            amount,
            currencyCode: entity.currency_code || 'SAR',
            exchangeRate,
            exchangeOperator,
        });
    } catch (e) {
        return amount;
    }
};

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