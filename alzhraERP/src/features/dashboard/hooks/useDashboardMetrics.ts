
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardData } from './index';
import { reportService } from '../../accounting/services/reportService';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import { useAuthStore } from '../../auth/store';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export const useDashboardMetrics = () => {
    const dashboardData = useDashboardData();
    const { stats, salesData } = dashboardData;
    const { user } = useAuthStore();
    const { branchId } = useBranchFilter();
    const companyId = user?.company_id;

    const extractNumericValue = (formatted: string | number) => {
        if (formatted === null || formatted === undefined) return 0;
        const numeric = String(formatted).replace(/[^0-9.-]/g, '');
        const val = parseFloat(numeric) || 0;
        return Math.max(0, val);
    };

    // Monthly revenue vs expenses — driven by get_monthly_performance
    // (journal entries) instead of a single synthetic aggregate point.
    const { data: monthlyPerformance } = useQuery({
        queryKey: ['dashboard_monthly_performance', companyId, branchId],
        queryFn: async () => {
            if (!companyId) return null;
            try {
                const rows = await reportService.getMonthlyPerformance(companyId, new Date().getFullYear(), branchId);
                return rows ?? [];
            } catch {
                return null;
            }
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
    });

    const revenueExpensesData = useMemo(() => {
        if (monthlyPerformance && monthlyPerformance.length > 0) {
            return monthlyPerformance.map((m) => ({
                name: ARABIC_MONTHS[m.monthIndex] ?? m.name,
                revenue: m.revenues || 0,
                expenses: m.expenses || 0,
            }));
        }
        const salesValue = extractNumericValue(stats?.sales || '0');
        const expensesValue = extractNumericValue(stats?.expenses || '0');
        return [{ name: 'الأداء المالي', revenue: salesValue, expenses: expensesValue }];
    }, [monthlyPerformance, stats]);

    const metrics = useMemo(() => {
        const currentSales = salesData && salesData.length > 0 ? (salesData as any[])[salesData.length - 1].value : 0;
        const avgSales = ((salesData as any[])?.reduce((a: number, b: any) => a + b.value, 0) || 0) / ((salesData as any[])?.length || 1);
        const growthRate = avgSales > 0 ? ((currentSales - avgSales) / avgSales) * 100 : 0;
        const salesValue = extractNumericValue(stats?.sales || '0');

        return {
            growthRate,
            salesValue,
            currentSales,
            avgSales
        };
    }, [salesData, stats]);

    // Dynamic monthly sales target (20% growth over the current period),
    // consistent with dashboardInsights so PerformanceGauge and SmartTargets agree.
    const salesTarget = useMemo(() => {
        const salesValue = extractNumericValue(stats?.sales || '0');
        return salesValue > 0 ? Math.round(salesValue * 1.2) : 0;
    }, [stats]);

    return {
        ...dashboardData,
        revenueExpensesData,
        salesTarget,
        ...metrics
    };
};
