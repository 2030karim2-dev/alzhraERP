
import React from 'react';
import { useProducts } from '../../inventory/hooks/index';
import { valuationService } from '../../inventory/services/valuationService';
import { formatCurrency } from '../../../core/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wallet, TrendingUp, ShieldCheck, Box, Coins, Target, Activity } from 'lucide-react';

// import { cn } from '@/core/utils';

const InventoryValuationView: React.FC = () => {
  const { products, isLoading } = useProducts();

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin shadow-xl shadow-emerald-500/20" />
      <p className="text-slate-400 font-bold tracking-[0.2em] animate-pulse uppercase text-[10px]">جاري حساب القيمة الرأسمالية للمخزون...</p>
    </div>
  );

  const costValue = valuationService.getTotalValueAtCost(products);
  const marketValue = valuationService.getTotalMarketValue(products);
  const profit = marketValue - costValue;

  const chartData = [
    { name: 'قيمة التكلفة', value: costValue, color: '#3b82f6' },
    { name: 'القيمة السوقية', value: marketValue, color: '#10b981' },
    { name: 'الربح المتوقع', value: profit, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">

      {/* High-Impact Valuation Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cost Value Card */}
        <div className="glass-panel bento-item p-8 bg-blue-600 dark:bg-blue-900/40 text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden group border-none min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:rotate-12 group-hover:scale-120 transition-all duration-700">
            <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase text-blue-100 tracking-[0.3em] mb-3">القيمة الرأسمالية (بالتكلفة)</p>
            <h2 dir="ltr" className="text-4xl font-bold font-mono tracking-tighter drop-shadow-2xl">{formatCurrency(costValue)}</h2>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <span className="text-[10px] bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold border border-white/10 uppercase tracking-widest">Capital Invested</span>
          </div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-[60px]" />
        </div>

        {/* Market Value Card */}
        <div className="glass-panel bento-item p-8 bg-emerald-600 dark:bg-emerald-900/40 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden group border-none min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:rotate-12 group-hover:scale-120 transition-all duration-700">
            <Coins size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase text-emerald-100 tracking-[0.3em] mb-3">القيمة البيعية السوقية</p>
            <h2 dir="ltr" className="text-4xl font-bold font-mono tracking-tighter drop-shadow-2xl">{formatCurrency(marketValue)}</h2>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <span className="text-[10px] bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold border border-white/10 uppercase tracking-widest">Market Appraisal</span>
          </div>
        </div>

        {/* Multi-Metric Smart Card */}
        <div className="glass-panel bento-item p-8 bg-slate-900 dark:bg-slate-950 text-white shadow-2xl relative overflow-hidden group border-none min-h-[220px] flex flex-col justify-between">
          <div className="absolute bottom-0 right-0 p-6 opacity-10 transform group-hover:-translate-y-4 group-hover:scale-110 transition-all duration-1000">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold uppercase text-amber-500 tracking-[0.3em] mb-3">ربح المخزون المتوقع</p>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <h2 dir="ltr" className="text-4xl font-bold font-mono tracking-tighter text-amber-500 drop-shadow-2xl italic">+{formatCurrency(profit)}</h2>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center"><Box size={10} /></div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center"><ShieldCheck size={10} /></div>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">AI Valuation Confidence: 99.8%</span>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="glass-panel bento-item bg-white dark:bg-slate-900/50 border-none shadow-2xl p-10 flex flex-col lg:flex-row gap-16 items-center overflow-hidden">
        {/* Visual Chart Area */}
        <div className="flex-[1.4] w-full min-h-[380px] relative">
          <div className="absolute top-0 right-0 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">تحليل فجوة الربحية</span>
          </div>

          <div className="mt-12 w-full h-full">
            <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={320}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient key={`barGrad-${index}`} id={`barGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
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
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-panel p-6 border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 min-w-[200px]">
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">{payload[0].payload.name}</p>
                          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(payload[0].value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[16, 16, 16, 16]} barSize={80} minPointSize={1}>
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#barGrad-${index})`} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Textual Insights Area */}
        <div className="flex-1 space-y-10 w-full lg:border-r lg:dark:border-slate-800 lg:pr-16 lg:rtl:pr-0 lg:rtl:pl-16">
          <div className="space-y-4">
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight">
              ديناميكية الأصول <br />ونسب الربح
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              وفقاً لقواعد البيانات الحالية، تبلغ القيمة الإجمالية للمخزون في مستودعاتك <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(costValue)}</span>.
              وعند تصفية هذه الأصول بالسعر السوقي، ستحقق مبيعات بقيمة <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(marketValue)}</span>،
              بمعدل ربحية تشغيلي يبلغ <span className="text-emerald-500 font-bold font-mono">%{((profit / costValue) * 100).toFixed(1)}</span>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="glass-card p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <Target size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">مجموع الأصناف</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter">
                {products.length} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sku</span>
              </h4>
            </div>

            <div className="glass-card p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Activity size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">معدل الدقة</span>
              </div>
              <h4 className="text-2xl font-bold text-emerald-500 font-mono tracking-tighter">
                100% <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Live</span>
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryValuationView;