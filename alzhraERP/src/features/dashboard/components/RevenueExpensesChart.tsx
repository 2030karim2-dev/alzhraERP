import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { useThemeStore } from '../../../lib/themeStore';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { cn } from '../../../core/utils';

interface RevenueExpensesChartProps {
    data: { name: string; revenue: number; expenses: number }[];
    className?: string;
}

const formatNumber = (value: number) => {
    const num = Number(value) || 0;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// --- Sub-components (Atoms/Molecules) ---

const ChartTooltip = React.memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;
        const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
        const net = revenue - expenses;

        return (
            <div className={cn(
                "p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-200",
                "bg-[var(--app-surface)]/80 border-[var(--app-border)] shadow-black/50"
            )}>
                <p className="text-xs font-bold text-[var(--app-text-secondary)] mb-3 border-b border-[var(--app-border)] pb-2">
                    {label}
                </p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs text-[var(--app-text)] font-bold">الإيرادات</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-100 font-mono tracking-tight">
                            {formatNumber(revenue)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                            <span className="text-xs text-[var(--app-text)] font-bold">المصروفات</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-100 font-mono tracking-tight">
                            {formatNumber(expenses)}
                        </span>
                    </div>
                    <div className="pt-2 border-t border-[var(--app-border)]">
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">الصافي</span>
                            <span className={cn(
                                "text-sm font-bold tracking-tight",
                                net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {net >= 0 ? '+' : ''}{formatNumber(net)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
});

const ChartHeader = React.memo(({ totalRevenue, totalExpenses }: { totalRevenue: number, totalExpenses: number }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                <Scale size={16} className="text-violet-500" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-[var(--app-text)]">
                    الإيرادات vs المصروفات
                </h3>
                <p className="text-[9px] text-[var(--app-text-secondary)]">مقارنة شهرية</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="text-center">
                <p className="text-[8px] font-bold text-emerald-500 uppercase">الإيرادات</p>
                <p className="text-sm font-bold text-emerald-600 font-mono">{formatNumber(totalRevenue)}</p>
            </div>
            <div className="text-center">
                <p className="text-[8px] font-bold text-rose-500 uppercase">المصروفات</p>
                <p className="text-sm font-bold text-rose-600 font-mono">{formatNumber(totalExpenses)}</p>
            </div>
        </div>
    </div>
));

const ChartFooter = React.memo(({ netProfit, profitMargin }: { netProfit: number, profitMargin: number }) => (
    <div className={cn(
        "mt-4 p-3 rounded-xl flex items-center justify-between",
        netProfit >= 0
            ? "bg-emerald-50 dark:bg-emerald-900/20"
            : "bg-rose-50 dark:bg-rose-900/20"
    )}>
        <div className="flex items-center gap-2">
            {netProfit >= 0 ? (
                <TrendingUp size={16} className="text-emerald-500" />
            ) : (
                <TrendingDown size={16} className="text-rose-500" />
            )}
            <span className="text-xs font-bold text-[var(--app-text-secondary)]">
                صافي الربح
            </span>
        </div>
        <div className="text-right">
            <p className={cn(
                "text-lg font-bold font-mono",
                netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
                {netProfit >= 0 ? '+' : ''}{formatNumber(netProfit)}
            </p>
            <p className={cn(
                "text-[9px] font-bold",
                netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
                هامش ربح {Math.max(-100, Math.min(100, profitMargin)).toFixed(1)}%
            </p>
        </div>
    </div>
));

const RevenueExpensesChart: React.FC<RevenueExpensesChartProps> = ({
    data,
    className
}) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [isMounted, setIsMounted] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

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

    const metrics = React.useMemo(() => {
        const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
        const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        return { totalRevenue, totalExpenses, netProfit, profitMargin };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className={cn(
                "bg-[var(--app-surface)] border border-[var(--app-border)] p-5 rounded-2xl flex items-center justify-center h-64",
                className
            )}>
                <div className="text-center">
                    <Scale size={32} className="mx-auto text-[var(--app-text-secondary)] mb-2" />
                    <p className="text-sm font-bold text-[var(--app-text-secondary)]">لا توجد بيانات</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-[var(--app-surface)] border border-[var(--app-border)] p-5 rounded-2xl",
            className
        )}>
            <ChartHeader
                totalRevenue={metrics.totalRevenue}
                totalExpenses={metrics.totalExpenses}
            />

            <div 
              ref={containerRef}
              className="w-full relative group overflow-hidden" 
              style={{ height: '220px', minHeight: '220px' }}
            >
                {isMounted && (
                    <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1} debounce={100}>
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                                </linearGradient>
                                <linearGradient id="barExpenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} opacity={0.4} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={formatNumber}
                                dx={-10}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                            <ReferenceLine y={0} stroke={isDark ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />
                            <Bar
                                dataKey="revenue"
                                name="الإيرادات"
                                fill="url(#barRevenue)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={40}
                                minPointSize={1}
                            />
                            <Bar
                                dataKey="expenses"
                                name="المصروفات"
                                fill="url(#barExpenses)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={40}
                                minPointSize={1}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <ChartFooter
                netProfit={metrics.netProfit}
                profitMargin={metrics.profitMargin}
            />
        </div>
    );
};

export default RevenueExpensesChart;
