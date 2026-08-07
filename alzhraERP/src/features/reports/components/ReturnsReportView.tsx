import React from 'react';
import { useReturnsReport } from '../hooks/useReturnsReport';
import ReturnsFilterBar from './returns/ReturnsFilterBar';
import ReturnsStatsGrid from './returns/ReturnsStatsGrid';
import ReturnsCharts from './returns/ReturnsCharts';
import ReturnsTopParties from './returns/ReturnsTopParties';
import ReturnsTransactionsTable from './returns/ReturnsTransactionsTable';

const ReturnsReportView: React.FC = () => {
    const {
        filters,
        setFilters,
        reportView,
        setReportView,
        salesLoading,
        purchaseLoading,
        filteredSalesReturns,
        filteredPurchaseReturns,
        stats,
        reasonDistribution,
        monthlyTrends,
        topParties,
        handleExportExcel
    } = useReturnsReport();

    const isLoading = salesLoading || purchaseLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin shadow-xl shadow-rose-500/20" />
                <p className="text-slate-400 font-bold tracking-[0.2em] animate-pulse uppercase text-[10px]">جاري مراجعة سجلات المرتجعات المالية...</p>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            {/* Premium Command Center: Intelligence & Controls */}
            <ReturnsFilterBar
                filters={filters}
                setFilters={setFilters}
                handleExportExcel={handleExportExcel}
                handlePrint={handlePrint}
            />

            {/* Intelligence Grid: Core Metrics */}
            <ReturnsStatsGrid stats={stats} />

            {/* Insight Tabs Architecture */}
            <div className="flex p-1 sm:p-1.5 bg-[var(--app-surface-hover)] rounded-xl sm:rounded-[1.5rem] w-full sm:w-fit border border-[var(--app-border)] sm:self-center overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setReportView('overview')}
                    className={cn(
                        "px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg sm:rounded-[1.5rem] transition-all duration-500 whitespace-nowrap min-h-[40px] sm:min-h-[44px]",
                        reportView === 'overview'
                            ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-xl scale-105'
                            : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] opacity-60 hover:opacity-100'
                    )}
                >
                    Overview
                </button>
                <button
                    onClick={() => setReportView('sales')}
                    className={cn(
                        "px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg sm:rounded-[1.5rem] transition-all duration-500 whitespace-nowrap min-h-[40px] sm:min-h-[44px]",
                        reportView === 'sales'
                            ? 'bg-[var(--app-surface)] text-rose-600 dark:text-rose-400 shadow-xl scale-105'
                            : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] opacity-60 hover:opacity-100'
                    )}
                >
                    Sales Returns
                </button>
                <button
                    onClick={() => setReportView('purchase')}
                    className={cn(
                        "px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg sm:rounded-[1.5rem] transition-all duration-500 whitespace-nowrap min-h-[40px] sm:min-h-[44px]",
                        reportView === 'purchase'
                            ? 'bg-[var(--app-surface)] text-emerald-600 dark:text-emerald-400 shadow-xl scale-105'
                            : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] opacity-60 hover:opacity-100'
                    )}
                >
                    Purchase Returns
                </button>
            </div>

            {/* Visual Intelligence: Distributions & Temporal Trends */}
            <ReturnsCharts monthlyTrends={monthlyTrends} reasonDistribution={reasonDistribution} />

            {/* Tactical Intelligence: Critical Entities */}
            <ReturnsTopParties topParties={topParties} type={filters.type} />

            {/* Granular Intelligence: Transaction Ledger */}
            <ReturnsTransactionsTable
                reportView={reportView}
                filteredSalesReturns={filteredSalesReturns}
                filteredPurchaseReturns={filteredPurchaseReturns}
                type={filters.type}
            />
        </div>
    );
};

export default ReturnsReportView;
