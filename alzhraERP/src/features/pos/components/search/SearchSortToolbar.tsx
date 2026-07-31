import React from 'react';
import { Sparkles, ArrowUpDown, Layers, TrendingUp, Filter } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { SortMode } from '../../hooks/usePOSSearch';

export const SORT_OPTIONS: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'relevance', label: 'الأكثر تطابقاً', icon: <Sparkles size={12} /> },
    { mode: 'price_asc', label: 'السعر: منخفض', icon: <ArrowUpDown size={12} /> },
    { mode: 'price_desc', label: 'السعر: مرتفع', icon: <ArrowUpDown size={12} /> },
    { mode: 'stock_desc', label: 'الأكثر توفراً', icon: <Layers size={12} /> },
    { mode: 'popular', label: 'الأكثر مبيعاً', icon: <TrendingUp size={12} /> },
    { mode: 'name', label: 'أبجدياً', icon: <Filter size={12} /> },
];

interface SearchSortToolbarProps {
    sortMode: SortMode;
    onSortChange: (mode: SortMode) => void;
}

export const SearchSortToolbar: React.FC<SearchSortToolbarProps> = React.memo(({ sortMode, onSortChange }) => {
    return (
        <div className="flex items-center gap-1.5 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm overflow-x-auto no-scrollbar flex-shrink-0">
            <span className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 flex-shrink-0">
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
                        'flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap transition-all active:scale-95',
                        sortMode === opt.mode
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
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
