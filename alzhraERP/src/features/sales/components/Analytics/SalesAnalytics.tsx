/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
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
    isLoading,
  } = useSalesAnalytics({
    companyId: user?.company_id || '',
    period,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-xl bg-gray-200 dark:bg-slate-700" />
        <div className="h-64 rounded-xl bg-gray-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30 max-md:p-3">
              <TrendingUp size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white max-md:text-lg">
                {formatNumber(totalSales)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30 max-md:p-3">
              <TrendingDown size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المردودات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white max-md:text-lg">
                {formatNumber(totalReturns)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30 max-md:p-3">
              <BarChart3 size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المبيعات الصافية</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white max-md:text-lg">
                {formatNumber(netSales)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30 max-md:p-3">
              <PieChart size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوسط الفاتورة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white max-md:text-lg">
                {formatNumber(averageInvoiceValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          المبيعات اليومية
        </h3>
        <div className="flex h-64 items-center justify-center text-gray-400">
          {salesByDay.length > 0 ? <p>المخطط البياني</p> : <p>لا توجد بيانات للفترة المحددة</p>}
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
