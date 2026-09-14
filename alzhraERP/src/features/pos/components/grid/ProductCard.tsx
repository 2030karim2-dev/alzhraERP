import React, { useState, lazy, Suspense } from 'react';
import { Package, Hash, Eye, Layers, Store, Building2, ArrowRightLeft } from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import type { Product } from '../../../inventory/types';

const StockTransferRequestModal = lazy(
  () => import('../../../inventory/components/StockTransferRequestModal')
);

interface ProductCardProps {
  product: Product;
  searchTerm: string;
  onAddToCart: (product: Product) => void;
  onViewDetails?: ((product: Product) => void) | undefined;
  playNotificationSound: () => void;
  isCrossBranch?: boolean;
  selectedWarehouseId?: string | null;
  /** وضع الرؤية فقط — لا يسمح بالبيع المتقاطع، فقط طلب تحويل */
  isInventoryOnly?: boolean | undefined;
  requesterBranchId?: string | null | undefined;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({
    product,
    searchTerm,
    onAddToCart,
    onViewDetails,
    playNotificationSound,
    isCrossBranch = false,
    selectedWarehouseId = null,
    isInventoryOnly = false,
    requesterBranchId = null,
  }) => {
    const [showWarehousePopover, setShowWarehousePopover] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferSourceWh, setTransferSourceWh] = useState<{
      branchId: string;
      branchName: string;
      qty: number;
    } | null>(null);

    const hasStock = product.stock_quantity > 0;
    const isSearching = searchTerm.trim().length > 0;
    const isMatchedByAlternative =
      isSearching &&
      product.alternative_numbers?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isLowStock = hasStock && product.stock_quantity <= (product.min_stock_level || 5);
    const warehouseDist = product.warehouse_distribution || [];
    const warehouseCount = warehouseDist.filter(w => w.quantity > 0).length;

    // Check if the stock is ENTIRELY from another warehouse
    const localStock =
      warehouseDist.find(w => w.warehouse_id === selectedWarehouseId)?.quantity || 0;
    const isPurelyCrossBranch = isCrossBranch && hasStock && localStock === 0;

    // إذا كان الفرع في وضع inventory_only وكان المنتج من فرع آخر → لا بيع متقاطع
    const isTransferOnly = isPurelyCrossBranch && isInventoryOnly;

    const handleCardClick = () => {
      if (!hasStock) return;
      if (isTransferOnly) return; // المستخدم يجب أن يضغط زر "طلب تحويل" بدلاً
      playNotificationSound();
      onAddToCart(product);
    };

    const handleRequestTransfer = (e: React.MouseEvent) => {
      e.stopPropagation();
      // تحديد الفرع الذي يملك المخزون
      // نبحث في توزيع المخزون عن أول مستودع غير محلي فيه كمية
      const externalWh = warehouseDist.find(
        w => w.warehouse_id !== selectedWarehouseId && w.quantity > 0
      );
      setTransferSourceWh(
        externalWh
          ? {
              branchId: externalWh.branch_id || externalWh.warehouse_id,
              branchName: externalWh.branch_name || externalWh.warehouse_name,
              qty: externalWh.quantity,
            }
          : null
      );
      setShowTransferModal(true);
    };

    return (
      <>
        <div
          onClick={handleCardClick}
          onMouseEnter={() => {
            setShowWarehousePopover(true);
          }}
          onMouseLeave={() => {
            setShowWarehousePopover(false);
          }}
          className={cn(
            'group relative flex h-48 select-none flex-col rounded-2xl border bg-[var(--app-surface)] p-2 text-right transition-all md:h-52',
            hasStock
              ? isPurelyCrossBranch
                ? 'cursor-pointer border-amber-200 shadow-xs hover:border-amber-500 hover:shadow-sm active:scale-95 dark:border-amber-900/50'
                : 'cursor-pointer border-gray-100 shadow-xs hover:border-blue-500 hover:shadow-sm active:scale-95 dark:border-slate-800'
              : 'cursor-not-allowed border-slate-200 bg-slate-50/40 opacity-80 dark:border-slate-800/80 dark:bg-slate-900/60'
          )}
          role="button"
          tabIndex={hasStock ? 0 : -1}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (hasStock) {
                playNotificationSound();
                onAddToCart(product);
              }
            }
          }}
        >
          {/* Image */}
          <div className="relative mb-1.5 flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100/50 bg-slate-50 dark:border-slate-700/30 dark:bg-slate-800/40 md:h-24">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-500',
                  hasStock ? 'group-hover:scale-105' : 'grayscale-[40%]'
                )}
              />
            ) : (
              <Package
                size={28}
                strokeWidth={1.5}
                className="text-slate-300 transition-transform duration-300 group-hover:scale-110 dark:text-slate-600"
              />
            )}

            {/* View Details Icon - Top Left */}
            {onViewDetails && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onViewDetails(product);
                }}
                className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 opacity-0 shadow-xs backdrop-blur-sm transition-all duration-200 hover:border-blue-500 hover:bg-blue-500 hover:text-white group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 max-md:opacity-100"
                title="عرض التفاصيل"
              >
                <Eye size={14} />
              </button>
            )}

            {/* Stock Badge Overlay on Image */}
            {!hasStock ? (
              <span className="absolute right-1.5 top-1.5 z-10 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                نفذت الكمية
              </span>
            ) : isPurelyCrossBranch ? (
              <span className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                <Building2 size={10} /> فرع آخر
              </span>
            ) : isLowStock ? (
              <span className="absolute right-1.5 top-1.5 z-10 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                شحيح
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col justify-between">
            <div>
              {/* Product Name */}
              <h3
                className={cn(
                  'mb-1.5 line-clamp-2 text-xs font-bold leading-snug md:text-sm',
                  hasStock
                    ? 'text-gray-800 dark:text-slate-100'
                    : 'text-gray-600 dark:text-slate-300'
                )}
              >
                {product.name}
              </h3>

              {/* Match badges */}
              <div className="flex flex-wrap gap-1.5">
                {isMatchedByAlternative && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 md:text-[10px]">
                    <Hash size={8} />
                    بديل
                  </span>
                )}
                {isSearching && product.part_number && product.part_number !== '---' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400 md:text-[10px]">
                    {product.part_number}
                  </span>
                )}
                {isSearching && product.brand && (
                  <span className="max-w-[90px] truncate rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 md:text-[10px]">
                    {product.brand}
                  </span>
                )}
                {/* Warehouse count badge */}
                {warehouseCount > 1 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 md:text-[10px]">
                    <Store size={8} />
                    {warehouseCount} مستودع
                  </span>
                )}
                {/* Cross Branch badge */}
                {isPurelyCrossBranch && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 md:text-[10px]"
                    title="البضاعة متوفرة في فرع آخر فقط"
                  >
                    <Building2 size={8} />
                    فرع خارجي
                  </span>
                )}
              </div>
            </div>

            {/* Price + Stock Row */}
            <div className="mt-2.5 flex w-full items-end justify-between">
              <span
                dir="ltr"
                className={cn(
                  'text-xs font-black tracking-tighter md:text-base',
                  hasStock
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-slate-400'
                )}
              >
                {formatCurrency(product.sale_price ?? product.selling_price ?? 0)}
              </span>
              <span
                dir="ltr"
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase md:text-xs',
                  hasStock
                    ? isLowStock
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                      : 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                )}
              >
                <Layers size={11} />
                {hasStock ? formatNumberDisplay(product.stock_quantity) : '0 نفذ'}
              </span>
            </div>
          </div>

          {/* Warehouse Distribution Popover */}
          {showWarehousePopover && warehouseDist.length > 0 && (
            <div
              className="animate-in fade-in slide-in-from-bottom-1 absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl duration-150 dark:border-slate-700 dark:bg-slate-800"
              onMouseEnter={() => {
                setShowWarehousePopover(true);
              }}
              onMouseLeave={() => {
                setShowWarehousePopover(false);
              }}
            >
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <Building2 size={12} />
                  توزيع المخزون
                </h4>
              </div>
              <div className="max-h-40 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/50">
                {warehouseDist.map((wh, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <span className="max-w-[140px] truncate text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <Store size={10} className="ml-1 inline text-slate-400" />
                      {wh.warehouse_name}
                    </span>
                    <span
                      dir="ltr"
                      className={cn(
                        'font-mono text-[11px] font-bold',
                        wh.quantity > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-400 dark:text-red-500'
                      )}
                    >
                      {formatNumberDisplay(wh.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* زر طلب التحويل — يظهر فقط في وضع inventory_only */}
          {isTransferOnly && (
            <button
              type="button"
              onClick={handleRequestTransfer}
              className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-1.5 text-[11px] font-black text-white shadow-md transition-all hover:bg-amber-400 active:scale-95"
            >
              <ArrowRightLeft size={13} />
              طلب تحويل
            </button>
          )}
        </div>

        {/* Modal طلب النقل */}
        {showTransferModal && transferSourceWh && requesterBranchId && (
          <Suspense fallback={null}>
            <StockTransferRequestModal
              product={product}
              sourceBranchId={transferSourceWh.branchId}
              sourceBranchName={transferSourceWh.branchName}
              requesterBranchId={requesterBranchId}
              availableQty={transferSourceWh.qty}
              onClose={() => setShowTransferModal(false)}
            />
          </Suspense>
        )}
      </>
    );
  }
);

ProductCard.displayName = 'ProductCard';
