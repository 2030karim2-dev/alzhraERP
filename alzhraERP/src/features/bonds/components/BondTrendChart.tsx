import React from 'react';
import { Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatCurrency } from '../../../core/utils';

interface BondTrendChartProps {
    data: { date: string; amount: number; count: number }[];
    isDark: boolean;
}

const BondTrendChart: React.FC<BondTrendChartProps> = ({ data, isDark }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                    <Activity size={18} className="text-blue-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">تحليل التدفق الزمني</h4>
            </div>
            <div className="h-[280px]">
                <ResponsiveContainer width="100%" height={280} minWidth={100} minHeight={280}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorBond" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                            dy={10}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        />
                        <Tooltip
                            cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' }}
                            content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className={cn(
                                            "p-4 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300",
                                            isDark
                                                ? "bg-slate-900/90 border-slate-700/50 shadow-black/50"
                                                : "bg-white/95 border-slate-200/50 shadow-slate-200/50"
                                        )}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                    {new Date(payload[0].payload.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="flex items-baseline gap-1 py-1">
                                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tracking-tighter">
                                                    {formatCurrency(payload[0].value)}
                                                </p>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">
                                                {payload[0].payload.count} عمليات مسجلة
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#3b82f6"
                            strokeWidth={4}
                            fill="url(#colorBond)"
                            animationDuration={2500}
                            animationEasing="ease-in-out"
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default BondTrendChart;
