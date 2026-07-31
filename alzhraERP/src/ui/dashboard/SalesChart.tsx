
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useThemeStore } from '../../lib/themeStore';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '../../core/utils';

interface SalesChartProps {
  data: { name: string; sales: number; date?: string }[];
  showPeriodSelector?: boolean;
  onPeriodChange?: (period: string) => void;
}

type PeriodType = 'today' | 'week' | 'month' | 'year';

const SalesChart: React.FC<SalesChartProps> = ({
  data,
  showPeriodSelector = false,
  onPeriodChange
}) => {
  const { theme, accentColor } = useThemeStore();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<PeriodType>('week');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);

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

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, average: 0, highest: 0, trend: 0 };
    }

    const total = data.reduce((sum, d) => sum + (d.sales || 0), 0);
    const average = total / data.length;
    const highest = Math.max(...data.map(d => d.sales || 0));

    // Calculate trend (compare last value to average)
    const lastValue = data[data.length - 1]?.sales || 0;
    const trend = average > 0 ? ((lastValue - average) / average) * 100 : 0;

    return { total, average, highest, trend };
  }, [data]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const periodLabels: Record<PeriodType, string> = {
    today: 'اليوم',
    week: 'أسبوع',
    month: 'شهر',
    year: 'سنة'
  };

  return (
    <div className="flex flex-col h-full">
      {/* Period Selector */}
      {showPeriodSelector && (
        <div className="flex items-center gap-1.5 mb-5 bg-[var(--app-surface)] dark:bg-slate-800/50 p-1 rounded-xl w-fit">
          <Calendar size={14} className="text-[var(--app-text-secondary)] ml-2" />
          {(['today', 'week', 'month', 'year'] as PeriodType[]).map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={cn(
                "px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-300",
                period === p
                  ? "bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm"
                  : "text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div 
        ref={containerRef}
        className="flex-1 h-[220px] min-h-[220px] w-full relative group overflow-hidden" 
        dir="ltr"
      >
        {/* Decorative background glow */}
        <div
          className="absolute inset-x-0 bottom-0 h-32 opacity-20 transition-opacity duration-700 pointer-events-none rounded-b-3xl"
          style={{ background: `linear-gradient(to top, ${accentColor}30, transparent)` }}
        />
        {isMounted ? (
          <ResponsiveContainer width="99%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradientMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
                </linearGradient>
                <filter id="shadowMain" height="150%">
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
              <CartesianGrid
                strokeDasharray="4 4"
                stroke={isDark ? '#334155' : '#e2e8f0'}
                vertical={false}
                opacity={0.4}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                dy={10}
                minTickGap={30}
              />
              <YAxis
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(12px)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '16px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
                formatter={(value) => [
                  <span key="val" className="font-mono tracking-tight text-sm font-bold mx-2" style={{ color: accentColor }}>
                    {formatNumber(Number(value) || 0)}
                  </span>,
                  <span key="lbl" className="text-xs font-bold text-[var(--app-text-secondary)]">المبيعات</span>
                ]}
                labelStyle={{ fontWeight: 'black', marginBottom: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', paddingBottom: '4px', fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}
                cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', strokeWidth: 2, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={accentColor}
                strokeWidth={4}
                fill="url(#salesGradientMain)"
                filter="url(#shadowMain)"
                activeDot={{ r: 8, stroke: accentColor, strokeWidth: 2, fill: isDark ? '#1e293b' : '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full bg-slate-50/50 dark:bg-slate-800/10 animate-pulse rounded-2xl" />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <p className="text-[8px] font-semibold text-[var(--app-text-secondary)] uppercase">الإجمالي</p>
          <p className="text-sm font-bold text-[var(--app-text)] font-mono">
            {formatNumber(stats.total)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-semibold text-[var(--app-text-secondary)] uppercase">المتوسط</p>
          <p className="text-sm font-bold text-[var(--app-text)] font-mono">
            {formatNumber(stats.average)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-semibold text-[var(--app-text-secondary)] uppercase">الأعلى</p>
          <p className="text-sm font-bold text-[var(--app-text)] font-mono">
            {formatNumber(stats.highest)}
          </p>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className={cn(
        "flex items-center justify-center gap-1 mt-2 py-1 px-2 rounded-full text-[10px] font-bold w-fit mx-auto",
        stats.trend >= 0
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
          : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
      )}>
        {stats.trend >= 0 ? (
          <TrendingUp size={12} />
        ) : (
          <TrendingDown size={12} />
        )}
        <span>{Math.abs(stats.trend).toFixed(1)}% من المتوسط</span>
      </div>
    </div>
  );
};

export default SalesChart;
