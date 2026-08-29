import React, { useState } from 'react';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { useAuthStore } from '../../../auth/store';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { formatCurrency as formatCurrencyUtil, formatNumberDisplay } from '../../../../core/utils';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';

// Extracted components
import {
    SalesKPIs,
    SalesTrendChart,
    PaymentMethodsChart,
    TopProductsList,
    TopCustomersList
} from './components';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Resolve a period enum to an inclusive [start, end] date range so the
 * period selector actually filters the backend query (the RPC accepts
 * p_start_date / p_end_date). Returns null when the range cannot be computed.
 */
const resolvePeriodRange = (period: PeriodType): { startDate: string | null; endDate: string | null } => {
    const now = new Date();
    // Format in LOCAL time to avoid toISOString() shifting local-midnight dates
    // a day back in UTC+ timezones.
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
        year: t('year')
    };

    // [FIX] Bind the selected period to actual date bounds so the KPI data
    // changes when the user switches today/week/month/quarter/year.
    const { startDate, endDate } = resolvePeriodRange(period);

    const {
        isLoading,
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
        salesByPaymentMethod
    } = useSalesAnalytics({
        companyId: user?.company_id || '',
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
    });

    // Use shared utility functions
    const formatCurrency = (value: number) => formatCurrencyUtil(value, 'SAR');
    const formatNumber = (value: number) => formatNumberDisplay(value);

    // Derive the average from the SAME period-filtered totals the page shows,
    // so the value stays internally consistent when the RPC aggregate differs.
    const consistentAvgInvoice = invoiceCount > 0 ? totalSales / invoiceCount : 0;

    const salesGrowth = prevTotalSales > 0
        ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
        : null;
    const returnsGrowth = prevTotalReturns > 0
        ? ((totalReturns - prevTotalReturns) / prevTotalReturns) * 100
        : totalReturns > 0
            ? 100
            : null;

    // Calculate cash ratio
    const totalPaymentAmount = salesByPaymentMethod.reduce((sum, p) => sum + p.amount, 0);
    const cashPayment = salesByPaymentMethod.find(p => p.method === 'cash');
    const cashRatio = totalPaymentAmount > 0
        ? Math.round(((cashPayment?.amount || 0) / totalPaymentAmount) * 100)
        : 0;

    const renderPeriodButton = (p: PeriodType) => (
        <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold transition-all rounded-lg min-h-[44px] ${period === p
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-border)]'
                }`}
        >
            {periodLabels[p]}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-24">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 max-md:gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        {t('sales_analytics')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('track_sales_performance')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-1 max-md:gap-1 sm:gap-2 bg-[var(--app-surface)] p-1 max-md:p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(renderPeriodButton)}
                </div>
            </div>

            {isError && (
                <ErrorDisplay
                    error={error?.message || 'تعذّر تحميل بيانات التحليلات'}
                    onRetry={refetch}
                    variant="inline"
                />
            )}

            {/* KPI Cards */}
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-md:gap-3">
                {/* Main Chart */}
                <SalesTrendChart
                    salesByDay={salesByDay}
                    periodLabel={periodLabels[period]}
                    formatCurrency={formatCurrency}
                />

                {/* Payment Methods */}
                <PaymentMethodsChart
                    salesByPaymentMethod={salesByPaymentMethod}
                    formatCurrency={formatCurrency}
                />
            </div>

            {/* Top Products & Customers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-md:gap-3">
                {/* Top Products */}
                <TopProductsList
                    topProducts={topProducts}
                    totalSales={totalSales}
                    isLoading={isLoading}
                    formatCurrency={formatCurrency}
                    formatNumber={formatNumber}
                />

                {/* Top Customers */}
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
