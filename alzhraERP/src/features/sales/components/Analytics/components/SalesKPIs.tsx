import React from 'react';
import {
    TrendingUp, Receipt, DollarSign, BarChart3,
    ArrowUpRight, ArrowDownRight, Users, Package, CreditCard
} from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface SalesKPIsProps {
    totalSales: number;
    netSales: number;
    invoiceCount: number;
    averageInvoiceValue: number;
    totalReturns: number;
    topCustomer: { customerName: string; totalAmount: number } | undefined;
    topProduct: { productName: string; quantity: number } | undefined;
    cashRatio: number;
    cashAmount: number;
    salesGrowth: number;
    returnsGrowth: number;
    periodLabel: string;
    isLoading: boolean;
    formatCurrency: (value: number) => string;
    formatNumber: (value: number) => string;
}

export const SalesKPIs: React.FC<SalesKPIsProps> = ({
    totalSales,
    netSales,
    invoiceCount,
    averageInvoiceValue,
    totalReturns,
    topCustomer,
    topProduct,
    cashRatio,
    cashAmount,
    salesGrowth,
    returnsGrowth,
    periodLabel,
    isLoading,
    formatCurrency,
    formatNumber
}) => {
    const { dictionary: t } = useI18nStore();

    return (
        <>
            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Sales */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <DollarSign size={24} className="text-white" />
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                                <ArrowUpRight size={12} />
                                +{salesGrowth}%
                            </span>
                        </div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">{t.total_sales_amount}</p>
                        <p className="text-3xl font-bold tracking-tight">
                            {isLoading ? '...' : formatCurrency(totalSales)}
                        </p>
                        <p className="text-blue-200 text-xs mt-2">{periodLabel}</p>
                    </div>
                </div>

                {/* Net Sales */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} className="text-emerald-600" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <ArrowUpRight size={12} />
                            +8.2%
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.net_sales}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isLoading ? '...' : formatCurrency(netSales)}
                    </p>
                    <div className="mt-3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                </div>

                {/* Invoice Count */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Receipt size={24} className="text-purple-600" />
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.invoices_count}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isLoading ? '...' : formatNumber(invoiceCount)}
                    </p>
                    <p className="text-slate-400 text-xs mt-2">+15 {periodLabel}</p>
                </div>

                {/* Average Invoice */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 size={24} className="text-amber-600" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                            <ArrowUpRight size={12} />
                            +5.3%
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.average_invoice}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isLoading ? '...' : formatCurrency(averageInvoiceValue)}
                    </p>
                    <p className="text-slate-400 text-xs mt-2">{t.sales}</p>
                </div>
            </div>

            {/* KPI Cards Row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Returns */}
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight size={16} className="text-rose-600" />
                        <span className="text-xs font-bold text-rose-600 uppercase">{t.returns}</span>
                        <span className="text-xs text-rose-400 mr-auto">{returnsGrowth}%</span>
                    </div>
                    <p className="text-xl font-bold text-rose-700 dark:text-rose-400">
                        {isLoading ? '...' : formatCurrency(totalReturns)}
                    </p>
                </div>

                {/* Top Customer */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase">{t.top_customer}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {isLoading ? '...' : topCustomer?.customerName || '-'}
                    </p>
                    <p className="text-xs text-slate-400">
                        {isLoading ? '' : topCustomer ? formatCurrency(topCustomer.totalAmount) : ''}
                    </p>
                </div>

                {/* Top Product */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase">{t.top_product}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {isLoading ? '...' : topProduct?.productName || '-'}
                    </p>
                    <p className="text-xs text-slate-400">
                        {isLoading ? '' : topProduct ? `${formatNumber(topProduct.quantity)} sold` : ''}
                    </p>
                </div>

                {/* Cash Ratio */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard size={16} className="text-purple-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase">{t.cash_ratio}</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800 dark:text-white">
                        {isLoading ? '...' : `${cashRatio}%`}
                    </p>
                    <p className="text-xs text-slate-400">
                        {formatCurrency(cashAmount)} {t.cash}
                    </p>
                </div>
            </div>
        </>
    );
};

export default SalesKPIs;
