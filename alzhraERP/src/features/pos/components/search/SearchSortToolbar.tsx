import React from 'react';
import { Sparkles, ArrowUpDown, Layers, TrendingUp } from 'lucide-react';
import { cn } from '../../../../core/utils';
import type { SortMode } from '../../hooks/usePOSSearch';

export const SORT_OPTIONS: Array<{ mode: SortMode; label: string; icon: React.ReactNode }> = [
  { mode: 'relevance', label: 'المتطابق', icon: <Sparkles size={10} /> },
  { mode: 'price_asc', label: 'الأرخص', icon: <ArrowUpDown size={10} /> },
  { mode: 'price_desc', label: 'الأعلى', icon: <ArrowUpDown size={10} /> },
  { mode: 'stock_desc', label: 'المتوفر', icon: <Layers size={10} /> },
  { mode: 'popular', label: 'الرائج', icon: <TrendingUp size={10} /> },
];

interface SearchSortToolbarProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

export const SearchSortToolbar: React.FC<SearchSortToolbarProps> = React.memo(
  ({ sortMode, onSortChange }) => {
    return (
      <div className="no-scrollbar flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/90 px-2 py-1.5 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
        <span className="flex-shrink-0 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          ترتيب:
        </span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.mode}
            onClick={e => {
              e.stopPropagation();
              onSortChange(opt.mode);
            }}
            className={cn(
              'flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all active:scale-95',
              sortMode === opt.mode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'border border-slate-200/60 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600/60 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    );
  }
);

SearchSortToolbar.displayName = 'SearchSortToolbar';
