import React from 'react';
import TransfersView from './TransfersView';
import StockAuditView from './StockAuditView';
import WarehousesView from './WarehousesView';
import AuditLogView from './AuditLogView';
import CategoriesManagementView from './CategoriesManagementView';
import ProductExcelGrid from './ProductExcelGrid';
import ProductMicroCard from './ProductMicroCard';
import ProductDetailPane from './ProductDetailPane';
import type { Product } from '../types';

interface InventoryViewRendererProps {
  activeView: string;
  products: Product[];
  isLoading: boolean;
  isDesktop: boolean;
  displayMode: 'table' | 'grid';
  selectedProduct: Product | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setActiveView: (view: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  handleEdit: (product: Product) => void;
  deleteProduct: (id: string) => void;
  handleSmartImportConfirm: (data: { items: any[]; currency?: string }) => Promise<void>;
  onMaximizeProduct?: () => void;
}

const InventoryViewRenderer: React.FC<InventoryViewRendererProps> = ({
  activeView,
  products,
  isLoading,
  isDesktop,
  displayMode,
  selectedProduct,
  searchTerm,
  setSearchTerm,
  setActiveView,
  setSelectedProduct,
  handleEdit,
  deleteProduct,
  onMaximizeProduct,
}) => {
  switch (activeView) {
    case 'transfers':
      return <TransfersView />;
    case 'audit':
      return <StockAuditView />;
    case 'warehouses':
      return <WarehousesView />;

    case 'history':
      return <AuditLogView />;
    case 'categories':
      return (
        <CategoriesManagementView
          onFilterProduct={catName => {
            setActiveView('products');
            setSearchTerm(catName);
          }}
        />
      );

    default: // Products View
      if (isDesktop) {
        return (
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
            <div
              className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${selectedProduct ? 'lg:col-span-8' : 'lg:col-span-12'}`}
            >
              <ProductExcelGrid
                products={products}
                isLoading={isLoading}
                onDelete={deleteProduct}
                onViewDetails={setSelectedProduct}
                onEdit={handleEdit}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
            {selectedProduct && (
              <div className="animate-in slide-in-from-right-4 fade-in h-full min-h-0 overflow-hidden duration-300 lg:col-span-4">
                <ProductDetailPane
                  product={selectedProduct}
                  onEdit={handleEdit}
                  onDelete={deleteProduct}
                  onClose={() => {
                    setSelectedProduct(null);
                  }}
                  onMaximize={onMaximizeProduct}
                />
              </div>
            )}
          </div>
        );
      }
      // Mobile View
      return displayMode === 'table' ? (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <ProductExcelGrid
            products={products}
            isLoading={isLoading}
            onDelete={deleteProduct}
            onViewDetails={setSelectedProduct}
            onEdit={handleEdit}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
      ) : (
        <div className="custom-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-3.5 overflow-y-auto p-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map(p => (
            <ProductMicroCard key={p.id} product={p} onClick={setSelectedProduct} />
          ))}
        </div>
      );
  }
};

export default InventoryViewRenderer;
