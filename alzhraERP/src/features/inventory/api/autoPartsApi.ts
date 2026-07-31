import { supabase } from '../../../lib/supabaseClient';
import { ProductCrossReference, ProductKitItem, ProductSupplierPrice } from '../types';
import { TableInsert } from '@/core/types/supabase-helpers';

const fetchProductsByIds = async (productIds: string[]) => {
    if (productIds.length === 0) return new Map<string, Record<string, unknown>>();

    const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, name_en, sku, part_number, brand, purchase_price, sale_price, unit, image_url')
        .in('id', productIds);

    if (error) throw error;
    return new Map((data || []).map((product: any) => [product.id, product as Record<string, unknown>]));
};

export const autoPartsApi = {
    // --- Cross References ---
    async getCrossReferences(productId: string) {
        const { data, error } = await supabase
            .from('product_cross_references')
            .select('*')
            .eq('base_product_id', productId);

        if (error) throw error;

        const alternativeProductIds = (data || [])
            .map((item: any) => item.alternative_product_id)
            .filter((id: any): id is string => typeof id === 'string');

        const productsMap = await fetchProductsByIds(alternativeProductIds);

        // Map camelCase for frontend where necessary
        return data?.map((req: any) => {
            type AltProduct = { name_ar?: string; name_en?: string };
            const alternativeProduct = productsMap.get(req.alternative_product_id) || null;
            const alt = alternativeProduct as AltProduct | null;
            return {
                ...req,
                alternative_product: {
                    ...(alternativeProduct || {}),
                    name: alt?.name_ar || alt?.name_en
                }
            };
        }) as unknown as ProductCrossReference[];
    },

    async addCrossReference(payload: TableInsert<'product_cross_references'>) {
        const { data, error } = await supabase
            .from('product_cross_references')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCrossReference(id: string) {
        const { error } = await supabase
            .from('product_cross_references')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Assembly Kits ---
    async getKitComponents(kitId: string) {
        const { data, error } = await supabase
            .from('product_kit_items')
            .select('*')
            .eq('kit_product_id', kitId);

        if (error) throw error;

        const componentProductIds = (data || [])
            .map((item: any) => item.component_product_id)
            .filter((id: any): id is string => typeof id === 'string');

        const productsMap = await fetchProductsByIds(componentProductIds);

        return data?.map((req: any) => {
            type CompProduct = { name_ar?: string; name_en?: string };
            const componentProduct = productsMap.get(req.component_product_id) || null;
            const comp = componentProduct as CompProduct | null;
            return {
                ...req,
                component_product: {
                    ...(componentProduct || {}),
                    name: comp?.name_ar || comp?.name_en
                }
            };
        }) as unknown as ProductKitItem[];
    },

    async addKitComponent(payload: TableInsert<'product_kit_items'>) {
        const { data, error } = await supabase
            .from('product_kit_items')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async removeKitComponent(id: string) {
        const { error } = await supabase
            .from('product_kit_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Supplier Prices (Sourcing) ---
    async getSupplierPrices(productId: string) {
        const { data, error } = await supabase
            .from('product_supplier_prices')
            .select(`
        *,
        supplier:parties!supplier_id (
          id, name
        )
      `)
            .eq('product_id', productId);

        if (error) throw error;

        return data?.map((item: any) => {
            type Sup = { name?: string };
            const sup = item.supplier as unknown as Sup | null;
            return {
                ...item,
                supplier_name: sup?.name
            };
        }) as unknown as ProductSupplierPrice[];
    },

    async addSupplierPrice(payload: TableInsert<'product_supplier_prices'>) {
        const { data, error } = await supabase
            .from('product_supplier_prices')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
