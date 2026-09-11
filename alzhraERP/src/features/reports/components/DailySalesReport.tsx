import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { formatCurrency, cn, formatLocalDate, toBaseCurrency } from '../../../core/utils';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../../../ui/common/StatCard';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';
import {
  MobileCard,
  MobileSectionTitle,
  ResponsiveGrid,
  MobileEmptyState,
} from './MobileComponents';

/** فاتورة يومية كما تُستقبل من `getDailySalesInvoices`. */
interface DailyInvoice {
  id?: string;
  issue_date?: string;
  invoice_number?: string | null;
  type?: string;
  status?: string;
  total_amount?: number | null;
  paid_amount?: number | null;
  exchange_rate?: number | null;
  currency_code?: string | null;
  parties?: { name?: string | null } | null;
}

/** صف الفاتورة المعروض في الجدول (مع المبلغ المحوَّل للعملة الأساسية). */
interface DailyInvoiceRow extends DailyInvoice {
  converted_amount?: number;
}

const useDailySalesReport = (days = 30) => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['daily_sales_report', user?.company_id, days],
    queryFn: async () => {
      if (!user?.company_id) return null;
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

      const { data: invoices, error } = await reportsApi.getDailySalesInvoices(
        user.company_id,
        formatLocalDate(fromDate)
      );

      if (error) throw error;

      // Group by date and handle currency conversion + returns
      const dailyMap: Record<string, { date: string; total: number; count: number }> = {};
      (invoices || []).forEach(inv => {
        // استبعاد الفواتير الملغاة أو المسودات لضمان عدم تزييف الإحصائيات
        if (inv.status === 'void' || inv.status === 'draft') return;

        const date = inv.issue_date?.split('T')[0] || inv.issue_date;
        if (!dailyMap[date]) dailyMap[date] = { date, total: 0, count: 0 };

        // التحويل المالي المعتمد للعملة الأساسية (SAR) باستخدام toBaseCurrency
        // لمنع تضخيم العملات ذات المعامل العكسي (مثل الريال اليمني YER)
        const convertedAmount = toBaseCurrency({
          total_amount: inv.total_amount,
          currency_code: inv.currency_code,
          exchange_rate: inv.exchange_rate,
        });

        const isReturn = inv.type === 'sale_return' || inv.type === 'return_sale';
        if (isReturn) {
          dailyMap[date].total -= convertedAmount;
        } else {
          dailyMap[date].total += convertedAmount;
          dailyMap[date].count += 1;
        }
      });

      const dailyData = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({ ...d, total: Math.max(0, Math.round(d.total * 100) / 100) })); // Round for display and clamp to 0

      const totalSales = Math.round(dailyData.reduce((s, d) => s + d.total, 0) * 100) / 100;
      const totalInvoices = dailyData.reduce((s, d) => s + d.count, 0);
      const avgDaily =
        dailyData.length > 0 ? Math.round((totalSales / dailyData.length) * 100) / 100 : 0;

      // Today's sales (Using local date to match user expectations)
      const today = formatLocalDate(now);
      const todaySales = dailyMap[today] || { date: today, total: 0, count: 0 };

      return {
        invoices: (invoices || [])
          .filter(inv => inv.status !== 'void' && inv.status !== 'draft')
          .map(inv => {
            const convertedAmount = toBaseCurrency({
              total_amount: inv.total_amount,
              currency_code: inv.currency_code,
              exchange_rate: inv.exchange_rate,
            });
            const isReturn = inv.type === 'sale_return' || inv.type === 'return_sale';
            return {
              ...inv,
              converted_amount: isReturn ? -convertedAmount : convertedAmount,
            };
          }),
        dailyData,
        totalSales,
        totalInvoices,
        avgDaily,
        todaySales: {
          ...todaySales,
          total: Math.round(todaySales.total * 100) / 100,
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

  const columns = useMemo(
    () => [
      {
        header: 'رقم الفاتورة',
        accessor: (row: DailyInvoiceRow) => (
          <span className="text-xs font-bold text-gray-800 dark:text-slate-100">
            {row.invoice_number || '---'}
          </span>
        ),
        width: '120px',
      },
      {
        header: 'التاريخ',
        accessor: (row: DailyInvoiceRow) => (
          <span className="font-mono text-xs text-gray-500">
            {row.issue_date?.split('T')[0] || row.issue_date}
          </span>
        ),
        width: '100px',
      },
      {
        header: 'العميل',
        accessor: (row: DailyInvoiceRow) => (
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">
            {row.parties?.name || '---'}
          </span>
        ),
      },
      {
        header: 'النوع',
        accessor: (row: DailyInvoiceRow) => {
          const isReturn = row.type === 'sale_return' || row.type === 'return_sale';
          return (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                !isReturn
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
              )}
            >
              {!isReturn ? 'بيع' : 'مرتجع'}
            </span>
          );
        },
        width: '80px',
        align: 'center' as const,
      },
      {
        header: 'المبلغ (ر.س)',
        accessor: (row: DailyInvoiceRow) => {
          const isForeign = row.currency_code && row.currency_code !== 'SAR';
          const isPositive = (row.converted_amount || 0) >= 0;
          return (
            <div className="flex flex-col items-center">
              <span
                dir="ltr"
                className={cn(
                  'font-mono text-xs font-bold',
                  isPositive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                )}
              >
                {formatCurrency(row.converted_amount || 0)}
              </span>
              {isForeign && (
                <span dir="ltr" className="font-mono text-[10px] text-gray-400">
                  ({formatCurrency(Number(row.total_amount) || 0, row.currency_code || undefined)})
                </span>
              )}
            </div>
          );
        },
        width: '130px',
        align: 'center' as const,
      },
      {
        header: 'الحالة',
        accessor: (row: DailyInvoiceRow) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              row.status === 'paid'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : row.status === 'posted'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : row.status === 'void'
                    ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            )}
          >
            {row.status === 'paid'
              ? 'مدفوعة'
              : row.status === 'posted'
                ? 'مرحلة'
                : row.status === 'partially_paid'
                  ? 'جزئي'
                  : row.status === 'void'
                    ? 'ملغاة'
                    : 'مسودة'}
          </span>
        ),
        width: '80px',
        align: 'center' as const,
      },
    ],
    []
  );

  if (isLoading)
    return (
      <div className="animate-pulse p-10 text-center text-sm text-slate-400 max-md:p-5">
        جاري تحليل بيانات المبيعات...
      </div>
    );

  if (!data || data.invoices.length === 0) {
    return (
      <div className="space-y-3">
        <MobileSectionTitle
          title="تقرير المبيعات اليومي"
          icon={<BarChart3 size={16} className="text-blue-600" />}
        />
        <MobileEmptyState
          title="لا توجد مبيعات"
          description="لا توجد فواتير مبيعات في الفترة المحددة"
        />
      </div>
    );
  }

  const displayInvoices = showAllInvoices ? data?.invoices : data?.invoices.slice(0, 10);

  return (
    <div className="space-y-3">
      {/* Period Selector */}
      <div className="flex items-center justify-between max-md:gap-2">
        <MobileSectionTitle
          title="تقرير المبيعات اليومي"
          icon={<BarChart3 size={16} className="text-blue-600" />}
        />
        <div className="flex flex-shrink-0 max-md:gap-1">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => {
                setDays(d);
              }}
              className={cn(
                'min-h-[36px] rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all active:scale-95 sm:px-3 sm:py-2 sm:text-xs',
                days === d
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <ResponsiveGrid cols={4}>
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(data?.todaySales.total || 0)}
          icon={Calendar}
          colorClass="text-blue-500"
          iconBgClass="bg-blue-500"
        />
        <StatCard
          title="فواتير اليوم"
          value={String(data?.todaySales.count || 0)}
          icon={ShoppingCart}
          colorClass="text-indigo-500"
          iconBgClass="bg-indigo-500"
        />
        <StatCard
          title={`إجمالي ${days} يوم`}
          value={formatCurrency(data?.totalSales || 0)}
          icon={TrendingUp}
          colorClass="text-emerald-500"
          iconBgClass="bg-emerald-500"
        />
        <StatCard
          title="متوسط يومي"
          value={formatCurrency(data?.avgDaily || 0)}
          icon={BarChart3}
          colorClass="text-amber-500"
          iconBgClass="bg-amber-500"
        />
      </ResponsiveGrid>

      {/* Chart */}
      {(data?.dailyData.length || 0) > 0 && (
        <MobileCard padding="sm">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:mb-3 sm:text-xs">
            اتجاه المبيعات اليومي
          </h4>
          <div className="h-[180px] w-full sm:h-[220px]">
            {isMounted && (
              <ResponsiveContainer
                key="daily-sales-chart"
                width="100%"
                height="100%"
                minWidth={1}
                debounce={1}
                minHeight={1}
              >
                <BarChart data={data?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={value => [formatCurrency(Number(value) || 0), 'المبيعات']}
                    labelFormatter={label => `التاريخ: ${label}`}
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
        <div className="flex items-center justify-between border-b bg-blue-50/50 dark:border-slate-800 dark:bg-blue-950/20 max-md:p-3 sm:p-4">
          <h4 className="flex items-center text-[10px] font-bold uppercase text-blue-600 max-md:gap-2 sm:text-xs">
            <ShoppingCart size={12} /> آخر الفواتير ({data?.totalInvoices || 0})
          </h4>
          <ShareButton
            size="sm"
            eventType="daily_sales"
            title="مشاركة تقرير المبيعات"
            message={`📊 تقرير المبيعات اليومي\n━━━━━━━━━━━━━━\n📅 مبيعات اليوم: ${formatCurrency(data?.todaySales.total || 0)} (${data?.todaySales.count || 0} فاتورة)\n💰 إجمالي ${days} يوم: ${formatCurrency(data?.totalSales || 0)}\n📈 متوسط يومي: ${formatCurrency(data?.avgDaily || 0)}`}
          />
        </div>
        <div className="-mx-1 overflow-x-auto">
          <div className="px-1">
            <ExcelTable columns={columns} data={displayInvoices || []} colorTheme="blue" isRTL />
          </div>
        </div>
        {(data?.invoices.length || 0) > 10 && (
          <button
            onClick={() => {
              setShowAllInvoices(!showAllInvoices);
            }}
            className="flex w-full items-center justify-center border-t text-center text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-50 active:scale-[0.98] dark:border-slate-800 dark:hover:bg-blue-950/30 max-md:gap-1 max-md:p-2 sm:p-3 sm:text-xs"
          >
            {showAllInvoices ? (
              <>
                <ChevronUp size={12} /> إخفاء
              </>
            ) : (
              <>
                <ChevronDown size={12} /> عرض الكل ({data?.invoices.length})
              </>
            )}
          </button>
        )}
      </MobileCard>
    </div>
  );
};

export default DailySalesReport;
