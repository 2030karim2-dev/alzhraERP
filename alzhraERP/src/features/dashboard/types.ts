/**
 * Dashboard Service Types
 * Type definitions for dashboard queries with complex joins
 */

import { Database } from '@/core/database.types';

// Journal Entry with Lines (for bonds)
export interface JournalEntryWithLines {
    id: string;
    entry_date: string;
    reference_type: 'receipt_bond' | 'payment_bond';
    journal_entry_lines: {
        debit_amount: number;
        credit_amount: number;
    }[];
}

// Product with Stock
export interface ProductWithStock {
    id: string;
    name_ar: string;
    min_stock_level: number;
    product_stock: {
        quantity: number;
        warehouse_id: string;
    }[];
}

// Invoice Item with Product and Invoice info
export interface InvoiceItemWithDetails {
    product_id: string;
    quantity: number;
    total: number;
    products: {
        name_ar: string;
    } | null;
    invoices: {
        company_id: string;
        type: string;
        status: string;
    } | null;
}

// Re-export common types from database
export type { Database };
