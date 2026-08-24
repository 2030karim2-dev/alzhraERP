import React from 'react';
import { SupplierProductDataGrid } from '../SupplierProductDataGrid';
import type { VendorProductItem } from '../../types';

interface ProductsTabProps {
  products: VendorProductItem[];
  currency?: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCreateQuotation: (selectedProducts: VendorProductItem[]) => void;
  onExportExcel: () => void;
  onOpenImport: () => void;
  isLoading?: boolean;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  currency = 'SAR',
  selectedIds,
  onSelectionChange,
  onCreateQuotation,
  onExportExcel,
  onOpenImport,
  isLoading = false,
}) => {
  return (
    <SupplierProductDataGrid
      products={products}
      currency={currency}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      onCreateQuotation={onCreateQuotation}
      onExportExcel={onExportExcel}
      onOpenImport={onOpenImport}
      isLoading={isLoading}
    />
  );
};
