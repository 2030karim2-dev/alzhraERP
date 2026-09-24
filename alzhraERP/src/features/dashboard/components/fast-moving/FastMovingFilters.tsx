/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/no-confusing-void-expression */
import React from 'react';
import { BadgePercent, Search, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/core/utils';
import type { FastMovingSummary, SortField, StockFilter } from './types';

interface FastMovingFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortField: SortField;
  handleSort: (field: SortField) => void;
  stockFilter: StockFilter;
  setStockFilter: (filter: StockFilter) => void;
  productsCount: number;
  summary: FastMovingSummary;
}

export const FastMovingFilters: React.FC<FastMovingFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  sortField,
  handleSort,
  stockFilter,
  setStockFilter,
  productsCount,
  summary,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900/50 p-3 sm:px-5">
      {/* Search */}
      <div className="relative min-w-[220px] flex-1 max-md:w-full">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم القطعة، رقم القطعة (OEM)، أو الماركة..."
          className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-1.5 pl-3 pr-9 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
        />
      </div>

      {/* Quick Sort Shortcuts */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
        <button
          type="button"
          onClick={() => handleSort('quantity')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
            sortField === 'quantity'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <Zap size={12} />
          <span>الكمية</span>
        </button>

        <button
          type="button"
          onClick={() => handleSort('revenue')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
            sortField === 'revenue'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <TrendingUp size={12} />
          <span>الإيراد</span>
        </button>

        <button
          type="button"
          onClick={() => handleSort('profit')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
            sortField === 'profit'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <BadgePercent size={12} />
          <span>الربح</span>
        </button>

        <button
          type="button"
          onClick={() => handleSort('margin')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
            sortField === 'margin'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <span>الهامش %</span>
        </button>
      </div>

      {/* Stock Filter Pills */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
        <button
          type="button"
          onClick={() => setStockFilter('all')}
          className={cn(
            'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
            stockFilter === 'all'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          الكل ({productsCount})
        </button>
        <button
          type="button"
          onClick={() => setStockFilter('in_stock')}
          className={cn(
            'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
            stockFilter === 'in_stock'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          متوفر
        </button>
        <button
          type="button"
          onClick={() => setStockFilter('low_stock')}
          className={cn(
            'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
            stockFilter === 'low_stock'
              ? 'bg-amber-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          شحيح ({summary.lowStockCount})
        </button>
        <button
          type="button"
          onClick={() => setStockFilter('out_of_stock')}
          className={cn(
            'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
            stockFilter === 'out_of_stock'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          نفد ({summary.outOfStockCount})
        </button>
        {summary.negativeStockCount > 0 && (
          <button
            type="button"
            onClick={() => setStockFilter('negative_stock')}
            className={cn(
              'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
              stockFilter === 'negative_stock'
                ? 'bg-rose-700 text-white'
                : 'text-rose-400 hover:text-rose-300'
            )}
          >
            مكشوف/سالب ({summary.negativeStockCount})
          </button>
        )}
      </div>
    </div>
  );
};
