
import React from 'react';
import { Product } from '../types';
import { formatCurrency, formatNumberDisplay } from '../../../core/utils';
import { Hash, MapPin, Box, Activity } from 'lucide-react';
import { cn } from '../../../core/utils';

interface Props {
  product: Product;
  onClick: (id: string) => void;
}

const ProductMicroCard: React.FC<Props> = ({ product, onClick }) => {
  return (
    <div
      onClick={() => onClick(product.id)}
      className={cn(
        "group relative bg-white dark:bg-slate-900 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col active:scale-[0.98] rounded-none",
        product.isLowStock
          ? "border-rose-200 dark:border-rose-900/40 hover:border-rose-500"
          : "border-gray-100 dark:border-slate-800 hover:border-blue-500"
      )}
    >
      {/* Visual Identity Strip */}
      <div className="h-20 relative bg-gray-50 dark:bg-slate-800/30 flex items-center justify-center border-b dark:border-slate-800">
        {product.image_url ? (
          <img src={product.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
        ) : (
          <Box size={24} className="text-gray-300 dark:text-slate-700" />
        )}

        {/* Status Overlay */}
        <div className="absolute top-1 right-1">
          <span className={cn(
            "px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-tighter",
            product.isLowStock ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
          )}>
            {product.isLowStock ? 'Stock Alert' : 'In Stock'}
          </span>
        </div>
      </div>

      {/* Core Data Segment */}
      <div className="p-2 space-y-1.5 flex-1">
        <h3 className="text-[10px] font-bold text-gray-800 dark:text-slate-100 leading-tight line-clamp-2 min-h-[2.4em]">
          {product.name}
        </h3>

        <div className="flex items-center justify-between text-[8px] font-bold text-gray-400 font-mono tracking-tighter bg-gray-50 dark:bg-slate-950 px-1.5 py-1">
          <span className="flex items-center gap-1 uppercase"><Hash size={8} /> {product.sku}</span>
          <span className="text-blue-600">{product.brand}</span>
        </div>

        {/* Inventory Status Bar */}
        <div className="h-1 bg-gray-100 dark:bg-slate-800 w-full overflow-hidden">
          <div
            className={cn("h-full transition-all", product.isLowStock ? "bg-rose-500" : "bg-emerald-500")}
            style={{ width: `${Math.min(100, (product.stock_quantity / (product.min_stock_level || 5)) * 50)}%` }}
          ></div>
        </div>

        {/* Pricing Segment */}
        <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-slate-800 mt-1 border-t dark:border-slate-800">
          <div className="bg-white dark:bg-slate-900 py-1.5 text-center">
            <p className="text-[7px] font-bold text-gray-400 uppercase leading-none mb-1">Price</p>
            <p dir="ltr" className="text-[10px] font-bold text-blue-600 font-mono">
              {formatCurrency(product.sale_price ?? product.selling_price ?? 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 py-1.5 text-center border-r dark:border-slate-800">
            <p className="text-[7px] font-bold text-gray-400 uppercase leading-none mb-1">Stock</p>
            <p dir="ltr" className={cn("text-[10px] font-bold font-mono", product.isLowStock ? "text-rose-600" : "text-gray-800 dark:text-white")}>
              {formatNumberDisplay(product.stock_quantity)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className="px-2 py-1 bg-gray-50 dark:bg-slate-950 border-t dark:border-slate-800 flex justify-between items-center opacity-60">
        <div className="flex items-center gap-1 text-[8px] font-bold text-gray-500 uppercase">
          <MapPin size={8} />
          <span>{product.location || 'N/A'}</span>
        </div>
        <Activity size={10} className="text-blue-500" />
      </div>
    </div>
  );
};

export default ProductMicroCard;
