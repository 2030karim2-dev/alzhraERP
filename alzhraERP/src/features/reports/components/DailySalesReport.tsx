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
import { MobileCard, MobileSectionTitle, ResponsiveGrid, MobileEmptyState } from './MobileComponents';

/** فاتورة يومية كما تُستقبل من `getDailySalesInvoices`. */
interface DailyInvoice {
  issue_date?: string;
  invoice_number?: string;
  type?: string;
  status?: string;
  total_amount?: number | null;
  paid_amount?: number | null;
  exchange_rate?: number | null;
  parties?: { name?: string | null } | null;
}

/** صف الفاتورة المعروض في الجدول (مع المبلغ المحوَّل للعملة الأساسية). */
interface DailyInvoiceRow extends DailyInvoice {
  converted_amount?: number;
}

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
            (invoices || []).forEach((inv: DailyInvoice) => {
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
                invoices: (invoices || []).map((inv: DailyInvoice) => ({
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
            accessor: (row: DailyInvoiceRow) => <span className="font-bold text-gray-800 dark:text-slate-100 text-[10px]">{row.invoice_number || '---'}</span>,
            width: '120px',
        },
        {
            header: 'التاريخ',
            accessor: (row: DailyInvoiceRow) => <span className="text-[10px] text-gray-500 font-mono">{row.issue_date?.split('T')[0] || row.issue_date}</span>,
            width: '100px',
        },
        {
            header: 'العميل',
            accessor: (row: DailyInvoiceRow) => <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300">{row.parties?.name || '---'}</span>,
        },
        {
            header: 'النوع',
            accessor: (row: DailyInvoiceRow) => (
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
            accessor: (row: DailyInvoiceRow) => (
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
            accessor: (row: DailyInvoiceRow) => (
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

    if (isLoading) return <div className="p-10  max-md:p-5 text-center animate-pulse text-slate-400 text-sm">جاري تحليل بيانات المبيعات...</div>;

    if (!data || data.invoices.length === 0) {
        return (
            <div className="space-y-3">
                <MobileSectionTitle title="تقرير المبيعات اليومي" icon={<BarChart3 size={16} className="text-blue-600" />} />
                <MobileEmptyState title="لا توجد مبيعات" description="لا توجد فواتير مبيعات في الفترة المحددة" />
            </div>
        );
    }

    const displayInvoices = showAllInvoices ? data?.invoices : data?.invoices.slice(0, 10);

    return (
        <div className="space-y-3">
            {/* Period Selector */}
            <div className="flex items-center   max-md:gap-2 justify-between">
                <MobileSectionTitle title="تقرير المبيعات اليومي" icon={<BarChart3 size={16} className="text-blue-600" />} />
                <div className="flex   max-md:gap-1 flex-shrink-0">
                    {[7, 14, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={cn(
                                "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 min-h-[36px]",
                                days === d
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200"
                            )}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <ResponsiveGrid cols={4}>
                <StatCard title="مبيعات اليوم" value={formatCurrency(data?.todaySales.total || 0)} icon={Calendar} colorClass="text-blue-500" iconBgClass="bg-blue-500" />
                <StatCard title="فواتير اليوم" value={String(data?.todaySales.count || 0)} icon={ShoppingCart} colorClass="text-indigo-500" iconBgClass="bg-indigo-500" />
                <StatCard title={`إجمالي ${days} يوم`} value={formatCurrency(data?.totalSales || 0)} icon={TrendingUp} colorClass="text-emerald-500" iconBgClass="bg-emerald-500" />
                <StatCard title="متوسط يومي" value={formatCurrency(data?.avgDaily || 0)} icon={BarChart3} colorClass="text-amber-500" iconBgClass="bg-amber-500" />
            </ResponsiveGrid>

            {/* Chart */}
            {(data?.dailyData.length || 0) > 0 && (
                <MobileCard padding="sm">
                    <h4 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sm:mb-3">اتجاه المبيعات اليومي</h4>
                    <div className="w-full h-[180px] sm:h-[220px]">
                        {isMounted && (
                            <ResponsiveContainer key="daily-sales-chart" width="100%" height="100%" minWidth={1} debounce={1} minHeight={1}>
                                <BarChart data={data?.dailyData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(value: number | string) => [formatCurrency(Number(value) || 0), 'المبيعات']}
                                        labelFormatter={(label) => `التاريخ: ${label}`}
                                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                    />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} minPointSize={1} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </MobileCard>
            )}

            {/* Invoices Table */}
            <MobileCard padding="none">
                <div className="  max-md:p-3 sm:p-4 border-b dark:border-slate-800 flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/20">
                    <h4 className="font-bold text-[10px] sm:text-xs text-blue-600 uppercase flex items-center   max-md:gap-2">
                        <ShoppingCart size={12} /> آخر الفواتير ({data?.totalInvoices || 0})
                    </h4>
                    <ShareButton
                        size="sm"
                        eventType="daily_sales"
                        title="مشاركة تقرير المبيعات"
                        message={`📊 تقرير المبيعات اليومي\n━━━━━━━━━━━━━━\n📅 مبيعات اليوم: ${formatCurrency(data?.todaySales.total || 0)} (${data?.todaySales.count || 0} فاتورة)\n💰 إجمالي ${days} يوم: ${formatCurrency(data?.totalSales || 0)}\n📈 متوسط يومي: ${formatCurrency(data?.avgDaily || 0)}`}
                    />
                </div>
                <div className="overflow-x-auto -mx-1">
                    <div className="px-1">
                        <ExcelTable columns={columns} data={displayInvoices || []} colorTheme="blue" isRTL />
                    </div>
                </div>
                {(data?.invoices.length || 0) > 10 && (
                    <button
                        onClick={() => setShowAllInvoices(!showAllInvoices)}
                        className="w-full   max-md:p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center   max-md:gap-1 border-t dark:border-slate-800 active:scale-[0.98] transition-all"
                    >
                        {showAllInvoices ? <><ChevronUp size={12} /> إخفاء</> : <><ChevronDown size={12} /> عرض الكل ({data?.invoices.length})</>}
                    </button>
                )}
            </MobileCard>
        </div>
    );
};

export default DailySalesReport;
