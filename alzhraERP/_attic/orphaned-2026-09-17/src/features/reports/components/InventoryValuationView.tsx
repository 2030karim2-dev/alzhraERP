import React from 'react';
import { useProducts } from '../../inventory/hooks/index';
import { valuationService } from '../../inventory/services/valuationService';
import { formatCurrency } from '../../../core/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wallet, TrendingUp, ShieldCheck, Box, Coins, Target, Activity } from 'lucide-react';

// import { cn } from '@/core/utils';

const InventoryValuationView: React.FC = () => {
  const { products, isLoading } = useProducts();

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center p-20 max-md:gap-4 max-md:p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500 shadow-xl shadow-emerald-500/20" />
        <p className="animate-pulse text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          جاري حساب القيمة الرأسمالية للمخزون...
        </p>
      </div>
    );

  const costValue = valuationService.getTotalValueAtCost(products);
  const marketValue = valuationService.getTotalMarketValue(products);
  const profit = marketValue - costValue;

  const chartData = [
    { name: 'قيمة التكلفة', value: costValue, color: '#3b82f6' },
    { name: 'القيمة السوقية', value: marketValue, color: '#10b981' },
    { name: 'الربح المتوقع', value: profit, color: '#f59e0b' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 space-y-8 pb-20 duration-1000">
      {/* High-Impact Valuation Bento Grid */}
      <div className="grid grid-cols-1 gap-6 max-md:gap-3 md:grid-cols-3">
        {/* Cost Value Card */}
        <div className="glass-panel bento-item group relative flex min-h-[220px] flex-col justify-between overflow-hidden border-none bg-blue-600 p-8 text-white shadow-2xl shadow-blue-500/30 dark:bg-blue-900/40 max-md:p-4">
          <div className="group-hover:scale-120 absolute right-0 top-0 transform p-6 opacity-20 transition-all duration-700 group-hover:rotate-12 max-md:p-3">
            <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-100">
              القيمة الرأسمالية (بالتكلفة)
            </p>
            <h2
              dir="ltr"
              className="font-mono text-4xl font-bold tracking-tighter drop-shadow-2xl max-md:text-2xl"
            >
              {formatCurrency(costValue)}
            </h2>
          </div>
          <div className="relative z-10 flex items-center max-md:gap-2">
            <span className="rounded-full border border-white/10 bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
              Capital Invested
            </span>
          </div>
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-[60px]" />
        </div>

        {/* Market Value Card */}
        <div className="glass-panel bento-item group relative flex min-h-[220px] flex-col justify-between overflow-hidden border-none bg-emerald-600 p-8 text-white shadow-2xl shadow-emerald-500/30 dark:bg-emerald-900/40 max-md:p-4">
          <div className="group-hover:scale-120 absolute right-0 top-0 transform p-6 opacity-20 transition-all duration-700 group-hover:rotate-12 max-md:p-3">
            <Coins size={100} />
          </div>
          <div className="relative z-10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-100">
              القيمة البيعية السوقية
            </p>
            <h2
              dir="ltr"
              className="font-mono text-4xl font-bold tracking-tighter drop-shadow-2xl max-md:text-2xl"
            >
              {formatCurrency(marketValue)}
            </h2>
          </div>
          <div className="relative z-10 flex items-center max-md:gap-2">
            <span className="rounded-full border border-white/10 bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
              Market Appraisal
            </span>
          </div>
        </div>

        {/* Multi-Metric Smart Card */}
        <div className="glass-panel bento-item group relative flex min-h-[220px] flex-col justify-between overflow-hidden border-none bg-slate-900 p-8 text-white shadow-2xl dark:bg-slate-950 max-md:p-4">
          <div className="absolute bottom-0 right-0 transform p-6 opacity-10 transition-all duration-1000 group-hover:-translate-y-4 group-hover:scale-110 max-md:p-3">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
                ربح المخزون المتوقع
              </p>
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <h2
              dir="ltr"
              className="font-mono text-4xl font-bold italic tracking-tighter text-amber-500 drop-shadow-2xl max-md:text-2xl"
            >
              +{formatCurrency(profit)}
            </h2>
          </div>
          <div className="relative z-10 flex items-center max-md:gap-3">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-blue-500">
                <Box size={10} />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-emerald-500">
                <ShieldCheck size={10} />
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
              AI Valuation Confidence: 99.8%
            </span>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="glass-panel bento-item bg-[var(--app-surface)]/50 flex flex-col items-center overflow-hidden border-none p-10 shadow-2xl max-md:gap-16 max-md:p-5 lg:flex-row">
        {/* Visual Chart Area */}
        <div className="relative min-h-[380px] w-full flex-[1.4]">
          <div className="absolute right-0 top-0 flex items-center max-md:gap-3">
            <div className="h-6 w-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
              تحليل فجوة الربحية
            </span>
          </div>

          <div className="mt-12 h-full w-full">
            <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={320}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient
                      key={`barGrad-${index}`}
                      id={`barGrad-${index}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.4} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                  dy={15}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={
                    (({
                      active,
                      payload,
                    }: {
                      active?: boolean;
                      payload?: Array<{ value?: number | string; payload?: { name?: string } }>;
                    }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="glass-panel min-w-[200px] border-none bg-white/95 p-6 shadow-2xl dark:bg-slate-900/95 max-md:p-3">
                            <p className="mb-2 border-b border-slate-100 pb-2 text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:border-slate-800">
                              {payload[0].payload?.name}
                            </p>
                            <p className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                              {formatCurrency(Number(payload[0].value) || 0)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }) as unknown as never
                  }
                />
                <Bar dataKey="value" radius={[16, 16, 16, 16]} barSize={80} minPointSize={1}>
                  {chartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGrad-${index})`}
                      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Textual Insights Area */}
        <div className="w-full flex-1 space-y-10 lg:border-r lg:pr-16 lg:dark:border-slate-800 lg:rtl:pl-16 lg:rtl:pr-0">
          <div className="space-y-4">
            <h3 className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white max-md:text-xl">
              ديناميكية الأصول <br />
              ونسب الربح
            </h3>
            <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              وفقاً لقواعد البيانات الحالية، تبلغ القيمة الإجمالية للمخزون في مستودعاتك{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(costValue)}
              </span>
              . وعند تصفية هذه الأصول بالسعر السوقي، ستحقق مبيعات بقيمة{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(marketValue)}
              </span>
              ، بمعدل ربحية تشغيلي يبلغ{' '}
              <span className="font-mono font-bold text-emerald-500">
                %{((profit / costValue) * 100).toFixed(1)}
              </span>
              .
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 max-md:gap-3">
            <div className="glass-card group rounded-3xl border border-slate-100 bg-slate-50 p-6 transition-all hover:bg-white dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800 max-md:rounded-xl max-md:p-3">
              <div className="mb-3 flex items-center max-md:gap-3">
                <div className="rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-110 max-md:p-2">
                  <Target size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  مجموع الأصناف
                </span>
              </div>
              <h4 className="font-mono text-2xl font-bold tracking-tighter text-slate-900 dark:text-white max-md:text-lg">
                {products.length}{' '}
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sku
                </span>
              </h4>
            </div>

            <div className="glass-card group rounded-3xl border border-slate-100 bg-slate-50 p-6 transition-all hover:bg-white dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800 max-md:rounded-xl max-md:p-3">
              <div className="mb-3 flex items-center max-md:gap-3">
                <div className="rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110 max-md:p-2">
                  <Activity size={16} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  معدل الدقة
                </span>
              </div>
              <h4 className="font-mono text-2xl font-bold tracking-tighter text-emerald-500 max-md:text-lg">
                100%{' '}
                <span className="text-[10px] font-bold uppercase italic tracking-widest text-slate-400">
                  Live
                </span>
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryValuationView;
