/**
 * Core Utilities - Barrel Export
 * Re-exports all utility functions from specialized modules
 */

// Currency utilities (formatting, conversion, parsing)
export {
  formatCurrency,
  formatNumber,
  convertToBaseCurrency,
  convertFromBaseCurrency,
  convertCurrency,
  toBaseCurrency,
  getDefaultExchangeOperator,
  sumInBaseCurrency,
  parseCurrency,
  parseNumberFlexible,
  calculateExchangeRate,
  CURRENCY_SYMBOLS,
  ensureLatinDigits,
  sanitizeNumericInput,
} from './currencyUtils';

export type { CurrencyCode, CurrencyConversionParams } from './currencyUtils';

// Validation utilities
export {
  validateInvoiceItems,
  validateSalePayload,
  validatePurchasePayload,
  assertValid,
} from './validationUtils';

export type { ValidationError } from './validationUtils';

// Account routing utilities
export { routeToChildByCurrency } from './accountRouting';
export type { RoutableAccount } from './accountRouting';

// Logger
export { logger } from './logger';
export type { LogLevel, LoggerConfig } from './logger';

// Error utilities
export { parseError } from './errorUtils';
export type { AppError } from './errorUtils';

// NOTE: the PDF/Excel/share/ZATCA exporters are intentionally NOT re-exported
// here. They statically pull jspdf, html2canvas and xlsx-js-style; because this
// barrel is imported by 300+ modules (most only for `cn`/`formatCurrency`), a
// single static re-export dragged those heavy vendors into every importer's chunk
// — including the app entry chunk (verified: `vendor-export` 573KB was
// modulepreloaded on first paint). Import them directly from their module
// (e.g. `@/core/utils/pdfExporter`) or dynamically at the call site.

// Sharing utilities are imported directly by their consumers (see note above).

// ZATCA compliance is imported directly by its consumers (see note above).

// Query synchronization utilities
export { invalidateFinancialQueries } from './querySyncUtils';
export type { FinancialSyncOptions } from './querySyncUtils';

// Date utilities
export { formatLocalDate, getLocalYearStart } from './dateUtils';

// Search and normalization utilities
export {
  normalizeArabic,
  normalizeArabicDigits,
  normalizeSearch,
  matchesArabicSearch,
  filterByArabicSearch,
} from './search';

// Product display utilities (safe name/code extraction, UUID prevention)
export { getDisplayItemName, getDisplayItemCode, isRawUuid } from './productUtils';
export type { DisplayableItemInput } from './productUtils';

// Re-export from parent utils.ts (cn, formatNumberDisplay, GLOBAL_CURRENCY_SYMBOL)
export { cn, formatNumberDisplay, GLOBAL_CURRENCY_SYMBOL } from '../utils';
