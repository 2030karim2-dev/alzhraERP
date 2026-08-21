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

    // التحقق من المبلغ قبل أي مسار إرجاع مبكر — حتى مع rate === 1 لا يمرّ NaN/Infinity.
    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    if (exchangeRate === 1) {
        return amount;
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

    // التحقق من المبلغ قبل أي مسار إرجاع مبكر — حتى مع rate === 1 لا يمرّ NaN/Infinity.
    if (!Number.isFinite(amount)) {
        throw new CurrencyError(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    if (exchangeRate === 1) {
        return amount;
    }

    const converted = exchangeOperator === 'divide'
        ? amount * exchangeRate
        : amount / exchangeRate;

    return Math.round((converted + Number.EPSILON) * 100) / 100;
};

/**
 * تحويل أي أرقام عربية/فارسية (٠-٩، ۰-۹) إلى أرقام إنجليزية (0-9).
 * تُستخدم كشبكة أمان نهائية لضمان ظهور جميع الأرقام بالشكل الإنجليزي
 * حتى لو تسرّبت أرقام عربية من أي مصدر خارجي.
 */
export const ensureLatinDigits = (value: string | number): string => {
    const str = String(value);
    return str
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
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

    const formattedNumber = ensureLatinDigits(new Intl.NumberFormat('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount));

    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

    if (currencyCode === 'USD') {
        return `${symbol}${formattedNumber}`;
    }

    return `${formattedNumber} ${symbol}`;
};

export const formatNumber = (value: number): string => {
    return ensureLatinDigits(new Intl.NumberFormat('en-US').format(value));
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

/**
 * Convert an amount between base and foreign currency.
 *
 * IMPORTANT: the arithmetic is delegated to `convertToBaseCurrency` /
 * `convertFromBaseCurrency` so all call sites share ONE convention. Previously
 * this helper hard-coded the MULTIPLY convention and silently disagreed with
 * the two sibling functions when `exchange_operator === 'divide'`, producing
 * inverted conversions for divide-based currencies.
 *
 * @param amount       The amount to convert.
 * @param rate         Exchange rate against the base currency (must be > 0).
 * @param direction    `'toBase'` = foreign → base, `'fromBase'` = base → foreign.
 * @param exchangeOperator Per-currency convention (`'multiply'` default,
 *                         backward compatible with the old behavior).
 */
export function convertCurrency(
    amount: number,
    rate: number,
    direction: 'toBase' | 'fromBase',
    exchangeOperator: 'multiply' | 'divide' = 'multiply'
): number {
    const params: CurrencyConversionParams = {
        // `currencyCode` is only used by callers that build a full entity; the
        // conversion arithmetic itself does not depend on it.
        amount,
        currencyCode: 'SAR',
        exchangeRate: rate,
        exchangeOperator,
    };
    return direction === 'toBase'
        ? convertToBaseCurrency(params)
        : convertFromBaseCurrency(params);
}

export const toBaseCurrency = (entity: {
    amount?: number | null;
    total_amount?: number | null;
    currency_code?: string | null;
    exchange_rate?: number | null;
    exchange_operator?: string | null;
}): number => {
    const amount = Number(entity.amount ?? entity.total_amount ?? 0);
    const exchangeRate = Number(entity.exchange_rate ?? 1);
    const exchangeOperator = (entity.exchange_operator as 'multiply' | 'divide') || 'multiply';

    if (isNaN(amount)) return 0;

    // Fail loudly instead of silently returning the foreign amount as if it were
    // base currency. A missing/zero/negative rate makes the stored amount
    // meaningless — surfacing the error beats showing a wrong financial total.
    return convertToBaseCurrency({
        amount,
        currencyCode: entity.currency_code || 'SAR',
        exchangeRate,
        exchangeOperator,
    });
};

export const sumInBaseCurrency = (
    items: Array<{
        amount?: number | null;
        total_amount?: number | null;
        currency_code?: string | null;
        exchange_rate?: number | null;
    }>
): number => {
    return items.reduce((sum, item) => sum + toBaseCurrency(item), 0);
};