/**
 * @fileoverview Decimal-safe arithmetic — configuration
 * @module core/utils/decimalUtils/constants
 */
import Decimal from 'decimal.js';

// SOX-compliant tolerance (0.000001 SAR)
export const SOX_BALANCE_TOLERANCE = new Decimal('0.000001');

// Tax calculation precision
export const TAX_PRECISION = 6;

// Currency display precision
export const CURRENCY_PRECISION = 2;
