import type { Product, ProductFormData } from '../types';
import { inventoryApi } from '../api';
import { supabase } from '../../../lib/supabaseClient';
import type { InsertDto } from '../../../core/database.helpers';
import type { TableUpdate } from '@/core/types/supabase-helpers';
import { logger } from '../../../core/utils/logger';

interface RawStock {
  quantity?: number | string;
  warehouse_id: string;
  warehouses?: { name_ar?: string };
}

interface RawProduct {
  id: string;
  company_id: string;
  name_ar: string;
  sku?: string;
  part_number?: string;
  brand?: string;
  category?: { id: string; name: string } | null;
  category_id?: string;
  size?: string;
  description?: string;
  purchase_price?: number | string;
  sale_price?: number | string;
  min_stock_level?: number | string;
  unit?: string;
  image_url?: string | null;
  alternative_numbers?: string | null;
  barcode?: string | null;
  updated_at: string;
  created_at?: string;
  stock?: RawStock[];
  status?: string;
  location?: string;
  uoms?: Array<{ id: string; uom_name: string; conversion_factor: number }>;
}

/** Shape returned by the product search RPC — minimal fields for dropdowns/rows. */
export interface SearchResultProduct {
  id: string;
  name?: string;
  name_ar?: string;
  part_number?: string | null;
  sku?: string | null;
  brand?: string | null;
  size?: string | null;
}

/** Raw row fields consumed by `mapSearchRow` (subset shared by RPC + table fallback). */
interface SearchRow {
  id: string;
  name_ar?: string | null;
  sku?: string | null;
  part_number?: string | null;
  brand?: string | null;
  size?: string | null;
}

/** Maps a raw product row to the minimal search-result shape used by dropdowns/pickers. */
function mapSearchRow(row: SearchRow): SearchResultProduct {
  return {
    id: row.id,
    name: row.name_ar ?? '',
    name_ar: row.name_ar ?? '',
    sku: row.sku ?? null,
    part_number: row.part_number ?? null,
    brand: row.brand ?? null,
    size: row.size ?? null,
  };
}

/**
 * Fallback product search using ILIKE when the smart search RPC is unavailable
 * (mirrors the POS fallback so pickers keep working even if the RPC is missing).
 */
async function searchProductsFallback(
  companyId: string,
  term: string,
  limit = 50
): Promise<SearchResultProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name_ar, sku, part_number, brand, size')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .or(
      `name_ar.ilike.%${term}%,sku.ilike.%${term}%,` +
        `part_number.ilike.%${term}%,alternative_numbers.ilike.%${term}%,` +
        `barcode.ilike.%${term}%`
    )
    .limit(limit);

  if (error) return [];
  return data.map(mapSearchRow);
}

let isSimilarProductsRpcAvailable = true;

export const productService = {
  /**
   * Get all products for a company
   */
  getProducts: async (
    companyId: string,
    page = 1,
    limitNum = 10000,
    warehouseId?: string,
    signal?: AbortSignal
  ): Promise<Product[]> => {
    const { data, error } = await inventoryApi.getProducts(companyId, page, limitNum, signal);
    if (error) throw error;
    return productService.mapRawProducts(data || [], warehouseId);
  },

  /**
   * Maps raw DB rows (arbitrary shape) to the Product domain type.
   * Used both internally and by the paginated hook.
   * @param warehouseId Optional. If provided, `stock_quantity` will reflect ONLY this warehouse's stock.
   */
  mapRawProducts: (rows: unknown[], warehouseId?: string): Product[] => {
    return (rows as RawProduct[])
      .map(prod => {
        if (!prod?.id) return null;

        const stockList = Array.isArray(prod.stock) ? prod.stock : [];

        // Warehouse Isolation Fix: Calculate total stock based on warehouseId if provided
        const relevantStockList = warehouseId
          ? stockList.filter(s => s.warehouse_id === warehouseId)
          : stockList;

        const totalStock = relevantStockList.reduce((sum: number, s: RawStock) => {
          const qty = Number(s.quantity);
          return sum + (isNaN(qty) ? 0 : qty);
        }, 0);

        const categoryName = prod.category?.name || 'عام';

        return {
          id: prod.id,
          company_id: prod.company_id,
          name_ar: prod.name_ar || 'بدون اسم',
          name_en: '',
          name: prod.name_ar || 'بدون اسم',
          sku: prod.sku || '---',
          part_number: prod.part_number || '---',
          brand: prod.brand || '',
          category: categoryName,
          category_id: prod.category_id || null,
          size: prod.size || '',
          specifications: prod.description || '',
          cost_price: Number(prod.purchase_price) || 0,
          sale_price: Number(prod.sale_price) || 0,
          selling_price: Number(prod.sale_price) || 0,
          stock_quantity: totalStock,
          min_stock_level: Number(prod.min_stock_level) || 0,
          unit: prod.unit || 'pcs',
          uoms: (prod.uoms || []).map(u => ({
            id: u.id,
            uom_name: u.uom_name,
            conversion_factor: Number(u.conversion_factor),
          })),
          image_url: prod.image_url || null,
          alternative_numbers: prod.alternative_numbers || null,
          barcode: prod.barcode || null,
          location: (() => {
            const warehouseNames = stockList
              .map((s: RawStock) => s.warehouses?.name_ar)
              .filter(Boolean) as string[];
            const uniqueWarehouses = [...new Set(warehouseNames)].join(', ');
            const shelfLocation = prod.location || '';
            if (uniqueWarehouses && shelfLocation) return `${uniqueWarehouses} (${shelfLocation})`;
            return uniqueWarehouses || shelfLocation || '—';
          })(),
          created_at: prod.created_at || new Date().toISOString(),
          isLowStock: totalStock <= (Number(prod.min_stock_level) || 5),
          warehouse_distribution: stockList.map((s: RawStock) => ({
            warehouse_id: s.warehouse_id,
            warehouse_name: s.warehouses?.name_ar || 'مستودع',
            quantity: Number(s.quantity) || 0,
            location: prod.location || '',
          })),
          alternatives: prod.alternative_numbers
            ? prod.alternative_numbers.split(',').map(n => n.trim())
            : [],
          compatibility: [],
          total_purchases_qty: 0,
          total_sales_qty: 0,
          total_profit: 0,
          total_loss: 0,
          last_invoice_date: new Date().toISOString(),
        } as Product;
      })
      .filter((p): p is Product => p !== null);
  },

  /**
   * Get a single product by ID
   */
  getProductById: async (id: string) => {
    const { data, error } = await inventoryApi.getProductById(id);
    if (error) throw error;
    return { data };
  },

  /**
   * Search products using advanced database search.
   * Uses the paginated search RPC (granted to `authenticated`) with an ILIKE
   * fallback so product pickers keep working even if the RPC is unavailable.
   */
  searchProducts: async (companyId: string, term: string): Promise<SearchResultProduct[]> => {
    try {
      const { data, error } = await supabase.rpc('search_inventory_paginated', {
        p_company_id: companyId,
        p_term: term,
        p_limit: 50,
        p_offset: 0,
        p_sort_key: 'updated_at',
        p_sort_dir: 'desc',
      });
      if (error) {
        logger.warn('inventory', 'searchProducts RPC error, falling back to ILIKE:', error.message);
        return await searchProductsFallback(companyId, term);
      }
      return data.map(mapSearchRow);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('inventory', 'searchProducts failed, using fallback:', message);
      return searchProductsFallback(companyId, term);
    }
  },

  /**
   * Create a new product
   */
  createProduct: async (data: ProductFormData, companyId: string, _userId: string) => {
    const trimmedName = (data.name || data.name_ar || '').trim();
    if (!trimmedName) throw new Error('اسم المنتج مطلوب');

    const trimmedSku = (data.sku || '').trim();
    const trimmedPartNo = (data.part_number || '').trim();
    const trimmedBarcode = (data.barcode || '').trim();
    const trimmedBrand = (data.brand || '').trim();

    // 1. Prevent duplicate product name in company
    const { data: existingName } = await supabase
      .from('products')
      .select('id, name_ar')
      .eq('company_id', companyId)
      .ilike('name_ar', trimmedName)
      .limit(1);

    if (existingName && existingName.length > 0) {
      throw new Error(`يوجد منتج مسجل مسبقاً بنفس الاسم: "${trimmedName}"`);
    }

    // 2. Prevent duplicate SKU in company (if provided)
    if (trimmedSku) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id, name_ar, sku')
        .eq('company_id', companyId)
        .eq('sku', trimmedSku)
        .limit(1);

      if (existingSku && existingSku.length > 0) {
        throw new Error(
          `رمز الصنف (SKU: ${trimmedSku}) مسجل مسبقاً للمنتج: "${existingSku[0].name_ar}"`
        );
      }
    }

    // 3. Prevent duplicate Barcode in company (if provided)
    if (trimmedBarcode) {
      const { data: existingBarcode } = await supabase
        .from('products')
        .select('id, name_ar, barcode')
        .eq('company_id', companyId)
        .eq('barcode', trimmedBarcode)
        .limit(1);

      if (existingBarcode && existingBarcode.length > 0) {
        throw new Error(
          `الباركود (${trimmedBarcode}) مسجل مسبقاً للمنتج: "${existingBarcode[0].name_ar}"`
        );
      }
    }

    // 4. Prevent duplicate Part Number + Brand in company (if provided)
    if (trimmedPartNo) {
      let partQuery = supabase
        .from('products')
        .select('id, name_ar, part_number, brand')
        .eq('company_id', companyId)
        .eq('part_number', trimmedPartNo);

      if (trimmedBrand) {
        partQuery = partQuery.eq('brand', trimmedBrand);
      }

      const { data: existingPart } = await partQuery.limit(1);
      if (existingPart && existingPart.length > 0) {
        throw new Error(
          `رقم القطعة (${trimmedPartNo}${trimmedBrand ? ` - ${trimmedBrand}` : ''}) مسجل مسبقاً للمنتج: "${existingPart[0].name_ar}"`
        );
      }
    }

    const payload: InsertDto<'products'> = {
      company_id: companyId,
      name_ar: trimmedName,
      sku: trimmedSku || `SKU-${Date.now()}`,
      sale_price: Number(data.selling_price) || 0,
      purchase_price: Number(data.cost_price) || 0,
      min_stock_level: Number(data.min_stock_level) || 5,
      unit: data.unit || 'piece',
      part_number: trimmedPartNo || null,
      brand: trimmedBrand || null,
      status: 'active',
      description: data.specifications || null,
      size: data.size || null,
      image_url: data.image_url || null,
      alternative_numbers: data.alternative_numbers || null,
      barcode: trimmedBarcode || null,
      category_id: data.category && data.category.length === 36 ? data.category : null,
    };

    try {
      const { data: product, error } = await inventoryApi.createProduct(payload);
      if (error) throw error;

      // Save UOMs
      if (product && data.uoms && data.uoms.length > 0) {
        await inventoryApi.saveProductUoMs(product.id, data.uoms);
      }

      // Initialize stock in default warehouse
      if (product) {
        const { data: warehouses } = await supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', companyId)
          .limit(1);

        if (warehouses && warehouses.length > 0) {
          const warehouse = warehouses[0];
          await inventoryApi.initializeStock(companyId, _userId, {
            product_id: product.id,
            warehouse_id: warehouse.id,
            quantity: Number(data.stock_quantity) || 0,
          });
        }
      }

      return product;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new Error('عذراً، بيانات الصنف (SKU أو الاسم أو الباركود) مكررة ومسجلة مسبقاً');
      }
      throw error;
    }
  },

  /**
   * Update an existing product
   */
  updateProduct: async (id: string, data: ProductFormData, companyId?: string) => {
    logger.debug('ProductService', `Updating product ${id}`, data);

    const trimmedName = (data.name || data.name_ar || '').trim();
    const trimmedSku = (data.sku || '').trim();
    const trimmedBarcode = (data.barcode || '').trim();
    const trimmedPartNo = (data.part_number || '').trim();
    const trimmedBrand = (data.brand || '').trim();

    if (companyId) {
      // 1. Check duplicate name if name provided
      if (trimmedName) {
        const { data: existingName } = await supabase
          .from('products')
          .select('id, name_ar')
          .eq('company_id', companyId)
          .ilike('name_ar', trimmedName)
          .neq('id', id)
          .limit(1);

        if (existingName && existingName.length > 0) {
          throw new Error(`يوجد منتج آخر مسجل بنفس الاسم: "${trimmedName}"`);
        }
      }

      // 2. Check duplicate SKU
      if (trimmedSku) {
        const { data: existingSku } = await supabase
          .from('products')
          .select('id, name_ar, sku')
          .eq('company_id', companyId)
          .eq('sku', trimmedSku)
          .neq('id', id)
          .limit(1);

        if (existingSku && existingSku.length > 0) {
          throw new Error(
            `رمز الصنف (SKU: ${trimmedSku}) مسجل مسبقاً لمنتج آخر: "${existingSku[0].name_ar}"`
          );
        }
      }

      // 3. Check duplicate Barcode
      if (trimmedBarcode) {
        const { data: existingBarcode } = await supabase
          .from('products')
          .select('id, name_ar, barcode')
          .eq('company_id', companyId)
          .eq('barcode', trimmedBarcode)
          .neq('id', id)
          .limit(1);

        if (existingBarcode && existingBarcode.length > 0) {
          throw new Error(
            `الباركود (${trimmedBarcode}) مسجل مسبقاً لمنتج آخر: "${existingBarcode[0].name_ar}"`
          );
        }
      }

      // 4. Check duplicate Part Number + Brand
      if (trimmedPartNo) {
        let partQuery = supabase
          .from('products')
          .select('id, name_ar, part_number, brand')
          .eq('company_id', companyId)
          .eq('part_number', trimmedPartNo)
          .neq('id', id);

        if (trimmedBrand) {
          partQuery = partQuery.eq('brand', trimmedBrand);
        }

        const { data: existingPart } = await partQuery.limit(1);
        if (existingPart && existingPart.length > 0) {
          throw new Error(
            `رقم القطعة (${trimmedPartNo}${trimmedBrand ? ` - ${trimmedBrand}` : ''}) مسجل مسبقاً لمنتج آخر: "${existingPart[0].name_ar}"`
          );
        }
      }
    }

    try {
      const payload: TableUpdate<'products'> = {
        name_ar: trimmedName || 'صنف',
        sale_price: Number(data.selling_price) || 0,
        purchase_price: Number(data.cost_price) || 0,
        min_stock_level: Number(data.min_stock_level) || 0,
        unit: data.unit || 'piece',
      };

      if (trimmedSku) payload.sku = trimmedSku;
      if (data.part_number !== undefined) payload.part_number = trimmedPartNo || null;
      if (data.brand !== undefined) payload.brand = trimmedBrand || null;
      if (data.specifications !== undefined) payload.description = data.specifications || null;
      if (data.size !== undefined) payload.size = data.size || null;
      if (data.image_url !== undefined) payload.image_url = data.image_url || null;
      if (data.alternative_numbers !== undefined)
        payload.alternative_numbers = data.alternative_numbers || null;
      if (data.barcode !== undefined) payload.barcode = trimmedBarcode || null;
      if (data.location !== undefined) payload.location = data.location || null;
      payload.category_id = data.category && data.category.length === 36 ? data.category : null;

      logger.debug('ProductService', `Sending update payload to API`, payload);
      const { data: product, error } = await inventoryApi.updateProduct(id, payload);

      if (error) {
        logger.error('ProductService', `API update failed`, error);
        throw error;
      }

      // Update UOMs
      if (data.uoms) {
        await inventoryApi.saveProductUoMs(id, data.uoms);
      }

      logger.debug('ProductService', `Product metadata updated successfully`, product);

      // [CRITICAL FIX]: Do NOT update stock during product edit.
      // data.stock_quantity contains the TOTAL stock across all warehouses.
      // If we update the default warehouse with the total stock, we corrupt the isolated quantities.
      // Stock should only be updated via dedicated inventory transactions (purchases, transfers, audits, sales).

      return product;
    } catch (err) {
      logger.error('ProductService', `Critical failure in updateProduct`, err);
      throw err;
    }
  },

  /**
   * Delete a product
   */
  deleteProduct: async (id: string) => {
    const { error } = await inventoryApi.deleteProduct(id);
    if (error) throw error;
  },

  /**
   * Bulk delete products
   */
  bulkDeleteProducts: async (ids: string[]) => {
    const { error } = await inventoryApi.bulkDeleteProducts(ids);
    if (error) throw error;
  },

  /**
   * Get minimal product list (for dropdowns and quick selections)
   */
  getMinimalProducts: async (companyId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name_ar, sku, sale_price')
      .eq('company_id', companyId)
      .eq('status', 'active');
    if (error) throw error;
    return (data || []).map(
      (p: { id: string; name_ar: string; sku: string | null; sale_price: number | null }) => ({
        id: p.id,
        name: p.name_ar,
        sku: p.sku,
        selling_price: p.sale_price || 0,
      })
    );
  },

  /**
   * Get item movement history with date filtering and detail resolution, now processed on the DB side
   */
  getItemMovement: async (productId: string, companyId: string) => {
    const { data, error } = await supabase.rpc('get_item_movements_with_balance', {
      p_company_id: companyId,
      p_product_id: productId,
    });

    if (error) throw error;

    return data || [];
  },

  /**
   * Get products with similar names to detect potential duplicates
   */
  getSimilarProducts: async (name: string, companyId: string) => {
    try {
      if (isSimilarProductsRpcAvailable) {
        const { data, error } = await supabase.rpc('get_similar_products', {
          p_name: name,
          p_company_id: companyId,
        });

        if (!error && data) {
          return data;
        }

        if (error) {
          const errCode = error.code ?? '';
          const errMsg = error.message ?? '';
          if (
            errCode === 'PGRST202' ||
            errCode === '404' ||
            errMsg.includes('not found') ||
            errMsg.includes('does not exist')
          ) {
            isSimilarProductsRpcAvailable = false;
          }
        }
      }

      // If RPC fails or is unavailable on backend, fallback to fast ILIKE search
      const { data: fallbackData } = await supabase
        .from('products')
        .select('id, name_ar, sku')
        .eq('company_id', companyId)
        .ilike('name_ar', `%${name}%`)
        .limit(5);

      return (fallbackData || []).map(
        (product: { id: string; name_ar: string; sku: string | null }) => ({
          ...product,
          similarity: 0.5,
        })
      );
    } catch {
      return [];
    }
  },

  /**
   * Get all potential duplicate pairs in the company inventory
   */
  getPotentialDuplicates: async (companyId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_potential_duplicates', {
        p_company_id: companyId,
      });
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
};

export default productService;
