import React, { useState, useMemo } from 'react';
import { Product, ProductFormData } from '../types';
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
    onCellUpdate?: (rowIndex: number, accessorKey: string, value: any) => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
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
    title = "المنتجات",
    subtitle = `${products.length} منتج في المستودع`,
    colorTheme = "indigo",
    onCellUpdate,
    searchValue,
    onSearchChange
}) => {
    const { saveProduct, bulkDeleteProducts } = useProductMutations();
    const { showToast } = useFeedbackStore();
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string | string[]; type: 'single' | 'bulk' } | null>(null);

    const {
        selectedRowIds,
        setSelectedRowIds,
        handleCopy,
        handleSend,
        clearSelection
    } = useProductBulkActions(products);

    const handleCellUpdate = async (rowIndex: number, accessorKey: string, value: any) => {
        const productToUpdate = products[rowIndex];
        if (productToUpdate) {
            const updatedData = { ...productToUpdate, [accessorKey]: Number(value) || 0 };
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

    const columns = useMemo(() => getProductColumns({
        onEdit,
        onDeleteRequest: onDelete ? (p) => setDeleteConfirm({ id: p.id, type: 'single' }) : undefined,
        hideActions,
        extraColumns
    }), [onEdit, onDelete, hideActions, extraColumns]);

    if (isLoading) return <TableSkeleton rows={10} cols={6} />;

    return (
        <div className="relative h-full flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/80 p-1.5 transition-all duration-300">
            {!hideBulkActions && selectedRowIds.size > 0 && (
                <BulkActionsBar
                    selectedCount={selectedRowIds.size}
                    onClear={clearSelection}
                    onCopy={handleCopy}
                    onSend={handleSend}
                    onDelete={() => setDeleteConfirm({ id: Array.from(selectedRowIds), type: 'bulk' })}
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
                onOrderChange={() => { }}
                onCellUpdate={onCellUpdate || handleCellUpdate}
                enableSelection={!hideBulkActions}
                selectedRowIds={selectedRowIds}
                onSelectionChange={setSelectedRowIds}
                getRowId={(p) => p.id}
                searchValue={searchValue || ''}
                onSearchChange={onSearchChange}
            />

            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDelete}
                title={deleteConfirm?.type === 'bulk' ? 'حذف مجموعة منتجات' : 'حذف منتج'}
                message={deleteConfirm?.type === 'bulk' ? `هل أنت متأكد من حذف ${deleteConfirm.id.length} صنف نهائياً؟` : 'هل أنت متأكد من حذف هذا الصنف نهائياً؟ لا يمكن التراجع عن هذه العملية.'}
                variant="danger"
                confirmLabel="نعم، احذف الآن"
            />
        </div>
    );
};

export default ProductExcelGrid;