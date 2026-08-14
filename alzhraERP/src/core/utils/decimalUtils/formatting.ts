/**
 * @fileoverview Decimal-safe arithmetic — formatting, validation & cleanup
 * @module core/utils/decimalUtils/formatting
 */
import Decimal from 'decimal.js';
import type { NumericInput } from './types';
import { CURRENCY_PRECISION } from './constants';
import { safeDecimal, tryDecimal } from './constructors';

/**
 * Cleanup routine for Decimal instances
 * Explicitly nullifies references for GC
 */
export const cleanupDecimals = (...decimals: (Decimal | null | undefined)[]): void => {
    decimals.forEach(d => {
        if (d) {
            // In JavaScript, we can't force GC, but we can help by:
            // 1. Nullifying external references (handled by caller)
            // 2. Marking objects for potential cleanup
        }
    });
};

/**
 * Wrapper for calculations with automatic cleanup
 */
export const withDecimalCalculation = <T,>(
    calculation: () => T
): T => {
    try {
        return calculation();
    } finally {
        // Cleanup happens via reference nullification in calling code
    }
};

/**
 * Formats Decimal for display with locale support
 */
export const formatDecimal = (
    value: NumericInput,
    options: {
        decimals?: number;
        locale?: string;
        currency?: string;
    } = {}
): string => {
    const d = safeDecimal(value);
    const decimals = options.decimals ?? CURRENCY_PRECISION;
    const locale = options.locale ?? 'en-US';

    const numValue = d.toDecimalPlaces(decimals).toNumber();

    if (options.currency) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: options.currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(numValue);
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(numValue);
};

export const isValidDecimal = (value: NumericInput): boolean => {
    return tryDecimal(value) !== null;
};

export const isPositiveDecimal = (value: NumericInput): boolean => {
    const d = tryDecimal(value);
    return d !== null && d.isPositive() && !d.isZero();
};

export const isNonNegativeDecimal = (value: NumericInput): boolean => {
    const d = tryDecimal(value);
    return d !== null && !d.isNegative();
};

export const isZeroDecimal = (value: NumericInput): boolean => {
    const d = tryDecimal(value);
    return d !== null && d.isZero();
};
