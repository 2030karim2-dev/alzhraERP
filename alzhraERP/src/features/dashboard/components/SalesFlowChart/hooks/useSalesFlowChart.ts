import { useState, useMemo } from 'react';

export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'all';
export type ChartType = 'area' | 'bar' | 'composed';
export type SeriesType = 'sales' | 'purchases' | 'expenses' | 'profit';

export interface ChartDataPoint {
    name: string;
    value: number;
    sales: number;
    purchases?: number;
    expenses?: number;
    profit?: number;
}

interface UseSalesFlowChartParams {
    data: ChartDataPoint[];
    onPeriodChange?: ((period: string) => void) | undefined;
}

export const useSalesFlowChart = ({ data, onPeriodChange }: UseSalesFlowChartParams) => {
    const [period, setPeriod] = useState<PeriodType>('month');
    const [chartType, setChartType] = useState<ChartType>('area');

    // Series visibility state
    const [visibleSeries, setVisibleSeries] = useState<Record<SeriesType, boolean>>({
        sales: true,
        purchases: false, // Hidden by default to not clutter
        expenses: false,
        profit: true
    });

    const toggleSeries = (series: SeriesType) => {
        setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }));
    };

    // Filter data based on period
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = new Date();
        const cutoff = new Date();

        switch (period) {
            case 'week': cutoff.setDate(now.getDate() - 7); break;
            case 'month': cutoff.setDate(now.getDate() - 30); break;
            case 'quarter': cutoff.setDate(now.getDate() - 90); break;
            case 'year': cutoff.setDate(now.getDate() - 365); break;
            case 'all': return data;
        }

        return data.filter(d => new Date(d.name) >= cutoff).map(d => ({
            ...d,
            sales: Math.max(0, d.sales || 0),
            purchases: Math.max(0, d.purchases || 0),
            expenses: Math.max(0, d.expenses || 0),
            // profit remains as is as it's allowed to be negative
        }));
    }, [data, period]);

    // Calculate summary stats based on filtered data
    const stats = useMemo(() => {
        if (!filteredData || filteredData.length === 0) {
            return { totalSales: 0, totalProfit: 0, avgSales: 0, trend: 0 };
        }

        const salesValues = filteredData.map(d => d.sales || 0);
        const profitValues = filteredData.map(d => d.profit || 0);

        const totalSales = salesValues.reduce((sum, v) => sum + v, 0);
        const totalProfit = profitValues.reduce((sum, v) => sum + v, 0);
        const avgSales = totalSales / salesValues.length;

        // Calculate trend (compare last 3 points to previous 3)
        let trend = 0;
        if (salesValues.length >= 6) {
            const last3 = salesValues.slice(-3).reduce((sum, v) => sum + v, 0) / 3;
            const prev3 = salesValues.slice(-6, -3).reduce((sum, v) => sum + v, 0) / 3;
            trend = prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : 0;
        }

        return { totalSales, totalProfit, avgSales, trend };
    }, [filteredData]);

    const handlePeriodChange = (newPeriod: PeriodType) => {
        setPeriod(newPeriod);
        onPeriodChange?.(newPeriod);
    };

    return {
        period,
        chartType,
        setChartType,
        visibleSeries,
        toggleSeries,
        filteredData,
        stats,
        handlePeriodChange
    };
};
