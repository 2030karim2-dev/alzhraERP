// Inventory Services - Unified exports for all inventory-related services
// This file provides backward compatibility while using the new modular services

export { productService } from './productService';
export { warehouseService } from './warehouseService';
export { transferService } from './transferService';
export { auditService } from './auditService';
export { categoryService } from './categoryService';
export { analyticsService } from './analyticsService';

// Re-export types from the main types file
export type { Product, ProductFormData, ProductFilters, Warehouse, WarehouseFormData, StockTransfer, TransferFormData } from '../types';

// Combined inventory service for backward compatibility
import { productService } from './productService';
import { warehouseService } from './warehouseService';
import { transferService } from './transferService';
import { auditService } from './auditService';
import { categoryService } from './categoryService';
import { analyticsService } from './analyticsService';

export const inventoryServices = {
    // Product operations
    products: productService,

    // Warehouse operations
    warehouses: warehouseService,

    // Transfer operations
    transfers: transferService,

    // Audit operations
    audits: auditService,

    // Category operations
    categories: categoryService,

    // Analytics operations
    analytics: analyticsService
};

export default inventoryServices;
