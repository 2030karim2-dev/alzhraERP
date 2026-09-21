/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, security/detect-object-injection */
import React, { useState } from 'react';
import { RefreshCw, Sparkles, Cpu } from 'lucide-react';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { useAuthStore } from '../../../auth/store';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import {
  formatCurrency as formatCurrencyUtil,
  formatNumberDisplay,
  cn,
} from '../../../../core/utils';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';

// Extracted components
import {
  SalesAIInsights,
  SalesKPIs,
  SalesTrendChart,
  PaymentMethodsChart,
  TopProductsList,
  TopCustomersList,
} from './components';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Resolve a period enum to an inclusive [start, end] date range so the
 * period selector actually filters the backend query (the RPC accepts
 * p_start_date / p_end_date). Returns null when the range cannot be computed.
 */
const resolvePeriodRange = (
  period: PeriodType
): { startDate: string | null; endDate: string | null } => {
  const now = new Date();
  // Format in LOCAL time to avoid toISOString() shifting local-midnight dates
  // a day back in UTC+ timezones.
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: iso(start), endDate: iso(now) };
    }
    case 'week': {
      const dow = (now.getDay() + 6) % 7; // Monday = 0
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
      return { startDate: iso(start), endDate: iso(now) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: iso(start), endDate: iso(now) };
    }
    case 'quarter': {
      const qs = [0, 3, 6, 9];
      const q = now.getMonth() < 3 ? 0 : now.getMonth() < 6 ? 1 : now.getMonth() < 9 ? 2 : 3;
      const start = new Date(now.getFullYear(), qs[q], 1);
      return { startDate: iso(start), endDate: iso(now) };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: iso(start), endDate: iso(now) };
    }
  }
};

const SalesAnalyticsView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<PeriodType>('month');

  // Period labels using translations
  const periodLabels: Record<PeriodType, string> = {
    today: t('today'),
    week: t('week'),
    month: t('month'),
    quarter: t('quarter'),
    year: t('year'),
  };

  // Bind the selected period to actual date bounds
  const { startDate, endDate } = resolvePeriodRange(period);

  const {
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    totalSales,
    totalReturns,
    netSales,
    invoiceCount,
    prevTotalSales,
    prevTotalReturns,
    topProducts,
    topCustomers,
    salesByDay,
    salesByPaymentMethod,
  } = useSalesAnalytics({
    companyId: user?.company_id || '',
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });

  // Currency & Number formatters
  const formatCurrency = (value: number) => formatCurrencyUtil(value, 'SAR');
  const formatNumber = (value: number) => formatNumberDisplay(value);

  // Derive consistent average invoice
  const consistentAvgInvoice = invoiceCount > 0 ? totalSales / invoiceCount : 0;

  const salesGrowth =
    prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : null;
  const returnsGrowth =
    prevTotalReturns > 0
      ? ((totalReturns - prevTotalReturns) / prevTotalReturns) * 100
      : totalReturns > 0
        ? 100
        : null;

  // Calculate cash ratio
  const totalPaymentAmount = salesByPaymentMethod.reduce((sum, p) => sum + p.amount, 0);
  const cashPayment = salesByPaymentMethod.find(p => p.method === 'cash');
  const cashRatio =
    totalPaymentAmount > 0
      ? Math.round(((cashPayment?.amount || 0) / totalPaymentAmount) * 100)
      : 0;

  const renderPeriodButton = (p: PeriodType) => (
    <button
      key={p}
      onClick={() => {
        setPeriod(p);
      }}
      className={cn(
        'min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-200',
        period === p
          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20'
          : 'bg-transparent text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      )}
    >
      {periodLabels[p]}
    </button>
  );

  return (
    <div className="animate-in fade-in space-y-6 pb-24 duration-500">
      {/* High-Tech Executive Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Cpu size={20} />
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('sales_analytics')}
            </h3>

            {/* Live AI Pulse Telemetry */}
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              <Sparkles size={11} className="text-indigo-500" />
              محرك الذكاء الاصطناعي نشط
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            متابعة فورية للتدفقات البيعية، كفاءة التحصيل، والتنبؤ التقديري بحصيلة الإيرادات
          </p>
        </div>

        {/* Controls & Period Switcher */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <div className="flex flex-wrap items-center rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-800/60">
            {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(
              renderPeriodButton
            )}
          </div>

          <button
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="تحديث فوري لبيانات التحليلات"
          >
            <RefreshCw
              size={15}
              className={cn('text-indigo-600 dark:text-indigo-400', isFetching && 'animate-spin')}
            />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {isError && (
        <ErrorDisplay
          error={error?.message || 'تعذّر تحميل بيانات التحليلات'}
          onRetry={() => {
            void refetch();
          }}
          variant="inline"
        />
      )}

      {/* 1. AI Executive Intelligence Matrix */}
      <SalesAIInsights
        totalSales={totalSales}
        prevTotalSales={prevTotalSales}
        totalReturns={totalReturns}
        netSales={netSales}
        invoiceCount={invoiceCount}
        salesByDay={salesByDay}
        topProducts={topProducts}
        topCustomers={topCustomers}
        cashRatio={cashRatio}
        period={period}
        formatCurrency={formatCurrency}
        isLoading={isLoading}
      />

      {/* 2. Cyber HUD KPI Metrics */}
      <SalesKPIs
        totalSales={totalSales}
        netSales={netSales}
        invoiceCount={invoiceCount}
        averageInvoiceValue={consistentAvgInvoice}
        totalReturns={totalReturns}
        topCustomer={topCustomers[0]}
        topProduct={topProducts[0]}
        cashRatio={cashRatio}
        cashAmount={cashPayment?.amount || 0}
        salesGrowth={salesGrowth}
        returnsGrowth={returnsGrowth}
        periodLabel={periodLabels[period]}
        isLoading={isLoading}
        formatCurrency={formatCurrency}
        formatNumber={formatNumber}
      />

      {/* 3. Deep Interactive Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SalesTrendChart
          salesByDay={salesByDay}
          periodLabel={periodLabels[period]}
          formatCurrency={formatCurrency}
        />

        <PaymentMethodsChart
          salesByPaymentMethod={salesByPaymentMethod}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* 4. Top Entities Leaderboards (Pareto 80/20) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TopProductsList
          topProducts={topProducts}
          totalSales={totalSales}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />

        <TopCustomersList
          topCustomers={topCustomers}
          isLoading={isLoading}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};

export default SalesAnalyticsView;
