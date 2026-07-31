import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Receipt, DollarSign, Tag, Activity, PieChart as PieIcon, Wallet, TrendingUp, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { Expense } from '../types';
import { useExpenseAnalytics } from '../hooks/useExpenseAnalytics';
import { useThemeStore } from '@/lib/themeStore';
import { cn } from '@/core/utils';

interface ExpensesAnalyticsViewProps {
    expenses: Expense[];
}

const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'];

const ExpensesAnalyticsView: React.FC<ExpensesAnalyticsViewProps> = ({ expenses }) => {
    const analytics = useExpenseAnalytics(expenses);
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    return (
        <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Expenses */}
                <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-rose-500/30 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                    <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:rotate-12 transition-transform duration-500">
                        <Receipt size={60} />
                    </div>
                    <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] mb-3">إجمالي المصروفات</p>
                    <h2 dir="ltr" className="text-3xl font-bold font-mono tracking-tighter mb-1">{formatCurrency(analytics.totalAmount)}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-bold">{analytics.count} عملية دفع</span>
                    </div>
                </div>

                {/* Average */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-orange-500/30 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                    <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:rotate-12 transition-transform duration-500">
                        <DollarSign size={60} />
                    </div>
                    <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] mb-3">متوسط المصروف</p>
                    <h2 dir="ltr" className="text-3xl font-bold font-mono tracking-tighter mb-1">{formatCurrency(analytics.avgAmount)}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-bold">لكل فاتورة</span>
                    </div>
                </div>

                {/* Categories */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                    <div className="absolute bottom-0 right-0 p-6 opacity-5 transform group-hover:-translate-y-2 transition-transform duration-500">
                        <Tag size={80} className="text-purple-500" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">عدد التصنيفات</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter">{analytics.categoryData.length}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="text-[10px] bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1 rounded-full font-bold uppercase">Active Categories</span>
                    </div>
                </div>

                {/* Highest Category */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                    <div className="absolute bottom-0 right-0 p-6 opacity-5 transform group-hover:-translate-y-2 transition-transform duration-500">
                        <TrendingUp size={80} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">أعلى تصنيف إنفاق</p>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate border-b-2 border-emerald-500/20 pb-2 mb-2">
                        {analytics.categoryData[0]?.name || '---'}
                    </h2>
                    <p className="text-sm font-bold text-emerald-500 font-mono" dir="ltr">
                        {analytics.categoryData[0] ? formatCurrency(analytics.categoryData[0].amount) : ''}
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="p-2 bg-rose-500/10 rounded-xl">
                                    <Activity size={16} className="text-rose-500" />
                                </div>
                                اتجاه المصروفات
                            </h4>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <Calendar size={14} className="text-slate-400" />
                        </div>
                    </div>

                    <div className="h-[280px] relative">
                        <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
                            <AreaChart data={analytics.chartData}>
                                <defs>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
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
                                    cursor={{ stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '4 4' }}
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
                                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {new Date(payload[0].payload.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-2xl font-bold text-rose-500 font-mono tracking-tighter">
                                                            {formatCurrency(payload[0].value)}
                                                        </p>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 mt-1 font-bold italic">
                                                        {payload[0].payload.count} عملية إنفاق مسجلة
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
                                    stroke="#f43f5e"
                                    strokeWidth={4}
                                    fill="url(#colorExpense)"
                                    animationDuration={2500}
                                    animationEasing="ease-in-out"
                                    activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-xl">
                                    <PieIcon size={16} className="text-purple-500" />
                                </div>
                                تحليل التصنيفات
                            </h4>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <Filter size={14} className="text-slate-400" />
                        </div>
                    </div>

                    <div className="h-[200px] mb-8">
                        <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
                            <PieChart>
                                <Pie
                                    data={analytics.categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="amount"
                                    nameKey="name"
                                    animationDuration={1500}
                                >
                                    {analytics.categoryData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className={cn(
                                                    "p-4 rounded-3xl border shadow-2xl backdrop-blur-xl",
                                                    isDark ? "bg-slate-900/80 border-slate-700/50" : "bg-white/90 border-slate-200/50"
                                                )}>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{payload[0].name}</p>
                                                    <p className="text-lg font-bold font-mono" style={{ color: payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {analytics.categoryData.slice(0, 4).map((cat, index) => (
                            <div key={cat.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-purple-500/30 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.5)]" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">{cat.name}</span>
                                </div>
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-100 font-mono tracking-tighter" dir="ltr">{formatCurrency(cat.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Payment Methods Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Wallet size={16} className="text-blue-500" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">توزيع طرق الدفع</h4>
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={1}>
                        <BarChart data={analytics.paymentData} layout="vertical" margin={{ left: 30, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'black' }}
                                width={80}
                            />
                            <Tooltip
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className={cn(
                                                "p-4 rounded-3xl border shadow-2xl backdrop-blur-xl",
                                                isDark ? "bg-slate-900/80 border-slate-700/50" : "bg-white/90 border-slate-200/50"
                                            )}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{payload[0].payload.name}</p>
                                                <p className="text-lg font-bold text-blue-500 font-mono">{formatCurrency(payload[0].value)}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="amount" radius={[0, 20, 20, 0]} barSize={32} minPointSize={1}>
                                {analytics.paymentData.map((_entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        className="transition-all duration-500"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ExpensesAnalyticsView;
