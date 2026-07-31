import React, { useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, BarChart2, AreaChart as AreaChartIcon, TrendingUp } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';
import { cn } from '@/core/utils';

interface SalesTrendChartProps {
    salesByDay: Array<{ date: string; sales: number }>;
    periodLabel: string;
    formatCurrency: (value: number) => string;
}

const CustomTooltip = ({ active, payload, label, t, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl transition-all duration-300">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tight border-b border-slate-100 dark:border-slate-800 pb-2">
                    {new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.sales}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {formatCurrency(payload[0].value)}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
    salesByDay,
    periodLabel,
    formatCurrency
}) => {
    const { dictionary: t } = useI18nStore();
    const [activeChart, setActiveChart] = useState<'area' | 'bar' | 'line'>('area');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        const checkDimensions = () => {
            if (containerRef.current && containerRef.current.offsetWidth > 0) {
                setIsMounted(true);
                return true;
            }
            return false;
        };

        if (checkDimensions()) return;

        const interval = setInterval(() => {
            if (checkDimensions()) clearInterval(interval);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const commonProps = {
        data: salesByDay,
        margin: { top: 10, right: 10, left: -20, bottom: 0 }
    };

    const renderChart = () => {
        const xAxis = (
            <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric' })}
                dy={10}
            />
        );
        const yAxis = <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />;
        const tooltip = <Tooltip content={<CustomTooltip t={t} formatCurrency={formatCurrency} />} cursor={{ stroke: 'rgba(59, 130, 246, 0.1)', strokeWidth: 2, fill: 'rgba(59, 130, 246, 0.05)' }} />;
        const grid = <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.3} />;

        switch (activeChart) {
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <filter id="areaGlow" height="150%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                <feOffset dx="0" dy="3" result="offsetblur" />
                                <feFlood floodColor="rgba(59, 130, 246, 0.3)" />
                                <feComposite in2="offsetblur" operator="in" />
                                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>
                        {grid}
                        {xAxis}
                        {yAxis}
                        {tooltip}
                        <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorSales)"
                            filter="url(#areaGlow)"
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#3b82f6' }}
                        />
                    </AreaChart>
                );
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        {grid}
                        {xAxis}
                        {yAxis}
                        {tooltip}
                        <Bar dataKey="sales" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={24} minPointSize={1} />
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        {grid}
                        {xAxis}
                        {yAxis}
                        {tooltip}
                        <Line
                            type="monotone"
                            dataKey="sales"
                            stroke="#3b82f6"
                            strokeWidth={4}
                            dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#3b82f6' }}
                        />
                    </LineChart>
                );
        }
    };

    return (
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" />
                        {t.sales_trend}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{periodLabel}</p>
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveChart('area')}
                        className={cn(
                            "p-2 rounded-lg transition-all duration-300",
                            activeChart === 'area' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                        title={t.area_chart || 'Area'}
                    >
                        <AreaChartIcon size={16} />
                    </button>
                    <button
                        onClick={() => setActiveChart('bar')}
                        className={cn(
                            "p-2 rounded-lg transition-all duration-300",
                            activeChart === 'bar' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                        title={t.bar_chart || 'Bar'}
                    >
                        <BarChart2 size={16} />
                    </button>
                    <button
                        onClick={() => setActiveChart('line')}
                        className={cn(
                            "p-2 rounded-lg transition-all duration-300",
                            activeChart === 'line' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                        title={t.line_chart || 'Line'}
                    >
                        <TrendingUp size={16} />
                    </button>
                </div>
            </div>
            <div 
                ref={containerRef}
                className="h-72 w-full mt-6" 
                dir="ltr"
            >
                {isMounted ? (
                    <ResponsiveContainer width="99%" height={280}>
                        {renderChart()}
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-[280px] bg-slate-50/50 dark:bg-slate-800/10 animate-pulse rounded-2xl" />
                )}
            </div>
        </div>
    );
};

export default SalesTrendChart;
