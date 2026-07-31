import React, { useState } from 'react';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { useAuthStore } from '../../../auth/store';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { formatCurrency as formatCurrencyUtil, formatNumberDisplay } from '../../../../core/utils';

// Extracted components
import {
    SalesKPIs,
    SalesTrendChart,
    PaymentMethodsChart,
    TopProductsList,
    TopCustomersList
} from './components';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

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

    const {
        isLoading,
        totalSales,
        totalReturns,
        netSales,
        invoiceCount,
        averageInvoiceValue,
        topProducts,
        topCustomers,
        salesByDay,
        salesByPaymentMethod
    } = useSalesAnalytics({
        companyId: user?.company_id || '',
        period
    });

    // Use shared utility functions
    const formatCurrency = (value: number) => formatCurrencyUtil(value, 'SAR');
    const formatNumber = (value: number) => formatNumberDisplay(value);

    // Calculate growth percentages (mock data for demo)
    const salesGrowth = 12.5;
    const returnsGrowth = -3.2;

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
            className={`px-4 py-2 text-xs font-bold transition-all rounded-lg ${period === p
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
        >
            {periodLabels[p]}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-24">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        {t('sales_analytics')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('track_sales_performance')}
                    </p>
                </div>
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(renderPeriodButton)}
                </div>
            </div>

            {/* KPI Cards */}
            <SalesKPIs
                totalSales={totalSales}
                netSales={netSales}
                invoiceCount={invoiceCount}
                averageInvoiceValue={averageInvoiceValue}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
