/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression */
import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface StatementToolbarProps {
  selectedCurrency: string;
  setSelectedCurrency: (curr: string) => void;
  availableCurrencies: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const StatementToolbar: React.FC<StatementToolbarProps> = ({
  selectedCurrency,
  setSelectedCurrency,
  availableCurrencies,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تصفية العملة:</span>
        <button
          type="button"
          onClick={() => setSelectedCurrency('ALL')}
          className={cn(
            'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
            selectedCurrency === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          )}
        >
          جميع العملات
        </button>
        {availableCurrencies.map(curr => (
          <button
            key={curr}
            type="button"
            onClick={() => setSelectedCurrency(curr)}
            className={cn(
              'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
              selectedCurrency === curr
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {curr}
          </button>
        ))}
      </div>

      {/* Quick Search inside Table */}
      <div className="relative min-w-[220px]">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="بحث برقم المرجع أو البيان..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-900"
        />
      </div>
    </div>
  );
};
