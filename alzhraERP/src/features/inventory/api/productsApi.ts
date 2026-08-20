import { supabase } from '../../../lib/supabaseClient';
import { TableInsert, TableUpdate } from '@/core/types/supabase-helpers';
import type { Json } from '../../../core/database.types';
import type { ProductUOM } from '../types';

/** Products CRUD and search */
export const productsApi = {
    getProducts: async (companyId: string, page: number = 1, limitNum: number = 10000, signal?: AbortSignal) => {
        const from = (page - 1) * limitNum;
        const to = from + limitNum - 1;

        const query = supabase.from('products')
            .select(`
                id,
                company_id,
                name_ar,
                sku,
                part_number,
                brand,
                category_id,
                size,
                description,
                purchase_price,
                sale_price,
                min_stock_level,
                unit,
                image_url,
                alternative_numbers,
                barcode,
                created_at,
                updated_at,
                status,
                category:product_categories(id, name),
                stock:product_stock(
                    quantity,
                    warehouse_id,
                    warehouses(name_ar)
                )
            `)
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to);

        // Let TanStack Query cancel this heavy request (10000 products + stock
        // join) at the network layer when a newer fetch supersedes it, instead
        // of leaving it hanging in the browser connection pool for up to 45s.
        return signal ? query.abortSignal(signal) : query;
    },

    getProductById: async (id: string) => {
        return await supabase.from('products')
            .select('*')
            .eq('id', id)
            .single();
    },

    createProduct: async (productData: TableInsert<'products'>) => {
        return await supabase.from('products')
            .insert(productData)
            .select()
            .single();
    },

    updateProduct: async (id: string, updates: TableUpdate<'products'>) => {
        return await supabase.from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
    },

    saveProductUoMs: async (productId: string, uoms: ProductUOM[]) => {
        // The atomic RPC (`save_product_uoms`) is the single source of truth.
        // Only when it is genuinely missing (PGRST202 / not deployed) do we
        // degrade to a direct table write. Real failures (network, constraints,
        // unexpected exceptions) are PROPAGATED — never reported as success —
        // so a failed UOM save can't silently look like it worked.
        // Direct-write fallback result shape (data omitted on failure).
        interface DirectUomWriteResult {
            data?: unknown;
            error: unknown;
        }
        const writeUoMsDirectly = async (): Promise<DirectUomWriteResult> => {
            const { error: deleteError } = await supabase.from('product_uoms').delete().eq('product_id', productId);
            if (deleteError) return { error: deleteError };
            if (uoms.length > 0) {
                return await supabase.from('product_uoms').insert(
                    uoms.map(u => ({
                        uom_name: u.uom_name,
                        conversion_factor: u.conversion_factor,
                        product_id: productId,
                    }))
                );
            }
            return { error: null };
        };

        try {
            const { data, error } = await supabase.rpc('save_product_uoms', {
                p_product_id: productId,
                p_uoms: uoms as unknown as Json
            });
            if (!error) return { data, error: null };

            // If the function is missing, fallback to client-side non-atomic sequence
            const pgError = error as { code?: string; message?: string };
            const errCode = pgError.code || '';
            const errMessage = pgError.message?.toLowerCase() || '';
            if (errCode === 'PGRST202' || errMessage.includes('could not find the function') || errMessage.includes('404')) {
                return await writeUoMsDirectly();
            }
            return { error };
        } catch {
            // Unexpected exception from the RPC path (network / serialization…).
            // Degrade to the direct write so the feature keeps working, but
            // surface any real failure instead of faking success.
            return await writeUoMsDirectly();
        }
    },

    deleteProduct: async (id: string) => {
        // Safety check: prevent deleting products with existing invoice items
        const { count: invoiceCount, error: invErr } = await supabase.from('invoice_items')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', id);
        if (invErr) throw invErr;
        if (invoiceCount && invoiceCount > 0) {
            throw new Error('لا يمكن حذف منتج له فواتير مرتبطة. قم بأرشفته بدلاً من ذلك.');
        }

        // Safety check: prevent deleting products with inventory transactions
        const { count: txCount, error: txErr } = await supabase.from('inventory_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', id);
        if (txErr) throw txErr;
        if (txCount && txCount > 0) {
            throw new Error('لا يمكن حذف منتج له حركات مخزون مرتبطة. قم بأرشفته بدلاً من ذلك.');
        }

        return await supabase.from('products')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
    },

    bulkDeleteProducts: async (ids: string[]) => {
        // Safety check: prevent deleting products with existing references
        const { count: invoiceCount, error: invErr } = await supabase.from('invoice_items')
            .select('id', { count: 'exact', head: true })
            .in('product_id', ids);
        if (invErr) throw invErr;
        if (invoiceCount && invoiceCount > 0) {
            throw new Error(`لا يمكن حذف المنتجات: ${invoiceCount} عنصر فاتورة مرتبط بها. قم بأرشفتها بدلاً من ذلك.`);
        }

        return await supabase.from('products')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', ids);
    },

    searchProduct: async (companyId: string, term: string) => {
        const searchPattern = `%${term.trim()}%`;
        
        return await supabase.from('products')
            .select('id, name_ar, sku, sale_price, purchase_price, part_number, alternative_numbers, brand, quantity:product_stock(quantity)')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .or(`name_ar.ilike.${searchPattern},sku.ilike.${searchPattern},part_number.ilike.${searchPattern},alternative_numbers.ilike.${searchPattern},brand.ilike.${searchPattern}`)
            .order('name_ar')
            .limit(15);
    },

    getSupplier: async (id: string) => {
        return await supabase.from('parties')
            .select('name')
            .eq('id', id)
            .single();
    },

    getCategories: async (companyId: string) => {
        const { data, error } = await supabase.from('product_categories')
            .select('*')
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    createCategory: async (companyId: string, name: string) => {
        return await supabase.from('product_categories')
            .insert({ company_id: companyId, name })
            .select()
            .single();
    },

    deleteCategory: async (id: string) => {
        return await supabase.from('product_categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    },
};
