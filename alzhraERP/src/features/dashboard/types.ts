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

export type DashboardPeriod = 'today' | 'this_week' | 'this_month' | 'this_year' | 'all_time';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
    today: 'اليوم',
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    this_year: 'هذا العام',
    all_time: 'جميع الأوقات',
};

export function getPeriodDates(period: DashboardPeriod): { dateFrom?: string | undefined; dateTo?: string | undefined } {
    const now = new Date();
    const dateTo = now.toISOString().split('T')[0];

    if (period === 'today') {
        return { dateFrom: dateTo, dateTo };
    }
    if (period === 'this_week') {
        const startOfWeek = new Date(now);
        const day = now.getDay(); // 0 is Sunday, 6 is Saturday
        const diff = (day + 1) % 7; // distance from Saturday
        startOfWeek.setDate(now.getDate() - diff);
        return { dateFrom: startOfWeek.toISOString().split('T')[0], dateTo };
    }
    if (period === 'this_month') {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return { dateFrom: `${year}-${month}-01`, dateTo };
    }
    if (period === 'this_year') {
        return { dateFrom: `${now.getFullYear()}-01-01`, dateTo };
    }
    // 'all_time'
    return {};
}
