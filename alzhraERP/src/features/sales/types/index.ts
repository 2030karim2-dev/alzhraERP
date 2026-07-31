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
    InvoiceStatus,
    InvoiceType,
    PaymentMethod,
    CreateInvoiceDTO,
    CreateInvoiceItemDTO,
    SalesInvoiceResult,
    SalesReturnResult,
} from './domain';

// Re-export utilities
export {
    MoneyUtils,
    InvoiceMapper,
    InvoiceItemMapper,
    CustomerMapper,
    SalesValidation,
} from './domain';
