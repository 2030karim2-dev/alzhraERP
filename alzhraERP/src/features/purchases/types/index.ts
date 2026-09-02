/**
 * Purchases Types - Barrel Export
 * Al-Zahra Smart ERP
 */

export * from './domain';

// Re-export commonly used types
export type {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseInvoiceStatus,
  PaymentMethod,
  CreatePurchaseInvoiceDTO,
  CreatePurchaseInvoiceItemDTO,
  PurchaseInvoiceResult,
} from './domain';

// Re-export utilities
export { PurchaseInvoiceMapper, PurchaseInvoiceItemMapper } from './domain';

// Re-export parent types for barrel consistency
export type {
  PurchaseStats,
  PurchaseItem,
  CreatePurchaseDTO,
  CreatePaymentDTO,
  SupplierPaymentData,
  PurchaseInvoiceResponse,
} from '../types';
