import { TableRow, TableInsert, TableUpdate } from './common.types';

// ============================================
// Chart of Accounts
// ============================================
export type DBAccount = TableRow<'accounts'>;
export type DBAccountInsert = TableInsert<'accounts'>;
export type DBAccountUpdate = TableUpdate<'accounts'>;

// ============================================
// Journal Entries
// ============================================
export type DBJournalEntry = TableRow<'journal_entries'>;
export type DBJournalEntryInsert = TableInsert<'journal_entries'>;
export type DBJournalEntryUpdate = TableUpdate<'journal_entries'>;

export type DBJournalEntryLine = TableRow<'journal_entry_lines'>;
export type DBJournalEntryLineInsert = TableInsert<'journal_entry_lines'>;
export type DBJournalEntryLineUpdate = TableUpdate<'journal_entry_lines'>;

// ============================================
// Vouchers & Bonds (Receipts / Payments)
// ============================================
export type DBPayment = TableRow<'payments'>;
export type DBPaymentInsert = TableInsert<'payments'>;
export type DBPaymentUpdate = TableUpdate<'payments'>;
