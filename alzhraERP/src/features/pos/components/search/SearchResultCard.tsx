import React from 'react';
import { Package, TrendingUp, Hash, Tag, Factory, Ruler, Layers, History, Store, Info, Barcode, Sparkles } from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { POSSearchResult } from '../../hooks/usePOSSearch';

interface SearchResultCardProps {
    result: POSSearchResult;
    isSelected: boolean;
    onSelect: (result: POSSearchResult) => void;
    onViewDetails?: (result: POSSearchResult) => void;
    onMouseEnter: () => void;
}

const MatchBadge: React.FC<{ type?: string }> = React.memo(({ type }) => {
    if (!type || type === 'exact') return null;

    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
        barcode: {
            label: 'باركود',
            className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            icon: <Barcode size={12} />,
        },
        fuzzy: {
            label: 'تقريبي',
            className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Sparkles size={12} />,
        },
        alternative: {
            label: 'بديل',
            className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            icon: <Hash size={12} />,
        },
    };

    const c = config[type] || config.fuzzy;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold',
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
            onClick={() => onSelect(result)}
            onMouseEnter={onMouseEnter}
            className={cn(
                'relative w-full text-right p-3.5 md:p-4 flex items-start gap-4 transition-all duration-150 border-b border-slate-100 dark:border-slate-800 last:border-b-0',
                'hover:bg-blue-50 dark:hover:bg-blue-950/30',
                isSelected && 'bg-blue-100/70 dark:bg-blue-900/30 border-s-4 border-s-blue-500',
                !hasStock && 'opacity-70'
            )}
        >
            {/* Product Image / Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                {hasImage ? (
                    <img
                        src={result.image_url!}
                        alt={result.name_ar}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <Package size={22} className="text-slate-400 dark:text-slate-600" />
                )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-base truncate leading-snug">
                        {result.name_ar}
                    </h4>
                    {result.is_popular && (
                        <span title="منتج رائج">
                            <TrendingUp size={13} className="text-amber-500 flex-shrink-0" />
                        </span>
                    )}
                    <MatchBadge type={result.match_type} />
                </div>

                {/* Meta tags row */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs">
                    {result.sku && result.sku !== '---' && (
                        <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                            <Hash size={12} />
                            <span className="font-mono">{result.sku}</span>
                        </span>
                    )}
                    {result.part_number && result.part_number !== '---' && (
                        <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                            <Tag size={12} />
                            <span className="font-mono">{result.part_number}</span>
                        </span>
                    )}
                    {result.brand && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Factory size={12} />
                            {result.brand}
                        </span>
                    )}
                    {result.size && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                            <Ruler size={12} />
                            {result.size}
                        </span>
                    )}
                    {result.category && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
                            <Layers size={12} />
                            {result.category}
                        </span>
                    )}
                </div>

                {/* Sales history indicator */}
                {result.sales_count && result.sales_count > 0 ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <History size={12} />
                        <span className="font-semibold">تم بيعه {result.sales_count} مرة</span>
                        {result.last_sale_date && (
                            <span className="text-slate-400 dark:text-slate-500">
                                آخر مرة: {new Date(result.last_sale_date).toLocaleDateString('ar-SA')}
                            </span>
                        )}
                    </div>
                ) : null}

                {/* Warehouse distribution indicator */}
                {result.warehouse_distribution && result.warehouse_distribution.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {result.warehouse_distribution.map((wd, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[9px] md:text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                <Store size={10} />
                                <span className="font-semibold truncate max-w-[80px]" title={wd.warehouse_name}>{wd.warehouse_name}</span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">({wd.quantity})</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Price & Stock & Info Column */}
            <div className="flex-shrink-0 text-left flex flex-col items-end gap-1.5 min-w-[100px]">
                {onViewDetails && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(result);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors absolute top-3 left-3"
                        title="تفاصيل المنتج"
                    >
                        <Info size={16} />
                    </button>
                )}
                <span className="font-black text-blue-600 dark:text-blue-400 text-xs md:text-base font-mono mt-4" dir="ltr">
                    {formatCurrency(result.selling_price)}
                </span>
                <span
                    className={cn(
                        'text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full',
                        hasStock
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    )}
                >
                    {hasStock
                        ? `${formatNumberDisplay(result.stock_quantity)} ${result.unit}`
                        : 'نفد المخزون'}
                </span>
            </div>
        </button>
    );
});

SearchResultCard.displayName = 'SearchResultCard';
