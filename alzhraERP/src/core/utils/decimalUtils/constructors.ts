/**
 * @fileoverview Decimal-safe arithmetic — safe construction helpers
 * @module core/utils/decimalUtils/constructors
 */
import Decimal from 'decimal.js';
import type { NumericInput } from './types';

/**
 * Safely constructs a Decimal from various input types
 * Returns zero for null/undefined/invalid inputs
 */
export const safeDecimal = (value: NumericInput): Decimal => {
  if (value === undefined || value === null) {
    return new Decimal(0);
  }

  if (value instanceof Decimal) {
    return value;
  }

  try {
    if (typeof value === 'number') {
      // Handle floating point edge cases
      if (!Number.isFinite(value)) {
        return new Decimal(0);
      }
      return new Decimal(value.toString());
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'NaN' || trimmed === 'Infinity') {
        return new Decimal(0);
      }
      return new Decimal(trimmed);
    }

    return new Decimal(0);
  } catch {
    return new Decimal(0);
  }
};

/**
 * Attempts to construct a Decimal, returning null on failure
 * Use when you need to distinguish between valid zero and invalid input
 */
export const tryDecimal = (value: NumericInput): Decimal | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Decimal) {
    return value;
  }

  try {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return null;
      }
      return new Decimal(value.toString());
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'NaN') {
        return null;
      }
      return new Decimal(trimmed);
    }

    return null;
  } catch {
    return null;
  }
};
