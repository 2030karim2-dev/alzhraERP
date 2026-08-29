import React, { useState } from 'react';
import { Box, Edit, Trash2, Package, X, Maximize2 } from 'lucide-react';
import type { Product } from '../types';
import StockStatusBadge from './product_detail/StockStatusBadge';
import ProductDetailsContent from './product_detail/ProductDetailsContent';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';

interface Props {
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onClose?: (() => void) | undefined;
  onMaximize?: (() => void) | undefined;
}

/* eslint-disable max-lines-per-function -- جزء تفاصيل المنتج الجانبي بصفحة المخزون */
const ProductDetailPane: React.FC<Props> = ({ product, onEdit, onDelete, onClose, onMaximize }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!product) {
    return (
      <div className="animate-in fade-in flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-400 duration-500 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
          <Package size={32} strokeWidth={1} />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          اختر منتجاً لعرض التفاصيل
        </h3>
        <p className="mt-2 max-w-[200px] text-[10px] font-bold text-slate-400">
          قم بتحديد أي صنف من القائمة لعرض كامل تفاصيله وإحصائياته هنا
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 fade-in flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm duration-300 dark:border-slate-800 dark:bg-slate-950">
      {/* Header (Flat Excel Style) */}
      <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Box size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold uppercase leading-none tracking-tight text-slate-900 dark:text-white">
                {product.name}
              </h2>
              <div className="origin-right scale-75">
                <StockStatusBadge
                  quantity={product.stock_quantity}
                  minLevel={product.min_stock_level}
                />
              </div>
            </div>
            <p dir="ltr" className="mt-0.5 font-mono text-[10px] font-bold text-slate-400">
              {product.sku}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => {
              onEdit(product);
            }}
            className="rounded border border-transparent p-1.5 text-blue-600 transition-all hover:border-blue-200 hover:bg-blue-50 active:scale-95 dark:hover:border-blue-800 dark:hover:bg-blue-900/20"
            title="تعديل"
            aria-label="تعديل المنتج"
          >
            <Edit size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => {
              setIsDeleteModalOpen(true);
            }}
            className="rounded border border-transparent p-1.5 text-rose-500 transition-all hover:border-rose-200 hover:bg-rose-50 active:scale-95 dark:hover:border-rose-800 dark:hover:bg-rose-900/20"
            title="حذف"
            aria-label="حذف المنتج"
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </button>

          <span className="mx-0.5 h-6 w-px bg-slate-200 dark:bg-slate-800" />

          {onMaximize && (
            <button
              onClick={onMaximize}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-blue-600"
              title="تكبير"
              aria-label="تكبير التفاصيل"
            >
              <Maximize2 size={15} />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-rose-500"
              title="إغلاق"
              aria-label="إغلاق التفاصيل"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-0">
        <ProductDetailsContent product={product} />
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
        }}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          onDelete(product.id);
        }}
        title="حذف المنتج"
        message="هل أنت متأكد من حذف هذا الصنف نهائياً؟ لا يمكن التراجع عن هذه العملية."
        variant="danger"
        confirmLabel="نعم، احذف الآن"
      />
    </div>
  );
};

export default ProductDetailPane;
