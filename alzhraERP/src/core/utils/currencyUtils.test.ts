import { describe, it, expect } from 'vitest';
import {
    convertToBaseCurrency,
    convertFromBaseCurrency,
    formatCurrency,
    CurrencyError,
    CURRENCY_SYMBOLS,
    type CurrencyConversionParams,
} from './currencyUtils';

describe('currencyUtils', () => {
    describe('convertToBaseCurrency', () => {
        it('should convert USD to SAR with multiply operator', () => {
            const params: CurrencyConversionParams = {
                amount: 100,
                currencyCode: 'USD',
                exchangeRate: 3.75,
                exchangeOperator: 'multiply',
            };
            const result = convertToBaseCurrency(params);
            expect(result).toBe(375);
        });

        it('should convert with divide operator', () => {
            const params: CurrencyConversionParams = {
                amount: 375,
                currencyCode: 'USD',
                exchangeRate: 3.75,
                exchangeOperator: 'divide',
            };
            const result = convertToBaseCurrency(params);
            expect(result).toBe(100);
        });

        it('should return same amount when rate is 1', () => {
            const params: CurrencyConversionParams = {
                amount: 100,
                currencyCode: 'SAR',
                exchangeRate: 1,
            };
            const result = convertToBaseCurrency(params);
            expect(result).toBe(100);
        });

        it('should throw error for invalid exchange rate', () => {
            const params: CurrencyConversionParams = {
                amount: 100,
                currencyCode: 'USD',
                exchangeRate: 0,
            };
            expect(() => convertToBaseCurrency(params)).toThrow(CurrencyError);
        });

        it('should throw error for negative exchange rate', () => {
            const params: CurrencyConversionParams = {
                amount: 100,
                currencyCode: 'USD',
                exchangeRate: -1,
            };
            expect(() => convertToBaseCurrency(params)).toThrow(CurrencyError);
        });

        it('should throw error for invalid amount', () => {
            const params: CurrencyConversionParams = {
                amount: NaN,
                currencyCode: 'USD',
                exchangeRate: 3.75,
            };
            expect(() => convertToBaseCurrency(params)).toThrow(CurrencyError);
        });

        it('should round to 2 decimal places', () => {
            const params: CurrencyConversionParams = {
                amount: 100.555,
                currencyCode: 'USD',
                exchangeRate: 3.75,
            };
            const result = convertToBaseCurrency(params);
            expect(result).toBe(377.08);
        });
    });

    describe('convertFromBaseCurrency', () => {
        it('should convert SAR to USD with multiply operator', () => {
            const params: CurrencyConversionParams = {
                amount: 375,
                currencyCode: 'USD',
                exchangeRate: 3.75,
                exchangeOperator: 'multiply',
            };
            const result = convertFromBaseCurrency(params);
            expect(result).toBe(100);
        });

        it('should return same amount when rate is 1', () => {
            const params: CurrencyConversionParams = {
                amount: 100,
                currencyCode: 'SAR',
                exchangeRate: 1,
            };
            const result = convertFromBaseCurrency(params);
            expect(result).toBe(100);
        });

        it('should return 0 for invalid amount', () => {
            const params: CurrencyConversionParams = {
                amount: NaN,
                currencyCode: 'USD',
                exchangeRate: 3.75,
            };
            const result = convertFromBaseCurrency(params);
            expect(result).toBe(0);
        });

        it('should round to 2 decimal places', () => {
            const params: CurrencyConversionParams = {
                amount: 377.083,
                currencyCode: 'USD',
                exchangeRate: 3.75,
            };
            const result = convertFromBaseCurrency(params);
            expect(result).toBe(100.56);
        });
    });

    describe('formatCurrency', () => {
        it('should format SAR with symbol', () => {
            const result = formatCurrency(1234.56, 'SAR');
            expect(result).toContain('1,234.56');
            expect(result).toContain(CURRENCY_SYMBOLS.SAR);
        });

        it('should format USD with symbol', () => {
            const result = formatCurrency(1234.56, 'USD');
            expect(result).toContain('$');
            expect(result).toContain('1,234.56');
        });

        it('should format with default SAR when no currency specified', () => {
            const result = formatCurrency(1000);
            expect(result).toContain(CURRENCY_SYMBOLS.SAR);
        });

        it('should handle zero amount', () => {
            const result = formatCurrency(0, 'SAR');
            expect(result).toContain('0.00');
        });

        it('should handle negative amounts', () => {
            const result = formatCurrency(-1000, 'SAR');
            expect(result).toContain('-');
            expect(result).toContain('1,000.00');
        });

        it('should use custom fraction digits', () => {
            const result = formatCurrency(1000.5, 'SAR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            expect(result).toContain('1,000.50');
        });
    });

    describe('CurrencyError', () => {
        it('should create error with correct name', () => {
            const error = new CurrencyError('Test error');
            expect(error.name).toBe('CurrencyError');
            expect(error.message).toBe('Test error');
        });
    });

    describe('CURRENCY_SYMBOLS', () => {
        it('should have SAR symbol', () => {
            expect(CURRENCY_SYMBOLS.SAR).toBe('ر.س');
        });

        it('should have USD symbol', () => {
            expect(CURRENCY_SYMBOLS.USD).toBe('$');
        });

        it('should have YER symbol', () => {
            expect(CURRENCY_SYMBOLS.YER).toBe('ر.ي');
        });
    });
});
