import React from 'react';
import { Box, Edit, Trash2, Package, X, Maximize2 } from 'lucide-react';
import { Product } from '../types';
import StockStatusBadge from './product_detail/StockStatusBadge';
import ProductDetailsContent from './product_detail/ProductDetailsContent';

interface Props {
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onClose?: (() => void) | undefined;
  onMaximize?: (() => void) | undefined;
}

const ProductDetailPane: React.FC<Props> = ({ product, onEdit, onDelete, onClose, onMaximize }) => {
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 p-8 text-center animate-in fade-in duration-500">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
          <Package size={32} strokeWidth={1} />
        </div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">اختر منتجاً لعرض التفاصيل</h3>
        <p className="text-[10px] font-bold text-slate-400 mt-2 max-w-[200px]">قم بتحديد أي صنف من القائمة لعرض كامل تفاصيله وإحصائياته هنا</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950 h-full flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-right-4 fade-in duration-300 rounded-lg overflow-hidden">
      {/* Header (Flat Excel Style) */}
      <div className="flex justify-between items-center px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 relative z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded flex items-center justify-center">
            <Box size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate uppercase tracking-tight">
                {product.name}
              </h2>
              <div className="scale-75 origin-right">
                <StockStatusBadge quantity={product.stock_quantity} minLevel={product.min_stock_level} />
              </div>
            </div>
            <p dir="ltr" className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">{product.sku}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={() => onEdit(product)} 
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-95"
            title="تعديل"
          >
            <Edit size={14} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => { if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) onDelete(product.id); }} 
            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all active:scale-95"
            title="حذف"
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </button>
          
          <span className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />
          
          {onMaximize && (
            <button 
              onClick={onMaximize} 
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
              title="تكبير"
            >
              <Maximize2 size={15} />
            </button>
          )}
          
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors"
              title="إغلاق"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
        <ProductDetailsContent product={product} />
      </div>
    </div>
  );
};

export default ProductDetailPane;
