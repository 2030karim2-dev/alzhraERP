/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  BarChart2,
  AreaChart as AreaChartIcon,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';
import { cn } from '@/core/utils';

interface SalesByDayPoint {
  date: string;
  sales: number;
  returns?: number;
}

interface SalesTrendChartProps {
  salesByDay: SalesByDayPoint[];
  periodLabel: string;
  formatCurrency: (value: number) => string;
}

type ChartMode = 'area' | 'bar' | 'line' | 'cumulative';

const CustomTooltip = ({ active, payload, label, t, formatCurrency, isCumulative }: any) => {
  if (active && payload?.length) {
    const point = payload[0]?.payload;
    const sales = payload[0]?.value ?? 0;
    const returns = point?.returns ?? 0;
    const net = sales - returns;

    return (
      <div className="min-w-[180px] rounded-2xl border border-indigo-200/60 bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-200 dark:border-indigo-900/60 dark:bg-slate-900/95">
        <p className="mb-2 border-b border-slate-100 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800">
          {label
            ? new Date(label).toLocaleDateString('ar-SA-u-nu-latn', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : ''}
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isCumulative ? 'المبيعات التراكمية' : t.sales}
              </span>
            </div>
            <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(sales)}
            </span>
          </div>

          {!isCumulative && returns > 0 && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.returns}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-rose-500 dark:text-rose-400">
                {formatCurrency(returns)}
              </span>
            </div>
          )}

          {!isCumulative && returns > 0 && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الصافي:</span>
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(net)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  salesByDay,
  periodLabel,
  formatCurrency,
}) => {
  const { dictionary: t } = useI18nStore();
  const [activeChart, setActiveChart] = useState<ChartMode>('area');
  const [showMovingAvg, setShowMovingAvg] = useState(false);
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
    }, 400);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Compute enriched data with cumulative and 7-point moving average
  const enrichedData = useMemo(() => {
    let runningSales = 0;
    let runningReturns = 0;

    return salesByDay.map((pt, idx, arr) => {
      runningSales += pt.sales;
      runningReturns += pt.returns ?? 0;

      const windowStart = Math.max(0, idx - 6);
      const windowSlice = arr.slice(windowStart, idx + 1);
      const movingAvg = windowSlice.reduce((sum, p) => sum + p.sales, 0) / windowSlice.length;

      return {
        ...pt,
        cumulativeSales: runningSales,
        cumulativeReturns: runningReturns,
        movingAvgSales: Math.round(movingAvg),
      };
    });
  }, [salesByDay]);

  const commonProps = {
    data: enrichedData,
    margin: { top: 15, right: 10, left: -15, bottom: 0 },
    style: { cursor: 'pointer' } as React.CSSProperties,
  };

  const xAxis = (
    <XAxis
      dataKey="date"
      axisLine={false}
      tickLine={false}
      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
      tickFormatter={value => {
        const d = new Date(value);
        return isNaN(d.getTime())
          ? value
          : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      }}
      dy={8}
    />
  );

  const yAxis = (
    <YAxis
      tick={{ fontSize: 10, fill: '#94a3b8' }}
      axisLine={false}
      tickLine={false}
      width={45}
      tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
    />
  );

  const tooltip = (
    <Tooltip
      content={
        <CustomTooltip
          t={t}
          formatCurrency={formatCurrency}
          isCumulative={activeChart === 'cumulative'}
        />
      }
      cursor={{
        stroke: 'rgba(99, 102, 241, 0.2)',
        strokeWidth: 2,
        fill: 'rgba(99, 102, 241, 0.05)',
      }}
    />
  );

  const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />;

  const renderChart = () => {
    switch (activeChart) {
      case 'cumulative':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="cumSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              type="monotone"
              dataKey="cumulativeSales"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#cumSalesGrad)"
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#8b5cf6' }}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id="barSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar
              dataKey="sales"
              fill="url(#barSalesGrad)"
              radius={[6, 6, 0, 0]}
              barSize={20}
              minPointSize={2}
            />
            <Bar dataKey="returns" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={8} opacity={0.5} />
            {showMovingAvg && (
              <Line
                type="monotone"
                dataKey="movingAvgSales"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            )}
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
              strokeWidth={3}
              dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 3.5 }}
              activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3, fill: '#3b82f6' }}
            />
            <Line
              type="monotone"
              dataKey="returns"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            {showMovingAvg && (
              <Line
                type="monotone"
                dataKey="movingAvgSales"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        );

      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
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
              fill="url(#salesGrad)"
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#3b82f6' }}
            />
            <Area
              type="monotone"
              dataKey="returns"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={0.06}
              fill="#f43f5e"
            />
            {showMovingAvg && (
              <Line
                type="monotone"
                dataKey="movingAvgSales"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            )}
          </AreaChart>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 lg:col-span-2">
      {/* Chart Control Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Activity size={16} />
            </div>
            <h4 className="text-base font-black tracking-tight text-slate-800 dark:text-white">
              {t.sales_trend}
            </h4>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            مسار المبيعات والمردودات عبر {periodLabel}
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Moving Average Toggle */}
          <button
            onClick={() => {
              setShowMovingAvg(!showMovingAvg);
            }}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-all',
              showMovingAvg
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
            )}
            title="تفعيل المتوسط المتحرك الذكي لتنعيم القمم والانخفاضات"
          >
            <Sparkles size={13} className={showMovingAvg ? 'text-emerald-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">متوسط متحرك</span>
          </button>

          {/* Mode Tabs */}
          <div className="flex rounded-xl border border-slate-200/70 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-800/60">
            <button
              onClick={() => {
                setActiveChart('area');
              }}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-all',
                activeChart === 'area'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              )}
              title="رسم مساحي"
            >
              <AreaChartIcon size={15} />
            </button>
            <button
              onClick={() => {
                setActiveChart('bar');
              }}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-all',
                activeChart === 'bar'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              )}
              title="رسم بالأعمدة"
            >
              <BarChart2 size={15} />
            </button>
            <button
              onClick={() => {
                setActiveChart('line');
              }}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-all',
                activeChart === 'line'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              )}
              title="مسار خطي"
            >
              <TrendingUp size={15} />
            </button>
            <button
              onClick={() => {
                setActiveChart('cumulative');
              }}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-all',
                activeChart === 'cumulative'
                  ? 'bg-white text-purple-600 shadow-sm dark:bg-slate-700 dark:text-purple-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              )}
              title="المنحنى التراكمي للإيراد"
            >
              <Layers size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Telemetry Indicators */}
      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {activeChart === 'cumulative' ? 'التراكمي' : t.sales}
        </span>
        {activeChart !== 'cumulative' && (
          <span className="flex items-center gap-1.5 font-bold">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {t.returns}
          </span>
        )}
        {showMovingAvg && (
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            المتوسط المتحرك (7 أيام)
          </span>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="mt-3 h-72 w-full" dir="ltr">
        {isMounted ? (
          <ResponsiveContainer width="99%" height={280} minWidth={1} minHeight={1}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] w-full animate-pulse rounded-xl bg-slate-50 dark:bg-slate-800/40" />
        )}
      </div>
    </div>
  );
};

export default SalesTrendChart;
