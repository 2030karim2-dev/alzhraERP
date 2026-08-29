/* eslint-disable */
import React, { useState, useMemo } from 'react';
import { useProductsPaginated } from './hooks/useProductsPaginated';
import { useProductMutations } from './hooks/useProducts';
import { useInventoryView } from './hooks/useInventoryView';
import { useProductImport } from './hooks/useProductImport';
import type { Product } from './types';
import ProductDetailModal from './components/ProductDetailModal';
import ProductDetailPane from './components/ProductDetailPane';
import AddProductModal from './components/AddProductModal';
import SmartImportView from '../smart-import/components/SmartImportView';
import MicroHeader from '../../ui/base/MicroHeader';
import {
  Database,
  Plus,
  List,
  LayoutGrid,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react';
import { useBreakpoint, useCurrentBreakpoint } from '../../lib/hooks/useBreakpoint';
import ContentContainer from '../../ui/layout/ContentContainer';
import { useTranslation } from '../../lib/hooks/useTranslation';
import ErrorDisplay from '../../ui/base/ErrorDisplay';
import FullscreenContainer from '../../ui/base/FullscreenContainer';
import { cn } from '../../core/utils';
import InventoryViewRenderer from './components/InventoryViewRenderer';
import { getInventoryTabs } from './constants';
import ServerPaginationBar from '../../ui/common/ServerPaginationBar';
import { logger } from '../../core/utils/logger';

const InventoryPage: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    activeView,
    setActiveView,
    displayMode,
    setDisplayMode,
    selectedProduct,
    setSelectedProduct,
    editingProduct,
    isModalOpen,
    handleEdit,
    handleAdd,
    handleCloseModal,
  } = useInventoryView();

  const [pageSize, setPageSize] = useState(50);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isDetailsMaximized, setIsDetailsMaximized] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);

  const { t } = useTranslation();
  const isDesktop = useBreakpoint('lg');
  const breakpoint = useCurrentBreakpoint();
  const isWideDesktop = breakpoint === '3xl' || breakpoint === '4xl' || breakpoint === '5xl';

  // Show split-view detail pane on wide desktops (1920px+) when a product is selected
  const showSplitDetail = isWideDesktop && !!selectedProduct;

  const {
    products,
    totalCount,
    totalPages,
    page,
    isFetching,
    isLoading,
    isError,
    error,
    handleSearchChange,
    goToPage,
  } = useProductsPaginated({ pageSize, initialSearch: searchTerm });

  // Bridge: MicroHeader sets searchTerm in useInventoryView;
  // useProductsPaginated handles debounced server search.
  const handleSearch = (v: string) => {
    setSearchTerm(v);
    handleSearchChange(v);
  };

  const { saveProduct, isSaving, deleteProduct } = useProductMutations();
  const { handleSmartImportConfirm: runSmartImport } = useProductImport(products);

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct(null);
    }
  };

  const tabs = useMemo(() => getInventoryTabs(t), [t]);

  const handleSmartImportConfirm = async (data: { items: unknown[]; currency?: string }) => {
    const success = await runSmartImport(
      data as { items: Parameters<typeof runSmartImport>[0]['items']; currency?: string }
    );
    if (success) {
      setShowSmartImport(false);
      setActiveView('products');
    }
  };

  // Stats from current page (server delivers totalCount for the badge)
  const { availableProducts, outOfStockProducts } = useMemo(
    () => ({
      availableProducts: products.filter(p => p.stock_quantity > 0).length,
      outOfStockProducts: products.filter(p => p.stock_quantity <= 0).length,
    }),
    [products]
  );

  return (
    <FullscreenContainer
      isMaximized={isMaximized}
      onToggleMaximize={() => {
        setIsMaximized(false);
        setIsZenMode(false);
      }}
      isZenMode={isZenMode}
    >
      <div className="font-cairo flex h-full flex-col bg-[#f8fafc] dark:bg-slate-950">
        <MicroHeader
          title={t('inventory_management')}
          icon={Database}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
            if (isMaximized) setIsZenMode(false);
          }}
          isZenMode={isZenMode}
          onToggleZen={() => setIsZenMode(!isZenMode)}
          actions={
            <div className="flex items-center gap-2 max-md:gap-1">
              {activeView === 'products' && (
                <div
                  className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:text-xs md:flex"
                  title="إحصائيات المنتجات"
                >
                  <span
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400"
                    title="إجمالي المنتجات"
                  >
                    <Database size={12} /> {totalCount.toLocaleString('en-US')}
                  </span>
                  <span className="h-3 w-px bg-slate-300 dark:bg-slate-600"></span>
                  <span
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                    title="منتجات متوفرة"
                  >
                    <CheckCircle size={12} /> {availableProducts}
                  </span>
                  <span className="h-3 w-px bg-slate-300 dark:bg-slate-600"></span>
                  <span
                    className="flex items-center gap-1 text-rose-600 dark:text-rose-400"
                    title="منتجات ناقصة"
                  >
                    <AlertTriangle size={12} /> {outOfStockProducts}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSmartImport(true)}
                  className="hidden items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-md shadow-purple-500/20 active:scale-95 sm:flex"
                >
                  <Sparkles size={14} />
                  <span>استيراد ذكي</span>
                </button>
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-md shadow-blue-500/20 active:scale-95 max-md:px-2 max-md:py-1 max-md:text-[10px]"
                >
                  <Plus size={14} />
                  <span>{t('add_new_entity', { entity: t('product') })}</span>
                </button>
                {!isDesktop && activeView === 'products' && (
                  <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-slate-800 max-md:p-0.5">
                    <button
                      onClick={() => setDisplayMode('table')}
                      className={`rounded-lg p-1.5 max-md:p-1 ${displayMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      <List size={14} />
                    </button>
                    <button
                      onClick={() => setDisplayMode('grid')}
                      className={`rounded-lg p-1.5 max-md:p-1 ${displayMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          }
          searchValue={searchTerm}
          onSearchChange={handleSearch}
          tabs={tabs}
          activeTab={activeView}
          onTabChange={setActiveView}
        />

        <div
          className={cn(
            'relative z-20 flex flex-1 flex-col min-h-0 overflow-hidden transition-all duration-500',
            isZenMode ? 'bg-[var(--app-surface)]' : ''
          )}
        >
          <ContentContainer fluid fillHeight className="h-full flex-1 flex flex-col min-h-0">
            {showSmartImport ? (
              <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b bg-gray-50 p-3 dark:bg-slate-950/50 max-md:p-2">
                  <h3 className="flex items-center gap-2 font-bold text-purple-600">
                    <Sparkles size={16} /> الاستيراد الذكي (AI)
                  </h3>
                  <button
                    onClick={() => setShowSmartImport(false)}
                    className="rounded-lg p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <SmartImportView mode="inventory" onConfirm={handleSmartImportConfirm} />
                </div>
              </div>
            ) : showSplitDetail ? (
              <div className="flex flex-1 min-h-0 h-full gap-0 overflow-hidden">
                {/* Detail Pane — left side on RTL */}
                <div className="custom-scrollbar w-[480px] overflow-y-auto border-l border-[var(--app-border)] bg-[var(--app-surface)] 4xl:w-[560px] 5xl:w-[640px]">
                  <div className="p-4 max-md:p-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[var(--app-text)]">تفاصيل المنتج</h3>
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="rounded-lg p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)]"
                      >
                        ✕
                      </button>
                    </div>
                    <ProductDetailPane
                      product={selectedProduct}
                      onEdit={handleEdit}
                      onDelete={handleDeleteProduct}
                    />
                  </div>
                </div>
                {/* Table/Grid — right side */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <InventoryViewRenderer
                    activeView={activeView}
                    products={products}
                    isLoading={isLoading}
                    isDesktop={isDesktop}
                    displayMode={displayMode}
                    selectedProduct={selectedProduct}
                    searchTerm={searchTerm}
                    setSearchTerm={handleSearch}
                    setActiveView={setActiveView}
                    setSelectedProduct={setSelectedProduct}
                    handleEdit={handleEdit}
                    deleteProduct={handleDeleteProduct}
                    handleSmartImportConfirm={handleSmartImportConfirm}
                    onMaximizeProduct={() => setIsDetailsMaximized(true)}
                  />
                  {activeView === 'products' && (
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
                  )}
                </div>
              </div>
            ) : (
              /* Standard Layout: single column */
              <div className="flex flex-1 min-h-0 h-full flex-col overflow-hidden transition-all duration-500">
                {isError ? (
                  <ErrorDisplay
                    error={error?.message || null}
                    onRetry={() => goToPage(page)}
                    variant="full"
                  />
                ) : (
                  <>
                    <InventoryViewRenderer
                      activeView={activeView}
                      products={products}
                      isLoading={isLoading}
                      isDesktop={isDesktop}
                      displayMode={displayMode}
                      selectedProduct={selectedProduct}
                      searchTerm={searchTerm}
                      setSearchTerm={handleSearch}
                      setActiveView={setActiveView}
                      setSelectedProduct={setSelectedProduct}
                      handleEdit={handleEdit}
                      deleteProduct={handleDeleteProduct}
                      handleSmartImportConfirm={handleSmartImportConfirm}
                      onMaximizeProduct={() => setIsDetailsMaximized(true)}
                    />
                    {activeView === 'products' && (
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
                    )}
                  </>
                )}
              </div>
            )}
          </ContentContainer>
        </div>

        {/* Show modal on mobile/non-wide desktop, or when explicitly maximized */}
        {selectedProduct && !isWideDesktop && (!isDesktop || isDetailsMaximized) && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => {
              setSelectedProduct(null);
              setIsDetailsMaximized(false);
            }}
            onEdit={handleEdit}
          />
        )}

        <AddProductModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={async data => {
            try {
              await saveProduct(editingProduct?.id ? { data, id: editingProduct.id } : { data });
              if (selectedProduct && editingProduct && selectedProduct.id === editingProduct.id) {
                setSelectedProduct(prev =>
                  prev
                    ? ({
                        ...prev,
                        ...data,
                        name_ar: data.name,
                        name: data.name,
                        cost_price: Number(data.cost_price) || 0,
                        sale_price: Number(data.selling_price) || 0,
                        selling_price: Number(data.selling_price) || 0,
                        purchase_price: Number(data.cost_price) || 0,
                        min_stock_level: Number(data.min_stock_level) || 0,
                      } as Product)
                    : null
                );
              }
              handleCloseModal();
            } catch (err) {
              logger.error('InventoryPage', 'Validation or API error:', err);
            }
          }}
          isSubmitting={isSaving}
          initialData={editingProduct}
        />
      </div>
    </FullscreenContainer>
  );
};

export default InventoryPage;
