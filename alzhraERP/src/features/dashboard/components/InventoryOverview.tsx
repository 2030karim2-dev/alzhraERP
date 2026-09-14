import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  ArrowRightLeft,
  ShoppingCart,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../../core/utils';
import { useProducts, useWarehouses } from '../../inventory/hooks/index';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import type { Product, Warehouse } from '../../inventory/types';
import StockTransferRequestModal from '../../inventory/components/StockTransferRequestModal';

interface InventoryOverviewProps {
  lowStockProducts?: unknown[];
  className?: string;
}

type FilterMode = 'all' | 'zero' | 'core';

interface SelectedTransferTarget {
  product: Product;
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  availableQty: number;
}

const InventoryOverview: React.FC<InventoryOverviewProps> = ({
  lowStockProducts: _rawLowStock,
  className,
}) => {
  const navigate = useNavigate();
  const { data: allProducts = [] } = useProducts();
  const { data: warehousesRaw = [] } = useWarehouses();
  const { branchId: activeBranchId } = useBranchFilter();

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<SelectedTransferTarget | null>(null);

  const warehouses = warehousesRaw as Warehouse[];
  const products = allProducts as Product[];

  // Compute enriched low-stock products with branch breakdown
  const enrichedLowStock = useMemo(() => {
    return products
      .map(product => {
        const dist = product.warehouse_distribution || [];
        const threshold = Number(product.min_stock_level) > 0 ? Number(product.min_stock_level) : 3;

        // Current branch stock (or total stock if all branches)
        let currentStock = 0;
        if (activeBranchId) {
          const branchWarehouses = warehouses.filter(w => w.branch_id === activeBranchId);
          const branchWhIds = new Set(branchWarehouses.map(w => w.id));
          const relevantDist = dist.filter(d =>
            d.branch_id ? d.branch_id === activeBranchId : branchWhIds.has(d.warehouse_id)
          );
          currentStock = relevantDist.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
        } else {
          currentStock = Number(product.stock_quantity) || 0;
        }

        const isLow = currentStock <= threshold;
        const isZero = currentStock === 0;

        // Determine target (requester) branch and external sources
        let targetBranchId = activeBranchId || '';
        let externalDist = dist;

        if (activeBranchId) {
          externalDist = dist.filter(d => {
            const isDifferent = d.branch_id ? d.branch_id !== activeBranchId : true;
            return isDifferent && Number(d.quantity) > 0;
          });
        } else {
          // In all-branches view: identify the deficit branch and separate from surplus branches
          const sortedDist = [...dist].sort(
            (a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0)
          );
          const lowest = sortedDist[0];
          targetBranchId = lowest?.branch_id || lowest?.warehouse_id || '';
          externalDist = sortedDist.slice(1).filter(d => Number(d.quantity) > 0);
        }

        const bestExternalSource = externalDist.sort(
          (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)
        )[0];

        // Only mark external available if source is valid and different from target
        const bestSourceBranchId =
          bestExternalSource?.branch_id || bestExternalSource?.warehouse_id || '';
        const externalAvailable =
          !!bestExternalSource && !!targetBranchId && bestSourceBranchId !== targetBranchId;

        const externalBranchName =
          bestExternalSource?.branch_name || bestExternalSource?.warehouse_name || 'فرع شقيق';
        const externalBranchId = bestSourceBranchId;
        const externalQty = Number(bestExternalSource?.quantity) || 0;

        return {
          product,
          currentStock,
          threshold,
          isLow,
          isZero,
          targetBranchId,
          externalAvailable,
          externalBranchName,
          externalBranchId,
          externalQty,
          ratio: Math.min(100, Math.round((currentStock / (threshold || 1)) * 100)),
        };
      })
      .filter(item => item.isLow)
      .sort((a, b) => {
        // Zero stock first, then core items, then lowest current stock
        if (a.isZero && !b.isZero) return -1;
        if (!a.isZero && b.isZero) return 1;
        if (a.product.is_core && !b.product.is_core) return -1;
        if (!a.product.is_core && b.product.is_core) return 1;
        return a.currentStock - b.currentStock;
      });
  }, [products, warehouses, activeBranchId]);

  // Metric counts
  const zeroStockCount = useMemo(
    () => enrichedLowStock.filter(i => i.isZero).length,
    [enrichedLowStock]
  );
  const coreStockCount = useMemo(
    () => enrichedLowStock.filter(i => i.product.is_core).length,
    [enrichedLowStock]
  );
  const canTransferCount = useMemo(
    () => enrichedLowStock.filter(i => i.externalAvailable).length,
    [enrichedLowStock]
  );

  // Filtered list
  const filteredList = useMemo(() => {
    return enrichedLowStock
      .filter(item => {
        if (filterMode === 'zero') return item.isZero;
        if (filterMode === 'core') return item.product.is_core;
        return true;
      })
      .filter(item => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          item.product.name_ar.toLowerCase().includes(term) ||
          (item.product.part_number && item.product.part_number.toLowerCase().includes(term)) ||
          (item.product.sku && item.product.sku.toLowerCase().includes(term))
        );
      });
  }, [enrichedLowStock, filterMode, searchTerm]);

  return (
    <>
      <div
        className={cn(
          'bg-[var(--app-surface)]/90 relative overflow-hidden rounded-2xl border border-[var(--app-border)] p-4 shadow-sm backdrop-blur-xl transition-all duration-300 max-md:rounded-xl max-md:p-3',
          className
        )}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-[60px]" />

        {/* Header */}
        <div className="border-[var(--app-border)]/60 relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 shadow-sm shadow-cyan-500/10">
              <Package size={18} className="text-cyan-500 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--app-text)]">
                تنبيهات المنتجات المنخفضة المخزون
              </h3>
              <p className="text-[10px] text-[var(--app-text-secondary)]">
                متابعة استباقية للنواقص مع فرص المناقلة والشراء الفوري
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/inventory?view=low-stock')}
            className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
          >
            عرض الكل في المخزون
            <ExternalLink size={12} />
          </button>
        </div>

        {/* 4-Stat High Density Metrics Grid */}
        <div className="relative z-10 mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div
            onClick={() => setFilterMode('all')}
            className={cn(
              'cursor-pointer rounded-xl border p-2.5 transition-all',
              filterMode === 'all'
                ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20'
                : 'border-[var(--app-border)] bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/30'
            )}
          >
            <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--app-text-secondary)]">
              <span>إجمالي النواقص</span>
              <AlertTriangle size={12} className="text-amber-500" />
            </div>
            <p className="font-mono text-base font-bold text-[var(--app-text)]">
              {enrichedLowStock.length}
            </p>
          </div>

          <div
            onClick={() => setFilterMode('zero')}
            className={cn(
              'cursor-pointer rounded-xl border p-2.5 transition-all',
              filterMode === 'zero'
                ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                : 'border-[var(--app-border)] bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/30'
            )}
          >
            <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--app-text-secondary)]">
              <span>نفاد تام (0)</span>
              <AlertOctagon size={12} className="text-rose-500" />
            </div>
            <p className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">
              {zeroStockCount}
            </p>
          </div>

          <div
            onClick={() => setFilterMode('core')}
            className={cn(
              'cursor-pointer rounded-xl border p-2.5 transition-all',
              filterMode === 'core'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-[var(--app-border)] bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/30'
            )}
          >
            <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--app-text-secondary)]">
              <span>أصناف رئيسية</span>
              <Sparkles size={12} className="text-amber-500" />
            </div>
            <p className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
              {coreStockCount}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20">
            <div className="mb-1 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400">
              <span>فرص مناقلة</span>
              <ArrowRightLeft size={12} />
            </div>
            <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
              {canTransferCount}
            </p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث في المنتجات المنخفضة..."
              className="w-full rounded-xl border border-[var(--app-border)] bg-white/60 py-1 pe-2.5 ps-7 text-[11px] text-[var(--app-text)] placeholder-[var(--app-text-secondary)] transition-all focus:border-cyan-500 focus:outline-none dark:bg-slate-800/40"
            />
          </div>

          <button
            onClick={() => setIsListExpanded(!isListExpanded)}
            className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] px-2 py-1 text-[10px] font-bold text-[var(--app-text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isListExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{isListExpanded ? 'طي' : 'عرض'}</span>
          </button>
        </div>

        {/* Actionable Product Cards List */}
        {isListExpanded && (
          <div className="custom-scrollbar relative z-10 max-h-[300px] space-y-2 overflow-y-auto pe-0.5">
            {filteredList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--app-border)] py-6 text-center">
                <TrendingUp size={28} className="mx-auto mb-1 text-emerald-500 opacity-80" />
                <p className="text-xs font-bold text-[var(--app-text)]">
                  {enrichedLowStock.length === 0
                    ? 'المخزون متوازن وفي حالة ممتازة'
                    : 'لا توجد نتائج مطابقة للبحث أو الفلتر'}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)]">
                  {enrichedLowStock.length === 0
                    ? 'كافة الأصناف أعلى من الحدود الدنيا المحددة'
                    : 'جرب تعديل كلمة البحث أو التبديل إلى فلتر الكل'}
                </p>
              </div>
            ) : (
              filteredList.map(item => (
                <div
                  key={item.product.id}
                  className="rounded-xl border border-[var(--app-border)] bg-slate-50/50 p-2.5 transition-all hover:border-cyan-500/30 hover:bg-white dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-[var(--app-text)]">
                          {item.product.name_ar}
                        </span>
                        {item.product.is_core && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            رئيسي
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                            item.isZero
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {item.isZero
                            ? 'نفد تماماً (0)'
                            : `متبقي ${item.currentStock} من ${item.threshold}`}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--app-text-secondary)]">
                        {item.product.part_number && (
                          <span className="font-mono">P/N: {item.product.part_number}</span>
                        )}
                        {item.product.sku && (
                          <span className="font-mono">SKU: {item.product.sku}</span>
                        )}
                        {item.product.brand && <span>[{item.product.brand}]</span>}
                      </div>

                      {/* Stock Level Progress Bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              item.isZero
                                ? 'w-0 bg-rose-500'
                                : item.ratio <= 40
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                            )}
                            style={{ width: `${item.ratio}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                          {item.ratio}%
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {item.externalAvailable ? (
                        <button
                          onClick={() =>
                            setSelectedTransfer({
                              product: item.product,
                              sourceBranchId: item.externalBranchId,
                              sourceBranchName: item.externalBranchName,
                              targetBranchId: item.targetBranchId,
                              availableQty: item.externalQty,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                        >
                          <ArrowRightLeft size={10} />
                          مناقلة ({item.externalQty})
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/purchases?action=create')}
                          className="flex items-center gap-1 rounded-lg bg-cyan-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-cyan-700 active:scale-95"
                        >
                          <ShoppingCart size={10} />
                          طلب شراء
                        </button>
                      )}

                      <span className="text-[10px] text-[var(--app-text-secondary)]">
                        {item.externalAvailable ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            بـ {item.externalBranchName}
                          </span>
                        ) : (
                          <span className="text-rose-500">غير متوفر بفروع أخرى</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Stock Transfer Request Modal */}
      {selectedTransfer && (
        <StockTransferRequestModal
          product={selectedTransfer.product}
          sourceBranchId={selectedTransfer.sourceBranchId}
          sourceBranchName={selectedTransfer.sourceBranchName}
          requesterBranchId={selectedTransfer.targetBranchId}
          availableQty={selectedTransfer.availableQty}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </>
  );
};

export default InventoryOverview;
