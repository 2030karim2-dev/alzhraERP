// ============================================
// Centralized Cache Invalidation Utility
// Ensures comprehensive data synchronization after mutations across all ERP domains
// ============================================

import type { QueryClient } from '@tanstack/react-query';

/**
 * Data dependency graph for the ERP system (Unified Organism).
 * When any domain is mutated, all dependent and cascading domains are invalidated.
 */

// All known query keys grouped by domain
const DOMAIN_KEYS = {
  // Sales related
  sales: [
    'invoices',
    'invoice_details',
    'sales_stats',
    'sales_analytics',
    'next_invoice_number',
    'sales-returns',
    'sales-returns-stats',
    'sales_quotations',
  ],
  // Purchases related
  // [FIX] المفاتيح الفعلية في usePurchaseReturns تستخدم شرطة سفلية
  // (purchase_returns / purchase_returns_stats) — كانت 'purchase-returns'
  // بشرطة علوية فلا يصل الإبطال لهدفه أبداً وتبقى قائمة المرتجعات قديمة.
  purchases: [
    'purchases',
    'purchase_stats',
    'purchase_details',
    'purchases_analytics',
    'purchase_returns',
    'purchase_returns_stats',
  ],
  // Bonds related (Receipt & Payment)
  bonds: [
    'bonds',
    'receipt_bonds',
    'payment_bonds',
    'bonds_stats',
    'bonds_details',
    'treasury_balance',
  ],
  // Inventory related
  inventory: [
    'products',
    'product_search',
    'products_paginated',
    'product_details',
    'warehouses',
    'inventory_categories',
    'transfers',
    'audit_sessions',
    'stock_movements',
  ],
  // Expenses related
  expenses: ['expenses', 'expense_categories', 'next_expense_number'],
  // Accounting related
  accounting: [
    'journals',
    'accounts',
    'financials',
    'journal_entries',
    'ledger',
    'trial_balance',
    'balance_sheet',
    'income_statement',
  ],
  // Dashboard
  dashboard: [
    'dashboard_data',
    'dashboard',
    'dashboard_raw_data',
    'dashboard_summary',
    'sales_chart_data',
  ],
  // Parties (Customers & Suppliers)
  parties: [
    'parties',
    'party_categories',
    'customers',
    'suppliers',
    'party_statement',
    'party_details',
    'party_balances',
  ],
  // Reports
  reports: [
    'profit_loss',
    'debt_report',
    'cash_flow',
    'daily_sales',
    'debt_aging',
    'operational_expenses',
    'financial_health',
  ],
  // AI insights
  ai: ['ai_insights', 'pos_ai_suggestions'],
  // Commissions (incentive engine)
  commissions: [
    'commission-plans',
    'commission-periods',
    'commission-pending',
    'commission-calculations',
    'commission-rules',
    'commission-tiers',
    'commission-report-periods',
    'commission-report-calculations',
  ],
  // Debts & collection
  debts: [
    'debts',
    'debt_analytics',
    'debt_summary',
    'debt_aging',
    'debt_promises',
    'debt_followup',
    'debt_messages',
  ],
} as const;

/**
 * Invalidation presets for common mutation scenarios.
 * Each preset defines which query key prefixes should be invalidated to keep the whole system in sync.
 */
const INVALIDATION_PRESETS = {
  /** After creating/deleting/modifying a sale invoice */
  sale: [
    ...DOMAIN_KEYS.sales,
    ...DOMAIN_KEYS.inventory,
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
    ...DOMAIN_KEYS.reports,
    ...DOMAIN_KEYS.parties,
    ...DOMAIN_KEYS.debts,
  ],

  /** After creating/deleting a sales return */
  saleReturn: [
    ...DOMAIN_KEYS.sales,
    ...DOMAIN_KEYS.inventory,
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
    ...DOMAIN_KEYS.reports,
    ...DOMAIN_KEYS.parties,
    ...DOMAIN_KEYS.debts,
  ],

  /** After creating/deleting a purchase invoice or purchase return */
  purchase: [
    ...DOMAIN_KEYS.purchases,
    ...DOMAIN_KEYS.inventory,
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
    ...DOMAIN_KEYS.reports,
    ...DOMAIN_KEYS.parties,
    ...DOMAIN_KEYS.debts,
  ],

  /** After creating/deleting a receipt or payment bond */
  bond: [
    ...DOMAIN_KEYS.bonds,
    ...DOMAIN_KEYS.parties,
    ...DOMAIN_KEYS.debts,
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
    ...DOMAIN_KEYS.reports,
  ],

  /** After creating/deleting an expense */
  expense: [
    ...DOMAIN_KEYS.expenses,
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
    ...DOMAIN_KEYS.reports,
  ],

  /** After posting/voiding a journal entry */
  journal: [...DOMAIN_KEYS.accounting, ...DOMAIN_KEYS.dashboard, ...DOMAIN_KEYS.reports],

  /** After modifying inventory (products, transfers, stock counts, adjustments) */
  inventory: [...DOMAIN_KEYS.inventory, ...DOMAIN_KEYS.dashboard, ...DOMAIN_KEYS.ai],

  /** After modifying parties (customers, suppliers) */
  party: [
    ...DOMAIN_KEYS.parties,
    ...DOMAIN_KEYS.debts,
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
  ],

  /** After modifying account chart */
  account: [...DOMAIN_KEYS.accounting, ...DOMAIN_KEYS.dashboard, ...DOMAIN_KEYS.reports],

  /** After modifying settings (currency, fiscal year, company, branches) */
  settings: [
    'company',
    'company_profile',
    'fiscal_years',
    'exchange_rates',
    'supported_currencies',
    'warehouses',
    'settings_warehouses',
    'branches',
    ...DOMAIN_KEYS.dashboard,
  ],

  /** After modifying incentive plans/periods/engineer links/calculations */
  commission: [...DOMAIN_KEYS.commissions, ...DOMAIN_KEYS.dashboard],

  /** After modifying debt follow-ups, promises, templates, reminders */
  debts: [...DOMAIN_KEYS.debts, ...DOMAIN_KEYS.parties, ...DOMAIN_KEYS.dashboard],
} as const;

// Infer the type of preset names
export type InvalidationPreset = keyof typeof INVALIDATION_PRESETS;

/**
 * Invalidate all queries related to a mutation preset.
 */
export function invalidateByPreset(queryClient: QueryClient, preset: InvalidationPreset): void {
  const keys = INVALIDATION_PRESETS[preset];
  if (!keys) return;
  const uniqueKeys = [...new Set(keys)];
  for (const key of uniqueKeys) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/**
 * Invalidate specific query keys (for granular control).
 */
export function invalidateKeys(queryClient: QueryClient, keys: string[]): void {
  for (const key of keys) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export { DOMAIN_KEYS, INVALIDATION_PRESETS };
