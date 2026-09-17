// ============================================
// Sales Returns Component
// Displays sales returns list
// ============================================

import React from 'react';
import { Eye, AlertCircle, RotateCcw } from 'lucide-react';

interface SalesReturn {
  id: string;
  invoiceNumber: string;
  originalInvoice: string;
  returnAmount: number;
  reason: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SalesReturnsProps {
  returns: SalesReturn[];
  onViewReturn?: (returnItem: SalesReturn) => void;
  isLoading?: boolean;
}

const SalesReturns: React.FC<SalesReturnsProps> = ({ returns, onViewReturn, isLoading }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-3 h-20 rounded bg-gray-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (returns.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
        <p>لا توجد مردودات مبيعات</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-600',
      approved: 'bg-green-100 text-green-600',
      rejected: 'bg-red-100 text-red-600',
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'معلق',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-3">
      {returns.map(returnItem => (
        <div
          key={returnItem.id}
          className="rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                <RotateCcw size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  مردود #{returnItem.invoiceNumber}
                </p>
                <p className="text-sm text-gray-500">فاتورة الأصل: {returnItem.originalInvoice}</p>
              </div>
            </div>

            <div className="text-left">
              <p className="font-bold text-red-600">-{returnItem.returnAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {new Date(returnItem.date).toLocaleDateString('ar-SA-u-nu-latn')}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-slate-300">{returnItem.reason}</span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(returnItem.status)}`}
              >
                {getStatusLabel(returnItem.status)}
              </span>
              <button
                onClick={() => onViewReturn?.(returnItem)}
                className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SalesReturns;
