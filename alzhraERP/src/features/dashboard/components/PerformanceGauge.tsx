import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target, Award, Star } from 'lucide-react';
import { cn } from '../../../core/utils';
import { useThemeStore } from '../../../lib/themeStore';

interface PerformanceGaugeProps {
    value: number;
    target: number;
    title?: string;
    className?: string;
}

const PerformanceGauge: React.FC<PerformanceGaugeProps> = ({
    value,
    target,
    title = 'أداء المبيعات',
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

    const percentage = target > 0 ? Math.min(100, (value / target) * 100) : 0;
    const remaining = 100 - percentage;

    // Determine color based on performance
    const getColor = () => {
        if (percentage >= 80) return '#10b981'; // emerald
        if (percentage >= 60) return '#3b82f6'; // blue
        if (percentage >= 40) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    const color = getColor();

    const data = [
        { value: percentage, color },
        { value: remaining, color: '#e2e8f0' }
    ];

    const getStatus = () => {
        if (percentage >= 80) return { label: 'ممتاز', icon: Award, color: 'text-emerald-500' };
        if (percentage >= 60) return { label: 'جيد جداً', icon: Star, color: 'text-blue-500' };
        if (percentage >= 40) return { label: 'جيد', icon: Target, color: 'text-amber-500' };
        return { label: 'يحتاج تحسين', icon: Target, color: 'text-rose-500' };
    };

    const status = getStatus();

    // If no data, show empty state
    if (value === 0 && target === 0) {
        return (
            <div className={cn(
                "bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-2xl flex items-center justify-center h-64",
                className
            )}>
                <div className="text-center">
                    <Target size={32} className="mx-auto text-[var(--app-text-secondary)] mb-2" />
                    <p className="text-sm font-bold text-[var(--app-text-secondary)]">لا توجد بيانات</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-2xl relative overflow-hidden group",
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Target size={16} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--app-text)]">
                        {title}
                    </h3>
                </div>
                <div className={cn("flex items-center gap-1", status.color)}>
                    <status.icon size={14} />
                    <span className="text-[10px] font-bold">{status.label}</span>
                </div>
            </div>

            {/* Gauge Chart */}
            <div 
              ref={containerRef}
              className="relative h-40 min-h-[160px] group overflow-hidden"
            >
                {/* Subtle outer glow */}
                <div className="absolute inset-x-0 bottom-4 h-24 bg-[length:100%_100%] bg-no-repeat opacity-20 transition-opacity duration-700 group-hover:opacity-40 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(ellipse at bottom, ${color} 0%, transparent 70%)`
                    }}
                />

                {isMounted ? (
                    <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                        <PieChart>
                            <defs>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} floodOpacity="0.4" />
                                </filter>
                                <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="75%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={65}
                                outerRadius={85}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={8}
                            >
                                {data.map((_entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={index === 0 ? "url(#gaugeGradient)" : (isDark ? '#334155' : '#e2e8f0')}
                                        filter={index === 0 ? "url(#glow)" : undefined}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full bg-slate-50/50 dark:bg-slate-800/10 animate-pulse rounded-2xl" />
                )}

                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pt-10">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-[var(--app-text)] font-mono tracking-tighter" style={{ textShadow: `0 2px 10px ${color}30` }}>
                            {percentage.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-[var(--app-text-secondary)] font-bold uppercase tracking-wider mt-1">من الهدف</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-center p-2 bg-white/5 border border-white/5 rounded-xl">
                    <p className="text-[8px] font-bold text-[var(--app-text-secondary)] uppercase">المحقق</p>
                    <p className="text-sm font-bold text-[var(--app-text)] font-mono">
                        {value.toLocaleString('en-US')}
                    </p>
                </div>
                <div className="text-center p-2 bg-white/5 border border-white/5 rounded-xl">
                    <p className="text-[8px] font-bold text-[var(--app-text-secondary)] uppercase">الهدف</p>
                    <p className="text-sm font-bold text-[var(--app-text)] font-mono">
                        {target.toLocaleString('en-US')}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                </div>
                <p className="text-[9px] text-[var(--app-text-secondary)] text-center mt-1 font-medium">
                    متبقي {(target - value).toLocaleString('en-US')} للوصول للهدف
                </p>
            </div>
        </div>
    );
};

export default PerformanceGauge;
