import React from 'react';
import { Sparkles, ArrowUpDown, Layers, TrendingUp, Filter } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { SortMode } from '../../hooks/usePOSSearch';

export const SORT_OPTIONS: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
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

export const SearchSortToolbar: React.FC<SearchSortToolbarProps> = React.memo(({ sortMode, onSortChange }) => {
    return (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80 backdrop-blur-sm overflow-x-auto no-scrollbar flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 flex-shrink-0">
                ترتيب:
            </span>
            {SORT_OPTIONS.map((opt) => (
                <button
                    key={opt.mode}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSortChange(opt.mode);
                    }}
                    className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer',
                        sortMode === opt.mode
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-slate-600/60'
                    )}
                >
                    {opt.icon}
                    {opt.label}
                </button>
            ))}
        </div>
    );
});

SearchSortToolbar.displayName = 'SearchSortToolbar';
