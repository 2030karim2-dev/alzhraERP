import React from 'react';
import { DollarSign, Archive, Filter } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props {
    totalValue: number;
    totalItems: number;
    uniqueItemsCount: number;
}

const DeadStockStats: React.FC<Props> = ({ totalValue, totalItems, uniqueItemsCount }) => {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                    <DollarSign size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400">{t('dead_stock_value')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                    <Archive size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400">{t('dead_stock_count')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumberDisplay(totalItems)}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Filter size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400">{t('items_count')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{uniqueItemsCount}</p>
                </div>
            </div>
        </div>
    );
};

export default DeadStockStats;
