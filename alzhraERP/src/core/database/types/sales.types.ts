import { TableRow, TableInsert, TableUpdate } from './common.types';

// ============================================
// Invoices
// ============================================
export type DBInvoice = TableRow<'invoices'>;
export type DBInvoiceInsert = TableInsert<'invoices'>;
export type DBInvoiceUpdate = TableUpdate<'invoices'>;

export type DBInvoiceItem = TableRow<'invoice_items'>;
export type DBInvoiceItemInsert = TableInsert<'invoice_items'>;
export type DBInvoiceItemUpdate = TableUpdate<'invoice_items'>;

// ============================================
// Parties (Customers / Suppliers)
// ============================================
export type DBParty = TableRow<'parties'>;
export type DBPartyInsert = TableInsert<'parties'>;
export type DBPartyUpdate = TableUpdate<'parties'>;
