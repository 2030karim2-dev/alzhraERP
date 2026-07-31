import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart as RePieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Activity, BrainCircuit } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

interface Props {
    monthlyTrends: any[];
    reasonDistribution: any[];
}

const ReturnsCharts: React.FC<Props> = ({ monthlyTrends, reasonDistribution }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel bento-item p-10 bg-white/40 dark:bg-slate-900/40 border-none shadow-2xl backdrop-blur-3xl overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/50 to-emerald-500/50 opacity-30" />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">تحليل الاتجاه الزمني</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Monthly Flow Dynamics</p>
                    </div>
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <Activity size={18} className="text-rose-500 animate-pulse" />
                    </div>
                </div>
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={1}>
                        <LineChart data={monthlyTrends}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                    color: '#fff'
                                }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                            <Line type="monotone" dataKey="sales" name="SALES" stroke="#f43f5e" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e' }} />
                            <Line type="monotone" dataKey="purchase" name="PURCHASE" stroke="#10b981" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-panel bento-item p-10 bg-white/40 dark:bg-slate-900/40 border-none shadow-2xl backdrop-blur-3xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-purple-500/50 to-blue-500/50 opacity-30" />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">توزيع مسببات الارتجاع</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Causality Distribution Matrix</p>
                    </div>
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <BrainCircuit size={18} className="text-purple-500" />
                    </div>
                </div>
                {reasonDistribution.length > 0 ? (
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={1}>
                            <RePieChart>
                                <Pie
                                    data={reasonDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {reasonDistribution.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="diamond" wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingTop: '20px' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[320px] flex flex-col items-center justify-center text-slate-400 gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-800 border-dashed animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Causality Data Detected</p>
                    </div>
                )}
            </div>

            <div className="glass-panel bento-item p-10 bg-white/40 dark:bg-slate-900/40 border-none shadow-2xl backdrop-blur-3xl relative overflow-hidden group lg:col-span-2 mt-8">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-white mb-1">مقارنة الأداء الشهري</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Cross-Flow Monthly Benchmarking</p>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height={350} minWidth={1} minHeight={1}>
                        <BarChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(51, 65, 85, 0.1)' }}
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff' }}
                            />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: '900' }} />
                            <Bar dataKey="sales" name="Sales Returns" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} minPointSize={1} />
                            <Bar dataKey="purchase" name="Purchase Returns" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} minPointSize={1} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ReturnsCharts;
