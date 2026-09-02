import React, { useState, useRef, useEffect } from 'react';
import { Search, Box, ChevronDown, GitBranch, Globe, PackageCheck, Plus } from 'lucide-react';
import { useProductMutations } from '../../../inventory/hooks/index';
import type { Product, ProductFormData } from '../../../inventory/types';
import Modal from '../../../../ui/base/Modal';
import { PaginationBar } from '../../../../ui/common/PaginationBar';
import { useProductTableConfig } from '../../hooks/useProductTableConfig';
import { useProductSelectionTable } from '../../hooks/useProductSelectionTable';
import ProductDetailModal from '../../../inventory/components/ProductDetailModal';
import AddProductModal from '../../../inventory/components/AddProductModal';
import { productService } from '../../../inventory/service';
import { useBranchFilterStore } from '../../../branches/store';
import { useBranches } from '../../../settings/hooks';
import { useAuthStore } from '../../../auth/store';
import { logger } from '../../../../core/utils/logger';
import { useColumnResize } from './useColumnResize';
import { ProductColumnSettingsMenu } from './ProductColumnSettingsMenu';
import { ProductSelectionTableRow } from './ProductSelectionTableRow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  initialQuery?: string;
  mode?: 'sale' | 'purchase' | 'quotation';
}

const FONT_SIZE_CLASSES = { small: 'text-[10px]', medium: 'text-[11px]', large: 'text-[13px]' };
const HEADER_FONT_SIZE_CLASSES = {
  small: 'text-[10px]',
  medium: 'text-[10px]',
  large: 'text-[12px]',
};

const ProductSelectionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
  initialQuery = '',
  mode = 'sale',
}) => {
  const [localBranchId, setLocalBranchId] = useState<string | null>(null);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthStore();
  const isManager = user?.role === 'owner' || user?.role === 'admin';
  const { activeBranchId } = useBranchFilterStore();
  const { data: branches } = useBranches();
  const activeBranches = Array.isArray(branches) ? branches.filter(b => b.status === 'active') : [];

  const effectiveBranchId = localBranchId ?? activeBranchId;

  const {
    localQuery,
    setLocalQuery,
    showInStockOnly,
    setShowInStockOnly,
    products,
    isLoading,
    sortConfig,
    handleSort,
    pageSize,
    setPageSize,
    totalPages,
    safePage,
    setPage,
    paginatedProducts,
    handlePageChange,
    focusedIndex,
    setFocusedIndex,
    tableBodyRef,
    handleKeyDown,
    handleTableKeyDown,
    handleRowClick,
  } = useProductSelectionTable({ isOpen, initialQuery, effectiveBranchId, mode, onSelect });

  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const { saveProduct, isSaving } = useProductMutations();

  const handleAddProduct = async (data: ProductFormData) => {
    try {
      const created = await saveProduct({ data });
      setShowAddProduct(false);

      const mapped = productService.mapRawProducts([created])[0];
      if (mapped) {
        onSelect(mapped);
        onClose();
      }
    } catch (err) {
      logger.error('ProductSelectionModal', '[ProductSelectionModal] فشل إضافة المنتج:', err);
    }
  };

  const {
    config,
    setColumnWidth,
    toggleColumnVisibility,
    reorderColumn,
    setFontSize,
    resetConfig,
  } = useProductTableConfig();

  const { onMouseDown } = useColumnResize({ setColumnWidth });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setShowBranchMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  const visibleColumns = config.columns.filter(c => c.visible);

  const selectedBranchName =
    localBranchId !== null
      ? (activeBranches.find(b => b.id === localBranchId)?.name ?? 'فرع محدد')
      : activeBranchId !== null
        ? activeBranches.find(b => b.id === activeBranchId)?.name
        : 'جميع الفروع';

  return (
    <>
      {viewProduct && (
        <ProductDetailModal
          product={viewProduct}
          onClose={() => {
            setViewProduct(null);
          }}
        />
      )}

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        icon={Box}
        size="full"
        title="مستكشف الأصناف المتقدم"
        description="انقر مرتين على المنتج لإضافته للفاتورة"
        footer={
          <div className="flex w-full items-center justify-between gap-2 max-md:gap-2">
            <span className="font-mono text-[10px] text-gray-400">{products.length} منتج</span>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded bg-gray-100 py-2 text-[10px] font-bold uppercase transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              إغلاق
            </button>
          </div>
        }
      >
        <div className="flex h-[70vh] flex-col bg-[var(--app-surface)]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b bg-[var(--app-surface)] p-2 dark:border-slate-800 max-md:gap-2 max-md:p-2">
            <button
              type="button"
              onClick={() => {
                setShowAddProduct(true);
              }}
              className="flex items-center gap-1 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 max-md:gap-1.5"
              title="إضافة منتج جديد دون مغادرة النافذة"
            >
              <Plus size={14} />
              منتج جديد
            </button>

            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={15}
              />
              <input
                autoFocus
                type="text"
                value={localQuery}
                onChange={e => {
                  setLocalQuery(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="ابحث بالاسم، رقم القطعة، الماركة..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            {/* Filter: In Stock Only */}
            <button
              type="button"
              onClick={() => {
                setShowInStockOnly(!showInStockOnly);
              }}
              className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors max-md:gap-1.5 ${
                showInStockOnly
                  ? 'border-emerald-600 bg-emerald-500 text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <PackageCheck size={14} />
              متوفر فقط
            </button>

            {/* Filter: Branch selector (managers only) */}
            {isManager && (
              <div className="relative" ref={branchMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchMenu(!showBranchMenu);
                  }}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors max-md:gap-1.5 ${
                    localBranchId !== null
                      ? 'border-indigo-600 bg-indigo-500 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  {localBranchId !== null ? <GitBranch size={14} /> : <Globe size={14} />}
                  <span className="max-w-[100px] truncate">{selectedBranchName}</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${showBranchMenu ? 'rotate-180' : ''}`}
                  />
                </button>
                {showBranchMenu && (
                  <div className="absolute right-0 top-full z-[200] mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setLocalBranchId(null);
                        setShowBranchMenu(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-right text-xs font-semibold transition-colors max-md:gap-2 ${
                        localBranchId === null
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Globe size={13} /> جميع الفروع
                    </button>
                    {activeBranches.map(branch => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => {
                          setLocalBranchId(branch.id);
                          setShowBranchMenu(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-right text-xs font-semibold transition-colors max-md:gap-2 ${
                          localBranchId === branch.id
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <GitBranch size={13} /> {branch.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Column Settings Menu */}
            <ProductColumnSettingsMenu
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              settingsRef={settingsRef}
              config={config}
              setFontSize={setFontSize}
              toggleColumnVisibility={toggleColumnVisibility}
              reorderColumn={reorderColumn}
              resetConfig={resetConfig}
            />
          </div>

          {/* Table */}
          <div
            className="custom-scrollbar flex-1 overflow-auto outline-none"
            onKeyDown={handleTableKeyDown}
            tabIndex={0}
            role="grid"
            aria-label="قائمة المنتجات"
          >
            <table className="w-full min-w-max table-fixed border-collapse border-spacing-0">
              <thead className="sticky top-0 z-20 border-b-2 border-gray-300 bg-gray-100 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                <tr
                  className={`${
                    HEADER_FONT_SIZE_CLASSES[config.fontSize]
                  } text-right font-extrabold uppercase tracking-tighter text-gray-600 dark:text-slate-300`}
                >
                  {visibleColumns.map(col => {
                    const isSortable = !['index', 'actions', 'branch', 'specs'].includes(col.id);
                    const isSorted = sortConfig?.key === col.id;
                    return (
                      <th
                        key={col.id}
                        style={{ width: col.width }}
                        onClick={() => {
                          handleSort(col.id);
                        }}
                        className={`relative select-none border-l border-gray-300 bg-gray-100 p-2 last:border-l-0 dark:border-slate-600 dark:bg-slate-800/80 max-md:p-2 ${
                          col.id === 'index' || col.id === 'stock' || col.id === 'actions'
                            ? 'text-center'
                            : 'pr-4'
                        } ${isSortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700' : ''}`}
                      >
                        <span className="inline-flex items-center gap-1 max-md:gap-1">
                          {col.label}
                          {isSorted && (
                            <span className="text-blue-500">
                              {sortConfig.direction === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </span>
                        {col.id !== 'index' && (
                          <div
                            onMouseDown={e => {
                              onMouseDown(e, col.id, col.width);
                            }}
                            className="absolute left-0 top-0 z-30 -ml-1 h-full w-2 cursor-col-resize transition-colors hover:bg-blue-500/40"
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody ref={tableBodyRef} className="divide-y divide-gray-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length}
                      className="animate-pulse p-10 text-center text-[10px] font-bold text-gray-400 max-md:p-5"
                    >
                      جاري تحميل المنتجات...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length}
                      className="p-10 text-center text-sm text-gray-300 max-md:p-5"
                    >
                      لا توجد نتائج مطابقة
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p, idx) => (
                    <ProductSelectionTableRow
                      key={p.id}
                      product={p}
                      index={idx}
                      visibleColumns={visibleColumns}
                      effectiveBranchId={effectiveBranchId}
                      mode={mode}
                      fontSizeClass={FONT_SIZE_CLASSES[config.fontSize]}
                      isFocused={focusedIndex === idx}
                      onSelect={onSelect}
                      onViewProduct={setViewProduct}
                      onRowClick={handleRowClick}
                      onMouseEnter={() => {
                        setFocusedIndex(idx);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Status bar with pagination */}
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalResults={products.length}
            onPageChange={handlePageChange}
            onPageSizeChange={s => {
              setPageSize(s);
              setPage(1);
            }}
            extraInfo={
              <>
                {showInStockOnly && <span className="text-emerald-500">• عرض المتوفر فقط</span>}
                {effectiveBranchId !== null && (
                  <span className="text-indigo-500">• {selectedBranchName}</span>
                )}
              </>
            }
          />
        </div>
      </Modal>

      {/* Add New Product Modal */}
      <AddProductModal
        isOpen={showAddProduct}
        onClose={() => {
          setShowAddProduct(false);
        }}
        onSubmit={handleAddProduct}
        isSubmitting={isSaving}
        zIndex="z-[10000]"
      />
    </>
  );
};

export default ProductSelectionModal;
