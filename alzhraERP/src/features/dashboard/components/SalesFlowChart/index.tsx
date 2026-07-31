import React from 'react';
import { useThemeStore } from '../../../../lib/themeStore';
import { useSalesFlowChart, ChartDataPoint, SeriesType } from './hooks/useSalesFlowChart';
import { SalesChartHeader } from './components/SalesChartHeader';
import { SalesChartPlot } from './components/SalesChartPlot';
import { SalesChartSummary } from './components/SalesChartSummary';

interface SalesFlowChartProps {
    data: ChartDataPoint[];
    showPeriodSelector?: boolean | undefined;
    onPeriodChange?: ((period: string) => void) | undefined;
}

const SalesFlowChart: React.FC<SalesFlowChartProps> = ({
    data,
    showPeriodSelector = false,
    onPeriodChange
}) => {
    const { accentColor } = useThemeStore();

    const {
        period,
        chartType,
        setChartType,
        visibleSeries,
        toggleSeries,
        filteredData,
        stats,
        handlePeriodChange
    } = useSalesFlowChart({ data, onPeriodChange });

    const seriesConfig: Record<SeriesType, { label: string; color: string }> = {
        sales: { label: 'المبيعات', color: accentColor }, // Dynamic Accent
        profit: { label: 'الأرباح', color: '#10b981' }, // Emerald
        purchases: { label: 'المشتريات', color: '#f43f5e' }, // Rose
        expenses: { label: 'المصروفات', color: '#f59e0b' } // Amber
    };

    const maxSales = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.sales || 0)) : 0;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <SalesChartHeader
                seriesConfig={seriesConfig}
                visibleSeries={visibleSeries}
                toggleSeries={toggleSeries}
                showPeriodSelector={showPeriodSelector}
                period={period}
                handlePeriodChange={handlePeriodChange}
                chartType={chartType}
                setChartType={setChartType}
            />

            <div className="flex-1 min-h-[300px]">
                <SalesChartPlot
                    filteredData={filteredData}
                    chartType={chartType}
                    visibleSeries={visibleSeries}
                    seriesConfig={seriesConfig}
                />
            </div>

            <SalesChartSummary
                stats={stats}
                maxSales={maxSales}
            />
        </div>
    );
};

export default SalesFlowChart;
