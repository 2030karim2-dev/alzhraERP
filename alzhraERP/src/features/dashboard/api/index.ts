/**
 * Dashboard API Layer
 * Pure functions for fetching raw data from Supabase
 */

import { supabase } from '@/lib/supabaseClient';

// Helper to extract data or fall back gracefully on RPC failure.
// IMPORTANT: we deliberately do NOT throw here. The dashboard widgets
// must keep rendering with zeroed/empty fallbacks when a dashboard RPC
// is missing or temporarily failing (e.g. PGRST202 404), instead of
// taking the whole page down and triggering endless refetch loops.
function safeData<T>(result: PromiseSettledResult<{ data: T | null; error: { message?: string } | null }>, fallback: T, name: string = 'RPC'): T {
    if (result.status === 'fulfilled' && result.value.error) {
        console.warn(`[Dashboard API] ${name} unavailable, using fallback:`, result.value.error.message);
        return fallback;
    }
    if (result.status === 'rejected') {
        const reason = result.reason as { name?: string } | null | undefined;
        // Requests aborted because a newer fetch superseded them (e.g. the
        // fallback poll fired while the previous one was still in flight) are
        // not real failures — stay quiet and use the fallback.
        if (reason?.name === 'AbortError') {
            return fallback;
        }
        console.warn(`[Dashboard API] ${name} rejected, using fallback:`, result.reason);
        return fallback;
    }
    if (result.status === 'fulfilled' && result.value.data !== null) {
        return result.value.data;
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

interface RawLowStockProduct {
    id: string;
    name_ar?: string;
    quantity: number | string;
    min_quantity: number | string;
}

interface RawCategoryDatum {
    category_name: string;
    total_amount: number | string;
}

const CATEGORY_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'] as const;

interface RawTopPayload {
    top_products?: RawTopProduct[] | null;
    top_customers?: RawTopCustomer[] | null;
}

export const dashboardApi = {
    /**
     * Fetches the core dashboard raw data in parallel
     * @param companyId The current active company ID
     * @param signal AbortSignal for cancellation
     * @param branchId Optional branch UUID for branch-level filtering
     */
    async fetchRawDashboardData(companyId: string, signal?: AbortSignal, branchId?: string | null) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];
        const branchParam = branchId ?? undefined;

        // Ensure we always have a valid AbortSignal to prevent 'addEventListener is not a function' error
        const activeSignal: AbortSignal =
            (signal && 'addEventListener' in signal)
                ? signal
                : new AbortController().signal;

        // Use Promise.allSettled so one failed RPC doesn't block the entire dashboard
        const [summaryRes, chartRes, topRes, lowStockRes, categoryRes, trialBalanceRes] = await Promise.allSettled([
            // NOTE: dashboard RPCs are non-critical (safeData falls back to
            // zeros/empty arrays). They opt out of network retries via the
            // `x-skip-network-retry` header so a flaky connection cannot amplify
            // 6 parallel calls × retries into a request storm.
            // 1. Dashboard Summary (Sales, Purchases, Expenses, Bonds, Debts)
            supabase.rpc('get_dashboard_summary', {
                p_company_id: companyId,
                p_date_from: dateFrom,
                p_date_to: dateTo,
                ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
            })
                .setHeader('x-skip-network-retry', '1')
                .abortSignal(activeSignal),

            // 2. Sales Chart Data
            supabase.rpc('get_sales_chart_data', {
                p_company_id: companyId,
                p_date_from: dateFrom,
                p_date_to: dateTo,
                ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
            })
                .setHeader('x-skip-network-retry', '1')
                .abortSignal(activeSignal),

            // 3. Top Products & Customers
            supabase.rpc('get_top_products_and_customers', {
                p_company_id: companyId,
                p_limit: 5,
                ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
            })
                .setHeader('x-skip-network-retry', '1')
                .abortSignal(activeSignal),

            // 4. Low Stock Products
            supabase.rpc('get_low_stock_products', {
                p_company_id: companyId,
                ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
            })
                .setHeader('x-skip-network-retry', '1')
                .abortSignal(activeSignal),

            // 5. Expense Categories Summary
            supabase.rpc('get_expense_categories_summary', {
                p_company_id: companyId,
                p_date_from: dateFrom,
                p_date_to: dateTo,
                ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
            })
                .setHeader('x-skip-network-retry', '1')
                .abortSignal(activeSignal),

            // 6. Trial Balance for Net Profit
            supabase.rpc('report_trial_balance', {
                p_company_id: companyId,
                p_from: '2000-01-01',
                p_to: dateTo,
                ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
            })
                .setHeader('x-skip-network-retry', '1')
                .abortSignal(activeSignal),
        ]);

        // RPCs that return a single aggregated row arrive as a one-element array
        // (e.g. [{ total_sales: ... }]). Unwrap the first element so consumers can
        // access fields directly. This previously left every stat at 0 / empty.
        // These aggregation RPCs always return exactly one row; the safeData
        // fallback (a plain object) takes the non-array branch.
        // Handle results and throw if critical errors exist
        const rawSummary = safeData<SummaryRow | SummaryRow[]>(summaryRes, {}, 'get_dashboard_summary');
        const summary: SummaryRow = Array.isArray(rawSummary) ? rawSummary[0] : rawSummary;

        const salesChart = safeData(chartRes, [], 'get_sales_chart_data');

        const rawTop = safeData<RawTopPayload | RawTopPayload[]>(
            topRes as unknown as PromiseSettledResult<{ data: RawTopPayload | RawTopPayload[] | null; error: { message?: string } | null }>,
            { top_products: [], top_customers: [] },
            'get_top_products_and_customers'
        );
        const topDataObj: RawTopPayload = Array.isArray(rawTop) ? rawTop[0] : rawTop;

        const lowStockProducts = safeData(lowStockRes, [], 'get_low_stock_products');
        const categoryData = safeData(categoryRes, [], 'get_expense_categories_summary');
        const trialBalanceRows = safeData(trialBalanceRes, [], 'report_trial_balance');

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
            lowStockProducts: (lowStockProducts as RawLowStockProduct[]).map((p) => ({
                id: p.id,
                name: p.name_ar,
                quantity: Number(p.quantity),
                min_quantity: Number(p.min_quantity)
            })),
            categoryData: (categoryData as RawCategoryDatum[]).map((c, i) => ({
                name: c.category_name,
                value: Number(c.total_amount),
                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
            })),
            trialBalanceRows: Array.isArray(trialBalanceRows) ? trialBalanceRows : []
        };
    }
};

