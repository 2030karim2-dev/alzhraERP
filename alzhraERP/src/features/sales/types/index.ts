/**
 * Sales Types - Barrel Export
 * Al-Zahra Smart ERP
 */

export * from './domain';

// Re-export commonly used types
export type {
  SalesInvoice,
  InvoiceItem,
  Customer,
  Money,
  CurrencyCode,
  PaymentMethod,
  CreateInvoiceItemDTO,
  SalesInvoiceResult,
  SalesReturnResult,
} from './domain';

// Re-export parent types for barrel consistency
export type {
  InvoiceStatus,
  InvoiceType,
  CartItem,
  InvoiceSummary,
  CreateInvoicePayload,
  CreateInvoiceDTO,
  InvoiceResponse,
  InvoiceListItem,
} from '../types';

// Re-export utilities
export {
  MoneyUtils,
  InvoiceMapper,
  InvoiceItemMapper,
  CustomerMapper,
  SalesValidation,
} from './domain';
