import React from 'react';
import { RefreshCw, RotateCcw, FileText, Truck } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface StatsProps {
    returnCount: number;
    totalReturns: number;
    avgReturn: number;
    pendingCount: number;
    type: 'sales' | 'purchase';
}

export const ReturnsStatsHeader: React.FC<StatsProps> = ({ 
    returnCount, 
    totalReturns, 
    avgReturn, 
    pendingCount,
    type
}) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className={`bg-gradient-to-br from-${type === 'sales' ? 'red' : 'red'}-50 to-${type === 'sales' ? 'red' : 'red'}-100 dark:from-${type === 'sales' ? 'red' : 'red'}-900/20 dark:to-${type === 'sales' ? 'red' : 'red'}-800/20 rounded-xl p-4 border border-${type === 'sales' ? 'red' : 'red'}-200 dark:border-${type === 'sales' ? 'red' : 'red'}-800`}>
                <div className="flex items-center gap-2 mb-1">
                    <RotateCcw size={18} className={`text-${type === 'sales' ? 'red' : 'red'}-600`} />
                    <span className={`text-xs font-bold text-${type === 'sales' ? 'red' : 'red'}-600 dark:text-${type === 'sales' ? 'red' : 'red'}-400`}>عدد المرتجعات</span>
                </div>
                <p className={`text-2xl font-bold text-${type === 'sales' ? 'red' : 'red'}-700 dark:text-${type === 'sales' ? 'red' : 'red'}-300`}>{returnCount || 0}</p>
            </div>
            
            <div className={`bg-gradient-to-br from-${type === 'sales' ? 'red' : 'red'}-50 to-${type === 'sales' ? 'red' : 'red'}-100 dark:from-${type === 'sales' ? 'red' : 'red'}-900/20 dark:to-${type === 'sales' ? 'red' : 'red'}-800/20 rounded-xl p-4 border border-${type === 'sales' ? 'red' : 'red'}-200 dark:border-${type === 'sales' ? 'red' : 'red'}-800`}>
                <div className="flex items-center gap-2 mb-1">
                    {type === 'sales' ? 
                        <FileText size={18} className="text-red-600" /> : 
                        <Truck size={18} className="text-red-600" />
                    }
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">إجمالي المرتجعات</span>
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {type === 'sales' ? formatCurrency(totalReturns, 'SAR') : totalReturns.toFixed(2)}
                </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                    <FileText size={18} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">متوسط المرتجع</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {type === 'sales' ? formatCurrency(avgReturn, 'SAR') : avgReturn.toFixed(2)}
                </p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={18} className="text-yellow-600" />
                    <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">قيد الانتظار</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {pendingCount || 0}
                </p>
            </div>
        </div>
    );
};
