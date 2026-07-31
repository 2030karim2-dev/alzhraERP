import React from 'react';
import { TrendingUp, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { DebtMetrics } from '../../hooks/useDebtManagement';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  metrics: DebtMetrics;
}


export const DebtOverviewCards: React.FC<Props> = ({ metrics }) => {
  const { totalReceivables, totalOverdue, overduePercentage, pendingInvoicesCount, atRiskCustomersCount } = metrics;
  
  const isHealthy = overduePercentage < 20;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Receivables */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            إجمالي المستحقات
          </span>
        </div>
        <div className="mt-auto">
          <h3 className="text-sm font-medium text-gray-500 mb-1">إجمالي الديون</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalReceivables)}</p>
        </div>
      </div>

      {/* Total Overdue */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-red-100 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
            متأخرة السداد
          </span>
        </div>
        <div className="mt-auto">
          <h3 className="text-sm font-medium text-gray-500 mb-1">ديون متأخرة</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
          <div className="mt-2 flex items-center text-sm">
             <span className={`font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {overduePercentage.toFixed(1)}% 
             </span>
             <span className="text-gray-400 mx-1">من الإجمالي</span>
          </div>
        </div>
      </div>

      {/* Pending Invoices */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-orange-100 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-orange-400"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
            فواتير معلقة
          </span>
        </div>
        <div className="mt-auto">
          <h3 className="text-sm font-medium text-gray-500 mb-1">عدد الفواتير المعلقة</h3>
          <p className="text-2xl font-bold text-gray-900">{pendingInvoicesCount}</p>
        </div>
      </div>

      {/* At Risk Customers */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-purple-100 flex flex-col relative overflow-hidden">
         <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
            تصنيف المخاطر
          </span>
        </div>
        <div className="mt-auto">
          <h3 className="text-sm font-medium text-gray-500 mb-1">عملاء متأخرون بشدة</h3>
          <p className="text-2xl font-bold text-purple-700">
             {atRiskCustomersCount} <span className="text-sm font-normal text-gray-500">عميل</span>
          </p>
        </div>
      </div>

    </div>
  );
};
