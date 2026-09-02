import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  safeDecimal,
  tryDecimal,
  generateCalculationHash,
  generateCalculationHashAsync,
  isValidDecimal,
  isPositiveDecimal,
  isNonNegativeDecimal,
  isZeroDecimal,
  formatDecimal,
  SOX_BALANCE_TOLERANCE,
  TAX_PRECISION,
  CURRENCY_PRECISION,
} from './decimalUtils';

// ── safeDecimal ───────────────────────────────────────

describe('safeDecimal', () => {
  it('returns Decimal(0) for undefined', () => {
    expect(safeDecimal(undefined).isZero()).toBe(true);
  });

  it('returns Decimal(0) for null', () => {
    expect(safeDecimal(null).isZero()).toBe(true);
  });

  it('returns the same Decimal instance', () => {
    const d = new Decimal(42);
    expect(safeDecimal(d)).toBe(d);
  });

  it('converts a valid number to Decimal', () => {
    expect(safeDecimal(123.45).toNumber()).toBe(123.45);
  });

  it('returns Decimal(0) for NaN', () => {
    expect(safeDecimal(NaN).isZero()).toBe(true);
  });

  it('returns Decimal(0) for Infinity', () => {
    expect(safeDecimal(Infinity).isZero()).toBe(true);
  });

  it('returns Decimal(0) for -Infinity', () => {
    expect(safeDecimal(-Infinity).isZero()).toBe(true);
  });

  it('converts a valid numeric string to Decimal', () => {
    expect(safeDecimal('999.99').toNumber()).toBe(999.99);
  });

  it('returns Decimal(0) for empty string', () => {
    expect(safeDecimal('').isZero()).toBe(true);
  });

  it('returns Decimal(0) for "NaN" string', () => {
    expect(safeDecimal('NaN').isZero()).toBe(true);
  });

  it('handles negative numbers', () => {
    expect(safeDecimal(-50).toNumber()).toBe(-50);
  });

  it('handles very large numbers without precision loss', () => {
    expect(safeDecimal('1234567890123456.78').toString()).toBe('1234567890123456.78');
  });

  it('trims whitespace from strings', () => {
    expect(safeDecimal('  42.5  ').toNumber()).toBe(42.5);
  });
});

// ── tryDecimal ────────────────────────────────────────

describe('tryDecimal', () => {
  it('returns null for undefined', () => {
    expect(tryDecimal(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(tryDecimal(null)).toBeNull();
  });

  it('returns the same Decimal instance', () => {
    const d = new Decimal(42);
    expect(tryDecimal(d)).toBe(d);
  });

  it('returns a Decimal for a valid number', () => {
    const result = tryDecimal(100);
    expect(result).toBeInstanceOf(Decimal);
    expect(result!.toNumber()).toBe(100);
  });

  it('returns null for NaN', () => {
    expect(tryDecimal(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(tryDecimal(Infinity)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(tryDecimal('')).toBeNull();
  });

  it('returns a Decimal for a valid numeric string', () => {
    const result = tryDecimal('3.14');
    expect(result!.toNumber()).toBe(3.14);
  });

  it('returns Decimal for zero (zero is valid)', () => {
    expect(tryDecimal(0)!.isZero()).toBe(true);
  });
});

// ── generateCalculationHash ───────────────────────────

describe('generateCalculationHash', () => {
  it('returns a non-empty string', () => {
    const hash = generateCalculationHash({ amount: 100, rate: 3.75 });
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });

  it('returns same hash for identical inputs', () => {
    const h1 = generateCalculationHash({ a: '100', b: 50 });
    const h2 = generateCalculationHash({ a: '100', b: 50 });
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different inputs', () => {
    const h1 = generateCalculationHash({ amount: 100 });
    const h2 = generateCalculationHash({ amount: 200 });
    expect(h1).not.toBe(h2);
  });

  it('handles empty inputs object', () => {
    expect(generateCalculationHash({})).toBeTruthy();
  });
});

// ── generateCalculationHashAsync (true SHA-256) ───────

describe('generateCalculationHashAsync', () => {
  it('returns a 64-character hex string (SHA-256)', async () => {
    const hash = await generateCalculationHashAsync({ amount: 100, rate: 3.75 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns same hash for identical inputs', async () => {
    const h1 = await generateCalculationHashAsync({ a: '100', b: 50 });
    const h2 = await generateCalculationHashAsync({ a: '100', b: 50 });
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different inputs', async () => {
    const h1 = await generateCalculationHashAsync({ amount: 100 });
    const h2 = await generateCalculationHashAsync({ amount: 200 });
    expect(h1).not.toBe(h2);
  });

  it('is deterministic and independent of key order', async () => {
    const h1 = await generateCalculationHashAsync({ a: 1, b: 2 });
    const h2 = await generateCalculationHashAsync({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });
});

// ── Validation Utilities ──────────────────────────────

describe('isValidDecimal', () => {
  it('true for valid number', () => {
    expect(isValidDecimal(42)).toBe(true);
  });
  it('true for valid string', () => {
    expect(isValidDecimal('3.14')).toBe(true);
  });
  it('false for undefined', () => {
    expect(isValidDecimal(undefined)).toBe(false);
  });
  it('false for null', () => {
    expect(isValidDecimal(null)).toBe(false);
  });
  it('false for NaN', () => {
    expect(isValidDecimal(NaN)).toBe(false);
  });
});

describe('isPositiveDecimal', () => {
  it('true for positive', () => {
    expect(isPositiveDecimal(5)).toBe(true);
  });
  it('false for negative', () => {
    expect(isPositiveDecimal(-1)).toBe(false);
  });
  it('false for zero (zero is not strictly positive)', () => {
    expect(isPositiveDecimal(0)).toBe(false);
  });
  // Note: isPositiveDecimal uses decimal.js isPositive() which may treat 0 as positive
  // This test verifies expected GAAP behavior — zero is not positive
  it('false for undefined', () => {
    expect(isPositiveDecimal(undefined)).toBe(false);
  });
});

describe('isNonNegativeDecimal', () => {
  it('true for positive', () => {
    expect(isNonNegativeDecimal(10)).toBe(true);
  });
  it('true for zero', () => {
    expect(isNonNegativeDecimal(0)).toBe(true);
  });
  it('false for negative', () => {
    expect(isNonNegativeDecimal(-0.01)).toBe(false);
  });
});

describe('isZeroDecimal', () => {
  it('true for zero', () => {
    expect(isZeroDecimal(0)).toBe(true);
  });
  it('true for string "0"', () => {
    expect(isZeroDecimal('0')).toBe(true);
  });
  it('false for non-zero', () => {
    expect(isZeroDecimal(1)).toBe(false);
  });
  it('false for undefined', () => {
    expect(isZeroDecimal(undefined)).toBe(false);
  });
});

// ── formatDecimal ─────────────────────────────────────

describe('formatDecimal', () => {
  it('formats with default 2 decimals', () => {
    expect(formatDecimal(1234.567)).toBe('1,234.57');
  });

  it('formats zero', () => {
    expect(formatDecimal(0)).toBe('0.00');
  });

  it('accepts custom decimals', () => {
    expect(formatDecimal(100, { decimals: 0 })).toBe('100');
  });

  it('formats with currency option', () => {
    const result = formatDecimal(99.99, { currency: 'USD' });
    expect(result).toContain('$');
  });

  it('returns zero for undefined', () => {
    expect(formatDecimal(undefined)).toBe('0.00');
  });

  it('handles negative values', () => {
    expect(formatDecimal(-500)).toContain('-');
  });
});

// ── Constants ─────────────────────────────────────────

describe('Constants', () => {
  it('SOX_BALANCE_TOLERANCE is 0.000001', () => {
    expect(SOX_BALANCE_TOLERANCE.toString()).toBe('0.000001');
  });

  it('TAX_PRECISION is 6', () => {
    expect(TAX_PRECISION).toBe(6);
  });

  it('CURRENCY_PRECISION is 2', () => {
    expect(CURRENCY_PRECISION).toBe(2);
  });
});

// ── Edge Cases & GAAP Compliance ──────────────────────

describe('GAAP Compliance Edge Cases', () => {
  it('safeDecimal prevents Infinity propagation', () => {
    const rawInf = 1 / 0;
    expect(safeDecimal(rawInf).isZero()).toBe(true);
  });

  it('safeDecimal prevents NaN propagation', () => {
    const rawNaN = 0 / 0;
    expect(safeDecimal(rawNaN).isZero()).toBe(true);
  });

  it('tryDecimal distinguishes valid zero from invalid input', () => {
    expect(tryDecimal(0)).not.toBeNull();
    expect(tryDecimal(NaN)).toBeNull();
  });

  it('handles billion-scale monetary values', () => {
    expect(safeDecimal('1000000000.00').toNumber()).toBe(1_000_000_000);
  });

  it('preserves micro-precision for SOX tolerance', () => {
    expect(safeDecimal('0.000001').toString()).toBe('0.000001');
  });
});
