/**
 * Inventory Service - Main entry point
 * 
 * This file provides backward compatibility by delegating to specialized services.
 * The service has been split into modular components for better maintainability:
 * 
 * - productService: Product CRUD operations
 * - warehouseService: Warehouse management
 * - transferService: Stock transfers
 * - auditService: Inventory audits
 * - categoryService: Category management
 * - analyticsService: Inventory analytics
 * 
 * @see ./services/ for individual service modules
 */

import { Product, ProductFormData, CreateTransferDTO } from './types';
// Import specialized services
import { productService } from './services/productService';
import { warehouseService } from './services/warehouseService';
import { transferService } from './services/transferService';
import { auditService } from './services/auditService';
import { categoryService } from './services/categoryService';
import { analyticsService } from './services/analyticsService';

/**
 * Main inventory service object
 * Maintains backward compatibility while delegating to specialized services
 */
export const inventoryService = {
  // ==========================================
  // Product Operations (delegated to productService)
  // ==========================================

  getProducts: async (companyId: string, page?: number, limitNum?: number): Promise<Product[]> => {
    return productService.getProducts(companyId, page, limitNum);
  },

  searchProducts: async (companyId: string, term: string) => {
    return productService.searchProducts(companyId, term);
  },

  getProductById: async (id: string) => {
    return productService.getProductById(id);
  },

  createProduct: async (data: ProductFormData, companyId: string, userId: string) => {
    return productService.createProduct(data, companyId, userId);
  },

  updateProduct: async (id: string, data: ProductFormData, companyId: string) => {
    return productService.updateProduct(id, data, companyId);
  },

  deleteProduct: async (id: string) => {
    return productService.deleteProduct(id);
  },

  bulkDeleteProducts: async (ids: string[]) => {
    return productService.bulkDeleteProducts(ids);
  },

  getMinimalProducts: async (companyId: string) => {
    return productService.getMinimalProducts(companyId);
  },

  getItemMovement: async (productId: string, companyId: string) => {
    return productService.getItemMovement(productId, companyId);
  },

  processImportFile: async (file: File, companyId: string, userId: string) => {
    return productService.processImportFile(file, companyId, userId);
  },

  // ==========================================
  // Warehouse Operations (delegated to warehouseService)
  // ==========================================

  getWarehouses: async (companyId: string, branchId?: string | null) => {
    return warehouseService.getWarehouses(companyId, branchId);
  },

  getProductsForWarehouse: async (_companyId: string, warehouseId: string) => {
    return warehouseService.getProductsForWarehouse(warehouseId);
  },

  // ==========================================
  // Transfer Operations (delegated to transferService)
  // ==========================================

  createTransfer: async (data: CreateTransferDTO) => {
    return transferService.createTransfer(data);
  },

  getTransfers: async (companyId: string) => {
    return transferService.getTransfers(companyId);
  },

  // ==========================================
  // Audit Operations (delegated to auditService)
  // ==========================================

  startAudit: async (data: { warehouse_id: string; title: string }, companyId: string, userId: string) => {
    return auditService.startAudit(data, companyId, userId);
  },

  addAuditItem: async (sessionId: string, productId: string, expectedQuantity: number = 0, companyId: string, userId: string) => {
    return auditService.addAuditItem(sessionId, productId, expectedQuantity, companyId, userId);
  },

  finalizeAudit: async (sessionId: string, items: { id?: string; product_id: string; counted_quantity: number }[], _companyId: string, userId: string) => {
    return auditService.finalizeAudit(sessionId, items, userId);
  },

  getAuditSessions: async (companyId: string) => {
    return auditService.getAuditSessions(companyId);
  },

  getAuditSessionDetails: async (sessionId: string) => {
    return auditService.getAuditSessionDetails(sessionId);
  },

  saveAuditProgress: async (items: { id?: string; product_id: string; counted_quantity: number }[]) => {
    return auditService.saveAuditProgress(items);
  },

  deleteAuditItem: async (itemId: string) => {
    return auditService.deleteAuditItem(itemId);
  },

  // ==========================================
  // Category Operations (delegated to categoryService)
  // ==========================================

  getInventoryCategories: async (companyId: string) => {
    return categoryService.getCategories(companyId);
  },

  createCategory: async (companyId: string, name: string) => {
    return categoryService.createCategory(companyId, name);
  },

  deleteCategory: async (id: string) => {
    return categoryService.deleteCategory(id);
  },

  // ==========================================
  // Analytics Operations (delegated to analyticsService)
  // ==========================================

  getInventoryAnalytics: async (companyId: string, from?: string, to?: string) => {
    return analyticsService.getInventoryAnalytics(companyId, from, to);
  },

  // ==========================================
  // Quick Adjustments
  // ==========================================
  
  quickAdjustStock: async (companyId: string, items: { product_id: string; warehouse_id: string; quantity: number }[], userId: string) => {
    const { warehouseApi } = await import('./api/warehouseApi');
    
    // Process in batches of 20 to prevent rate limiting and connection drops
    const BATCH_SIZE = 20;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const promises = batch.map(item => 
         warehouseApi.updateStock(companyId, item.product_id, item.warehouse_id, item.quantity, userId)
      );
      await Promise.all(promises);
    }
    
    return true;
  }
};

// Export specialized services for direct access if needed
export {
  productService,
  warehouseService,
  transferService,
  auditService,
  categoryService,
  analyticsService
};

export default inventoryService;
