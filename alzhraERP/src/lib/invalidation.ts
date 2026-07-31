// ============================================
// Centralized Cache Invalidation Utility
// Ensures comprehensive data synchronization after mutations
// ============================================

import { QueryClient } from '@tanstack/react-query';

/**
 * Data dependency graph for the ERP system.
 * When a domain is mutated, all dependent domains must be invalidated.
 * 
 * Sales → invoices, sales_stats, products, accounts, dashboard, reports, parties (customers), next_invoice_number
 * Purchases → purchases, purchase_stats, products, accounts, dashboard, suppliers, purchases_analytics
 * Expenses → expenses, expense_categories, accounts, financials, journals, dashboard
 * Inventory → products, warehouses, dashboard, inventory_categories
 * Accounting → journals, accounts, financials, dashboard, reports
 * Parties → parties, party_categories, accounts
 */

// All known query keys grouped by domain
const DOMAIN_KEYS = {
    // Sales related
    sales: ['invoices', 'sales_stats', 'sales_analytics', 'next_invoice_number', 'sales-returns', 'sales-returns-stats'],
    // Purchases related
    purchases: ['purchases', 'purchase_stats', 'purchase_details', 'purchases_analytics'],
    // Inventory related
    inventory: ['products', 'product_search', 'warehouses', 'inventory_categories', 'transfers', 'audit_sessions'],
    // Expenses related
    expenses: ['expenses', 'expense_categories', 'next_expense_number'],
    // Accounting related
    accounting: ['journals', 'accounts', 'financials', 'journal_entries'],
    // Dashboard
    dashboard: ['dashboard_data', 'dashboard'],
    // Parties (Customers & Suppliers)
    parties: ['parties', 'party_categories', 'customers', 'suppliers'],
    // Reports
    reports: ['profit_loss', 'debt_report', 'cash_flow', 'daily_sales', 'debt_aging', 'operational_expenses'],
    // AI insights
    ai: ['ai_insights', 'pos_ai_suggestions'],
} as const;

/**
 * Invalidation presets for common mutation scenarios.
 * Each preset defines which query key prefixes should be invalidated.
 */
const INVALIDATION_PRESETS = {
    /** After creating/deleting a sale invoice */
    sale: [
        ...DOMAIN_KEYS.sales,
        ...DOMAIN_KEYS.inventory.slice(0, 2), // products, product_search
        ...DOMAIN_KEYS.accounting.slice(1, 3), // accounts, financials
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.reports,
        ...DOMAIN_KEYS.parties.slice(0, 1), // parties (customer balance update)
    ],

    /** After creating/deleting a sales return */
    saleReturn: [
        ...DOMAIN_KEYS.sales,
        'products', 'product_search',
        'accounts', 'financials',
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.reports,
        'parties',
    ],

    /** After creating/deleting a purchase invoice */
    purchase: [
        ...DOMAIN_KEYS.purchases,
        'products', 'product_search',
        'accounts', 'financials',
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.reports,
        'parties', // supplier balance
    ],

    /** After creating/deleting an expense */
    expense: [
        ...DOMAIN_KEYS.expenses,
        'accounts', 'financials', 'journals', 'journal_entries',
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.reports,
    ],

    /** After posting a journal entry */
    journal: [
        ...DOMAIN_KEYS.accounting,
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.reports,
    ],

    /** After modifying inventory (product CRUD, transfers, audits) */
    inventory: [
        ...DOMAIN_KEYS.inventory,
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.ai,
    ],

    /** After modifying parties (customers, suppliers) */
    party: [
        ...DOMAIN_KEYS.parties,
        'accounts',
    ],

    /** After modifying account chart */
    account: [
        ...DOMAIN_KEYS.accounting,
        ...DOMAIN_KEYS.dashboard,
        ...DOMAIN_KEYS.reports,
    ],

    /** After modifying settings (currency, fiscal year, company) */
    settings: [
        'company', 'company_profile',
        'fiscal_years',
        'exchange_rates', 'supported_currencies',
        'warehouses', 'settings_warehouses',
        ...DOMAIN_KEYS.dashboard,
    ],
} as const;

// Infer the type of preset names
export type InvalidationPreset = keyof typeof INVALIDATION_PRESETS;

/**
 * Invalidate all queries related to a mutation preset.
 * 
 * @example
 * // After creating an invoice:
 * invalidateByPreset(queryClient, 'sale');
 * 
 * // After deleting an expense:
 * invalidateByPreset(queryClient, 'expense');
 */
export function invalidateByPreset(
    queryClient: QueryClient,
    preset: InvalidationPreset
): void {
    const keys = INVALIDATION_PRESETS[preset];
    // Deduplicate keys
    const uniqueKeys = [...new Set(keys)];
    for (const key of uniqueKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
    }
}

/**
 * Invalidate specific query keys (for granular control).
 * 
 * @example
 * invalidateKeys(queryClient, ['products', 'warehouses']);
 */
export function invalidateKeys(
    queryClient: QueryClient,
    keys: string[]
): void {
    for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: [key] });
    }
}

export { DOMAIN_KEYS, INVALIDATION_PRESETS };
