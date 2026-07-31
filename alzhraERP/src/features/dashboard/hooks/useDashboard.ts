// ============================================
// Dashboard Data Hook
// Use Dashboard Hook
// ============================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/lib/react-query';
import { useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';

// ------------------------------------------
// Types
// ------------------------------------------
export interface DashboardSummary {
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    totalDebts: number;
    totalInvoices: number;
    netProfit: number;
    salesTrend: number;
    purchasesTrend: number;
    expensesTrend: number;
    debtsTrend: number;
    profitTrend: number;
}

export interface SalesDataPoint {
    name: string;
    value: number;
    sales?: number;
}

export interface TopProduct {
    id: string;
    name: string;
    revenue: number;
    quantity: number;
}

export interface TopCustomer {
    id: string;
    name: string;
    total: number;
    invoices: number;
}

export interface RecentTransaction {
    id: string;
    type: string;
    title: string;
    desc: string;
    time: string;
    color: string;
}

export interface Alert {
    id: string;
    type: 'urgent' | 'warning' | 'info';
    message: string;
    time?: string;
}

export interface DashboardData {
    summary: DashboardSummary;
    salesChartData: SalesDataPoint[];
    categoryChartData: { name: string; value: number; color: string }[];
    topProducts: TopProduct[];
    topCustomers: TopCustomer[];
    recentTransactions: RecentTransaction[];
    alerts: Alert[];
}

interface UseDashboardOptions {
    period?: 'today' | 'week' | 'month' | 'year';
    refetchInterval?: number;
}

// ------------------------------------------
// Default values for fallback
// ------------------------------------------
const DEFAULT_DASHBOARD_SUMMARY: DashboardSummary = {
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalDebts: 0,
    totalInvoices: 0,
    netProfit: 0,
    salesTrend: 0,
    purchasesTrend: 0,
    expensesTrend: 0,
    debtsTrend: 0,
    profitTrend: 0
};

// ------------------------------------------
// Fetch Dashboard Data (Legacy - actual data from hooks.ts)
// ------------------------------------------
const fetchDashboardData = async (_period: string): Promise<DashboardData> => {
    return {
        summary: DEFAULT_DASHBOARD_SUMMARY,
        salesChartData: [],
        categoryChartData: [],
        topProducts: [],
        topCustomers: [],
        recentTransactions: [],
        alerts: [],
    };
};

// ------------------------------------------
// Main Hook
// ------------------------------------------
export const useDashboard = (options?: UseDashboardOptions) => {
    const { period = 'week', refetchInterval } = options ?? {};

    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    const queryKey = [...queryKeys.dashboard.stats, period];

    // Semi-persistent Realtime channel (singleton per company) for new sales notifications.
    // Prevents "cannot add callbacks after subscribe()" race during StrictMode/HMR.
    useEffect(() => {
        if (!user?.company_id) return;

        const channelKey = `dashboard_sales_${user.company_id}`;
        const globalAny = window as any;
        if (!globalAny.__ALZ_DASHBOARD_CHANNELS__) {
            globalAny.__ALZ_DASHBOARD_CHANNELS__ = new Map<string, any>();
        }
        const registry: Map<string, any> = globalAny.__ALZ_DASHBOARD_CHANNELS__;

        if (!registry.has(channelKey)) {
            const channel = supabase
                .channel(channelKey)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'invoices',
                        filter: `company_id=eq.${user.company_id}`
                    },
                    (payload: any) => {
                        // Only notify for actual sales, ignoring returns and purchases
                        if (payload.new.type === 'sale') {
                            showToast(`مبيعات جديدة بقيمة ${payload.new.total_amount} ر.س`, 'success');
                            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
                        }
                    }
                )
                .subscribe();

            registry.set(channelKey, channel);
        }

        return () => { /* no-op: keep channel alive for stability */ };
    }, [user?.company_id, queryClient, showToast]);

    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
        isFetching
    } = useQuery({
        queryKey,
        queryFn: () => fetchDashboardData(period),
        refetchInterval: refetchInterval ?? false,
        retry: 2,
        staleTime: 1000 * 60 * 30, // 30 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    return {
        data,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
        // Convenience getters
        summary: data?.summary ?? DEFAULT_DASHBOARD_SUMMARY,
        salesChartData: data?.salesChartData ?? [],
        categoryChartData: data?.categoryChartData ?? [],
        topProducts: data?.topProducts ?? [],
        topCustomers: data?.topCustomers ?? [],
        recentTransactions: data?.recentTransactions ?? [],
        alerts: data?.alerts ?? [],
    };
};

// ------------------------------------------
// Specialized Hooks
// ------------------------------------------
export const useDashboardStats = () => {
    const { data, isLoading, error } = useDashboard({ period: 'week' });

    return {
        stats: data?.summary ?? DEFAULT_DASHBOARD_SUMMARY,
        isLoading,
        error,
    };
};

export const useSalesChart = (period: 'today' | 'week' | 'month' | 'year' = 'week') => {
    const { data, isLoading } = useDashboard({ period });

    return {
        chartData: data?.salesChartData ?? [],
        isLoading,
    };
};

export const useInventoryChart = () => {
    const { data, isLoading } = useDashboard({ period: 'month' });

    return {
        chartData: data?.categoryChartData ?? [],
        isLoading,
    };
};

export const useRecentActivity = (limit: number = 5) => {
    const { recentTransactions, isLoading } = useDashboard({ period: 'week' });

    return {
        activities: recentTransactions.slice(0, limit),
        isLoading,
    };
};

export const useTopProducts = (limit: number = 5) => {
    const { topProducts, isLoading } = useDashboard({ period: 'month' });

    return {
        products: topProducts.slice(0, limit),
        isLoading,
    };
};

export const useTopCustomers = (limit: number = 5) => {
    const { topCustomers, isLoading } = useDashboard({ period: 'month' });

    return {
        customers: topCustomers.slice(0, limit),
        isLoading,
    };
};

export const useDashboardAlerts = () => {
    const { alerts, isLoading } = useDashboard({ period: 'today' });

    return {
        alerts,
        isLoading,
        hasAlerts: alerts.length > 0,
    };
};

export default useDashboard;
