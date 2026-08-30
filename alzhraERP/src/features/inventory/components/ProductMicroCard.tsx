import React from 'react';
import type { Product } from '../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../core/utils';
import { Hash, MapPin, Box, Tag, Factory, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  product: Product;
  onClick: (product: Product) => void;
}

const ProductMicroCard: React.FC<Props> = ({ product, onClick }) => {
  const isLow = product.isLowStock || (product.stock_quantity <= (product.min_stock_level || 0));
  const price = product.sale_price ?? product.selling_price ?? 0;
  const partNumber = product.part_number && product.part_number !== '---' ? product.part_number : null;
  const sku = product.sku && product.sku !== '---' ? product.sku : null;

  return (
    <div
      onClick={() => onClick(product)}
      className={cn(
        "group relative bg-[var(--app-surface)] border transition-all duration-200 cursor-pointer overflow-hidden rounded-2xl p-3.5 shadow-xs hover:shadow-md active:scale-[0.99] flex flex-col justify-between",
        isLow
          ? "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
          : "border-[var(--app-border)] hover:border-blue-500/60 hover:bg-blue-50/10"
      )}
    >
      {/* Top Header: Image + Name + Status */}
      <div className="flex items-start gap-3 mb-2.5">
        {/* Product Image / Icon */}
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name_ar || product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <Box size={22} className="text-slate-400 dark:text-slate-500" />
          )}
        </div>

        {/* Title & Brand */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            {product.brand && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.2 rounded-md">
                <Factory size={10} />
                <span>{product.brand}</span>
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.2 rounded-md shrink-0",
                isLow
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              )}
            >
              {isLow ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
              <span>{isLow ? 'مخزون منخفض' : 'متوفر'}</span>
            </span>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2" title={product.name_ar || product.name}>
            {product.name_ar || product.name}
          </h3>
        </div>
      </div>

      {/* Identifiers Row (Part Number / SKU) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] font-mono">
        {partNumber && (
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
            <Tag size={11} className="text-slate-400" />
            <span>{partNumber}</span>
          </span>
        )}
        {sku && (
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
            <Hash size={11} className="text-slate-400" />
            <span>{sku}</span>
          </span>
        )}
        {product.location && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-sans mr-auto">
            <MapPin size={10} />
            <span>{product.location}</span>
          </span>
        )}
      </div>

      {/* Bottom Strip: Price & Stock */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 -mx-3.5 -mb-3.5 px-3.5 py-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase">سعر البيع</span>
          <span dir="ltr" className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 font-mono">
            {formatCurrency(price)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-slate-400 uppercase">الكمية بالمخزن</span>
          <span
            dir="ltr"
            className={cn(
              "text-xs sm:text-sm font-black font-mono px-2 py-0.5 rounded-md",
              isLow
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
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
