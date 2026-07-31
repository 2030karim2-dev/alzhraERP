/**
 * AI Module - Intent Router
 * Maps AI intents to application routes.
 */
import { AIIntent } from '../core/types';

export interface RouteMapping {
    path: string;
    label: string;
}

const INTENT_ROUTES: Record<string, RouteMapping> = {
    create_sales_invoice: { path: '/sales', label: 'فاتورة مبيعات' },
    create_return_sale: { path: '/sales', label: 'مرتجع مبيعات' },
    create_purchase_invoice: { path: '/purchases', label: 'فاتورة مشتريات' },
    create_return_purchase: { path: '/purchases', label: 'مرتجع مشتريات' },
    create_expense: { path: '/expenses', label: 'مصروف' },
    create_bond_receipt: { path: '/bonds', label: 'سند قبض' },
    create_bond_payment: { path: '/bonds', label: 'سند صرف' },
    create_customer: { path: '/parties/customers', label: 'عميل جديد' },
    create_supplier: { path: '/parties/suppliers', label: 'مورد جديد' },
    create_product: { path: '/inventory', label: 'منتج جديد' },
    statement_of_account: { path: '/parties/customers', label: 'كشف حساب' },
    journal_entry: { path: '/accounting', label: 'قيد محاسبي' },
    list_quotations: { path: '/sales', label: 'عروض المبيعات' },
    check_supplier_quotes: { path: '/purchases', label: 'عروض المشتريات' },
};

/**
 * Get the route path for a given AI intent.
 * Returns null if the intent is not routable (chat, unknown).
 */
export function getRouteForIntent(intent: AIIntent): RouteMapping | null {
    return INTENT_ROUTES[intent] || null;
}

/**
 * Check if an intent involves invoice items that need product lookup.
 */
export function isInvoiceIntent(intent: AIIntent): boolean {
    return [
        'create_sales_invoice',
        'create_return_sale',
        'create_purchase_invoice',
        'create_return_purchase',
        'create_quotation'
    ].includes(intent);
}
