// ============================================
// Sales Analytics Component
// Sales analytics display
// ============================================

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { formatNumber } from '../../../../core/utils';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { useAuthStore } from '../../../auth/store';

interface SalesAnalyticsProps {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
}

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ period = 'month' }) => {
    const { user } = useAuthStore();

    const {
        totalSales,
        totalReturns,
        netSales,

        averageInvoiceValue,
        salesByDay,
        isLoading
    } = useSalesAnalytics({
        companyId: user?.company_id || '',
        period,
    });

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <TrendingUp size={24} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">إجمالي المبيعات</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(totalSales)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <TrendingDown size={24} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">المردودات</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(totalReturns)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <BarChart3 size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">المبيعات الصافية</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(netSales)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <PieChart size={24} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">متوسط الفاتورة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(averageInvoiceValue)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    المبيعات اليومية
                </h3>
                <div className="h-64 flex items-center justify-center text-gray-400">
                    {salesByDay.length > 0 ? (
                        <p>المخطط البياني</p>
                    ) : (
                        <p>لا توجد بيانات للفترة المحددة</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesAnalytics;
