import { logger } from '../../../../core/utils/logger';
/**
 * POS Smart Search — database-backed lookups (RPC, ILIKE fallback, barcode).
 */
import { supabase } from '../../../../lib/supabaseClient';
import { scoreSearchResult } from '../../../../core/utils/search';
import type { BarcodeSearchRow, POSSearchFilters, POSSearchResult } from './types';

/**
 * Search the database using the smart search RPC function.
 */
export async function searchDatabase(
    companyId: string,
    query: string,
    filters?: POSSearchFilters,
    limit: number = 20
): Promise<POSSearchResult[]> {
    try {
        // Use the paginated search RPC for server-side normalized search
        const { data, error } = await supabase.rpc('search_inventory_paginated', {
            p_company_id: companyId,
            p_term: query,
            p_limit: limit,
            p_offset: 0,
            p_sort_key: 'updated_at',
            p_sort_dir: 'desc',
        });

        if (error) {
            logger.warn("database", 'POS Search RPC error, falling back to ILIKE:', error.message);
            return searchDatabaseFallback(companyId, query, filters, limit);
        }

        // Optimize: Skip fetching sales counts on every keystroke to resolve search slowness.
        // This avoids executing a heavy nested join query on invoice_items.
        const salesCounts = new Map();

        return (data || []).map((row: any) => {
            const stockList = Array.isArray(row.stock) ? row.stock : [];
            const totalStock = stockList.reduce(
                (sum: number, s: any) => sum + (Number(s.quantity) || 0),
                0
            );

            const salesInfo = salesCounts.get(row.id);

            return {
                id: row.id,
                type: 'product' as const,
                name: row.name_ar || '',
                name_ar: row.name_ar || '',
                sku: row.sku || '',
                part_number: row.part_number || '',
                brand: row.brand || '',
                category: row.category?.name || '',
                category_id: row.category_id || '',
                size: row.size || '',
                selling_price: Number(row.sale_price) || 0,
                cost_price: Number(row.purchase_price) || 0,
                stock_quantity: totalStock,
                unit: row.unit || 'pcs',
                image_url: row.image_url || null,
                alternative_numbers: row.alternative_numbers || null,
                barcode: row.barcode || null,
                warehouse_distribution: stockList.map((s: any) => ({
                    warehouse_id: s.warehouse_id,
                    warehouse_name: s.warehouses?.name_ar || '',
                    quantity: Number(s.quantity) || 0,
                })),
                score: scoreSearchResult(query, row, salesInfo?.count, salesInfo?.last_date),
                sales_count: salesInfo?.count,
                last_sale_date: salesInfo?.last_date,
                match_type: 'exact' as const,
            };
        });
    } catch (err: any) {
        logger.warn("database", 'POS Search failed, using fallback:', err.message);
        return searchDatabaseFallback(companyId, query, filters, limit);
    }
}

/**
 * Fallback search using ILIKE when RPC is unavailable.
 */
export async function searchDatabaseFallback(
    companyId: string,
    query: string,
    _filters?: POSSearchFilters,
    limit: number = 20
): Promise<POSSearchResult[]> {
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name_ar, sku, part_number, brand, size, sale_price,
            purchase_price, unit, image_url, alternative_numbers, barcode,
            category_id, product_categories!inner(name),
            product_stock(quantity, warehouse_id, warehouses(name_ar))
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .or(
            `name_ar.ilike.%${query}%,sku.ilike.%${query}%,` +
            `part_number.ilike.%${query}%,alternative_numbers.ilike.%${query}%,` +
            `barcode.ilike.%${query}%`
        )
        .limit(limit);

    if (error) return [];

    return (data || []).map((row: any) => {
        const stockList = Array.isArray(row.product_stock) ? row.product_stock : [];
        const totalStock = stockList.reduce(
            (sum: number, s: any) => sum + (Number(s.quantity) || 0), 0
        );

        return {
            id: row.id,
            type: 'product' as const,
            name: row.name_ar || '',
            name_ar: row.name_ar || '',
            sku: row.sku || '',
            part_number: row.part_number || '',
            brand: row.brand || '',
            category: row.product_categories?.name || '',
            category_id: row.category_id || '',
            size: row.size || '',
            selling_price: Number(row.sale_price) || 0,
            cost_price: Number(row.purchase_price) || 0,
            stock_quantity: totalStock,
            unit: row.unit || 'pcs',
            image_url: row.image_url || null,
            alternative_numbers: row.alternative_numbers || null,
            barcode: row.barcode || null,
            warehouse_distribution: stockList.map((s: any) => ({
                warehouse_id: s.warehouse_id,
                warehouse_name: s.warehouses?.name_ar || '',
                quantity: Number(s.quantity) || 0,
            })),
            score: scoreSearchResult(query, row),
            match_type: 'exact' as const,
        };
    });
}

/**
 * Quick search for barcode scanner input (exact match priority).
 */
export async function searchByBarcode(
    companyId: string,
    barcode: string
): Promise<POSSearchResult | null> {
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name_ar, sku, part_number, brand, size, sale_price,
            purchase_price, unit, image_url, alternative_numbers, barcode,
            product_stock(quantity, warehouse_id, warehouses(name_ar))
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .or(`barcode.eq.${barcode},sku.eq.${barcode},part_number.eq.${barcode}`)
        .limit(1)
        .single();

    if (error || !data) return null;

    const row = data as unknown as BarcodeSearchRow;
    const stockList = Array.isArray(row.product_stock) ? row.product_stock : [];
    const totalStock = stockList.reduce(
        (sum: number, s) => sum + (Number(s.quantity) || 0), 0
    );

    return {
        id: row.id,
        type: 'code',
        name: row.name_ar || '',
        name_ar: row.name_ar || '',
        sku: row.sku || '',
        part_number: row.part_number || '',
        brand: row.brand || '',
        size: row.size || '',
        selling_price: Number(row.sale_price) || 0,
        cost_price: Number(row.purchase_price) || 0,
        stock_quantity: totalStock,
        unit: row.unit || 'pcs',
        image_url: row.image_url || null,
        alternative_numbers: row.alternative_numbers || null,
        barcode: row.barcode || null,
        score: 100,
        match_type: 'barcode',
    };
}
