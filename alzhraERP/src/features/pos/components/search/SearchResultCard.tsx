import React from 'react';
import { Package, TrendingUp, Hash, Tag, Factory, Ruler, Barcode, Sparkles } from 'lucide-react';
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
        'py-0.2 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 text-[10px] font-bold',
        c.className
      )}
    >
      {c.icon}
      {c.label}
    </span>
  );
});
MatchBadge.displayName = 'MatchBadge';

export const SearchResultCard: React.FC<SearchResultCardProps> = React.memo(
  ({ result, isSelected, onSelect, onMouseEnter }) => {
    const hasStock = result.stock_quantity > 0;
    const hasImage = !!result.image_url;

    return (
      <button
        type="button"
        onClick={() => {
          onSelect(result);
        }}
        onMouseEnter={onMouseEnter}
        className={cn(
          'relative flex w-full cursor-pointer items-center gap-2 border-b border-slate-100 p-2 text-right transition-all duration-150 last:border-b-0 dark:border-slate-800 sm:gap-3 sm:p-3',
          'hover:bg-blue-50/80 dark:hover:bg-blue-950/40',
          isSelected && 'border-s-4 border-s-blue-500 bg-blue-100/70 dark:bg-blue-900/30',
          !hasStock && 'bg-slate-50/50 opacity-75 dark:bg-slate-900/40'
        )}
      >
        {/* Product Image / Icon */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 sm:h-11 sm:w-11">
          {hasImage ? (
            <img
              src={result.image_url!}
              alt={result.name_ar}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Package size={18} className="text-slate-400 dark:text-slate-500" />
          )}
        </div>

        {/* Main Info */}
        <div className="min-w-0 flex-1 pr-0.5">
          <div className="mb-1 flex items-center gap-1.5">
            <h4 className="line-clamp-2 text-xs font-bold leading-tight text-slate-900 dark:text-white sm:text-sm">
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
              <span className="py-0.2 inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 font-mono font-bold dark:bg-slate-800/80">
                <Hash size={10} className="text-slate-400" />
                <span>{result.sku}</span>
              </span>
            )}
            {result.part_number && result.part_number !== '---' && (
              <span className="py-0.2 inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 font-mono font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <Tag size={10} />
                <span>{result.part_number}</span>
              </span>
            )}
            {result.brand && (
              <span className="py-0.2 inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Factory size={10} />
                <span>{result.brand}</span>
              </span>
            )}
            {result.size && (
              <span className="py-0.2 hidden items-center gap-0.5 rounded bg-purple-50 px-1.5 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 sm:inline-flex">
                <Ruler size={10} />
                <span>{result.size}</span>
              </span>
            )}
          </div>
        </div>

        {/* Price & Stock Column */}
        <div className="flex flex-shrink-0 flex-col items-end justify-center gap-1 text-left">
          <span
            className="whitespace-nowrap font-mono text-xs font-black text-blue-600 dark:text-blue-400 sm:text-sm"
            dir="ltr"
          >
            {formatCurrency(result.selling_price)}
          </span>
          <span
            className={cn(
              'py-0.2 whitespace-nowrap rounded-full px-2 text-[10px] font-bold',
              hasStock
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {hasStock
              ? `${formatNumberDisplay(result.stock_quantity)} ${result.unit || 'حبة'}`
              : 'نفد'}
          </span>
        </div>
      </button>
    );
  }
);

SearchResultCard.displayName = 'SearchResultCard';
