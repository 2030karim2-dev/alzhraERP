/**
 * Dashboard API Layer
 * Pure functions for fetching raw data from Supabase
 */

import { supabase } from '@/lib/supabaseClient';

// Helper to safely extract data from a settled promise
function safeData<T>(result: PromiseSettledResult<{ data: T | null; error: any }>, fallback: T): T {
    if (result.status === 'fulfilled' && !result.value.error && result.value.data !== null) {
        return result.value.data;
    }
    if (result.status === 'fulfilled' && result.value.error) {
        console.warn('[Dashboard API] RPC error:', result.value.error?.message);
    }
    return fallback;
}

// Shapes returned by the dashboard RPCs (single-row aggregations arrive as [row]).
interface SummaryRow {
    total_sales?: number | string;
    total_purchases?: number | string;
    total_expenses?: number | string;
    receipt_bonds?: number | string;
    payment_bonds?: number | string;
    total_debts?: number | string;
    total_supplier_debts?: number | string;
    invoice_count?: number | string;
}

interface RawTopProduct {
    id?: string;
    sku?: string;
    name?: string;
    name_ar?: string;
    total_revenue?: number;
    revenue?: number;
    total_quantity?: number;
    quantity?: number;
}

interface RawTopCustomer {
    id?: string;
    customer_id?: string;
    name?: string;
    total_revenue?: number;
    total?: number;
    invoice_count?: number;
    invoices?: number;
}

interface RawTopPayload {
    top_products?: RawTopProduct[] | null;
    top_customers?: RawTopCustomer[] | null;
}

export const dashboardApi = {
    /**
     * Fetches the core dashboard raw data in parallel (resilient to individual failures)
     * @param companyId The current active company ID
     * @param _dateLimit Unused (kept for API compatibility)
     * @param signal AbortSignal for cancellation
     * @param branchId Optional branch UUID for branch-level filtering
     */
    async fetchRawDashboardData(companyId: string, _dateLimit: string, signal?: AbortSignal, branchId?: string | null) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];
        const branchParam = branchId || null;

        // Use Promise.allSettled so one failed RPC doesn't block the entire dashboard
        const [summaryRes, chartRes, topRes, lowStockRes, categoryRes, trialBalanceRes] = await Promise.allSettled([
            // 1. Dashboard Summary (Sales, Purchases, Expenses, Bonds, Debts)
            supabase.rpc('get_dashboard_summary', {
                p_company_id: companyId,
                p_branch_id: branchParam,
                p_date_from: dateFrom,
                p_date_to: dateTo
            }).abortSignal(signal as any),

            // 2. Sales Chart Data
            supabase.rpc('get_sales_chart_data', {
                p_company_id: companyId,
                p_branch_id: branchParam,
                p_date_from: dateFrom,
                p_date_to: dateTo
            }).abortSignal(signal as any),

            // 3. Top Products & Customers
            supabase.rpc('get_top_products_and_customers', {
                p_company_id: companyId,
                p_branch_id: branchParam,
                p_limit: 5
            }).abortSignal(signal as any),

            // 4. Low Stock Products
            supabase.rpc('get_low_stock_products', {
                p_company_id: companyId,
                p_branch_id: branchParam
            }).abortSignal(signal as any),

            // 5. Expense Categories Summary
            supabase.rpc('get_expense_categories_summary', {
                p_company_id: companyId,
                p_date_from: dateFrom,
                p_date_to: dateTo,
                p_branch_id: branchParam
            }).abortSignal(signal as any),

            // 6. Trial Balance for Net Profit
            supabase.rpc('report_trial_balance', {
                p_company_id: companyId,
                p_from: '2000-01-01',
                p_to: dateTo,
                p_branch_id: branchParam
            } as any).abortSignal(signal as any),
        ]);

        // RPCs that return a single aggregated row arrive as a one-element array
        // (e.g. [{ total_sales: ... }]). Unwrap the first element so consumers can
        // access fields directly. This previously left every stat at 0 / empty.
        // These aggregation RPCs always return exactly one row; the safeData
        // fallback (a plain object) takes the non-array branch.
        const rawSummary = safeData<SummaryRow | SummaryRow[]>(summaryRes, {});
        const summary: SummaryRow = Array.isArray(rawSummary) ? rawSummary[0] : rawSummary;

        const salesChart = safeData(chartRes, []);

        const rawTop = safeData<RawTopPayload | RawTopPayload[]>(topRes, { top_products: [], top_customers: [] });
        const topDataObj: RawTopPayload = Array.isArray(rawTop) ? rawTop[0] : rawTop;

        const rawLowStock = safeData(lowStockRes, []) as any[];
        const rawCategories = safeData(categoryRes, []) as any[];
        const trialBalanceData = safeData(trialBalanceRes, []);

        return {
            summary,
            salesChart,
            // Map RPC field names (total_revenue/total_quantity/invoice_count)
            // to the shape expected by TopPerformers ({ id, name, revenue, quantity } /
            // { id, name, total, invoices }).
            topData: {
                top_products: (topDataObj.top_products ?? []).map((p: RawTopProduct, i: number) => ({
                    id: p.id ?? p.sku ?? `prod-${String(i)}`,
                    name: p.name ?? p.name_ar ?? 'غير معروف',
                    revenue: p.total_revenue ?? p.revenue ?? 0,
                    quantity: p.total_quantity ?? p.quantity ?? 0,
                })),
                top_customers: (topDataObj.top_customers ?? []).map((cu: RawTopCustomer, i: number) => ({
                    id: cu.id ?? cu.customer_id ?? `cust-${String(i)}`,
                    name: cu.name ?? 'غير معروف',
                    total: cu.total_revenue ?? cu.total ?? 0,
                    invoices: cu.invoice_count ?? cu.invoices ?? 0,
                })),
            },
            lowStockProducts: rawLowStock.map((p: any) => ({
                id: p.id,
                name: p.name_ar,
                quantity: Number(p.quantity),
                min_quantity: Number(p.min_quantity)
            })),
            categoryData: rawCategories.map((c: any, i: number) => ({
                name: c.category_name,
                value: Number(c.total_amount),
                color: ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'][i % 6]
            })),
            trialBalanceRows: Array.isArray(trialBalanceData) ? trialBalanceData : []
        };
    }
};

