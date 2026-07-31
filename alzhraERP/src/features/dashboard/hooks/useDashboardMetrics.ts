
import { useMemo } from 'react';
import { useDashboardData } from './index';

export const useDashboardMetrics = () => {
    const dashboardData = useDashboardData();
    const { stats, salesData } = dashboardData;

    const extractNumericValue = (formatted: string) => {
        if (!formatted) return 0;
        const numeric = formatted.replace(/[^0-9.-]/g, '');
        const val = parseFloat(numeric) || 0;
        return Math.max(0, val);
    };

    const revenueExpensesData = useMemo(() => {
        const salesValue = extractNumericValue(stats?.sales || '0');
        const expensesValue = extractNumericValue(stats?.expenses || '0');
        return [
            { name: 'الأداء المالي', revenue: salesValue, expenses: expensesValue }
        ];
    }, [stats]);

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

    return {
        ...dashboardData,
        revenueExpensesData,
        ...metrics
    };
};
