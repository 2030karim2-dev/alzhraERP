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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
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
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] w-fit border border-slate-200/50 dark:border-slate-700/50 self-center">
                <button
                    onClick={() => setReportView('overview')}
                    className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all duration-500 ${reportView === 'overview'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl scale-105'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 opacity-60 hover:opacity-100'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setReportView('sales')}
                    className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all duration-500 ${reportView === 'sales'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xl scale-105'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 opacity-60 hover:opacity-100'
                        }`}
                >
                    Sales Returns
                </button>
                <button
                    onClick={() => setReportView('purchase')}
                    className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all duration-500 ${reportView === 'purchase'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl scale-105'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 opacity-60 hover:opacity-100'
                        }`}
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
