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
    <div className="grid grid-cols-3 gap-4 max-md:gap-2">
      <div className="flex items-center gap-4 rounded-2xl border bg-[var(--app-surface)] p-4 dark:border-slate-800 max-md:gap-2 max-md:p-2">
        <div className="rounded-xl bg-red-50 p-3 text-red-600 max-md:p-1.5">
          <DollarSign size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400">{t('dead_stock_value')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border bg-[var(--app-surface)] p-4 dark:border-slate-800 max-md:gap-2 max-md:p-2">
        <div className="rounded-xl bg-orange-50 p-3 text-orange-600 max-md:p-1.5">
          <Archive size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400">{t('dead_stock_count')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumberDisplay(totalItems)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border bg-[var(--app-surface)] p-4 dark:border-slate-800 max-md:gap-2 max-md:p-2">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600 max-md:p-1.5">
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
