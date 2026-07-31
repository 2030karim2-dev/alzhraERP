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
    toBaseCurrency,
    sumInBaseCurrency,
    parseCurrency,
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
export { exportSingleBondToExcel, exportBondsListToExcel, generateSingleBondExcelBlob } from './bondExcelExporter';
export { exportQuotationToExcel, generateQuotationExcelBlob } from './quotationExcelExporter';

// Sharing utilities
export { shareExcelFile } from './shareUtils';

// ZATCA compliance
export { generateZatcaBase64 } from './zatca';
