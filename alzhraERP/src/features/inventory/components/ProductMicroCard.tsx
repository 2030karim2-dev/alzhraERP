import React from 'react';
import type { Product } from '../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../core/utils';
import { Hash, MapPin, Box, Tag, Factory, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  product: Product;
  onClick: (product: Product) => void;
}

const ProductMicroCard: React.FC<Props> = ({ product, onClick }) => {
  const isLow = product.isLowStock || product.stock_quantity <= (product.min_stock_level || 0);
  const price = product.sale_price ?? product.selling_price ?? 0;
  const partNumber =
    product.part_number && product.part_number !== '---' ? product.part_number : null;
  const sku = product.sku && product.sku !== '---' ? product.sku : null;

  return (
    <div
      onClick={() => {
        onClick(product);
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-[var(--app-surface)] shadow-xs transition-all duration-200 hover:shadow-md active:scale-[0.99]',
        isLow
          ? 'border-amber-300/80 bg-amber-50/20 hover:border-amber-500 dark:border-amber-900/50 dark:bg-amber-950/15'
          : 'border-[var(--app-border)] hover:border-blue-500/60 hover:bg-blue-50/10'
      )}
    >
      {/* Main Body */}
      <div className="flex flex-1 flex-col justify-between space-y-2 p-2.5 sm:space-y-2.5 sm:p-3.5">
        {/* Top Header: Image + Name + Status */}
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Product Image / Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/80 sm:h-12 sm:w-12 sm:rounded-xl">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name_ar || product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <Box size={18} className="text-slate-400 dark:text-slate-500 sm:size-5" />
            )}
          </div>

          {/* Title & Brand */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-1">
              {product.brand && (
                <span className="inline-flex max-w-[110px] items-center gap-1 truncate rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:max-w-[130px] sm:px-2">
                  <Factory size={10} className="shrink-0" />
                  <span className="truncate">{product.brand}</span>
                </span>
              )}
              <span
                className={cn(
                  'mr-auto inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold sm:px-2',
                  isLow
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                )}
              >
                {isLow ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                <span>{isLow ? 'مخزون منخفض' : 'متوفر'}</span>
              </span>
            </div>

            <h3
              className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 dark:text-white sm:text-sm"
              title={product.name_ar || product.name}
            >
              {product.name_ar || product.name}
            </h3>
          </div>
        </div>

        {/* Identifiers Row (Part Number / SKU / Location) */}
        {(partNumber || sku || product.location) && (
          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] sm:gap-1.5 sm:text-[11px]">
            {partNumber && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Tag size={10} className="text-slate-400" />
                <span>{partNumber}</span>
              </span>
            )}
            {sku && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <Hash size={10} className="text-slate-400" />
                <span>{sku}</span>
              </span>
            )}
            {product.location && (
              <span className="mr-auto inline-flex items-center gap-1 font-sans text-[10px] text-slate-400 dark:text-slate-500">
                <MapPin size={10} />
                <span>{product.location}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Strip: Price & Stock (Clean border-t, no negative margins) */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-2.5 py-1.5 dark:border-slate-800/80 dark:bg-slate-900/40 sm:px-3.5 sm:py-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-slate-400">سعر البيع</span>
          <span
            dir="ltr"
            className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 sm:text-sm"
          >
            {formatCurrency(price)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase text-slate-400">الكمية بالمخزن</span>
          <span
            dir="ltr"
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-[10px] font-black sm:rounded-md sm:px-2 sm:text-xs',
              isLow
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            )}
          >
            {formatNumberDisplay(product.stock_quantity)} {product.unit || 'حبة'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductMicroCard;
