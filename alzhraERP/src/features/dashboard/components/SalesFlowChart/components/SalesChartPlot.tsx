import React from 'react';
import {
    Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Legend, Brush, Area, Line, BarChart
} from 'recharts';
import { cn } from '../../../../../core/utils';
import { useThemeStore } from '../../../../../lib/themeStore';
import { formatNumber } from './SalesChartSummary';
import { ChartType, SeriesType } from '../hooks/useSalesFlowChart';

export const CustomTooltip = ({ active, payload, label }: any) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    if (active && payload && payload.length) {
        return (
            <div className={cn(
                "p-4 rounded-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-200",
                "bg-slate-900/90 border-slate-700/50"
            )}>
                <p className="text-xs font-bold text-slate-400 mb-3 border-b border-slate-700/50 pb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {label}
                </p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-[color]"
                                    style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}40` }}
                                />
                                <span className={cn(
                                    "text-xs font-bold",
                                    isDark ? "text-slate-300" : "text-slate-600"
                                )}>
                                    {entry.name}
                                </span>
                            </div>
                            <span className="text-sm font-bold font-mono tracking-tight" style={{ color: entry.color }}>
                                {new Intl.NumberFormat('en-US').format(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

interface SalesChartPlotProps {
    filteredData: any[];
    chartType: ChartType;
    visibleSeries: Record<SeriesType, boolean>;
    seriesConfig: Record<SeriesType, { label: string; color: string }>;
}

export const SalesChartPlot: React.FC<SalesChartPlotProps> = ({
    filteredData,
    chartType,
    visibleSeries,
    seriesConfig
}) => {
    const { theme, accentColor } = useThemeStore();
    const isDark = theme === 'dark';
    const [isMounted, setIsMounted] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        let retryTimer: any;
        const timer = setTimeout(() => {
            if (containerRef.current && containerRef.current.offsetWidth > 0) {
                setIsMounted(true);
            } else {
                retryTimer = setTimeout(() => setIsMounted(true), 500);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, []);

    const gradients = (
        <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesConfig.sales.color} stopOpacity={0.8} />
                <stop offset="50%" stopColor={seriesConfig.sales.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={seriesConfig.sales.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesConfig.profit.color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={seriesConfig.profit.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesConfig.expenses.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={seriesConfig.expenses.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="purchasesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesConfig.purchases.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={seriesConfig.purchases.color} stopOpacity={0} />
            </linearGradient>
            <filter id="shadow" height="150%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
                <feOffset dx="0" dy="4" result="offsetblur" />
                <feFlood floodColor="rgba(0,0,0,0.15)" />
                <feComposite in2="offsetblur" operator="in" />
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    );

    const renderDataSeries = () => {
        const series = [];

        // Render order matters for layering
        if (visibleSeries.expenses) {
            series.push(
                chartType === 'area' ?
                    <Area key="exp" type="monotone" dataKey="expenses" name={seriesConfig.expenses.label} stroke={seriesConfig.expenses.color} fill="url(#expensesGradient)" strokeWidth={2} strokeDasharray="5 5" activeDot={{ r: 4, strokeWidth: 0 }} /> :
                    <Bar key="exp" dataKey="expenses" name={seriesConfig.expenses.label} fill={seriesConfig.expenses.color} radius={[6, 6, 0, 0]} minPointSize={1} />
            );
        }
        if (visibleSeries.purchases) {
            series.push(
                chartType === 'area' ?
                    <Area key="pur" type="monotone" dataKey="purchases" name={seriesConfig.purchases.label} stroke={seriesConfig.purchases.color} fill="url(#purchasesGradient)" strokeWidth={2} strokeDasharray="3 3" activeDot={{ r: 4, strokeWidth: 0 }} /> :
                    <Bar key="pur" dataKey="purchases" name={seriesConfig.purchases.label} fill={seriesConfig.purchases.color} radius={[6, 6, 0, 0]} minPointSize={1} />
            );
        }
        if (visibleSeries.sales) {
            series.push(
                chartType === 'bar' ?
                    <Bar key="sale" dataKey="sales" name={seriesConfig.sales.label} fill="url(#salesGradient)" stroke={seriesConfig.sales.color} radius={[6, 6, 0, 0]} minPointSize={1} /> :
                    <Area key="sale" type="monotone" dataKey="sales" name={seriesConfig.sales.label} stroke={seriesConfig.sales.color} fill="url(#salesGradient)" strokeWidth={4} activeDot={{ r: 8, stroke: seriesConfig.sales.color, strokeWidth: 2, fill: isDark ? '#1e293b' : '#fff' }} filter="url(#shadow)" />
            );
        }
        if (visibleSeries.profit) {
            series.push(
                chartType === 'bar' ?
                    <Bar key="prof" dataKey="profit" name={seriesConfig.profit.label} fill={seriesConfig.profit.color} radius={[6, 6, 0, 0]} minPointSize={1} /> :
                    <Line key="prof" type="monotone" dataKey="profit" name={seriesConfig.profit.label} stroke={seriesConfig.profit.color} strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, stroke: seriesConfig.profit.color, strokeWidth: 2, fill: isDark ? '#1e293b' : '#fff' }} filter="url(#shadow)" />
            );
        }

        return series;
    };

    const commonProps = {
        data: filteredData,
        margin: { top: 10, right: 10, left: -20, bottom: 0 }
    };

    const axisProps = {
        tick: { fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' as const },
        axisLine: false,
        tickLine: false,
        dy: 10
    };

    const ChartComponent = chartType === 'bar' ? BarChart : ComposedChart;

    return (
        <div 
          ref={containerRef}
          className="relative group w-full h-[300px] overflow-hidden"
        >
            {/* Subtle glowing background behind chart container */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-500/5 dark:from-blue-500/10 to-transparent pointer-events-none rounded-b-3xl" />

            {isMounted && (
                <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={300} debounce={100}>
                    <ChartComponent {...commonProps}>
                        {gradients}
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                        <XAxis {...axisProps} dataKey="name" minTickGap={40} />
                        <YAxis {...axisProps} tickFormatter={formatNumber} width={60} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1' }} />
                        {renderDataSeries()}
                        {chartType !== 'bar' && filteredData.length > 50 && (
                            <Brush
                                dataKey="name"
                                height={24}
                                stroke={accentColor}
                                fill={isDark ? '#0f172a' : '#f8fafc'}
                                tickFormatter={() => ''}
                            />
                        )}
                    </ChartComponent>
                </ResponsiveContainer>
            )}
        </div>
    );
};
