import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, Package } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface AnalyticsData {
    totalSales: number;
    totalPurchases: number;
    profit: number;
    margin: number;
    salesTrend?: number; // percentage change
    turnoverRate?: number;
    stockDays?: number;
}

interface Props {
    data: AnalyticsData;
    isLoading?: boolean;
}

const MiniSparkline: React.FC<{ value: number; color: string }> = ({ value, color }) => {
    // Generate a simple sparkline-like SVG bar
    const bars = 7;
    const heights = Array.from({ length: bars }, (_, i) => {
        const base = Math.sin((i / bars) * Math.PI) * 60 + 20;
        const variance = (Math.random() - 0.5) * 30;
        return Math.max(5, Math.min(100, base + variance));
    });

    return (
        <div className="flex items-end gap-[2px] h-8">
            {heights.map((h, i) => (
                <div
                    key={i}
                    className={`w-2 rounded-sm transition-all duration-300 ${color}`}
                    style={{ height: `${h}%` }}
                />
            ))}
        </div>
    );
};

const ProductAnalyticsChart: React.FC<Props> = ({ data, isLoading = false }) => {
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                    <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="grid grid-cols-3 gap-2">
                        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    const trendIcon = data.margin > 0
        ? <TrendingUp size={14} className="text-emerald-500" />
        : data.margin < 0
            ? <TrendingDown size={14} className="text-rose-500" />
            : <Minus size={14} className="text-slate-400" />;

    const trendColor = data.margin > 0 ? 'text-emerald-600' : 'text-rose-600';

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 bg-gradient-to-l from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950/30 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity size={13} className="text-blue-500" />
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            أداء المنتج
                        </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {trendIcon}
                        <span className={`text-[11px] font-black font-mono ${trendColor}`}>
                            {data.margin >= 0 ? '+' : ''}{data.margin.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {/* Sparkline Chart */}
                <div className="mb-4">
                    <MiniSparkline value={data.totalSales} color="bg-blue-400 dark:bg-blue-500" />
                    <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-slate-400">آخر 7 حركات</span>
                        <span className="text-[8px] text-slate-400">الآن</span>
                    </div>
                </div>

                {/* KPIs Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Sales */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2.5 border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingUp size={10} className="text-blue-500" />
                            <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                                مبيعات
                            </span>
                        </div>
                        <span className="text-xs font-black font-mono text-blue-700 dark:text-blue-300">
                            {data.totalSales.toLocaleString()}
                        </span>
                    </div>

                    {/* Purchases */}
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-center gap-1 mb-1">
                            <Package size={10} className="text-indigo-500" />
                            <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                مشتريات
                            </span>
                        </div>
                        <span className="text-xs font-black font-mono text-indigo-700 dark:text-indigo-300">
                            {data.totalPurchases.toLocaleString()}
                        </span>
                    </div>

                    {/* Profit */}
                    <div className={cn(
                        "rounded-lg p-2.5 border",
                        data.profit >= 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30'
                    )}>
                        <div className="flex items-center gap-1 mb-1">
                            <DollarSign size={10} className={data.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                            <span className="text-[8px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                                ربح
                            </span>
                        </div>
                        <span className={`text-xs font-black font-mono ${data.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {data.profit >= 0 ? '+' : ''}{data.profit.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Additional KPIs */}
                {(data.turnoverRate !== undefined || data.stockDays !== undefined) && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {data.turnoverRate !== undefined && (
                            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500">معدل الدوران</span>
                                <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {data.turnoverRate.toFixed(1)}x
                                </span>
                            </div>
                        )}
                        {data.stockDays !== undefined && (
                            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500">أيام المخزون</span>
                                <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {data.stockDays} يوم
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductAnalyticsChart;
