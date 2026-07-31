
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePurchasesAnalytics } from '../../hooks';
import { Loader2, TrendingDown, Users } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl transition-all duration-200">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tight border-b border-slate-100 dark:border-slate-800 pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{entry.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono font-mono">
                            {formatCurrency(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const PurchasesAnalytics: React.FC = () => {
    const { data: analytics, isLoading } = usePurchasesAnalytics();

    if (isLoading || !analytics) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-slate-500 font-bold tracking-wide">جاري تحليل بيانات المشتريات...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Suppliers Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Users size={18} className="text-blue-500" />
                        </div>
                        أفضل الموردين (حسب القيمة)
                    </h3>
                    <div className="h-72 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
                            <BarChart data={analytics.topSuppliers} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <defs>
                                    <linearGradient id="supplierGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                                <Bar dataKey="value" name="إجمالي المشتريات" fill="url(#supplierGradient)" radius={[0, 10, 10, 0]} barSize={24} minPointSize={1} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Purchase Trend Chart */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                                <TrendingDown size={18} className="text-emerald-500 rotate-180" />
                            </div>
                            حجم التوريد اليومي
                        </h3>
                    </div>
                    <div className="h-72 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
                            <BarChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                                />
                                <Tooltip
                                    content={({ active, payload, label }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl transition-all duration-300">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest leading-none border-b border-slate-100 dark:border-slate-800 pb-2">
                                                        {new Date(label).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                    <div className="flex flex-col gap-1 py-1">
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">قيمة التوريدات</span>
                                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter">
                                                            {formatCurrency(payload[0].value)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                                />
                                <Bar dataKey="amount" name="القيمة" fill="url(#trendGradient)" radius={[10, 10, 0, 0]} barSize={32} animationDuration={2500} minPointSize={1} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchasesAnalytics;
