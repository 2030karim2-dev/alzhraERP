import React from 'react';
import { Loader2, Zap, Sparkles, AlertCircle } from 'lucide-react';

export const SearchLoadingState: React.FC = React.memo(() => (
    <div className="p-8 flex flex-col items-center justify-center gap-3">
        <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                <Zap size={10} className="text-white" />
            </div>
        </div>
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            جاري البحث الذكي...
        </p>
    </div>
));
SearchLoadingState.displayName = 'SearchLoadingState';

export const SearchPopularHeader: React.FC = React.memo(() => (
    <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30">
        <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-xs md:text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                المنتجات الأكثر رواجاً
            </span>
        </div>
    </div>
));
SearchPopularHeader.displayName = 'SearchPopularHeader';

export const SearchEmptyState: React.FC<{ query: string }> = React.memo(({ query }) => (
    <div className="p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <AlertCircle size={28} className="text-slate-400 dark:text-slate-600" />
        </div>
        <div className="text-center">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">
                لا توجد نتائج لـ "{query}"
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                جرّب البحث بكلمات مختلفة أو تحقق من الإملاء
            </p>
        </div>
    </div>
));
SearchEmptyState.displayName = 'SearchEmptyState';

export const SearchFooterStats: React.FC<{
    resultCount: number;
    total: number;
    searchTimeMs: number;
}> = React.memo(({ resultCount, total, searchTimeMs }) => (
    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500 flex-shrink-0">
        <span>
            {resultCount} من {total} نتيجة
            {searchTimeMs > 0 && ` • ${Math.round(searchTimeMs)}ms`}
        </span>
        <span className="flex items-center gap-1 opacity-60">
            <Zap size={12} />
            اضغط Enter للإضافة
        </span>
    </div>
));
SearchFooterStats.displayName = 'SearchFooterStats';
