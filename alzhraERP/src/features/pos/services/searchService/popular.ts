/**
 * POS Smart Search — popular products lookup.
 */
import { supabase } from '../../../../lib/supabaseClient';
import type { POSSearchResult } from './types';

/**
 * Get popular products (most sold in last 30 days).
 */
export async function getPopularProducts(
    companyId: string,
    limit: number = 10
): Promise<POSSearchResult[]> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase.rpc('get_popular_products', {
            p_company_id: companyId,
            p_limit: limit,
        });

        if (error) {
            // Fallback: get recent products
            const { data: fallback } = await supabase
                .from('products')
                .select('id, name_ar, sku, part_number, brand, sale_price, purchase_price, unit, image_url')
                .eq('company_id', companyId)
                .eq('status', 'active')
                .order('updated_at', { ascending: false })
                .limit(limit);

            return (fallback || []).map((row: any) => ({
                id: row.id,
                type: 'product' as const,
                name: row.name_ar || '',
                name_ar: row.name_ar || '',
                sku: row.sku || '',
                part_number: row.part_number || '',
                brand: row.brand || '',
                selling_price: Number(row.sale_price) || 0,
                cost_price: Number(row.purchase_price) || 0,
                stock_quantity: 0,
                unit: row.unit || 'pcs',
                image_url: row.image_url || null,
                score: 5,
                is_popular: true,
            }));
        }

        return (data || []).map((row: any) => ({
            id: row.product_id || row.id,
            type: 'product' as const,
            name: row.name_ar || row.name || '',
            name_ar: row.name_ar || row.name || '',
            sku: row.sku || '',
            part_number: row.part_number || '',
            brand: row.brand || '',
            selling_price: Number(row.sale_price) || 0,
            cost_price: Number(row.purchase_price) || 0,
            stock_quantity: Number(row.stock_quantity) || 0,
            unit: row.unit || 'pcs',
            image_url: row.image_url || null,
            score: 10 + (Number(row.sales_count) || 0),
            sales_count: Number(row.sales_count) || 0,
            is_popular: true,
        }));
    } catch {
        return [];
    }
}
