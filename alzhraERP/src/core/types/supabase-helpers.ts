// ============================================
// Supabase Type Helpers
// helpers لاستخراج الأنواع من Database Types
// Al-Zahra Smart ERP
// ============================================

import { Database } from '../database.types';

// ============================================
// Table Types
// ============================================

/**
 * استخراج نوع صف من جدول
 * @example type Invoice = TableRow<'invoices'>;
 */
export type TableRow<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];

/**
 * استخراج نوع الإدراج لجدول
 * @example type InvoiceInsert = TableInsert<'invoices'>;
 */
export type TableInsert<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];

/**
 * استخراج نوع التحديث لجدول
 * @example type InvoiceUpdate = TableUpdate<'invoices'>;
 */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];

// ============================================
// View Types
// ============================================

/**
 * استخراج نوع صف من View
 * @example type InvoiceView = ViewRow<'invoice_details'>;
 */
export type ViewRow<T extends keyof Database['public']['Views']> =
    Database['public']['Views'][T]['Row'];

// ============================================
// Function Types
// ============================================

/**
 * استخراج نوع دالة RPC
 * @example type CreateInvoiceFn = RpcFunction<'create_invoice'>;
 */
export type RpcFunction<T extends keyof Database['public']['Functions']> =
    Database['public']['Functions'][T];

/**
 * استخراج نوع مدخلات دالة RPC
 * @example type CreateInvoiceArgs = RpcArgs<'create_invoice'>;
 */
export type RpcArgs<T extends keyof Database['public']['Functions']> =
    Database['public']['Functions'][T]['Args'];

/**
 * استخراج نوع ناتج دالة RPC
 * @example type CreateInvoiceReturns = RpcReturns<'create_invoice'>;
 */
export type RpcReturns<T extends keyof Database['public']['Functions']> =
    Database['public']['Functions'][T]['Returns'];

// ============================================
// Enum Types
// ============================================

/**
 * استخراج قيم Enum
 * @example type InvoiceStatus = EnumValue<'invoice_status'>;
 */
export type EnumValue<T extends keyof Database['public']['Enums']> =
    Database['public']['Enums'][T];

// ============================================
// Composite Types (للـ Composite Types المعقدة)
// ============================================

/**
 * استخراج نوع Composite
 * @example type AddressComposite = CompositeType<'address_type'>;
 */
export type CompositeType<T extends keyof Database['public']['CompositeTypes']> =
    Database['public']['CompositeTypes'][T];

// ============================================
// Common Table Types - للاستخدام المباشر
// ============================================

export type Invoice = TableRow<'invoices'>;
export type InvoiceItem = TableRow<'invoice_items'>;
export type Product = TableRow<'products'>;
export type Party = TableRow<'parties'>;
export type Account = TableRow<'accounts'>;
export type JournalEntry = TableRow<'journal_entries'>;
export type JournalEntryLine = TableRow<'journal_entry_lines'>;
export type Payment = TableRow<'payments'>;
export type Company = TableRow<'companies'>;
export type Warehouse = TableRow<'warehouses'>;
export type InventoryTransaction = TableRow<'inventory_transactions'>;
export type Expense = TableRow<'expenses'>;
export type ExchangeRate = TableRow<'exchange_rates'>;
export type ProductCategory = TableRow<'product_categories'>;
export type PartyCategory = TableRow<'party_categories'>;
export type ExpenseCategory = TableRow<'expense_categories'>;

// ============================================
// Helper Functions
// ============================================

/**
 * إنشاء نوع ممتد مع relations
 * @example
 * type InvoiceWithParty = WithRelations<Invoice, { party: Party }>;
 */
export type WithRelations<T, R extends Record<string, unknown>> = T & R;

/**
 * إنشاء نوع Partial بشكل صارم
 * يُستخدم للتحديثات الجزئية
 */
export type StrictPartial<T> = {
    [P in keyof T]?: T[P] extends object ? StrictPartial<T[P]> : T[P];
};

/**
 * إنشاء نوع للـ Pagination Response
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * إنشاء نوع للـ API Response الموحد
 */
export interface ApiResult<T> {
    data: T | null;
    error: Error | null;
    success: boolean;
}

// ============================================
// Type Guards
// ============================================

/**
 * التحقق من أن القيمة هي صف من جدول معين
 */
export function isTableRow<T extends keyof Database['public']['Tables']>(
    _table: T,
    value: unknown
): value is TableRow<T> {
    return value !== null && typeof value === 'object' && 'id' in value;
}

/**
 * التحقق من أن القيمة هي نتيجة ناجحة
 */
export function isSuccessResult<T>(result: ApiResult<T>): result is ApiResult<T> & { data: T; success: true } {
    return result.success && result.data !== null;
}

/**
 * التحقق من أن القيمة هي نتيجة فاشلة
 */
export function isErrorResult<T>(result: ApiResult<T>): result is ApiResult<T> & { error: Error; success: false } {
    return !result.success && result.error !== null;
}
