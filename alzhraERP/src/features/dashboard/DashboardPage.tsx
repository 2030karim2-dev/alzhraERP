
import React, { Suspense, lazy } from 'react';
import ContentContainer from '../../ui/layout/ContentContainer';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { useTranslation } from '../../lib/hooks/useTranslation';

import MicroHeader from '../../ui/base/MicroHeader';
import ChartSkeleton from '../../ui/base/ChartSkeleton';
import { RefreshCw, Activity, TrendingUp } from 'lucide-react';
import { GlobalErrorBoundary } from '../../ui/common/GlobalErrorBoundary';

// Lazy Loaded Widgets
const StatsGrid = lazy(() => import('../../ui/dashboard/StatsGrid'));
const CashFlowWidget = lazy(() => import('./components/CashFlowWidget'));
const TopPerformers = lazy(() => import('./components/TopPerformers'));
const AlertsPanel = lazy(() => import('./components/AlertsPanel'));
const SalesFlowChart = lazy(() => import('./components/SalesFlowChart'));
const RevenueExpensesChart = lazy(() => import('./components/RevenueExpensesChart'));
const SmartTargets = lazy(() => import('./components/SmartTargets'));
const PerformanceGauge = lazy(() => import('./components/PerformanceGauge'));
const SmartPurchaseAlert = lazy(() => import('./components/SmartPurchaseAlert'));
const CustomerSegmentation = lazy(() => import('../customers/components/CustomerSegmentation'));
const AISmartNotifications = lazy(() => import('./components/AISmartNotifications'));
const FinancialHealthScore = lazy(() => import('./components/FinancialHealthScore'));
const WarehouseTransferSuggestions = lazy(() => import('./components/WarehouseTransferSuggestions'));
const InventoryOverview = lazy(() => import('./components/InventoryOverview'));
const QuickActions = lazy(() => import('./components/QuickActions'));
const CategoriesChart = lazy(() => import('../../ui/dashboard/CategoriesChart'));
const QuotationSummaryWidget = lazy(() => import('./components/QuotationSummaryWidget'));

// Sub-components for state management
const DashboardLoading = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 p-10 text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            <div className="font-bold text-gray-400 text-lg">{t('loading_financial_data')}</div>
        </div>
    );
};

const DashboardError = ({ refetch, isFetching }: { refetch: () => void, isFetching: boolean }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-10 text-center bg-[var(--app-bg)] font-cairo">
        <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <Activity size={48} className="text-rose-500 animate-pulse" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-[var(--app-text)] mb-2">عذراً، حدث خطأ أثناء تجميع البيانات</h2>
            <p className="text-[var(--app-text-secondary)] text-sm max-w-md mx-auto">
                قد يكون هناك ضغط على الخادم أو مشكلة في الاتصال. يرجى المحاولة مرة أخرى.
            </p>
        </div>
        <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/20"
        >
            <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
            إعادة المحاولة
        </button>
    </div>
);

const DashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const {
        stats,
        salesData,
        categoryData,
        topProducts,
        topCustomers,
        targets,
        cashFlow,
        alerts,
        lowStockProducts,
        isLoading,
        isError,
        refetch,
        isFetching,
        revenueExpensesData,
        growthRate,
        salesValue
    } = useDashboardMetrics();

    if (isLoading) return <DashboardLoading />;
    if (isError) return <DashboardError refetch={refetch} isFetching={isFetching} />;

    return (
        <div className="flex flex-col h-full bg-[var(--app-bg)] font-cairo relative">
            {/* Cinematic Grain Texture - Optimized Opacity and fixed positioning */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-[1] will-change-transform" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
            }} />

            <MicroHeader
                title={t('smart_performance_summary')}
                icon={Activity}
                iconColor="text-emerald-500"
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            className="p-2 text-[var(--app-text-secondary)] hover:text-[var(--accent)] active:scale-90 transition-all rounded-lg hover:bg-[var(--app-surface-hover)]"
                        >
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto px-1.5 md:px-3 py-3 custom-scrollbar pb-24 relative z-10">
                <ContentContainer>

                    <Suspense fallback={<div className="h-40 animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FinancialHealthScore
                                stats={stats || { sales: '0', purchases: '0', expenses: '0', debts: '0' }}
                                cashFlow={cashFlow}
                                targets={targets}
                            />
                            <QuickActions />
                        </div>
                    </Suspense>

                    <Suspense fallback={<div className="h-32 mt-3 animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                        <div className="mt-3">
                            <StatsGrid stats={stats || { sales: '0', purchases: '0', expenses: '0', debts: '0' }} />
                        </div>
                    </Suspense>

                    <Suspense fallback={null}>
                        <div className="mt-3">
                            <AISmartNotifications stats={stats} lowStockProducts={lowStockProducts} alerts={alerts} />
                        </div>
                    </Suspense>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5 gap-3 mt-3">
                        <Suspense fallback={<ChartSkeleton />}>
                            <div className="bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-4 rounded-2xl relative overflow-hidden group hover:border-[var(--accent)]/30 transition-all duration-500">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-400/20 transition-all duration-700 pointer-events-none"></div>
                                <div className="flex justify-between items-center mb-3 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                                            <TrendingUp size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-[var(--app-text)]">
                                                {t('sales_flow_analysis')} <span className="text-emerald-400 text-[9px]">(قطع الغيار)</span>
                                            </h3>
                                            <p className="text-[9px] font-bold text-[var(--app-text-secondary)]">تدفق المبيعات اليومية</p>
                                        </div>
                                    </div>
                                    <div className="text-left bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                                        <span className={`text-sm font-bold font-mono tracking-tighter ${growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <SalesFlowChart data={salesData as any} showPeriodSelector={true} />
                                </div>
                            </div>
                        </Suspense>

                        <GlobalErrorBoundary sectionName="الإيرادات والمصروفات">
                            <Suspense fallback={<div className="h-[220px] min-h-[220px] animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                                <RevenueExpensesChart data={revenueExpensesData} />
                            </Suspense>
                        </GlobalErrorBoundary>

                        <Suspense fallback={<div className="h-40 min-h-[160px] animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                            <PerformanceGauge
                                value={salesValue}
                                target={100000}
                                title="هدف المبيعات الشهري"
                            />
                        </Suspense>

                        <Suspense fallback={<div className="h-40 animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                            <CashFlowWidget data={cashFlow} />
                        </Suspense>

                        <Suspense fallback={<div className="h-40 animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                            <InventoryOverview lowStockProducts={lowStockProducts} />
                        </Suspense>

                        <Suspense fallback={<div className="h-40 animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                            <QuotationSummaryWidget />
                        </Suspense>

                        <Suspense fallback={<div className="h-[300px] min-h-[300px] animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                            <div className="bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] rounded-2xl p-4 h-[350px]">
                                <h3 className="text-xs font-bold text-[var(--app-text)] mb-4">التصنيفات الأكثر حركة</h3>
                                <div className="flex flex-col h-full items-center p-2">
                                    <CategoriesChart data={categoryData as any} />
                                </div>
                            </div>
                        </Suspense>

                        <Suspense fallback={<div className="h-60 animate-pulse bg-[var(--app-surface)] rounded-2xl" />}>
                            <TopPerformers
                                products={topProducts as any}
                                customers={topCustomers as any}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <WarehouseTransferSuggestions />
                        </Suspense>

                        <Suspense fallback={null}>
                            <CustomerSegmentation companyId="" />
                        </Suspense>

                        <Suspense fallback={null}>
                            <AlertsPanel alerts={alerts as any} />
                        </Suspense>

                        <Suspense fallback={null}>
                            <SmartPurchaseAlert lowStockItems={lowStockProducts as any} />
                        </Suspense>

                        <Suspense fallback={null}>
                            <SmartTargets targets={targets} />
                        </Suspense>
                    </div>

                </ContentContainer>
            </div>

        </div>
    );
};

export default DashboardPage;
