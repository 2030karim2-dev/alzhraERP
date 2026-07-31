import { Product, ProductFormData } from '../types';
import { inventoryApi } from '../api';
import { supabase } from '../../../lib/supabaseClient';
import { InsertDto } from '../../../core/database.helpers';
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

export const productService = {
    /**
     * Get all products for a company
     */
    getProducts: async (companyId: string, page: number = 1, limitNum: number = 10000): Promise<Product[]> => {
        const { data, error } = await inventoryApi.getProducts(companyId, page, limitNum);
        if (error) throw error;
        return productService.mapRawProducts(data || []);
    },

    /**
     * Maps raw DB rows (any shape) to the Product domain type.
     * Used both internally and by the paginated hook.
     */
    mapRawProducts: (rows: unknown[]): Product[] => {
        return (rows as RawProduct[]).map((prod) => {
            if (!prod || !prod.id) return null;

            const stockList = Array.isArray(prod.stock) ? prod.stock : [];
            const totalStock = stockList.reduce((sum: number, s: RawStock) => {
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
                    conversion_factor: Number(u.conversion_factor)
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
                    location: prod.location || ''
                })),
                alternatives: prod.alternative_numbers ? prod.alternative_numbers.split(',').map(n => n.trim()) : [],
                compatibility: [],
                total_purchases_qty: 0,
                total_sales_qty: 0,
                total_profit: 0,
                total_loss: 0,
                last_invoice_date: new Date().toISOString()
            } as Product;
        }).filter((p): p is Product => p !== null);
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
     * Search products using advanced database search
     */
    searchProducts: async (companyId: string, term: string): Promise<Record<string, unknown>[]> => {
        const { data, error } = await supabase.rpc('search_inventory', {
            p_term: term,
            p_company_id: companyId
        });
        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new product
     */
    createProduct: async (data: ProductFormData, companyId: string, _userId: string) => {
        // Prevent duplicate names
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('company_id', companyId)
            .eq('name_ar', data.name)
            .limit(1);

        if (existing && existing.length > 0) {
            throw new Error(`يوجد منتج بنفس الاسم بالفعل: ${data.name}`);
        }

        const payload: InsertDto<'products'> = {
            company_id: companyId,
            name_ar: data.name,
            sku: data.sku || `SKU-${Date.now()}`,
            sale_price: Number(data.selling_price) || 0,
            purchase_price: Number(data.cost_price) || 0,
            min_stock_level: Number(data.min_stock_level) || 5,
            unit: data.unit || 'piece',
            part_number: data.part_number || null,
            brand: data.brand || null,
            status: 'active',
            description: data.specifications || null,
            size: data.size || null,
            image_url: data.image_url || null,
            alternative_numbers: data.alternative_numbers || null,
            barcode: data.barcode || null,
            category_id: (data.category && data.category.length === 36) ? data.category : null
        } as any;

        const { data: product, error } = await inventoryApi.createProduct(payload);
        if (error) throw error;

        // Save UOMs
        if (product && data.uoms && data.uoms.length > 0) {
            // using type assertion since api aggregation might not have exact types
            await (inventoryApi as any).saveProductUoMs(product.id, data.uoms);
        }

        // Initialize stock in default warehouse
        if (product) {
            const { data: warehouses } = await supabase
                .from('warehouses')
                .select('id')
                .eq('company_id', companyId)
                .limit(1);

            if (warehouses && warehouses.length > 0) {
                const warehouse = warehouses[0] as { id: string };
                await inventoryApi.initializeStock(companyId, _userId, {
                    product_id: product.id,
                    warehouse_id: warehouse.id,
                    quantity: Number(data.stock_quantity) || 0
                });
            }
        }

        return product;
    },

    /**
     * Update an existing product
     */
    updateProduct: async (id: string, data: ProductFormData, companyId: string) => {
        logger.debug('ProductService', `Updating product ${id}`, data);

        try {
            const payload: any = {
                name_ar: data.name,
                sale_price: Number(data.selling_price),
                purchase_price: Number(data.cost_price),
                min_stock_level: Number(data.min_stock_level),
                unit: data.unit,
            };

            if (data.part_number !== undefined) payload.part_number = data.part_number || null;
            if (data.brand !== undefined) payload.brand = data.brand || null;
            if (data.specifications !== undefined) payload.description = data.specifications || null;
            if (data.size !== undefined) payload.size = data.size || null;
            if (data.image_url !== undefined) payload.image_url = data.image_url || null;
            if (data.alternative_numbers !== undefined) payload.alternative_numbers = data.alternative_numbers || null;
            if (data.barcode !== undefined) payload.barcode = data.barcode || null;
            if (data.category) payload.category_id = data.category.length === 36 ? data.category : null;

            logger.debug('ProductService', `Sending update payload to API`, payload);
            const { data: product, error } = await inventoryApi.updateProduct(id, payload as any);

            if (error) {
                logger.error('ProductService', `API update failed`, error);
                throw error;
            }

            // Update UOMs
            if (data.uoms) {
                await (inventoryApi as any).saveProductUoMs(id, data.uoms);
            }

            logger.debug('ProductService', `Product metadata updated successfully`, product);

            // Update stock in default warehouse
            if (data.stock_quantity !== undefined) {
                logger.debug('ProductService', `Checking for default warehouse to update stock`);
                const { data: warehouses, error: whError } = await supabase
                    .from('warehouses')
                    .select('id')
                    .eq('company_id', companyId)
                    .limit(1);

                if (whError) {
                    logger.error('ProductService', `Failed to fetch warehouses`, whError);
                } else if (warehouses && warehouses.length > 0) {
                    const warehouse = warehouses[0] as { id: string };
                    logger.debug('ProductService', `Updating stock in warehouse ${warehouse.id} to ${data.stock_quantity}`);
                    try {
                        // Pass null for userId if not available in this context, or we could pass current user if tracked in store
                        await inventoryApi.updateStock(companyId, id, warehouse.id, Number(data.stock_quantity));
                        logger.debug('ProductService', `Stock updated successfully via transaction`);
                    } catch (stockErr) {
                        logger.error('ProductService', `Failed to update stock, but metadata was saved`, stockErr);
                        // We don't throw here to avoid failing the whole operation if only stock fails
                    }
                } else {
                    logger.warn('ProductService', `No default warehouse found for stock initialization`);
                }
            }

            return product;
        } catch (err: any) {
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
        const { data, error } = await supabase.from('products')
            .select('id, name_ar, sku, sale_price')
            .eq('company_id', companyId)
            .eq('status', 'active');
        if (error) throw error;
        return (data || []).map((p: { id: string, name_ar: string, sku: string | null, sale_price: number | null }) => ({
            id: p.id,
            name: p.name_ar,
            sku: p.sku,
            selling_price: p.sale_price || 0
        }));
    },

    /**
     * Get item movement history with date filtering and detail resolution, now processed on the DB side
     */
    getItemMovement: async (productId: string, companyId: string) => {
        const { data, error } = await supabase.rpc('get_item_movements_with_balance', {
            p_company_id: companyId,
            p_product_id: productId
        });

        if (error) throw error;

        return data || [];
    },

    /**
     * Process import file (placeholder for future implementation)
     */
    processImportFile: async (_file: File, _companyId: string, _userId: string) => {
        // Simplified import logic placeholder - in production would use XLSX parsing
        return Promise.resolve();
    },

    /**
     * Get products with similar names to detect potential duplicates
     */
    getSimilarProducts: async (name: string, companyId: string) => {
        const { data, error } = await supabase.rpc('get_similar_products', {
            p_name: name,
            p_company_id: companyId
        });

        const code = error?.code || '';
        const message = error?.message?.toLowerCase() || '';

        if (error && (code === 'PGRST202' || message.includes('could not find the function') || message.includes('404'))) {
            // Use trigram similarity matching for the fallback, which is much faster than ILIKE %...%
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('products')
                .select('id, name_ar, sku')
                .eq('company_id', companyId)
                .filter('name_ar', 'match', `%${name}%`) // Using trigram if available, or ILIKE fallback
                .limit(5);

            if (fallbackError) throw fallbackError;

            return (fallbackData || []).map((product: { id: string; name_ar: string; sku: string | null }) => ({
                ...product,
                similarity: 0.5,
            }));
        }

        if (error) throw error;
        return data || [];
    },

    /**
     * Get all potential duplicate pairs in the company inventory
     */
    getPotentialDuplicates: async (companyId: string) => {
        const { data, error } = await supabase.rpc('get_potential_duplicates', {
            p_company_id: companyId
        });
        if (error) throw error;
        return data || [];
    }
};

export default productService;
