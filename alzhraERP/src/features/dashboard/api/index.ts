/**
 * Dashboard API Layer
 * Pure functions for fetching raw data from Supabase
 */

import { supabase } from '@/lib/supabaseClient';

export const dashboardApi = {
    /**
     * Fetches the core dashboard raw data in a single parallel transaction
     * @param companyId The current active company ID
     * @param dateLimit The ISO string limit for filtering (e.g., last 30 days)
     * @param branchId Optional branch UUID for branch-level filtering
     */
    async fetchRawDashboardData(companyId: string, _dateLimit: string, signal?: AbortSignal, branchId?: string | null) {
        // We now use Thick Database architecture (Postgres RPCs) for instant calculations
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];

        const batch = await Promise.all([
            // 1. Dashboard Summary (Sales, Purchases, Expenses, Bonds, Debts)
            supabase.rpc('get_dashboard_summary', { 
                p_company_id: companyId, 
                p_branch_id: branchId || null,
                p_date_from: dateFrom,
                p_date_to: dateTo
            }).abortSignal(signal as any),

            // 2. Sales Chart Data
            supabase.rpc('get_sales_chart_data', { 
                p_company_id: companyId, 
                p_branch_id: branchId || null,
                p_date_from: dateFrom,
                p_date_to: dateTo
            }).abortSignal(signal as any),

            // 3. Top Products & Customers
            supabase.rpc('get_top_products_and_customers', { 
                p_company_id: companyId, 
                p_branch_id: branchId || null,
                p_limit: 3
            }).abortSignal(signal as any),

            // 4. ⚡ Low Stock Products via RPC (replaces JS filtering)
            supabase.rpc('get_low_stock_products', {
                p_company_id: companyId,
                p_branch_id: branchId || null
            }).abortSignal(signal as any),
            
            // 5. ⚡ Expense Categories via RPC (replaces JS grouping)
            supabase.rpc('get_expense_categories_summary', {
                p_company_id: companyId,
                p_date_from: dateFrom,
                p_date_to: dateTo,
                p_branch_id: branchId || null
            }).abortSignal(signal as any),

            // 6. Trial Balance for accurate Net Profit based on Accounting Trees
            supabase.rpc('report_trial_balance', { p_company_id: companyId, p_from: '2000-01-01', p_to: dateTo, p_branch_id: branchId || null } as any).abortSignal(signal as any)
        ]);

        const firstError = batch.find((res: any) => res.error)?.error;
        if (firstError) throw firstError;

        const [summaryRes, chartRes, topRes, lowStockRes, categoryRes, trialBalanceRes] = batch;

        return {
            summary: summaryRes.data || {},
            salesChart: chartRes.data || [],
            topData: topRes.data || { top_products: [], top_customers: [] },
            lowStockProducts: (lowStockRes.data || []).map((p: any) => ({
                id: p.id,
                name: p.name_ar,
                quantity: Number(p.quantity),
                min_quantity: Number(p.min_quantity)
            })),
            categoryData: (categoryRes.data || []).map((c: any, i: number) => ({
                name: c.category_name,
                value: Number(c.total_amount),
                color: ['#f43f5e','#fb923c','#facc15','#4ade80','#38bdf8','#a78bfa'][i % 6]
            })),
            trialBalanceRows: (trialBalanceRes.data as any)?.rows || []
        };
    }
};

