import React from 'react';
import TransfersView from './TransfersView';
import StockAuditView from './StockAuditView';
import WarehousesView from './WarehousesView';
import VehiclesPage from '../../vehicles/VehiclesPage';
import AuditLogView from './AuditLogView';
import CategoriesManagementView from './CategoriesManagementView';
import ProductExcelGrid from './ProductExcelGrid';
import ProductMicroCard from './ProductMicroCard';
import ProductDetailPane from './ProductDetailPane';
import { Product } from '../types';

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
    handleSmartImportConfirm: (data: { items: any[], currency?: string }) => Promise<void>;
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
    handleSmartImportConfirm,
    onMaximizeProduct
}) => {
    switch (activeView) {
        case 'transfers': return <TransfersView />;
        case 'audit': return <StockAuditView />;
        case 'warehouses': return <WarehousesView />;

        case 'vehicles': return <VehiclesPage />;
        case 'history': return <AuditLogView />;
        case 'categories': return <CategoriesManagementView onFilterProduct={(catName) => {
            setActiveView('products');
            setSearchTerm(catName);
        }} />;

        default: // Products View
            if (isDesktop) {
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
                        <div className={`flex-1 min-h-0 overflow-hidden flex flex-col transition-all duration-300 ${selectedProduct ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
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
                            <div className="lg:col-span-4 h-full overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
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
                );
            }
            // Mobile View
            return displayMode === 'table' ? (
                <ProductExcelGrid
                    products={products}
                    isLoading={isLoading}
                    onDelete={deleteProduct}
                    onViewDetails={setSelectedProduct}
                    onEdit={handleEdit}
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {products.map(p => (
                        <ProductMicroCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
                    ))}
                </div>
            );
    }
};

export default InventoryViewRenderer;
