import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Star,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  Layers,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProductExcelGrid from './ProductExcelGrid';
import ProductDetailPane from './ProductDetailPane';
import ServerPaginationBar from '../../../ui/common/ServerPaginationBar';
import { useProductsPaginated } from '../hooks/useProductsPaginated';
import { useProductMutations } from '../hooks/useProducts';
import { productService } from '../services/productService';
import { useAuthStore } from '../../auth/store';
import type { Product } from '../types';
import { cn, formatNumberDisplay } from '../../../core/utils';
import type { Column } from '../../../ui/common/ExcelTable';

interface CoreProductsViewProps {
  isDesktop: boolean;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  handleEdit: (product: Product) => void;
  deleteProduct: (id: string) => void;
  onMaximizeProduct?: (() => void) | undefined;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

type CoreFilterMode = 'core_only' | 'critical_stock' | 'out_of_stock' | 'all_inventory';

export const CoreProductsView: React.FC<CoreProductsViewProps> = ({
  isDesktop,
  selectedProduct,
  setSelectedProduct,
  handleEdit,
  deleteProduct,
  onMaximizeProduct,
  searchTerm: propSearchTerm,
  onSearchChange: propOnSearchChange,
}) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id ?? '';
  const queryClient = useQueryClient();

  const [filterMode, setFilterMode] = useState<CoreFilterMode>('core_only');
  const [localSearchTerm, setLocalSearchTerm] = useState(propSearchTerm || '');
  const activeSearch = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const [pageSize, setPageSize] = useState(100);
  const { toggleCoreProduct } = useProductMutations();

  // Query parameter: only filter is_core = true when not inspecting full inventory
  const queryIsCore = filterMode === 'all_inventory' ? undefined : true;

  const {
    products,
    totalCount,
    totalPages,
    page,
    isFetching,
    isLoading,
    handleSearchChange,
    goToPage,
  } = useProductsPaginated({
    pageSize,
    initialSearch: activeSearch,
    isCore: queryIsCore,
  });

  // Accurate real-time KPI counts across the company's full catalog
  const {
    data: globalStats,
    isFetching: isStatsFetching,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['core_products_stats', companyId],
    queryFn: () => productService.getCoreProductsStats(companyId),
    enabled: !!companyId,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (propSearchTerm !== undefined) {
      setLocalSearchTerm(propSearchTerm);
      handleSearchChange(propSearchTerm);
    }
  }, [propSearchTerm, handleSearchChange]);

  const onSearch = (value: string) => {
    setLocalSearchTerm(value);
    if (propOnSearchChange) {
      propOnSearchChange(value);
    }
    handleSearchChange(value);
  };

  // Synchronize search and filter state
  const displayedProducts = useMemo(() => {
    if (filterMode === 'critical_stock') {
      return products.filter(p => p.isLowStock && p.stock_quantity > 0);
    }
    if (filterMode === 'out_of_stock') {
      return products.filter(p => p.stock_quantity <= 0);
    }
    return products;
  }, [products, filterMode]);

  // Derived KPI numbers
  const stats = useMemo(() => {
    const totalCore = globalStats?.total ?? (filterMode === 'core_only' ? totalCount : 0);
    const criticalCount = globalStats?.critical ?? 0;
    const outOfStockCount = globalStats?.outOfStock ?? 0;
    const safeCount = globalStats?.safe ?? Math.max(0, totalCore - criticalCount - outOfStockCount);

    return {
      totalCore,
      criticalCount,
      outOfStockCount,
      safeCount,
    };
  }, [globalStats, totalCount, filterMode]);

  const handleToggleCore = async (product: Product, newIsCore: boolean) => {
    await toggleCoreProduct({ id: product.id, isCore: newIsCore });
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      queryClient.invalidateQueries({ queryKey: ['products_paginated'] }),
    ]);
  }, [refetchStats, queryClient]);

  // Handle effective counts for pagination
  const effectiveTotalCount = useMemo(() => {
    if (filterMode === 'critical_stock') return stats.criticalCount || displayedProducts.length;
    if (filterMode === 'out_of_stock') return stats.outOfStockCount || displayedProducts.length;
    return totalCount;
  }, [filterMode, stats, displayedProducts.length, totalCount]);

  const effectiveTotalPages = useMemo(() => {
    if (filterMode === 'critical_stock' || filterMode === 'out_of_stock') {
      return Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    }
    return totalPages;
  }, [filterMode, effectiveTotalCount, pageSize, totalPages]);

  // Strategic extra columns for clear intelligence and stock monitoring
  const strategicColumns: Array<Column<Product>> = useMemo(
    () => [
      {
        header: 'حد الأمان',
        accessor: p => (
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            {formatNumberDisplay(p.min_stock_level || 0)} {p.unit || 'قطعة'}
          </span>
        ),
        width: 'w-24',
        className: 'text-center',
        sortKey: 'min_stock_level',
      },
      {
        header: 'موقف المخزون',
        accessor: p => {
          const qty = p.stock_quantity ?? 0;
          const min = p.min_stock_level || 0;
          const isCritical = p.isLowStock && qty > 0;
          const isOut = qty <= 0;

          if (isOut) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                <PackageX size={12} />
                نافد كلياً
              </span>
            );
          }
          if (isCritical) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                <AlertTriangle size={12} />
                حرج ({formatNumberDisplay(qty)} / {formatNumberDisplay(min || 3)})
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 size={12} />
              متوفر بأمان
            </span>
          );
        },
        width: 'w-32',
        className: 'text-center',
      },
    ],
    []
  );

  const renderEmptyState = () => {
    if (activeSearch.trim()) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/30">
            <Search size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            لا توجد نتائج مطابقة لبحثك
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            لم نعثر على أي صنف استراتيجي يطابق عبارة &quot;{activeSearch}&quot;.
          </p>
          <button
            type="button"
            onClick={() => onSearch('')}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-600"
          >
            مسح البحث
          </button>
        </div>
      );
    }

    if (filterMode === 'critical_stock') {
      return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white/60 p-8 text-center dark:border-emerald-900/40 dark:bg-slate-900/60">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
            وضع المخزون الاستراتيجي ممتاز!
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-600 dark:text-slate-400">
            لا توجد أي أصناف استراتيجية مهددة بالنفاذ حالياً. جميع الأصناف الحيوية أعلى من حدود
            الأمان.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('core_only');
              goToPage(1);
            }}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
          >
            عرض كافة الأصناف الاستراتيجية
          </button>
        </div>
      );
    }

    if (filterMode === 'out_of_stock') {
      return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            رائع! لا توجد أصناف استراتيجية نافدة
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            كافة الأصناف الاستراتيجية متوفرة بأرصدة موجبة في المستودعات.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('core_only');
              goToPage(1);
            }}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
          >
            عرض كافة الأصناف الاستراتيجية
          </button>
        </div>
      );
    }

    // Default core_only empty state
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-white/60 p-8 text-center dark:border-amber-900/40 dark:bg-slate-900/60">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/30">
          <Star size={24} className="fill-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          لم يتم تحديد أي أصناف استراتيجية بعد
        </h3>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          الأصناف الاستراتيجية (العمود الفقري) هي المنتجات الحيوية الأكثر طلباً لمنشأتك والتي تحظى
          بمراقبة دقيقة وتنبيهات فورية عند اقتراب نفاذ رصيدها.
        </p>
        <button
          type="button"
          onClick={() => {
            setFilterMode('all_inventory');
            goToPage(1);
          }}
          className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-95"
        >
          <Layers size={14} />
          استعراض كافة المخزون لتحديد الأصناف الاستراتيجية ⭐
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2">
      {/* Top Banner & Quick Filters */}
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-l from-amber-500/15 via-amber-500/5 to-transparent p-3 shadow-sm dark:border-amber-800/40 dark:from-amber-500/20 dark:via-amber-500/5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 shadow-sm ring-1 ring-amber-500/30 dark:text-amber-400">
              <Star size={24} className="fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  المنتجات الاستراتيجية
                </h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  العمود الفقري ⭐
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                أصناف حيوية واستراتيجية يراقبها النظام على مدار الساعة ويرسل تنبيهات عاجلة عند
                اقتراب نفاذها لحماية مبيعاتك وتفادي نفاد مخزونها الحرج.
              </p>
            </div>
          </div>

          {/* Actions & Filter Pills */}
          <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto">
            <button
              type="button"
              onClick={() => {
                setFilterMode('core_only');
                goToPage(1);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'core_only'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
              )}
            >
              <Star
                size={14}
                className={
                  filterMode === 'core_only'
                    ? 'fill-white text-white'
                    : 'fill-amber-400 text-amber-500'
                }
              />
              الأصناف الاستراتيجية
              <span className="py-0.2 rounded-full bg-white/20 px-1.5 font-mono text-[10px]">
                {stats.totalCore}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('critical_stock');
                goToPage(1);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'critical_stock'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
              )}
            >
              <AlertTriangle
                size={14}
                className={filterMode === 'critical_stock' ? 'text-white' : 'text-rose-500'}
              />
              مهددة بالنفاذ (حرجة)
              {stats.criticalCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {stats.criticalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('out_of_stock');
                goToPage(1);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'out_of_stock'
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
              )}
            >
              <PackageX
                size={14}
                className={filterMode === 'out_of_stock' ? 'text-white' : 'text-slate-500'}
              />
              نافدة كلياً
              {stats.outOfStockCount > 0 && (
                <span className="rounded-full bg-slate-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {stats.outOfStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('all_inventory');
                goToPage(1);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'all_inventory'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
              )}
              title="استعراض كافة منتجات المخزون للنقر على النجمة وتعيين أصناف استراتيجية جديدة"
            >
              <Layers
                size={14}
                className={filterMode === 'all_inventory' ? 'text-white' : 'text-indigo-500'}
              />
              كافة المخزون (لتحديد الاستراتيجي ⭐)
            </button>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isFetching || isStatsFetching}
              title="تحديث بيانات المخزون والأرصدة الحالية"
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCw
                size={14}
                className={cn(isFetching || isStatsFetching ? 'animate-spin text-amber-500' : '')}
              />
            </button>
          </div>
        </div>

        {/* 4 Stat Badges / KPI Cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Star size={16} className="fill-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                إجمالي المنتجات الاستراتيجية
              </div>
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {stats.totalCore}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                مهددة بالنفاذ (حرجة)
              </div>
              <div className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                {stats.criticalCount}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                متوفرة بأمان
              </div>
              <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {stats.safeCount}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <PackageX size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                نافدة كلياً
              </div>
              <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                {stats.outOfStockCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area (Desktop split or full width) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isLoading && displayedProducts.length === 0 ? (
          renderEmptyState()
        ) : isDesktop ? (
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
            <div
              className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${
                selectedProduct ? 'lg:col-span-8' : 'lg:col-span-12'
              }`}
            >
              <ProductExcelGrid
                products={displayedProducts}
                isLoading={isLoading}
                onDelete={deleteProduct}
                onViewDetails={setSelectedProduct}
                onEdit={handleEdit}
                searchValue={activeSearch}
                onSearchChange={onSearch}
                onToggleCore={handleToggleCore}
                extraColumns={strategicColumns}
                title={
                  filterMode === 'all_inventory'
                    ? 'اختر الأصناف لتحديدها كمنتجات استراتيجية'
                    : 'المنتجات الاستراتيجية'
                }
                subtitle={
                  filterMode === 'all_inventory'
                    ? 'انقر على النجمة ⭐ لتعيين الصنف كصنف استراتيجي يتابعه النظام بدقة'
                    : `${displayedProducts.length} صنف معروض من إجمالي ${effectiveTotalCount}`
                }
              />
            </div>
            {selectedProduct && (
              <div className="animate-in slide-in-from-right-4 fade-in h-full min-h-0 overflow-hidden duration-300 lg:col-span-4">
                <ProductDetailPane
                  product={selectedProduct}
                  onEdit={handleEdit}
                  onDelete={deleteProduct}
                  onClose={() => setSelectedProduct(null)}
                  onMaximize={onMaximizeProduct}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <ProductExcelGrid
              products={displayedProducts}
              isLoading={isLoading}
              onDelete={deleteProduct}
              onViewDetails={setSelectedProduct}
              onEdit={handleEdit}
              searchValue={activeSearch}
              onSearchChange={onSearch}
              onToggleCore={handleToggleCore}
              extraColumns={strategicColumns}
              title={
                filterMode === 'all_inventory'
                  ? 'اختر الأصناف لتحديدها كمنتجات استراتيجية'
                  : 'المنتجات الاستراتيجية'
              }
              subtitle={
                filterMode === 'all_inventory'
                  ? 'انقر على النجمة ⭐ لتعيين الصنف كصنف استراتيجي يتابعه النظام بدقة'
                  : `${displayedProducts.length} صنف معروض من إجمالي ${effectiveTotalCount}`
              }
            />
          </div>
        )}

        {/* Pagination Bar */}
        {displayedProducts.length > 0 && (
          <ServerPaginationBar
            page={page}
            totalPages={effectiveTotalPages}
            totalCount={effectiveTotalCount}
            pageSize={pageSize}
            isFetching={isFetching}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100, 200]}
          />
        )}
      </div>
    </div>
  );
};

export default CoreProductsView;
