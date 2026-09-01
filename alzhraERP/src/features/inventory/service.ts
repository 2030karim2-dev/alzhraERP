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
import { supabase } from '@/lib/supabaseClient';
import { parseError } from '@/core/utils/errorUtils';
import type { Json } from '@/core/database.types';

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

  getProducts: async (
    companyId: string,
    page?: number,
    limitNum?: number,
    warehouseId?: string,
    signal?: AbortSignal
  ): Promise<Product[]> => {
    return productService.getProducts(companyId, page, limitNum, warehouseId, signal);
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

  // ==========================================
  // Warehouse Operations (delegated to warehouseService)
  // ==========================================

  getWarehouses: async (companyId: string, _branchId?: string | null) => {
    return warehouseService.getWarehouses(companyId);
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

  startAudit: async (
    data: { warehouse_id: string; title: string },
    companyId: string,
    userId: string
  ) => {
    return auditService.startAudit(data, companyId, userId);
  },

  addAuditItem: async (
    sessionId: string,
    productId: string,
    expectedQuantity: number = 0,
    companyId: string,
    userId: string
  ) => {
    return auditService.addAuditItem(sessionId, productId, expectedQuantity, companyId, userId);
  },

  finalizeAudit: async (
    sessionId: string,
    items: { id?: string; product_id: string; counted_quantity: number }[],
    companyId: string,
    userId: string
  ) => {
    return auditService.finalizeAudit(sessionId, items, userId, companyId);
  },

  getAuditSessions: async (companyId: string) => {
    return auditService.getAuditSessions(companyId);
  },

  getAuditSessionDetails: async (sessionId: string) => {
    return auditService.getAuditSessionDetails(sessionId);
  },

  saveAuditProgress: async (
    items: { id?: string; product_id: string; counted_quantity: number }[]
  ) => {
    return auditService.saveAuditProgress(items);
  },

  deleteAuditItem: async (itemId: string) => {
    return auditService.deleteAuditItem(itemId);
  },

  deleteAuditSession: async (sessionId: string) => {
    return auditService.deleteAuditSession(sessionId);
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
  // Quick Adjustments (Server-Authoritative & Atomic Batch)
  // ==========================================

  quickAdjustStock: async (
    companyId: string,
    items: { product_id: string; warehouse_id: string; quantity: number }[],
    _userId?: string
  ) => {
    if (!items || items.length === 0) return true;

    const { data, error } = await supabase.rpc('quick_adjust_stock_batch', {
      p_company_id: companyId,
      p_items: items as unknown as Json,
      p_notes: 'تسوية يدوية سريعة للمخزون',
    });

    if (error) throw parseError(error);
    return data;
  },
};

// Export specialized services for direct access if needed
export {
  productService,
  warehouseService,
  transferService,
  auditService,
  categoryService,
  analyticsService,
};

export default inventoryService;
