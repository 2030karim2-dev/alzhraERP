import { logger } from '../../../core/utils/logger';
import { formatLocalDate } from '../../../core/utils/dateUtils';
/**
 * Dashboard API Layer
 * Pure functions for fetching raw data from Supabase
 */

import { supabase } from '@/lib/supabaseClient';

// ── RPC availability cache (per browser session) ─────────────────────
// When the connected Supabase project is missing a dashboard RPC (e.g.
// migrations not applied / DB out of sync), record it once so subsequent
// dashboard loads SKIP the failing call instead of firing N×404 requests
// (PGRST202) on every render.
const missingDashboardRpcs = new Set<string>();

/** Normalise an error payload to a readable string for logs. */
function toDetail(value: string | object | null | undefined): string {
  return typeof value === 'string' ? value : JSON.stringify(value ?? null);
}

// The generated `database.types.ts` narrows `supabase.rpc` to a strict
// per-function union (name must be a literal; args match that function). The
/** Wrapper around supabase.rpc that short-circuits known-missing functions. */
function dashboardRpc(name: string, args: Record<string, unknown>, signal: AbortSignal) {
  if (missingDashboardRpcs.has(name)) {
    return Promise.resolve({
      data: null,
      error: { message: `${name} unavailable (previously failed)` },
    });
  }
  // Call rpc on the supabase instance to preserve 'this' context
  return (
    supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>
    ) => ReturnType<typeof supabase.rpc>
  )
    .call(supabase, name, args)
    .abortSignal(signal);
}

// `data` is deliberately `unknown`: the RPC/from builders resolve to generated
// Json shapes that we re-shape into the widget types below. safeData only
// branches on `error` presence and re-casts `data` to the expected T.
type DashResult = PromiseSettledResult<{
  data: unknown;
  error: { code?: string; message?: string } | null;
}>;

function isAbort(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object') {
    const anyErr = err as { name?: string; message?: string };
    if (anyErr.name === 'AbortError') return true;
    if (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('abort'))
      return true;
  }
  return false;
}

// Helper to extract data or fall back gracefully on RPC failure.
function safeData<T>(result: DashResult, fallback: T, name = 'RPC'): T {
  if (result.status === 'fulfilled') {
    if (result.value.error) {
      const err = result.value.error;
      if (isAbort(err)) {
        return fallback;
      }
      const detail = toDetail(err.message);
      // Only blacklist permanently if the RPC actually does not exist in Postgres (PGRST202)
      if (err.code === 'PGRST202') {
        missingDashboardRpcs.add(name);
      }
      logger.logOnce(
        'warn',
        'api',
        `[Dashboard API] ${name} unavailable, using fallback: ${detail}`,
        { name, error: detail }
      );
      return fallback;
    }
    if (result.value.data !== null) {
      return result.value.data as T;
    }
    return fallback;
  }
  const reason = result.reason as { name?: string; message?: string } | null | undefined;
  // Requests aborted or transiently rejected are not missing schema RPCs — do not blacklist
  if (isAbort(reason)) {
    return fallback;
  }
  const detail = toDetail(reason?.message);
  logger.logOnce('warn', 'api', `[Dashboard API] ${name} rejected, using fallback: ${detail}`, {
    name,
    error: detail,
  });
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
  part_number?: string | null;
  brand?: string | null;
  category_name?: string | null;
  total_revenue?: number;
  revenue?: number;
  total_quantity?: number;
  quantity?: number;
  gross_profit?: number;
  cost?: number;
  total_cost?: number;
  margin_percentage?: number;
  revenue_yer?: number;
  total_revenue_yer?: number;
  cost_yer?: number;
  total_cost_yer?: number;
  gross_profit_yer?: number;
  price?: number;
  current_stock?: number;
  min_stock_level?: number;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
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

interface RawRecentInvoice {
  id: string;
  invoice_number?: string | null;
  type?: string | null;
  issue_date: string;
  created_at?: string | null;
  party_id?: string | null;
  total_amount?: number | null;
  currency_code?: string | null;
  parties?: { name?: string | null } | null;
}

interface RawRecentExpense {
  id: string;
  voucher_number?: string | null;
  expense_date: string;
  created_at?: string | null;
  description?: string | null;
  amount?: number | null;
  currency_code?: string | null;
  expense_categories?: { name?: string | null } | null;
}

interface RawDebtFollowupRow {
  party_id: string;
  party_name?: string | null;
  classification?: string;
  days_overdue?: number | null;
  outstanding_balance?: number | null;
  invoice_count?: number | null;
}

interface RawTopSellingProduct {
  category_id: string;
  gross_profit?: number;
  id: string;
  name_ar?: string;
  sku?: string;
  total_cost?: number;
  total_revenue?: number;
  total_sold?: number;
}

interface RawProductCategory {
  id: string;
  name: string;
}

const CATEGORY_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'] as const;

interface RawTopPayload {
  top_products?: RawTopProduct[] | null;
  top_customers?: RawTopCustomer[] | null;
}

interface FetchRawDashboardOptions {
  signal?: AbortSignal;
  branchId?: string | null;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
}

export const dashboardApi = {
  /**
   * Fetches the core dashboard raw data in parallel
   * @param companyId The current active company ID
   * @param opts Optional parameters: signal, branchId, dateFrom, dateTo
   */
  async fetchRawDashboardData(companyId: string, opts: FetchRawDashboardOptions = {}) {
    const { signal, branchId, dateFrom, dateTo } = opts;
    const todayStr = formatLocalDate();
    const effectiveDateTo = dateTo || todayStr;
    const effectiveDateFrom = dateFrom !== undefined ? dateFrom : null;
    const currentYearStart = `${todayStr.slice(0, 4)}-01-01`;
    const branchParam = branchId ?? undefined;

    // Ensure we always have a valid AbortSignal to prevent 'addEventListener is not a function' error
    const activeSignal: AbortSignal =
      signal && 'addEventListener' in signal ? signal : new AbortController().signal;

    // Execute in two staggered batches to protect against concurrent statement timeouts:
    // Batch 1: Core KPIs and real-time activity feeds
    const [summaryRes, plRes, lowStockRes, recentInvoicesRes, recentExpensesRes, debtFollowupRes] =
      await Promise.allSettled([
        // 1. Dashboard Summary (Sales, Purchases, Expenses, Bonds, Debts)
        dashboardRpc(
          'get_dashboard_summary',
          {
            p_company_id: companyId,
            ...(effectiveDateFrom ? { p_date_from: effectiveDateFrom } : {}),
            ...(effectiveDateTo ? { p_date_to: effectiveDateTo } : {}),
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),

        // 2. Authoritative Net Profit
        dashboardRpc(
          'report_profit_loss',
          {
            p_company_id: companyId,
            p_from: effectiveDateFrom || currentYearStart,
            p_to: effectiveDateTo,
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),

        // 3. Low Stock Products
        dashboardRpc(
          'get_low_stock_products',
          {
            p_company_id: companyId,
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),

        // 4. Recent invoices feed
        (() => {
          let q = supabase
            .from('invoices')
            .select(
              'id, invoice_number, type, issue_date, created_at, total_amount, currency_code, party_id, parties(name)'
            )
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .in('type', ['sale', 'purchase', 'sale_return', 'purchase_return']);
          if (branchParam !== undefined) {
            q = q.eq('branch_id', branchParam);
          }
          return q.order('created_at', { ascending: false }).limit(10).abortSignal(activeSignal);
        })(),

        // 5. Recent expenses feed
        (() => {
          let q = supabase
            .from('expenses')
            .select(
              'id, voucher_number, expense_date, created_at, description, amount, currency_code, expense_categories!fk_expenses_company_category(name)'
            )
            .eq('company_id', companyId)
            .is('deleted_at', null);
          if (branchParam !== undefined) {
            q = q.eq('branch_id', branchParam);
          }
          return q.order('created_at', { ascending: false }).limit(10).abortSignal(activeSignal);
        })(),

        // 6. Debt follow-up alerts (bounded by limit to avoid full party table scan)
        dashboardRpc(
          'get_debt_followup_dashboard',
          {
            p_company_id: companyId,
            p_due_soon_days: 7,
            p_critical_days: 30,
            p_reminder_window_days: 3,
            p_limit: 50,
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),
      ]);

    // Batch 2: Charts and visual aggregations
    const [chartRes, topRes, topSellingRes, productCategoriesRes, categoryRes] =
      await Promise.allSettled([
        // 7. Sales Chart Data
        dashboardRpc(
          'get_sales_chart_data',
          {
            p_company_id: companyId,
            ...(effectiveDateFrom ? { p_date_from: effectiveDateFrom } : {}),
            ...(effectiveDateTo ? { p_date_to: effectiveDateTo } : {}),
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),

        // 8. Top Products & Customers (Respects the dashboard date filter & fetches 15 items)
        dashboardRpc(
          'get_top_products_and_customers',
          {
            p_company_id: companyId,
            p_limit: 15,
            ...(effectiveDateFrom ? { p_date_from: effectiveDateFrom } : {}),
            ...(effectiveDateTo ? { p_date_to: effectiveDateTo } : {}),
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),

        // 9. Top-selling products
        dashboardRpc(
          'get_top_selling_products',
          {
            p_company_id: companyId,
            p_days: 30,
            p_limit: 20,
          },
          activeSignal
        ),

        // 10. Product categories
        supabase
          .from('product_categories')
          .select('id, name')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .abortSignal(activeSignal),

        // 11. Expense Categories Summary
        dashboardRpc(
          'get_expense_categories_summary',
          {
            p_company_id: companyId,
            ...(effectiveDateFrom ? { p_date_from: effectiveDateFrom } : {}),
            ...(effectiveDateTo ? { p_date_to: effectiveDateTo } : {}),
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        ),
      ]);

    // Optional Trial Balance fallback: only called if report_profit_loss completely failed
    let trialBalanceRows: unknown[] = [];
    const plFailed =
      plRes.status === 'rejected' || (plRes.status === 'fulfilled' && plRes.value.error != null);
    if (plFailed) {
      try {
        const tbRes = await dashboardRpc(
          'report_trial_balance',
          {
            p_company_id: companyId,
            p_from: effectiveDateFrom ?? currentYearStart,
            p_to: effectiveDateTo,
            ...(branchParam !== undefined ? { p_branch_id: branchParam } : {}),
          },
          activeSignal
        );
        if (tbRes.error == null && Array.isArray(tbRes.data)) {
          trialBalanceRows = tbRes.data as unknown[];
        }
      } catch {
        trialBalanceRows = [];
      }
    }

    // RPCs that return a single aggregated row arrive as a one-element array
    // (e.g. [{ total_sales: ... }]). Unwrap the first element so consumers can
    // access fields directly. This previously left every stat at 0 / empty.
    // These aggregation RPCs always return exactly one row; the safeData
    // fallback (a plain object) takes the non-array branch.
    try {
      const rawSummary = safeData<SummaryRow | SummaryRow[]>(
        summaryRes,
        {},
        'get_dashboard_summary'
      );
      const summary: SummaryRow = Array.isArray(rawSummary)
        ? (rawSummary[0] ?? {})
        : rawSummary && typeof rawSummary === 'object'
          ? rawSummary
          : {};

      const salesChart = safeData(chartRes, [], 'get_sales_chart_data');

      const rawTop = safeData<RawTopPayload | RawTopPayload[]>(
        topRes,
        { top_products: [], top_customers: [] },
        'get_top_products_and_customers'
      );
      const topDataObj: RawTopPayload = Array.isArray(rawTop)
        ? (rawTop[0] ?? {})
        : rawTop && typeof rawTop === 'object'
          ? rawTop
          : {};

      const lowStockProducts = safeData(lowStockRes, [], 'get_low_stock_products');
      const categoryData = safeData(categoryRes, [], 'get_expense_categories_summary');
      const profitLossRows = safeData(plRes, [], 'report_profit_loss');
      const topSellingProducts = safeData<RawTopSellingProduct[]>(
        topSellingRes,
        [],
        'get_top_selling_products'
      );
      const productCategories = safeData<RawProductCategory[]>(
        productCategoriesRes,
        [],
        'product_categories'
      );

      const recentInvoices = safeData<RawRecentInvoice[]>(recentInvoicesRes, [], 'recent_invoices');
      const recentExpenses = safeData<RawRecentExpense[]>(recentExpensesRes, [], 'recent_expenses');

      const rawDebtFollowup = safeData<RawDebtFollowupRow[]>(
        debtFollowupRes,
        [],
        'get_debt_followup_dashboard'
      );
      const overdueInvoices = (Array.isArray(rawDebtFollowup) ? rawDebtFollowup : [])
        .filter(
          row => row && (row.classification === 'overdue' || row.classification === 'critical')
        )
        .map(row => ({
          id: row.party_id,
          partyName: row.party_name ?? 'غير محدد',
          daysOverdue: Number(row.days_overdue) || 0,
        }));

      const safeTopProducts = Array.isArray(topDataObj?.top_products)
        ? topDataObj.top_products.map((p: RawTopProduct, i: number) => ({
            id: p?.id ?? p?.sku ?? `prod-${String(i)}`,
            name: p?.name ?? p?.name_ar ?? 'غير معروف',
            part_number: p?.part_number ?? null,
            brand: p?.brand ?? null,
            sku: p?.sku ?? '',
            category_name: p?.category_name ?? null,
            revenue: p?.total_revenue ?? p?.revenue ?? 0,
            quantity: p?.total_quantity ?? p?.quantity ?? 0,
            cost: p?.total_cost ?? p?.cost ?? 0,
            gross_profit: p?.gross_profit ?? 0,
            margin_percentage: p?.margin_percentage ?? 0,
            revenue_yer: p?.total_revenue_yer ?? p?.revenue_yer,
            cost_yer: p?.total_cost_yer ?? p?.cost_yer,
            gross_profit_yer: p?.gross_profit_yer,
            price: p?.price ?? 0,
            current_stock: p?.current_stock ?? 0,
            min_stock_level: p?.min_stock_level ?? 0,
            is_low_stock: Boolean(p?.is_low_stock),
            is_out_of_stock: Boolean(p?.is_out_of_stock),
            value: p?.total_quantity ?? p?.quantity ?? 0,
          }))
        : [];

      const safeTopCustomers = Array.isArray(topDataObj?.top_customers)
        ? topDataObj.top_customers.map((cu: RawTopCustomer, i: number) => ({
            id: cu?.id ?? cu?.customer_id ?? `cust-${String(i)}`,
            name: cu?.name ?? 'غير معروف',
            total: cu?.total_revenue ?? cu?.total ?? 0,
            invoices: cu?.invoice_count ?? cu?.invoices ?? 0,
          }))
        : [];

      const safeLowStock = Array.isArray(lowStockProducts)
        ? (lowStockProducts as RawLowStockProduct[]).map(p => ({
            id: p?.id ?? '',
            name: p?.name_ar ?? '',
            quantity: Number(p?.quantity) || 0,
            min_quantity: Number(p?.min_quantity) || 0,
          }))
        : [];

      const safeCategoryData = Array.isArray(categoryData)
        ? (categoryData as RawCategoryDatum[]).map((c, i) => ({
            name: c?.category_name ?? 'غير مصنف',
            value: Number(c?.total_amount) || 0,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          }))
        : [];

      return {
        summary,
        salesChart: Array.isArray(salesChart) ? salesChart : [],
        topData: {
          top_products: safeTopProducts,
          top_customers: safeTopCustomers,
        },
        lowStockProducts: safeLowStock,
        categoryData: safeCategoryData,
        trialBalanceRows: Array.isArray(trialBalanceRows) ? trialBalanceRows : [],
        profitLossRows: Array.isArray(profitLossRows) ? profitLossRows : [],
        topSellingProducts: Array.isArray(topSellingProducts) ? topSellingProducts : [],
        productCategories: Array.isArray(productCategories) ? productCategories : [],
        recentInvoices: Array.isArray(recentInvoices) ? recentInvoices : [],
        recentExpenses: Array.isArray(recentExpenses) ? recentExpenses : [],
        overdueInvoices,
      };
    } catch (error) {
      logger.error(
        'DashboardAPI',
        'Unexpected error in fetchRawDashboardData, using safe fallback',
        error
      );
      return {
        summary: {},
        salesChart: [],
        topData: { top_products: [], top_customers: [] },
        lowStockProducts: [],
        categoryData: [],
        trialBalanceRows: [],
        profitLossRows: [],
        topSellingProducts: [],
        productCategories: [],
        recentInvoices: [],
        recentExpenses: [],
        overdueInvoices: [],
      };
    }
  },
};
