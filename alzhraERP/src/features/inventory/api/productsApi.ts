import { supabase } from '../../../lib/supabaseClient';
// import { Database } from '../../../core/database.types';

import { TableInsert, TableUpdate } from '@/core/types/supabase-helpers';

/** Products CRUD and search */
export const productsApi = {
    getProducts: async (companyId: string, page: number = 1, limitNum: number = 10000) => {
        const from = (page - 1) * limitNum;
        const to = from + limitNum - 1;

        return await supabase.from('products')
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

    saveProductUoMs: async (productId: string, uoms: any[]) => {
        // product_uoms table may not exist yet — silently skip if so
        try {
            const { data, error } = await supabase.rpc('save_product_uoms', {
                p_product_id: productId,
                p_uoms: uoms
            });
            if (!error) return { data, error: null };

            // If function is missing, fallback to client-side non-atomic sequence
            const errCode = (error as any).code || '';
            const errMessage = (error as any).message?.toLowerCase() || '';
            if (errCode === 'PGRST202' || errMessage.includes('could not find the function') || errMessage.includes('404')) {
                await supabase.from('product_uoms' as any).delete().eq('product_id', productId);
                if (uoms && uoms.length > 0) {
                    const uomsToInsert = uoms.map(u => ({ ...u, product_id: productId }));
                    return await supabase.from('product_uoms' as any).insert(uomsToInsert);
                }
                return { error: null };
            }
            return { error };
        } catch (_) {
            // Safe fallback for connection/unexpected exceptions
            try {
                await supabase.from('product_uoms' as any).delete().eq('product_id', productId);
                if (uoms && uoms.length > 0) {
                    const uomsToInsert = uoms.map(u => ({ ...u, product_id: productId }));
                    return await supabase.from('product_uoms' as any).insert(uomsToInsert);
                }
            } catch (__) { /* table not yet migrated */ }
        }
        return { error: null };
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

    searchProductForFitment: async (companyId: string, term: string) => {
        // 1. Clean and tokenize
        const sanitized = term.replace(/[^\w\s\u0600-\u06FF]/g, ' '); 
        const tokens = sanitized.split(/\s+/).filter(word => word.length > 0);
        
        if (tokens.length < 1) return [];

        const tsQuery = tokens.map(word => `${word}:*`).join(' & ');

        const { data, error } = await supabase.from('products')
            .select('id, name_ar, name_en, sku, part_number, brand')
            .eq('company_id', companyId)
            .textSearch('search_vector', tsQuery, { 
                config: 'simple'
            })
            .limit(10);

        if (error) throw error;
        return data || [];
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
