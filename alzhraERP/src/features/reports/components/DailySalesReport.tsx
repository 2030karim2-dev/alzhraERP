import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { formatCurrency, cn } from '../../../core/utils';
import { BarChart3, TrendingUp, ShoppingCart, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../../../ui/common/StatCard';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';

const useDailySalesReport = (days: number = 30) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['daily_sales_report', user?.company_id, days],
        queryFn: async () => {
            if (!user?.company_id) return null;
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);

            const { data: invoices, error } = await reportsApi.getDailySalesInvoices(user.company_id, fromDate.toISOString().split('T')[0]);

            if (error) throw error;

            // Group by date and handle currency conversion + returns
            const dailyMap: Record<string, { date: string; total: number; count: number }> = {};
            (invoices || []).forEach((inv: any) => {
                const date = inv.issue_date?.split('T')[0] || inv.issue_date;
                if (!dailyMap[date]) dailyMap[date] = { date, total: 0, count: 0 };

                // Convert to base currency (SAR) using preserved exchange_rate
                const amount = Number(inv.total_amount || 0);
                const rate = Number(inv.exchange_rate || 1);
                const convertedAmount = amount * rate;

                if (inv.type === 'return_sale') {
                    dailyMap[date].total -= convertedAmount;
                    // Usually returns don't count as positive invoice count, or we could handle them differently
                } else {
                    dailyMap[date].total += convertedAmount;
                    dailyMap[date].count += 1;
                }
            });

            const dailyData = Object.values(dailyMap)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(d => ({ ...d, total: Math.max(0, Math.round(d.total * 100) / 100) })); // Round for display and clamp to 0

            const totalSales = dailyData.reduce((s, d) => s + d.total, 0);
            const totalInvoices = dailyData.reduce((s, d) => s + d.count, 0);
            const avgDaily = dailyData.length > 0 ? totalSales / dailyData.length : 0;

            // Today's sales (Using local date to match user expectations)
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const todaySales = dailyMap[today] || { date: today, total: 0, count: 0 };

            return {
                invoices: (invoices || []).map((inv: any) => ({
                    ...inv,
                    // Store converted amount for individual invoice display if needed
                    converted_amount: Number(inv.total_amount || 0) * Number(inv.exchange_rate || 1) * (inv.type === 'return_sale' ? -1 : 1)
                })),
                dailyData,
                totalSales,
                totalInvoices,
                avgDaily,
                todaySales: {
                    ...todaySales,
                    total: Math.round(todaySales.total * 100) / 100
                },
            };
        },
        enabled: !!user?.company_id,
    });
};

const DailySalesReport: React.FC = () => {
    const [days, setDays] = useState(30);
    const [showAllInvoices, setShowAllInvoices] = useState(false);
    const { data, isLoading } = useDailySalesReport(days);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const columns = useMemo(() => [
        {
            header: 'رقم الفاتورة',
            accessor: (row: any) => <span className="font-bold text-gray-800 dark:text-slate-100 text-[10px]">{row.invoice_number || '---'}</span>,
            width: '120px',
        },
        {
            header: 'التاريخ',
            accessor: (row: any) => <span className="text-[10px] text-gray-500 font-mono">{row.issue_date?.split('T')[0] || row.issue_date}</span>,
            width: '100px',
        },
        {
            header: 'العميل',
            accessor: (row: any) => <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300">{(row.parties as any)?.name || '---'}</span>,
        },
        {
            header: 'النوع',
            accessor: (row: any) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                    row.type === 'sale' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                )}>
                    {row.type === 'sale' ? 'بيع' : 'مرتجع'}
                </span>
            ),
            width: '80px',
            align: 'center' as const,
        },
        {
            header: 'المبلغ (ر.س)',
            accessor: (row: any) => (
                <span dir="ltr" className={cn(
                    "font-bold font-mono text-[10px]",
                    row.type === 'sale' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                )}>
                    {formatCurrency(row.converted_amount || 0)}
                </span>
            ),
            width: '120px',
            align: 'center' as const,
        },
        {
            header: 'الحالة',
            accessor: (row: any) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                    row.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                        row.status === 'void' ? 'bg-gray-50 text-gray-700' : 'bg-amber-50 text-amber-700'
                )}>
                    {row.status === 'paid' ? 'مدفوعة' : row.status === 'void' ? 'ملغاة' : row.status === 'partial' ? 'جزئي' : 'معلقة'}
                </span>
            ),
            width: '80px',
            align: 'center' as const,
        },
    ], []);

    if (isLoading) return <div className="p-20 text-center animate-pulse">جاري تحليل بيانات المبيعات...</div>;

    const displayInvoices = showAllInvoices ? data?.invoices : data?.invoices.slice(0, 10);

    return (
        <div className="space-y-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2 justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-600" /> تقرير المبيعات اليومي
                </h3>
                <div className="flex gap-1">
                    {[7, 14, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-bold transition-colors",
                                days === d
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200"
                            )}
                        >
                            {d} يوم
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard title="مبيعات اليوم" value={formatCurrency(data?.todaySales.total || 0)} icon={Calendar} colorClass="text-blue-500" iconBgClass="bg-blue-500" />
                <StatCard title="فواتير اليوم" value={String(data?.todaySales.count || 0)} icon={ShoppingCart} colorClass="text-indigo-500" iconBgClass="bg-indigo-500" />
                <StatCard title={`إجمالي ${days} يوم`} value={formatCurrency(data?.totalSales || 0)} icon={TrendingUp} colorClass="text-emerald-500" iconBgClass="bg-emerald-500" />
                <StatCard title="متوسط يومي" value={formatCurrency(data?.avgDaily || 0)} icon={BarChart3} colorClass="text-amber-500" iconBgClass="bg-amber-500" />
            </div>

            {/* Chart */}
            {(data?.dailyData.length || 0) > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 p-4 shadow-sm">
                    <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">اتجاه المبيعات اليومي</h4>
                    <div className="w-full h-[220px] relative">
                        {isMounted && (
                            <ResponsiveContainer key="daily-sales-chart" width="100%" height={220} minWidth={1} debounce={1} minHeight={1}>
                                <BarChart data={data?.dailyData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(value: any) => [formatCurrency(Number(value) || 0), 'المبيعات']}
                                        labelFormatter={(label) => `التاريخ: ${label}`}
                                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                    />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} minPointSize={1} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 border-b dark:border-slate-800 flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/20">
                    <h4 className="font-bold text-[9px] text-blue-600 uppercase flex items-center gap-2">
                        <ShoppingCart size={12} /> آخر الفواتير ({data?.totalInvoices || 0})
                    </h4>
                    <ShareButton
                        size="sm"
                        eventType="daily_sales"
                        title="مشاركة تقرير المبيعات"
                        message={`📊 تقرير المبيعات اليومي\n━━━━━━━━━━━━━━\n📅 مبيعات اليوم: ${formatCurrency(data?.todaySales.total || 0)} (${data?.todaySales.count || 0} فاتورة)\n💰 إجمالي ${days} يوم: ${formatCurrency(data?.totalSales || 0)}\n📈 متوسط يومي: ${formatCurrency(data?.avgDaily || 0)}`}
                    />
                </div>
                <div className="p-1">
                    <ExcelTable columns={columns} data={displayInvoices || []} colorTheme="blue" isRTL />
                </div>
                {(data?.invoices.length || 0) > 10 && (
                    <button
                        onClick={() => setShowAllInvoices(!showAllInvoices)}
                        className="w-full p-2 text-center text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center gap-1 border-t dark:border-slate-800"
                    >
                        {showAllInvoices ? <><ChevronUp size={12} /> إخفاء</> : <><ChevronDown size={12} /> عرض الكل ({data?.invoices.length})</>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default DailySalesReport;
