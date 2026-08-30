import React from 'react';
import { Package, TrendingUp, Hash, Tag, Factory, Ruler, Layers, History, Store, Info, Barcode, Sparkles } from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import type { POSSearchResult } from '../../hooks/usePOSSearch';

interface SearchResultCardProps {
    result: POSSearchResult;
    isSelected: boolean;
    onSelect: (result: POSSearchResult) => void;
    onViewDetails?: ((result: POSSearchResult) => void) | undefined;
    onMouseEnter: () => void;
}

const MatchBadge: React.FC<{ type?: string }> = React.memo(({ type }) => {
    if (!type || type === 'exact') return null;

    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
        barcode: {
            label: 'باركود',
            className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            icon: <Barcode size={10} />,
        },
        fuzzy: {
            label: 'تقريبي',
            className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Sparkles size={10} />,
        },
        alternative: {
            label: 'بديل',
            className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            icon: <Hash size={10} />,
        },
    };

    const c = config[type] || config.fuzzy;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] sm:text-[10px] font-bold shrink-0',
                c.className
            )}
        >
            {c.icon}
            {c.label}
        </span>
    );
});
MatchBadge.displayName = 'MatchBadge';

export const SearchResultCard: React.FC<SearchResultCardProps> = React.memo(({
    result,
    isSelected,
    onSelect,
    onViewDetails,
    onMouseEnter
}) => {
    const hasStock = result.stock_quantity > 0;
    const hasImage = !!result.image_url;

    return (
        <button
            type="button"
            onClick={() => { onSelect(result); }}
            onMouseEnter={onMouseEnter}
            className={cn(
                'relative w-full text-right p-2 sm:p-3 flex items-center gap-2 sm:gap-3 transition-all duration-150 border-b border-slate-100 dark:border-slate-800 last:border-b-0 cursor-pointer',
                'hover:bg-blue-50/80 dark:hover:bg-blue-950/40',
                isSelected && 'bg-blue-100/70 dark:bg-blue-900/30 border-s-4 border-s-blue-500',
                !hasStock && 'opacity-75 bg-slate-50/50 dark:bg-slate-900/40'
            )}
        >
            {/* Product Image / Icon */}
            <div className="flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                {hasImage ? (
                    <img
                        src={result.image_url!}
                        alt={result.name_ar}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <Package size={18} className="text-slate-400 dark:text-slate-500" />
                )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 pr-0.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2 leading-tight">
                        {result.name_ar}
                    </h4>
                    {result.is_popular && (
                        <span title="منتج رائج" className="shrink-0">
                            <TrendingUp size={12} className="text-amber-500" />
                        </span>
                    )}
                    {result.match_type !== undefined && <MatchBadge type={result.match_type} />}
                </div>

                {/* Meta tags row - Compact & Readable */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {result.sku && result.sku !== '---' && (
                        <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded font-mono font-bold">
                            <Hash size={10} className="text-slate-400" />
                            <span>{result.sku}</span>
                        </span>
                    )}
                    {result.part_number && result.part_number !== '---' && (
                        <span className="inline-flex items-center gap-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono font-bold">
                            <Tag size={10} />
                            <span>{result.part_number}</span>
                        </span>
                    )}
                    {result.brand && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                            <Factory size={10} />
                            <span>{result.brand}</span>
                        </span>
                    )}
                    {result.size && (
                        <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                            <Ruler size={10} />
                            <span>{result.size}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Price & Stock Column */}
            <div className="flex-shrink-0 text-left flex flex-col items-end justify-center gap-1">
                <span className="font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-mono whitespace-nowrap" dir="ltr">
                    {formatCurrency(result.selling_price)}
                </span>
                <span
                    className={cn(
                        'text-[10px] font-bold px-2 py-0.2 rounded-full whitespace-nowrap',
                        hasStock
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    )}
                >
                    {hasStock
                        ? `${formatNumberDisplay(result.stock_quantity)} ${result.unit || 'حبة'}`
                        : 'نفد'}
                </span>
            </div>
        </button>
    );
});

SearchResultCard.displayName = 'SearchResultCard';
