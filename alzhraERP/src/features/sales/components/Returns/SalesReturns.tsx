// ============================================
// Sales Returns Component
// Displays sales returns list
// ============================================

import React from 'react';
import {  Eye, AlertCircle, RotateCcw } from 'lucide-react';

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

const SalesReturns: React.FC<SalesReturnsProps> = ({
    returns,
    onViewReturn,
    isLoading,
}) => {
    if (isLoading) {
        return (
            <div className="animate-pulse">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded mb-3" />
                ))}
            </div>
        );
    }

    if (returns.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
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
            {returns.map((returnItem) => (
                <div
                    key={returnItem.id}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <RotateCcw size={20} className="text-red-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    مردود #{returnItem.invoiceNumber}
                                </p>
                                <p className="text-sm text-gray-500">
                                    فاتورة الأصل: {returnItem.originalInvoice}
                                </p>
                            </div>
                        </div>

                        <div className="text-left">
                            <p className="font-bold text-red-600">-{returnItem.returnAmount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">
                                {new Date(returnItem.date).toLocaleDateString('ar-SA')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-slate-300">
                                {returnItem.reason}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                                {getStatusLabel(returnItem.status)}
                            </span>
                            <button
                                onClick={() => onViewReturn?.(returnItem)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
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
