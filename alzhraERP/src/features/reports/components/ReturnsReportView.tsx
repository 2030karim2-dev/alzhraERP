import React from 'react';
import { cn } from '../../../core/utils';
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
    handleExportExcel,
  } = useReturnsReport();

  const isLoading = salesLoading || purchaseLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 max-md:gap-4 max-md:p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-rose-500 shadow-xl shadow-rose-500/20" />
        <p className="animate-pulse text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          جاري مراجعة سجلات المرتجعات المالية...
        </p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 space-y-4 pb-20 duration-1000 sm:space-y-6">
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
      <div className="no-scrollbar flex w-full overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] max-md:p-1 sm:w-fit sm:self-center sm:rounded-[1.5rem] sm:p-1.5">
        <button
          onClick={() => {
            setReportView('overview');
          }}
          className={cn(
            'min-h-[40px] whitespace-nowrap rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-500 sm:min-h-[44px] sm:rounded-[1.5rem] sm:px-6 sm:py-3 sm:text-xs md:px-8',
            reportView === 'overview'
              ? 'scale-105 bg-[var(--app-surface)] text-[var(--accent)] shadow-xl'
              : 'text-[var(--app-text-secondary)] opacity-60 hover:text-[var(--app-text)] hover:opacity-100'
          )}
        >
          Overview
        </button>
        <button
          onClick={() => {
            setReportView('sales');
          }}
          className={cn(
            'min-h-[40px] whitespace-nowrap rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-500 sm:min-h-[44px] sm:rounded-[1.5rem] sm:px-6 sm:py-3 sm:text-xs md:px-8',
            reportView === 'sales'
              ? 'scale-105 bg-[var(--app-surface)] text-rose-600 shadow-xl dark:text-rose-400'
              : 'text-[var(--app-text-secondary)] opacity-60 hover:text-[var(--app-text)] hover:opacity-100'
          )}
        >
          Sales Returns
        </button>
        <button
          onClick={() => {
            setReportView('purchase');
          }}
          className={cn(
            'min-h-[40px] whitespace-nowrap rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-500 sm:min-h-[44px] sm:rounded-[1.5rem] sm:px-6 sm:py-3 sm:text-xs md:px-8',
            reportView === 'purchase'
              ? 'scale-105 bg-[var(--app-surface)] text-emerald-600 shadow-xl dark:text-emerald-400'
              : 'text-[var(--app-text-secondary)] opacity-60 hover:text-[var(--app-text)] hover:opacity-100'
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
