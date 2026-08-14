/**
 * POS Smart Search — sales-history driven lookups (recent sales, sales counts).
 */
import { supabase } from '../../../../lib/supabaseClient';
import type { POSSearchResult, RecentSalesRow, SalesCountRow } from './types';

/**
 * Get recently sold items matching the query.
 */
export async function getRecentSales(
    companyId: string,
    query: string,
    limit: number = 5
): Promise<POSSearchResult[]> {
    try {
        const { data, error } = await supabase
            .from('invoice_items')
            .select(`
                product_id,
                products!inner(id, name_ar, sku, part_number, brand, sale_price, purchase_price, unit, image_url, alternative_numbers),
                invoices!inner(created_at)
            `)
            .eq('invoices.company_id', companyId)
            .eq('invoices.status', 'paid')
            .ilike('products.name_ar', `%${query}%`)
            .order('invoices(created_at)', { ascending: false })
            .limit(limit);

        if (error || !data) return [];

        const seen = new Set<string>();
        const results: POSSearchResult[] = [];

        for (const row of data) {
            const typed = row as RecentSalesRow;
            const product = typed.products;
            if (!product || seen.has(product.id)) continue;
            seen.add(product.id);

            results.push({
                id: product.id,
                type: 'product' as const,
                name: product.name_ar || '',
                name_ar: product.name_ar || '',
                sku: product.sku || '',
                part_number: product.part_number || '',
                brand: product.brand || '',
                selling_price: Number(product.sale_price) || 0,
                cost_price: Number(product.purchase_price) || 0,
                stock_quantity: 0,
                unit: product.unit || 'pcs',
                image_url: product.image_url || null,
                alternative_numbers: product.alternative_numbers || null,
                score: 15,
                last_sale_date: typed.invoices?.created_at,
            });
        }

        return results;
    } catch {
        return [];
    }
}

/**
 * Get sales counts for a list of product IDs.
 */
export async function getSalesCounts(
    productIds: string[]
): Promise<Map<string, { count: number; last_date?: string }>> {
    if (productIds.length === 0) return new Map();

    try {
        const { data, error } = await supabase
            .from('invoice_items')
            .select('product_id, invoices(created_at)')
            .in('product_id', productIds)
            .eq('invoices.status', 'paid')
            .limit(1000);

        if (error || !data) return new Map();

        const map = new Map<string, { count: number; last_date?: string }>();
        const rows = data as SalesCountRow[];
        for (const row of rows) {
            const productId = row.product_id;
            const existing = map.get(productId);
            const createdAt = row.invoices?.created_at;

            if (existing) {
                existing.count++;
                if (createdAt && (!existing.last_date || createdAt > existing.last_date)) {
                    existing.last_date = createdAt;
                }
            } else {
                map.set(productId, { count: 1, last_date: createdAt });
            }
        }

        return map;
    } catch {
        return new Map();
    }
}
