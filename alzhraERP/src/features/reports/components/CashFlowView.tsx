
import React, { useState, useEffect } from 'react';
import { useCashFlow } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { ArrowDownRight, ArrowUpRight, BarChart3, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';
import { MobileCard } from './MobileComponents';

/** صف التدفق النقدي الشهري كما يعيده `useCashFlow`. */
interface CashFlowRow {
  month: string;
  in: number;
  out: number;
  net: number;
}

const CashFlowView: React.FC = () => {
    const { data, isLoading } = useCashFlow();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20  max-md:p-6   max-md:gap-4">
            <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-lg shadow-blue-500/20" />
            <p className="text-slate-400 font-bold tracking-[0.2em] animate-pulse uppercase text-[10px]">جاري تحليل تدفقات السيولة الذكية...</p>
        </div>
    );

    // Compute latest month stats from trend data
    const trend = data?.monthlyTrend || [];
    const latestMonth = trend.length > 0 ? trend[trend.length - 1] : null;
    const monthlyIn = latestMonth?.in || 0;
    const monthlyOut = latestMonth?.out || 0;

    const columns = [
        { header: 'الشهر', accessor: (row: CashFlowRow) => <span className="font-bold text-slate-700 dark:text-slate-200">{row.month}</span> },
        { header: 'الوارد', accessor: (row: CashFlowRow) => <span dir="ltr" className="font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">{formatCurrency(row.in)}</span>, className: 'text-left' },
        { header: 'الصادر', accessor: (row: CashFlowRow) => <span dir="ltr" className="font-bold font-mono text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">{formatCurrency(row.out)}</span>, className: 'text-left' },
        { header: 'الصافي', accessor: (row: CashFlowRow) => <span dir="ltr" className={`font-bold font-mono px-3 py-1 rounded-full ${row.net >= 0 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'}`}>{formatCurrency(row.net)}</span>, className: 'text-left' },
    ];

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12   max-md:gap-4 sm:gap-6">
                {/* Main Stats Bento Section */}
                <div className="lg:col-span-4 space-y-4 sm:space-y-6">
                    {/* Primary Liquidity Card */}
                    <MobileCard padding="lg" className="bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden shadow-2xl border-none min-h-[220px] sm:min-h-[280px] flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-48 h-48 sm:w-80 sm:h-80 bg-blue-600/10 rounded-full blur-[60px] sm:blur-[100px] -mr-24 -mt-24 sm:-mr-40 sm:-mt-40 transition-all duration-1000" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-40 sm:h-40 bg-emerald-500/5 rounded-full blur-[40px] sm:blur-[60px] -ml-12 -mb-12 sm:-ml-20 sm:-mb-20" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-1">السيولة النقدية الحالية</p>
                                    <h2 dir="ltr" className="text-3xl max-md:text-xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tighter drop-shadow-2xl">
                                        {formatCurrency(data?.currentLiquidity || 0)}
                                    </h2>
                                </div>
                                <ShareButton
                                    size="md"
                                    eventType="cash_flow"
                                    title="مشاركة تقرير السيولة"
                                    className="bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl   max-md:p-2 sm:p-3 border border-white/10 transition-all backdrop-blur-md"
                                    message={`💰 تقرير السيولة النقدية - الزهراء سمارت\n━━━━━━━━━━━━━━\n🏦 إجمالي النقد المتاح: ${formatCurrency(data?.currentLiquidity || 0)}\n\n📊 التدفق الشهري الأخير:\n  • الوارد: ${formatCurrency(monthlyIn)}\n  • الصادر: ${formatCurrency(monthlyOut)}\n  • الصافي: ${formatCurrency(monthlyIn - monthlyOut)}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA-u-nu-latn')}`}
                                />
                            </div>
                        </div>

                        <div className="flex   max-md:gap-3 sm:gap-4 relative z-10">
                            <div className="flex-1 bg-white/5 border border-white/5 backdrop-blur-xl transition-all duration-500 hover:bg-white/10 group/item rounded-xl sm:rounded-3xl   max-md:p-3 sm:p-4">
                                <div className="  max-md:p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg sm:rounded-xl w-fit mb-1.5 sm:mb-2 group-hover/item:scale-110 transition-transform">
                                    <ArrowUpRight size={14} className="text-emerald-400" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">وارد الشهر</span>
                                <span dir="ltr" className="text-xs sm:text-sm font-bold font-mono text-emerald-400">{formatCurrency(monthlyIn)}</span>
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/5 backdrop-blur-xl transition-all duration-500 hover:bg-white/10 group/item rounded-xl sm:rounded-3xl   max-md:p-3 sm:p-4">
                                <div className="  max-md:p-1.5 sm:p-2 bg-rose-500/20 rounded-lg sm:rounded-xl w-fit mb-1.5 sm:mb-2 group-hover/item:scale-110 transition-transform">
                                    <ArrowDownRight size={14} className="text-rose-400" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">صادر الشهر</span>
                                <span dir="ltr" className="text-xs sm:text-sm font-bold font-mono text-rose-400">{formatCurrency(monthlyOut)}</span>
                            </div>
                        </div>
                    </MobileCard>

                    <MobileCard padding="none" className="overflow-hidden shadow-xl">
                        <div className="  max-md:p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700/50 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ملخص التدفقات الشهرية</span>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <div className="overflow-x-auto">
                            <ExcelTable columns={columns} data={trend} colorTheme="blue" />
                        </div>
                    </MobileCard>
                </div>

                {/* Chart Area Bento Section */}
                <MobileCard padding="none" className="lg:col-span-8 border-none shadow-2xl relative group overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-30" />

                    <div className="  max-md:p-4 sm:p-6 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center   max-md:gap-4 sm:gap-6 mb-6 max-md:mb-3 sm:mb-12 relative z-10">
                        <div>
                            <div className="flex items-center   max-md:gap-3 sm:gap-4 mb-1 sm:mb-2">
                                <div className="  max-md:p-2 sm:p-3 bg-blue-500 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/30">
                                    <BarChart3 size={20} />
                                </div>
                                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    ديناميكية التدفق النقدي
                                </h3>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">تحليل استراتيجي لمسار السيولة التشغيلية</p>
                        </div>

                        <div className="flex   max-md:gap-1.5 sm:gap-2   max-md:p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center   max-md:gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">المقبوضات</span>
                            </div>
                            <div className="flex items-center   max-md:gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 opacity-60" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">المدفوعات</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 h-[250px] sm:h-[300px] md:h-[400px] relative z-10 px-2 sm:px-4 md:px-10">
                        {isMounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.monthlyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="flowIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="flowOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'medium' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '6 6' }}
                                        content={({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white/95 dark:bg-slate-900/95   max-md:p-4 sm:p-6 shadow-2xl min-w-[180px] sm:min-w-[220px]">
                                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{label}</span>
                                                            <Clock size={12} className="text-slate-300" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center   max-md:gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تدفقات واردة</span>
                                                                </div>
                                                                <span className="text-sm font-bold text-emerald-600 font-mono italic">
                                                                    {formatCurrency(payload[0].value)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                                                <div className="flex items-center   max-md:gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تدفقات صادرة</span>
                                                                </div>
                                                                <span className="text-sm font-bold text-rose-600 font-mono italic">
                                                                    {formatCurrency(payload[1].value)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="in"
                                        stroke="#10b981"
                                        fillOpacity={1}
                                        fill="url(#flowIn)"
                                        strokeWidth={3}
                                        animationDuration={2000}
                                        dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#10b981' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="out"
                                        stroke="#f43f5e"
                                        fillOpacity={1}
                                        fill="url(#flowOut)"
                                        strokeWidth={2}
                                        strokeDasharray="8 8"
                                        animationDuration={2500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full bg-slate-50/50 dark:bg-slate-800/10 animate-pulse rounded-xl sm:rounded-3xl" />
                        )}
                    </div>
                </MobileCard>
            </div>
        </div>
    );
};

export default CashFlowView;
