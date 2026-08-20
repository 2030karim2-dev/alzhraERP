import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { dashboardApi } from '../api/index';
import { calculateDashboardInsights, resolveNetProfit } from '../services/dashboardInsights';
import { buildTopCategoryData } from '../services/topCategoryData';
import { useMemo, useEffect } from 'react';
import { useFeedbackStore } from '../../feedback/store';
import type {
  DashboardDataPayload,
  ChartDataPoint,
  TopPerformer,
  LowStockProduct,
  RecentActivityItem,
} from '../models';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import { logger } from '../../../core/utils/logger';

// Realtime logic is now handled in useDashboardData hook

// ------------------------------------------
// Type definitions for raw RPC data
// ------------------------------------------
interface RawSummary {
  total_sales?: number | string;
  total_purchases?: number | string;
  total_expenses?: number | string;
  receipt_bonds?: number | string;
  payment_bonds?: number | string;
  total_debts?: number | string;
  total_supplier_debts?: number | string;
  invoice_count?: number | string;
}

interface RawTrialBalanceRow {
  code?: string;
  account_code?: string;
  netBalance?: number;
  balance?: number;
}

interface RawTopData {
  top_customers?: TopPerformer[];
  top_products?: TopPerformer[];
}

interface RawDashboardData {
  summary: RawSummary;
  salesChart: unknown[];
  topData: RawTopData;
  // ⚡ These are now pre-computed by Postgres RPCs:
  lowStockProducts: LowStockProduct[];
  categoryData: ChartDataPoint[];
  trialBalanceRows: unknown[];
  // Server-authored P&L rows: [{ category, amount, type }] — مصدر صافي الربح المعتمد
  profitLossRows?: Array<{ type?: string; amount?: number | string }>;
  // Top-selling products + product categories (feed for the top-category chart)
  topSellingProducts?: Array<{
    category_id: string;
    id: string;
    name_ar?: string;
    total_revenue?: number;
    total_sold?: number;
  }>;
  productCategories?: Array<{ id: string; name: string }>;
  // Real data feeds (added via dashboardApi): recent activity + overdue alerts
  recentInvoices: Array<{
    id: string;
    type?: string | null;
    issue_date: string;
    total_amount?: number | null;
    parties?: { name?: string | null } | null;
  }>;
  recentExpenses: Array<{
    id: string;
    expense_date: string;
    description?: string | null;
    amount?: number | null;
    expense_categories?: { name?: string | null } | null;
  }>;
  overdueInvoices: Array<{ id: string; partyName?: string; daysOverdue?: number }>;
}

// ------------------------------------------
// Recent-activity builder (driven by real invoices/expenses)
// ------------------------------------------
const INVOICE_ACTIVITY_META: Record<string, { title: string; color: string }> = {
  sale: { title: 'فاتورة مبيعات', color: 'blue' },
  purchase: { title: 'فاتورة مشتريات', color: 'violet' },
  sale_return: { title: 'مرتجع مبيعات', color: 'orange' },
  purchase_return: { title: 'مرتجع مشتريات', color: 'amber' },
};

const buildRecentActivities = (
  invoices: RawDashboardData['recentInvoices'],
  expenses: RawDashboardData['recentExpenses'],
): RecentActivityItem[] => {
  const items: RecentActivityItem[] = [
    ...(invoices || []).map((inv) => {
      const meta = INVOICE_ACTIVITY_META[inv.type ?? ''] ?? { title: 'فاتورة', color: 'gray' };
      return {
        id: inv.id,
        type: inv.type ?? 'invoice',
        title: meta.title,
        desc: `${toNumber(inv.total_amount).toLocaleString('ar-EG')} ر.س — ${inv.parties?.name ?? 'غير محدد'}`,
        date: inv.issue_date,
        time: inv.issue_date,
        color: meta.color,
      };
    }),
    ...(expenses || []).map((exp) => ({
      id: exp.id,
      type: 'expense',
      title: `مصروف: ${exp.description || exp.expense_categories?.name || 'غير محدد'}`,
      desc: `${toNumber(exp.amount).toLocaleString('ar-EG')} ر.س`,
      date: exp.expense_date,
      time: exp.expense_date,
      color: 'rose',
    })),
  ];
  return items
    .filter((item) => !!item.time)
    .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
    .slice(0, 6);
};

// ------------------------------------------
// Helper functions (extracted to keep hooks concise)
// ------------------------------------------
const toNumber = (value: number | string | undefined | null): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Note: computeLowStockProducts() and computeCategoryData() have been moved to
// Postgres RPC functions (get_low_stock_products, get_expense_categories_summary).
// The API layer now returns pre-computed results directly.
// Note: sumTrialBalance/getAccountCode were removed — their logic now lives in the
// pure, unit-tested `resolveNetProfit`/`sumTrialBalanceByPrefix` in dashboardInsights.ts.

/**
 * تجميع أعلى المنتجات مبيعاً حسب فئتها — نقلت إلى services/topCategoryData
 * (دالة نقية قابلة للاختبار) ويُستورد منها أعلاه.
 */



// ------------------------------------------
// Main Hook
// ------------------------------------------
interface UseDashboardDataResult extends DashboardDataPayload {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
  data: DashboardDataPayload | null;
}

export const useDashboardData = (): UseDashboardDataResult => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();

  // Realtime channel for dashboard stats
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  useEffect(() => {
    if (!companyId) return;
    const channelKey = `dashboard_sales_${companyId}`;
    const globalAny = window as any;
    if (!globalAny.__ALZ_DASHBOARD_CHANNELS__) {
      globalAny.__ALZ_DASHBOARD_CHANNELS__ = new Map<string, any>();
    }
    const registry: Map<string, any> = globalAny.__ALZ_DASHBOARD_CHANNELS__;

    if (!registry.has(channelKey)) {
      void import('../../../lib/supabaseClient').then(({ supabase }) => {
        const ch = supabase
          .channel(channelKey)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'invoices', filter: `company_id=eq.${companyId}` },
            (payload: any) => {
              if (payload.new.type === 'sale') {
                showToast(`مبيعات جديدة بقيمة ${payload.new.total_amount} ر.س`, 'success');
                queryClient.invalidateQueries({ queryKey: ['dashboard_raw_data'] });
              }
            }
          )
          .subscribe();
        registry.set(channelKey, ch);
      });
    }
    return () => { /* no-op */ };
  }, [companyId, queryClient, showToast]);

  // 1. Fetch Raw Data using React Query
  const rawDataQuery = useQuery({
    queryKey: ['dashboard_raw_data', companyId, branchId],
    queryFn: async ({ signal }): Promise<RawDashboardData | null> => {
      if (!companyId) {
        return null;
      }
      try {
        const result = await dashboardApi.fetchRawDashboardData(
          companyId,
          signal,
          branchId,
        );
        return result as unknown as RawDashboardData;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          logger.info("hooks", 'Dashboard data fetch aborted');
          return null;
        }
        if (signal.aborted) {
          logger.info("hooks", 'Dashboard data fetch aborted (signal)');
          return null;
        }
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    // Refresh when the user returns to the tab so stale fallback zeros never
    // linger after an RPC hiccup. Realtime still drives mid-session updates.
    refetchOnWindowFocus: true,
  });

  // 2. Compute Base Metrics using useMemo
  const processedData = useMemo<DashboardDataPayload | null>(() => {
    if (!rawDataQuery.data) {
      return null;
    }

    const {
      summary,
      salesChart,
      topData,
      lowStockProducts,
      trialBalanceRows,
      profitLossRows = [],
      topSellingProducts = [],
      productCategories = [],
      // ⚠️ Defensive defaults: the 24h IndexedDB persister can restore a payload
      // written by an OLDER build whose API did not return these fields yet.
      // Without defaults, `calculateDashboardInsights` used to crash with
      // `Cannot read properties of undefined (reading 'length')` inside this useMemo.
      recentInvoices = [],
      recentExpenses = [],
      overdueInvoices = [],
    } = rawDataQuery.data;

    // Guard: if summary is missing (RPC failed or old cache), return null
    if (!summary || typeof summary !== 'object') {
      return null;
    }

    // Process Trial Balance for accurate Net Profit/Loss
    const safeTrialBalance: RawTrialBalanceRow[] = Array.isArray(trialBalanceRows)
      ? (trialBalanceRows as RawTrialBalanceRow[])
      : [];

    // المصدر الأساسي لصافي الربح: RPC `report_profit_loss` (إشارات محاسبية موثوقة).
    // الاحتياط: ميزان المراجعة بأكواد 4/5 — المغلف داخل دالة نقية مختبرة (resolveNetProfit).
    const netProfit = resolveNetProfit(profitLossRows, safeTrialBalance);

    const netCashPosition = toNumber(summary.receipt_bonds) - toNumber(summary.payment_bonds);

    // lowStockProducts comes directly from the RPC. The top-categories chart is
    // aggregated from get_top_selling_products + product_categories (instead of
    // the expense-categories summary, which was a logical mismatch).
    const safeLowStockProducts = Array.isArray(lowStockProducts) ? lowStockProducts : [];
    const productCategoryData = buildTopCategoryData(topSellingProducts, productCategories);

    const safeSalesChart: ChartDataPoint[] = Array.isArray(salesChart)
      ? (salesChart as ChartDataPoint[])
      : [];

    const safeTopData: RawTopData =
      topData && typeof topData === 'object' ? topData : {};

    // Call external service transformer for insights
    const insightsResult = calculateDashboardInsights({
      receiptBonds: toNumber(summary.receipt_bonds),
      paymentBonds: toNumber(summary.payment_bonds),
      totalSales: toNumber(summary.total_sales),
      totalPurchases: toNumber(summary.total_purchases),
      totalExpenses: toNumber(summary.total_expenses),
      netProfit,
      totalCustomerDebts: toNumber(summary.total_debts),
      totalSupplierDebts: toNumber(summary.total_supplier_debts),
      salesChartData: safeSalesChart,
      lowStockProducts: safeLowStockProducts,
      overdueInvoices,
    });

    // Assemble final payload directly from RPC data
    const payload: DashboardDataPayload = {
      stats: {
        sales: toNumber(summary.total_sales),
        purchases: toNumber(summary.total_purchases),
        expenses: toNumber(summary.total_expenses),
        debts: toNumber(summary.total_debts),
        // ذمم الموردين منفصلة عن ذمم العملاء (بندان متعاكسان مالياً لا يُجمعان)
        supplierDebts: toNumber(summary.total_supplier_debts),
        invoices: toNumber(summary.invoice_count),
        profit: netProfit,
        netCash: netCashPosition,
        salesTrend: Math.round(insightsResult.salesTrend * 10) / 10,
        purchasesTrend: Math.round(insightsResult.purchasesTrend * 10) / 10,
        expensesTrend: Math.round(insightsResult.expensesTrend * 10) / 10,
        profitTrend: 0,
      },
      salesData: safeSalesChart.length
        ? safeSalesChart
        : [{ name: 'اليوم', value: 0 }],
      categoryData: productCategoryData.length
        ? productCategoryData
        : [{ name: 'لا توجد بيانات', value: 0, color: '#94a3b8' }],
      recentActivities: buildRecentActivities(recentInvoices, recentExpenses),
      customers: safeTopData.top_customers ?? [],
      topProducts: safeTopData.top_products ?? [],
      topCustomers: safeTopData.top_customers ?? [],
      targets: insightsResult.targets,
      cashFlow: {
        inflow: toNumber(summary.receipt_bonds),
        outflow: toNumber(summary.payment_bonds),
        net: netCashPosition,
      },
      alerts: insightsResult.alerts,
      insights: insightsResult.insights,
      lowStockProducts: safeLowStockProducts,
    };

    return payload;
  }, [rawDataQuery.data]);

  const fallbackData: DashboardDataPayload = {
    stats: {
      sales: 0,
      purchases: 0,
      expenses: 0,
      debts: 0,
      // ذمم الموردين منفصلة (بند متعاكس ماليًا لا يُجمع مع ذمم العملاء)
      supplierDebts: 0,
      invoices: 0,
      profit: 0,
      netCash: 0,
      salesTrend: 0,
      purchasesTrend: 0,
      expensesTrend: 0,
      profitTrend: 0,
    },
    salesData: [],
    categoryData: [],
    recentActivities: [],
    customers: [],
    topProducts: [],
    topCustomers: [],
    targets: { salesProgress: 0, collectionRate: 0 },
    cashFlow: { inflow: 0, outflow: 0, net: 0 },
    alerts: [],
    insights: [],
    lowStockProducts: [],
  };

  return {
    ...rawDataQuery,
    data: processedData,
    ...(processedData ?? fallbackData),
  };
};

export const useDashboardStats = () => {
  const { stats, isLoading, error } = useDashboardData();
  return { stats, isLoading, error };
};

export const useSalesChart = (_period: 'today' | 'week' | 'month' | 'year' = 'week') => {
  const { salesData, isLoading } = useDashboardData();
  return { chartData: salesData, isLoading };
};

export const useInventoryChart = () => {
  const { categoryData, isLoading } = useDashboardData();
  return { chartData: categoryData, isLoading };
};

export const useRecentActivity = (limit = 5) => {
  const { recentActivities, isLoading } = useDashboardData();
  return { activities: recentActivities.slice(0, limit), isLoading };
};

export const useTopProducts = (limit = 5) => {
  const { topProducts, isLoading } = useDashboardData();
  return { products: topProducts.slice(0, limit), isLoading };
};

export const useTopCustomers = (limit = 5) => {
  const { topCustomers, isLoading } = useDashboardData();
  return { customers: topCustomers.slice(0, limit), isLoading };
};

export const useDashboardAlerts = () => {
  const { alerts, isLoading } = useDashboardData();
  return { alerts, isLoading, hasAlerts: alerts.length > 0 };
};

export default useDashboardData;
