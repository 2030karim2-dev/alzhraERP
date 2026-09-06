import { describe, it, expect } from 'vitest';
import {
  convertToBaseCurrency,
  convertFromBaseCurrency,
  convertCurrency,
  toBaseCurrency,
  formatCurrency,
  parseCurrency,
  parseNumberFlexible,
  ensureLatinDigits,
  CurrencyError,
  CURRENCY_SYMBOLS,
  type CurrencyConversionParams,
} from './currencyUtils';

describe('currencyUtils', () => {
  describe('convertCurrency (unified with operator semantics)', () => {
    it('toBase with default multiply matches convertToBaseCurrency', () => {
      // 100 USD @ multiply 3.75 → 375 base
      expect(convertCurrency(100, 3.75, 'toBase')).toBe(375);
    });

    it('toBase with divide matches convertToBaseCurrency divide', () => {
      // 375 foreign ÷ 3.75 → 100 base (divide convention)
      expect(convertCurrency(375, 3.75, 'toBase', 'divide')).toBe(100);
    });

    it('fromBase with default multiply matches convertFromBaseCurrency', () => {
      // 375 base ÷ 3.75 → 100 foreign (multiply convention)
      expect(convertCurrency(375, 3.75, 'fromBase')).toBe(100);
    });

    it('fromBase with divide matches convertFromBaseCurrency divide', () => {
      // 100 base × 3.75 → 375 foreign (divide convention)
      expect(convertCurrency(100, 3.75, 'fromBase', 'divide')).toBe(375);
    });

    it('returns the amount unchanged when rate is 1', () => {
      expect(convertCurrency(100, 1, 'toBase')).toBe(100);
      expect(convertCurrency(100, 1, 'fromBase')).toBe(100);
    });

    it('throws CurrencyError for zero/negative rate', () => {
      expect(() => convertCurrency(100, 0, 'toBase')).toThrow(CurrencyError);
      expect(() => convertCurrency(100, -3.75, 'fromBase')).toThrow(CurrencyError);
    });

    it('throws CurrencyError for non-finite amount', () => {
      expect(() => convertCurrency(NaN, 3.75, 'toBase')).toThrow(CurrencyError);
    });
  });

  describe('toBaseCurrency (fails loudly on bad rate)', () => {
    it('converts a valid entity to base currency', () => {
      expect(
        toBaseCurrency({
          amount: 100,
          currency_code: 'USD',
          exchange_rate: 3.75,
          exchange_operator: 'multiply',
        })
      ).toBe(375);
    });

    it('defaults missing rate to 1 and missing currency to SAR', () => {
      expect(toBaseCurrency({ amount: 100 })).toBe(100);
    });

    it('throws CurrencyError instead of silently returning the raw amount for a zero rate', () => {
      expect(() =>
        toBaseCurrency({
          amount: 100,
          currency_code: 'USD',
          exchange_rate: 0,
        })
      ).toThrow(CurrencyError);
    });
  });
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

    it('should throw CurrencyError for NaN amount even when rate is 1', () => {
      const params: CurrencyConversionParams = {
        amount: NaN,
        currencyCode: 'SAR',
        exchangeRate: 1,
      };
      expect(() => convertToBaseCurrency(params)).toThrow(CurrencyError);
    });

    it('should throw CurrencyError for Infinity amount even when rate is 1', () => {
      const params: CurrencyConversionParams = {
        amount: Infinity,
        currencyCode: 'SAR',
        exchangeRate: 1,
      };
      expect(() => convertToBaseCurrency(params)).toThrow(CurrencyError);
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

    it('should throw CurrencyError for NaN amount even when rate is 1', () => {
      const params: CurrencyConversionParams = {
        amount: NaN,
        currencyCode: 'SAR',
        exchangeRate: 1,
      };
      expect(() => convertFromBaseCurrency(params)).toThrow(CurrencyError);
    });

    it('should throw CurrencyError for Infinity amount even when rate is 1', () => {
      const params: CurrencyConversionParams = {
        amount: Infinity,
        currencyCode: 'SAR',
        exchangeRate: 1,
      };
      expect(() => convertFromBaseCurrency(params)).toThrow(CurrencyError);
    });

    it('should throw error for invalid amount', () => {
      const params: CurrencyConversionParams = {
        amount: NaN,
        currencyCode: 'USD',
        exchangeRate: 3.75,
      };
      expect(() => convertFromBaseCurrency(params)).toThrow(CurrencyError);
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
      const result = formatCurrency(1000.5, 'SAR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
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

  describe('ensureLatinDigits (English digits everywhere)', () => {
    it('leaves Latin digits untouched', () => {
      expect(ensureLatinDigits(12345)).toBe('12345');
      expect(ensureLatinDigits('1,234.56')).toBe('1,234.56');
    });

    it('converts Arabic-Indic digits (٠-٩) to English', () => {
      expect(ensureLatinDigits('١٢٣٤٥')).toBe('12345');
      expect(ensureLatinDigits('٠')).toBe('0');
      expect(ensureLatinDigits('٩٩٩')).toBe('999');
    });

    it('converts Persian digits (۰-۹) to English', () => {
      expect(ensureLatinDigits('۱۲۳۴')).toBe('1234');
    });

    it('converts digits inside mixed Arabic text', () => {
      expect(ensureLatinDigits('سعر ١٠٠٠ ريال')).toBe('سعر 1000 ريال');
    });

    it('is applied by formatCurrency and formatNumberDisplay', () => {
      // حتى لو دخلت أرقام عربية من مصدر خارجي يبقى الناتج إنجليزياً
      expect(formatCurrency(1234.5, 'SAR')).toMatch(/[0-9]/);
      expect(formatCurrency(1234.5, 'SAR')).not.toMatch(/[٠-٩]/);
    });
  });

  describe('parseNumberFlexible & parseCurrency', () => {
    it('handles regular decimals and numbers', () => {
      expect(parseNumberFlexible(0.5)).toBe(0.5);
      expect(parseNumberFlexible('0.50')).toBe(0.5);
      expect(parseNumberFlexible('.5')).toBe(0.5);
      expect(parseNumberFlexible('150.75')).toBe(150.75);
    });

    it('handles commas as decimal points (European & Arabic keyboards)', () => {
      expect(parseNumberFlexible('0,50')).toBe(0.5);
      expect(parseNumberFlexible('0،50')).toBe(0.5); // Arabic comma U+060C
      expect(parseNumberFlexible('0٫50')).toBe(0.5); // Arabic decimal separator U+066B
    });

    it('handles Eastern Arabic & Persian numerals', () => {
      expect(parseNumberFlexible('٠.٥٠')).toBe(0.5);
      expect(parseNumberFlexible('٠٫٥٠')).toBe(0.5);
      expect(parseNumberFlexible('١٢.٥')).toBe(12.5);
      expect(parseNumberFlexible('۰.۵')).toBe(0.5);
    });

    it('handles thousand separators alongside decimal separators', () => {
      expect(parseNumberFlexible('1,234.50')).toBe(1234.5);
      expect(parseNumberFlexible('1.234,50')).toBe(1234.5);
      expect(parseNumberFlexible('10,000')).toBe(10000);
      expect(parseNumberFlexible('10 000,50')).toBe(10000.5);
    });

    it('handles invalid or empty inputs safely', () => {
      expect(parseNumberFlexible('')).toBe(0);
      expect(parseNumberFlexible(null)).toBe(0);
      expect(parseNumberFlexible(undefined)).toBe(0);
      expect(parseNumberFlexible('abc')).toBe(0);
      expect(parseNumberFlexible(NaN)).toBe(0);
    });

    it('parseCurrency also accepts decimals and commas seamlessly', () => {
      expect(parseCurrency('0.50')).toBe(0.5);
      expect(parseCurrency('0,50')).toBe(0.5);
      expect(parseCurrency('0٫50')).toBe(0.5);
      expect(parseCurrency('0،50')).toBe(0.5);
      expect(parseCurrency('1,500.25 SAR')).toBe(1500.25);
    });
  });
});
