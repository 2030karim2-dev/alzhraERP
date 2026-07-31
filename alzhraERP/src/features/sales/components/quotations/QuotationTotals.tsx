import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/core/utils';

interface QuotationTotalsProps {
  total: number;
}

const QuotationTotals: React.FC<QuotationTotalsProps> = ({ total }) => {
  return (
    <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <DollarSign size={18} />
          <span className="text-sm font-bold">إجمالي عرض السعر</span>
        </div>
        <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300" dir="ltr">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
};

export default QuotationTotals;
