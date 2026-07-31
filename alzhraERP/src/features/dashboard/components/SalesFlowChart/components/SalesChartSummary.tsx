import React from 'react';
import { cn } from '../../../../../core/utils';

export const formatNumber = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
};

interface SalesChartSummaryProps {
    stats: {
        totalSales: number;
        totalProfit: number;
        avgSales: number;
        trend: number;
    };
    maxSales: number;
}

export const SalesChartSummary: React.FC<SalesChartSummaryProps> = ({ stats, maxSales }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[var(--app-text-secondary)] font-bold">إجمالي المبيعات</span>
                <div className="flex items-end gap-2">
                    <span className="text-xl font-bold text-[var(--app-text)] font-mono">{formatNumber(stats.totalSales)}</span>
                    {stats.trend !== 0 && (
                        <span className={cn("text-[10px] font-bold mb-1", stats.trend > 0 ? "text-emerald-500" : "text-rose-500")}>
                            {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[var(--app-text-secondary)] font-bold">صافي الأرباح</span>
                <span className={cn("text-xl font-bold font-mono", stats.totalProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {formatNumber(stats.totalProfit)}
                </span>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[var(--app-text-secondary)] font-bold">متوسط المبيعات</span>
                <span className="text-xl font-bold text-[var(--app-text)] font-mono">
                    {formatNumber(stats.avgSales)}
                </span>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[var(--app-text-secondary)] font-bold">أفضل أداء</span>
                <span className="text-xl font-bold text-blue-600 font-mono">
                    {formatNumber(maxSales)}
                </span>
            </div>
        </div>
    );
};
