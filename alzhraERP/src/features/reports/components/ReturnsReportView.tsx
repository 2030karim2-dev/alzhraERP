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
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-6 duration-700 sm:space-y-5">
      {/* Command Center: Filters & Export */}
      <ReturnsFilterBar
        filters={filters}
        setFilters={setFilters}
        handleExportExcel={handleExportExcel}
        handlePrint={handlePrint}
      />

      {/* Core Metrics Grid */}
      <ReturnsStatsGrid stats={stats} />

      {/* Tabs Navigation */}
      <div className="no-scrollbar flex w-full overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-1 sm:w-fit sm:self-center">
        <button
          onClick={() => {
            setReportView('overview');
          }}
          className={cn(
            'min-h-[36px] whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all sm:min-h-[38px] sm:px-5',
            reportView === 'overview'
              ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
          )}
        >
          نظرة عامة
        </button>
        <button
          onClick={() => {
            setReportView('sales');
          }}
          className={cn(
            'min-h-[36px] whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all sm:min-h-[38px] sm:px-5',
            reportView === 'sales'
              ? 'bg-[var(--app-surface)] text-rose-600 shadow-sm dark:text-rose-400'
              : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
          )}
        >
          مرتجعات المبيعات
        </button>
        <button
          onClick={() => {
            setReportView('purchase');
          }}
          className={cn(
            'min-h-[36px] whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all sm:min-h-[38px] sm:px-5',
            reportView === 'purchase'
              ? 'bg-[var(--app-surface)] text-emerald-600 shadow-sm dark:text-emerald-400'
              : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
          )}
        >
          مرتجعات المشتريات
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
