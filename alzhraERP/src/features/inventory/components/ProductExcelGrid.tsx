import React, { useState, useMemo } from 'react';
import type { Product, ProductFormData } from '../types';
import ExcelTable from '../../../ui/common/ExcelTable';
import TableSkeleton from '../../../ui/base/TableSkeleton';
import { useProductMutations, useProductBulkActions } from '../hooks/index';
import { useFeedbackStore } from '../../../features/feedback/store';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import BulkActionsBar from './products/BulkActionsBar';
import { getProductColumns } from './products/ProductTableColumns';

interface Props {
  products: Product[];
  isLoading: boolean;
  onDelete?: ((id: string) => void) | undefined;
  onViewDetails?: ((product: Product) => void) | undefined;
  onEdit?: ((product: Product) => void) | undefined;
  onRowClick?: ((product: Product) => void) | undefined;
  hideActions?: boolean;
  hideBulkActions?: boolean;
  extraColumns?: any[] | undefined;
  title?: string;
  subtitle?: string;
  colorTheme?: string;
  onCellUpdate?: (rowIndex: number, accessorKey: string, value: any, item?: Product) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  visibleColumns?: string[];
  onOrderChange?: ((reorderedData: Product[]) => void) | undefined;
  onToggleCore?: ((product: Product, isCore: boolean) => void) | undefined;
}

const ProductExcelGrid: React.FC<Props> = ({
  products,
  isLoading,
  onDelete,
  onViewDetails,
  onEdit,
  onRowClick,
  hideActions = false,
  hideBulkActions = false,
  extraColumns = [],
  title = 'المنتجات',
  subtitle = `${products.length} منتج في المستودع`,
  colorTheme = 'indigo',
  onCellUpdate,
  searchValue,
  onSearchChange,
  visibleColumns,
  onOrderChange,
  onToggleCore,
}) => {
  const { saveProduct, bulkDeleteProducts, toggleCoreProduct } = useProductMutations();
  const { showToast } = useFeedbackStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string | string[];
    type: 'single' | 'bulk';
  } | null>(null);

  const handleToggleCore = async (product: Product, isCore: boolean) => {
    if (onToggleCore) {
      onToggleCore(product, isCore);
      return;
    }
    await toggleCoreProduct({ id: product.id, isCore });
  };

  const { selectedRowIds, setSelectedRowIds, handleCopy, handleSend, clearSelection } =
    useProductBulkActions(products);

  const handleCellUpdate = async (
    rowIndex: number,
    accessorKey: string,
    value: any,
    item?: Product
  ) => {
    const productToUpdate = item || products[rowIndex];
    if (productToUpdate) {
      const numericKeys = new Set([
        'cost_price',
        'sale_price',
        'min_quantity',
        'stock_quantity',
        'current_stock',
        'wholesale_price',
        'minimum_price',
      ]);
      const formattedValue = numericKeys.has(accessorKey)
        ? Number(value) || 0
        : String(value ?? '').trim();
      const updatedData = { ...productToUpdate, [accessorKey]: formattedValue };
      await saveProduct({ data: updatedData as ProductFormData, id: productToUpdate.id });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'bulk') {
        await bulkDeleteProducts(deleteConfirm.id as string[]);
        clearSelection();
      } else {
        if (onDelete) await onDelete(deleteConfirm.id as string);
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      showToast(err?.message || 'تعذر حذف المنتج. تأكد من عدم وجود فواتير مرتبطة به.', 'error');
      setDeleteConfirm(null);
    }
  };

  const columns = useMemo(
    () =>
      getProductColumns({
        onEdit,
        onDeleteRequest: onDelete
          ? p => {
              setDeleteConfirm({ id: p.id, type: 'single' });
            }
          : undefined,
        onToggleCore: handleToggleCore,
        hideActions,
        extraColumns,
        visibleColumns,
      }),
    [onEdit, onDelete, onToggleCore, hideActions, extraColumns, visibleColumns]
  );

  if (isLoading) return <TableSkeleton rows={10} cols={6} />;

  return (
    <div className="bg-[var(--app-surface)]/60 relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/50 p-1.5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:shadow-none">
      {!hideBulkActions && selectedRowIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedRowIds.size}
          onClear={clearSelection}
          onCopy={handleCopy}
          onSend={handleSend}
          onDelete={() => {
            setDeleteConfirm({ id: Array.from(selectedRowIds), type: 'bulk' });
          }}
        />
      )}

      <ExcelTable
        columns={columns}
        data={products}
        title={title}
        subtitle={subtitle}
        colorTheme={colorTheme as any}
        pageSize={100}
        onRowDoubleClick={onViewDetails}
        onRowClick={onRowClick}
        onOrderChange={onOrderChange || (() => {})}
        onCellUpdate={onCellUpdate || handleCellUpdate}
        enableSelection={!hideBulkActions}
        selectedRowIds={selectedRowIds}
        onSelectionChange={setSelectedRowIds}
        getRowId={p => p.id}
        searchValue={searchValue || ''}
        onSearchChange={onSearchChange}
      />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => {
          setDeleteConfirm(null);
        }}
        onConfirm={confirmDelete}
        title={deleteConfirm?.type === 'bulk' ? 'حذف مجموعة منتجات' : 'حذف منتج'}
        message={
          deleteConfirm?.type === 'bulk'
            ? `هل أنت متأكد من حذف ${deleteConfirm.id.length} صنف نهائياً؟`
            : 'هل أنت متأكد من حذف هذا الصنف نهائياً؟ لا يمكن التراجع عن هذه العملية.'
        }
        variant="danger"
        confirmLabel="نعم، احذف الآن"
      />
    </div>
  );
};

export default ProductExcelGrid;
