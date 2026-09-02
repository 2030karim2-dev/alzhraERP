/**
 * @fileoverview Decimal-safe arithmetic utilities for financial calculations
 * @module core/utils/decimalUtils
 * @description GAAP/SOX compliant decimal arithmetic with strict type safety
 * @version 1.0.0
 *
 * Public entry point. Re-exports every unit split from the former single-file
 * implementation so all existing imports keep working unchanged.
 */

export * from './types';
export * from './constants';
export * from './constructors';
export * from './hashing';
export * from './calculations';
export * from './formatting';

import { safeDecimal, tryDecimal } from './constructors';
import {
  calculateLineItem,
  calculateInvoiceSummary,
  validateJournalBalance,
  assertJournalBalanced,
  convertCurrency,
} from './calculations';
import { formatDecimal } from './formatting';
import { generateCalculationHash } from './hashing';
import { SOX_BALANCE_TOLERANCE } from './constants';

export default {
  safeDecimal,
  tryDecimal,
  calculateLineItem,
  calculateInvoiceSummary,
  validateJournalBalance,
  assertJournalBalanced,
  convertCurrency,
  formatDecimal,
  generateCalculationHash,
  SOX_BALANCE_TOLERANCE,
};
