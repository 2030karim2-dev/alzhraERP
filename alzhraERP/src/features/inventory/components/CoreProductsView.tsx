import React, { useState, useMemo, useEffect } from 'react';
import { Star, AlertTriangle, CheckCircle2, PackageX, Layers } from 'lucide-react';
import ProductExcelGrid from './ProductExcelGrid';
import ProductDetailPane from './ProductDetailPane';
import ServerPaginationBar from '../../../ui/common/ServerPaginationBar';
import { useProductsPaginated } from '../hooks/useProductsPaginated';
import { useProductMutations } from '../hooks/useProducts';
import type { Product } from '../types';
import { cn } from '../../../core/utils';

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
  const [filterMode, setFilterMode] = useState<CoreFilterMode>('core_only');
  const [localSearchTerm, setLocalSearchTerm] = useState(propSearchTerm || '');
  const activeSearch = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const [pageSize, setPageSize] = useState(50);
  const { toggleCoreProduct } = useProductMutations();

  // Determine query parameters based on current filter mode
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

  // Client-side filtering for sub-states (critical / out of stock) on current page
  const displayedProducts = useMemo(() => {
    if (filterMode === 'critical_stock') {
      return products.filter(p => p.isLowStock && p.stock_quantity > 0);
    }
    if (filterMode === 'out_of_stock') {
      return products.filter(p => p.stock_quantity <= 0);
    }
    return products;
  }, [products, filterMode]);

  // Real-time KPI summaries for current page & core items
  const stats = useMemo(() => {
    const coreItems = products.filter(p => p.is_core);
    const critical = coreItems.filter(p => p.isLowStock && p.stock_quantity > 0);
    const outOfStock = coreItems.filter(p => p.stock_quantity <= 0);
    const safe = coreItems.filter(p => !p.isLowStock && p.stock_quantity > 0);

    return {
      totalCore: filterMode === 'all_inventory' ? coreItems.length : totalCount,
      criticalCount: critical.length,
      outOfStockCount: outOfStock.length,
      safeCount: safe.length,
    };
  }, [products, totalCount, filterMode]);

  const handleToggleCore = async (product: Product, newIsCore: boolean) => {
    await toggleCoreProduct({ id: product.id, isCore: newIsCore });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2">
      {/* Top Banner & KPI Cards */}
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-amber-200/60 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent p-3 dark:border-amber-800/40 dark:from-amber-500/20 dark:via-amber-500/5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 shadow-sm dark:text-amber-400">
              <Star size={22} className="fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                المنتجات الاستراتيجية (العمود الفقري للمنشأة)
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  أولوية قصوى
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                أصناف حيوية يراقبها النظام على مدار الساعة ويرسل تنبيهات عاجلة عند اقتراب نفاذها
                لحماية مبيعاتك.
              </p>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto">
            <button
              type="button"
              onClick={() => setFilterMode('core_only')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'core_only'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
              )}
            >
              <Star
                size={14}
                className={filterMode === 'core_only' ? 'fill-white' : 'text-amber-500'}
              />
              الأصناف الاستراتيجية المعتمدة
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('critical_stock')}
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
              مهددة بالنفاذ
              {stats.criticalCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {stats.criticalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('out_of_stock')}
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
              onClick={() => setFilterMode('all_inventory')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'all_inventory'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
              )}
              title="استعراض كافة منتجات المخزون للنقر على النجمة وتعيين أصناف جديدة"
            >
              <Layers
                size={14}
                className={filterMode === 'all_inventory' ? 'text-white' : 'text-indigo-500'}
              />
              كافة المخزون (لتعيين جديد ⭐)
            </button>
          </div>
        </div>

        {/* 4 Stat Badges / Mini Cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Star size={16} className="fill-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                إجمالي الأصناف الاستراتيجية
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
        {isDesktop ? (
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
                title={
                  filterMode === 'all_inventory'
                    ? 'اختر الأصناف لتمييزها بنجمة'
                    : 'الأصناف الاستراتيجية'
                }
                subtitle={
                  filterMode === 'all_inventory'
                    ? 'انقر على النجمة ⭐ لتعيين الصنف كصنف استراتيجي'
                    : `${displayedProducts.length} صنف استراتيجي معتمد`
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
              title="الأصناف الاستراتيجية"
            />
          </div>
        )}

        {/* Pagination Bar */}
        <ServerPaginationBar
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          isFetching={isFetching}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[25, 50, 100, 200]}
        />
      </div>
    </div>
  );
};

export default CoreProductsView;
