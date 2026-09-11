import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/core/utils';

interface QuotationTotalsProps {
  total: number;
  currencyCode?: string;
}

const QuotationTotals: React.FC<QuotationTotalsProps> = ({ total, currencyCode = 'SAR' }) => {
  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 dark:border-indigo-800/30 dark:from-indigo-900/20 dark:to-blue-900/20 max-md:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 max-md:gap-2">
          <DollarSign size={18} />
          <span className="text-sm font-bold">إجمالي عرض السعر</span>
        </div>
        <span
          className="font-mono text-2xl font-bold text-indigo-700 dark:text-indigo-300 max-md:text-lg"
          dir="ltr"
        >
          {formatCurrency(total, currencyCode)}
        </span>
      </div>
    </div>
  );
};

export default QuotationTotals;
