/**
 * Cross-Reference Service for Automotive Parts
 * 
 * Manages OEM-to-aftermarket part number cross-references.
 * Enables mechanics to find parts by manufacturer part numbers
 * (e.g., Bosch 0986AB123 → Febi 12345 → OEM 1234567890).
 * 
 * @module features/inventory/services/crossReferenceService
 */

import { supabase } from '../../../lib/supabaseClient';
import { ProductCrossReference } from '../types';

export interface CrossReferenceSearchResult {
    productId: string;
    productName: string;
    productNameAr: string;
    productSku: string;
    matchQuality: 'exact' | 'partial' | 'interchangeable';
    sourceNumber: string;
    targetNumber: string;
    brand: string;
    stockQuantity: number;
    salePrice: number;
}

export const crossReferenceService = {
    /**
     * Search for products by OEM part number or alternative number
     * Searches across part_number, alternative_numbers, and cross_references
     */
    searchByOEM: async (
        companyId: string,
        searchTerm: string
    ): Promise<CrossReferenceSearchResult[]> => {
        const { data, error } = await supabase.rpc('search_by_oem', {
            p_company_id: companyId,
            p_search_term: searchTerm.trim()
        });

        if (error) {
            console.error('CrossReferenceService: searchByOEM failed', error);
            throw error;
        }

        return (data || []).map((row: any) => ({
            productId: row.product_id,
            productName: row.product_name,
            productNameAr: row.product_name_ar,
            productSku: row.product_sku,
            matchQuality: row.match_quality,
            sourceNumber: row.source_number,
            targetNumber: row.target_number,
            brand: row.brand,
            stockQuantity: Number(row.stock_quantity) || 0,
            salePrice: Number(row.sale_price) || 0,
        }));
    },

    /**
     * Add a cross-reference between two products
     */
    addCrossReference: async (
        companyId: string,
        baseProductId: string,
        alternativeProductId: string,
        matchQuality: 'exact' | 'partial' | 'interchangeable',
        notes?: string
    ): Promise<void> => {
        const { error } = await supabase
            .from('product_cross_references')
            .insert({
                company_id: companyId,
                base_product_id: baseProductId,
                alternative_product_id: alternativeProductId,
                match_quality: matchQuality,
                notes: notes || null,
                created_by: (await supabase.auth.getUser()).data.user?.id
            });

        if (error) {
            console.error('CrossReferenceService: addCrossReference failed', error);
            throw error;
        }
    },

    /**
     * Get all cross-references for a product
     */
    getCrossReferences: async (
        companyId: string,
        productId: string
    ): Promise<ProductCrossReference[]> => {
        const { data, error } = await supabase
            .from('product_cross_references')
            .select(`
                *,
                alternative_product:products!alternative_product_id(
                    id, name, name_ar, sku, part_number, brand, sale_price, cost_price
                )
            `)
            .eq('company_id', companyId)
            .eq('base_product_id', productId)
            .order('match_quality', { ascending: true });

        if (error) {
            console.error('CrossReferenceService: getCrossReferences failed', error);
            throw error;
        }

        return (data || []) as unknown as ProductCrossReference[];
    },

    /**
     * Delete a cross-reference
     */
    deleteCrossReference: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('product_cross_references')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('CrossReferenceService: deleteCrossReference failed', error);
            throw error;
        }
    }
};