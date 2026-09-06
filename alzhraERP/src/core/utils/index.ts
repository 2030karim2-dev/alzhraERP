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
  sumInBaseCurrency,
  parseCurrency,
  parseNumberFlexible,
  calculateExchangeRate,
  CURRENCY_SYMBOLS,
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

// PDF & Excel exporters
export { exportToPDF } from './pdfExporter';
export { exportInvoiceToExcel, generateInvoiceExcelBlob } from './invoiceExcelExporter';
export { exportReturnsToExcel, exportSingleReturnToExcel } from './returnsExcelExporter';
export {
  exportSingleBondToExcel,
  exportBondsListToExcel,
  generateSingleBondExcelBlob,
} from './bondExcelExporter';
export { exportQuotationToExcel, generateQuotationExcelBlob } from './quotationExcelExporter';

// Sharing utilities
export { shareExcelFile, shareSpreadsheet } from './shareUtils';
export type { ShareSpreadsheetOptions } from './shareUtils';

// ZATCA compliance
export { generateZatcaBase64 } from './zatca';

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

// Re-export from parent utils.ts (cn, formatNumberDisplay, GLOBAL_CURRENCY_SYMBOL)
export { cn, formatNumberDisplay, GLOBAL_CURRENCY_SYMBOL } from '../utils';
