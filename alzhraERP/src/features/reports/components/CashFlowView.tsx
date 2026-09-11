import React, { useState, useEffect } from 'react';
import { useCashFlow } from '../hooks';
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import { ArrowDownRight, ArrowUpRight, BarChart3, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';

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
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="border-3 h-8 w-8 animate-spin rounded-full border-slate-200 border-t-blue-500" />
        <p className="mt-3 text-xs font-bold text-slate-400">
          جاري تحليل تدفقات السيولة النقدية...
        </p>
      </div>
    );

  // Compute latest month stats from trend data
  const trend = data?.monthlyTrend || [];
  const latestMonth = trend.length > 0 ? trend[trend.length - 1] : null;
  const monthlyIn = latestMonth?.in || 0;
  const monthlyOut = latestMonth?.out || 0;
  const reportDate = formatLocalDate(new Date());

  const columns = [
    {
      header: 'الشهر',
      accessor: (row: CashFlowRow) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{row.month}</span>
      ),
    },
    {
      header: 'الوارد',
      accessor: (row: CashFlowRow) => (
        <span
          dir="ltr"
          className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:bg-emerald-900/20"
        >
          {formatCurrency(row.in)}
        </span>
      ),
      className: 'text-left',
    },
    {
      header: 'الصادر',
      accessor: (row: CashFlowRow) => (
        <span
          dir="ltr"
          className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-600 dark:bg-rose-900/20"
        >
          {formatCurrency(row.out)}
        </span>
      ),
      className: 'text-left',
    },
    {
      header: 'الصافي',
      accessor: (row: CashFlowRow) => (
        <span
          dir="ltr"
          className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${row.net >= 0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}
        >
          {formatCurrency(row.net)}
        </span>
      ),
      className: 'text-left',
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-6 duration-700">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Main Stats Section */}
        <div className="space-y-4 lg:col-span-4">
          {/* Primary Liquidity Card */}
          <div className="flex min-h-[200px] flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
            <div>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    إجمالي السيولة النقدية الحالية
                  </p>
                  <h2
                    dir="ltr"
                    className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
                  >
                    {formatCurrency(data?.currentLiquidity || 0)}
                  </h2>
                </div>
                <ShareButton
                  size="md"
                  eventType="cash_flow"
                  title="مشاركة تقرير السيولة"
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
                  message={`💰 تقرير السيولة النقدية - الزهراء سمارت\n━━━━━━━━━━━━━━\n🏦 إجمالي النقد المتاح: ${formatCurrency(data?.currentLiquidity || 0)}\n\n📊 التدفق الشهري الأخير:\n  • الوارد: ${formatCurrency(monthlyIn)}\n  • الصادر: ${formatCurrency(monthlyOut)}\n  • الصافي: ${formatCurrency(monthlyIn - monthlyOut)}\n📅 التاريخ: ${reportDate}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--app-border)] pt-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="mb-1 flex items-center gap-1 text-emerald-600">
                  <ArrowUpRight size={14} />
                  <span className="text-[10px] font-bold">وارد الشهر</span>
                </div>
                <span
                  dir="ltr"
                  className="block font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400"
                >
                  {formatCurrency(monthlyIn)}
                </span>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                <div className="mb-1 flex items-center gap-1 text-rose-600">
                  <ArrowDownRight size={14} />
                  <span className="text-[10px] font-bold">صادر الشهر</span>
                </div>
                <span
                  dir="ltr"
                  className="block font-mono text-xs font-bold text-rose-600 dark:text-rose-400"
                >
                  {formatCurrency(monthlyOut)}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ملخص التدفقات الشهرية
              </span>
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <div className="overflow-x-auto">
              <ExcelTable columns={columns} data={trend} colorTheme="blue" />
            </div>
          </div>
        </div>

        {/* Chart Area Section */}
        <div className="flex flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm lg:col-span-8">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-500 p-2 text-white">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  مسار التدفق النقدي
                </h3>
                <p className="text-[10px] font-semibold text-slate-400">
                  مقارنة المقبوضات مقابل المدفوعات عبر الأشهر
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-1 text-xs">
              <div className="flex items-center gap-1.5 rounded bg-[var(--app-surface)] px-2.5 py-1 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  المقبوضات
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  المدفوعات
                </span>
              </div>
            </div>
          </div>

          <div className="h-[260px] w-full flex-1 sm:h-[320px]">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.monthlyTrend || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
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
                    tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                  />
                  <Tooltip
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '6 6' }}
                    content={
                      (({
                        active,
                        payload,
                        label,
                      }: {
                        active?: boolean;
                        payload?: Array<{ value?: number | string }>;
                        label?: string;
                      }) => {
                        if (active && payload?.length) {
                          return (
                            <div className="min-w-[180px] bg-white/95 shadow-2xl dark:bg-slate-900/95 max-md:p-4 sm:min-w-[220px] sm:p-6">
                              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                                  {label}
                                </span>
                                <Clock size={12} className="text-slate-300" />
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center max-md:gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                      تدفقات واردة
                                    </span>
                                  </div>
                                  <span className="font-mono text-sm font-bold italic text-emerald-600">
                                    {formatCurrency(Number(payload[0].value) || 0)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-2 dark:border-slate-800/50">
                                  <div className="flex items-center max-md:gap-2">
                                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                      تدفقات صادرة
                                    </span>
                                  </div>
                                  <span className="font-mono text-sm font-bold italic text-rose-600">
                                    {formatCurrency(Number(payload[1].value) || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }) as unknown as never
                    }
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
              <div className="h-full w-full animate-pulse rounded-xl bg-slate-50/50 dark:bg-slate-800/10 sm:rounded-3xl" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowView;
