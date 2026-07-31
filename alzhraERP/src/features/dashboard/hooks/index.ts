import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { dashboardApi } from '../api/index';
import { calculateDashboardInsights } from '../services/dashboardInsights';
import { useMemo } from 'react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import type {
  DashboardDataPayload,
  ChartDataPoint,
  TopPerformer,
  LowStockProduct,
  DashboardAlert,
  DashboardInsight,
} from '../models';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';

// Re-export specific hooks from the old structure for backwards compatibility
export {
  useSalesChart,
  useInventoryChart,
  useRecentActivity,
  useTopProducts,
  useTopCustomers,
  useDashboardAlerts,
} from './useDashboard';

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
}

interface RawTrialBalanceRow {
  code?: string;
  account_code?: string;
  netBalance?: number;
  balance?: number;
}

interface RawProductStock {
  quantity?: number;
}

interface RawProduct {
  id?: string;
  name_ar?: string;
  min_stock_level?: number;
  product_stock?: RawProductStock[];
}

interface RawExpense {
  amount?: number;
  expense_categories?: { name: string } | null;
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
}

// ------------------------------------------
// Helper functions (extracted to keep hooks concise)
// ------------------------------------------
const toNumber = (value: number | string | undefined | null): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getAccountCode = (row: RawTrialBalanceRow): string => {
  const code = row.code ?? row.account_code ?? '';
  return typeof code === 'string' ? code : String(code);
};

const sumTrialBalance = (rows: RawTrialBalanceRow[], prefix: string): number => {
  return rows.reduce((sum, row) => {
    const code = getAccountCode(row);
    if (code.startsWith(prefix)) {
      return sum + Math.abs(toNumber(row.netBalance ?? row.balance));
    }
    return sum;
  }, 0);
};

// Note: computeLowStockProducts() and computeCategoryData() have been moved to
// Postgres RPC functions (get_low_stock_products, get_expense_categories_summary).
// The API layer now returns pre-computed results directly.


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

  // 1. Fetch Raw Data using React Query
  const rawDataQuery = useQuery({
    queryKey: ['dashboard_raw_data', companyId, branchId],
    queryFn: async ({ signal }): Promise<RawDashboardData | null> => {
      if (!companyId) {
        return null;
      }
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];
        const result = await dashboardApi.fetchRawDashboardData(
          companyId,
          dateLimit,
          signal,
          branchId,
        );
        return result as unknown as RawDashboardData;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.info('Dashboard data fetch aborted');
          return null;
        }
        if (signal.aborted) {
          console.info('Dashboard data fetch aborted (signal)');
          return null;
        }
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
  });

  // 2. Compute Base Metrics using useMemo
  const processedData = useMemo<DashboardDataPayload | null>(() => {
    if (!rawDataQuery.data) {
      return null;
    }

    const { summary, salesChart, topData, lowStockProducts, categoryData, trialBalanceRows } =
      rawDataQuery.data;

    // Guard: if summary is missing (RPC failed or old cache), return null
    if (!summary || typeof summary !== 'object') {
      return null;
    }

    // Process Trial Balance for accurate Net Profit/Loss
    const safeTrialBalance: RawTrialBalanceRow[] = Array.isArray(trialBalanceRows)
      ? (trialBalanceRows as RawTrialBalanceRow[])
      : [];

    const totalRevenues = sumTrialBalance(safeTrialBalance, '4');
    const totalExpensesAcc = sumTrialBalance(safeTrialBalance, '5');
    const netProfit = totalRevenues - totalExpensesAcc;

    const netCashPosition = toNumber(summary.receipt_bonds) - toNumber(summary.payment_bonds);

    // lowStockProducts and categoryData are now provided directly by the RPC
    const safeCategoryData = Array.isArray(categoryData) ? categoryData : [];
    const safeLowStockProducts = Array.isArray(lowStockProducts) ? lowStockProducts : [];

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
      totalDebts: toNumber(summary.total_debts),
      totalSupplierDebts: toNumber(summary.total_supplier_debts),
      invoicesData: [],
      expensesData: [],
      lowStockProducts: safeLowStockProducts,
      overdueInvoices: [],
    });

    // Assemble final payload directly from RPC data
    const payload: DashboardDataPayload = {
      stats: {
        sales: formatCurrency(toNumber(summary.total_sales)),
        purchases: formatCurrency(toNumber(summary.total_purchases)),
        expenses: formatCurrency(toNumber(summary.total_expenses)),
        debts: formatCurrency(
          toNumber(summary.total_debts) + toNumber(summary.total_supplier_debts),
        ),
        invoices: '0',
        profit: formatCurrency(netProfit),
        netCash: formatCurrency(netCashPosition),
        salesTrend: Math.round(insightsResult.salesTrend * 10) / 10,
        purchasesTrend: Math.round(insightsResult.purchasesTrend * 10) / 10,
        expensesTrend: Math.round(insightsResult.expensesTrend * 10) / 10,
        profitTrend: 0,
      },
      salesData: safeSalesChart.length
        ? safeSalesChart
        : [{ name: 'اليوم', value: 0 }],
      categoryData: safeCategoryData.length
        ? safeCategoryData
        : [{ name: 'لا توجد بيانات', value: 0, color: '#94a3b8' }],
      recentActivities: [],
      customers: safeTopData.top_customers ?? [],
      topProducts: safeTopData.top_products ?? [],
      topCustomers: safeTopData.top_customers ?? [],
      targets: insightsResult.targets,
      cashFlow: {
        inflow: toNumber(summary.receipt_bonds),
        outflow: toNumber(summary.payment_bonds),
        net: netCashPosition,
      },
      alerts: insightsResult.alerts as unknown as DashboardAlert[],
      insights: insightsResult.insights as unknown as DashboardInsight[],
      lowStockProducts: safeLowStockProducts,
    };

    return payload;
  }, [rawDataQuery.data]);

  // Provide fallback empty data if still loading or errored
  const fallbackData: DashboardDataPayload = {
    stats: {
      sales: '0',
      purchases: '0',
      expenses: '0',
      debts: '0',
      invoices: '0',
      profit: '0',
      netCash: '0',
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

export default useDashboardData;
