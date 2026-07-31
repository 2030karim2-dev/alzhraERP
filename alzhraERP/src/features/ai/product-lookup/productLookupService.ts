/**
 * AI Module - Product Lookup Service
 * Searches the real product database for AI-extracted item names/part numbers.
 * Supports searching by: product name, part number, SKU, brand combinations.
 */
import { productService } from '../../inventory/services/productService';
import { supabase } from '../../../lib/supabaseClient';
import { AIEntityItem, ProductMatch, LookupResult } from '../core/types';

export type { ProductMatch, LookupResult };

/**
 * Direct search by part_number or barcode (exact/partial match).
 */
async function searchByPartNumber(companyId: string, partNumber: string): Promise<ProductMatch[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, sku, part_number, brand, size, sale_price, purchase_price, alternative_numbers, barcode')
        .eq('company_id', companyId)
        .or(`part_number.ilike.%${partNumber}%,sku.ilike.%${partNumber}%,barcode.ilike.%${partNumber}%,alternative_numbers.ilike.%${partNumber}%`)
        .eq('status', 'active')
        .limit(20);

    if (error || !data) return [];

    return data.map((r: any) => ({
        id: r.id,
        name: r.name_ar || '',
        part_number: r.part_number || r.sku || '---',
        brand: r.brand || '',
        size: r.size || '',
        selling_price: Number(r.sale_price) || 0,
        cost_price: Number(r.purchase_price) || 0,
        stock_quantity: 0, // Will be filled from stock table if needed
        sku: r.sku || '',
    }));
}

/**
 * Check if a string looks like a part number (contains digits/dashes/dots).
 */
function looksLikePartNumber(text: string): boolean {
    // Part numbers typically have digits mixed with letters/dashes
    return /[\d]{3,}/.test(text) || /^[A-Za-z0-9\-\.]+$/.test(text.trim());
}

/**
 * Search the real product database for each AI-extracted item.
 * Uses multiple strategies: name search, part number search, SKU search.
 * Returns lookup results with real product matches from DB.
 */
export async function lookupProducts(
    items: AIEntityItem[],
    companyId: string
): Promise<LookupResult[]> {
    const results: LookupResult[] = [];

    for (const item of items) {
        let allMatches: ProductMatch[] = [];

        // Strategy 1: If productCode is provided, search by part number directly
        if (item.productCode) {
            const partMatches = await searchByPartNumber(companyId, item.productCode);
            allMatches.push(...partMatches);
        }

        // Strategy 2: If productName looks like a part number, also search by part number
        if (item.productName && looksLikePartNumber(item.productName)) {
            const partMatches = await searchByPartNumber(companyId, item.productName);
            allMatches.push(...partMatches);
        }

        // Strategy 3: Full-text search using the RPC function
        const searchTerms: string[] = [];
        if (item.productName) searchTerms.push(item.productName);
        if (item.productCode && !looksLikePartNumber(item.productCode)) {
            searchTerms.push(item.productCode);
        }
        if (item.manufacturer && item.productName) {
            searchTerms.push(`${item.productName} ${item.manufacturer}`);
        }

        for (const term of searchTerms) {
            try {
                const rawResults = await productService.searchProducts(companyId, term);
                const mapped = rawResults.map((r: any) => ({
                    id: r.id,
                    name: r.name_ar || r.name || '',
                    part_number: r.part_number || r.sku || '---',
                    brand: r.brand || '',
                    size: r.size || '',
                    selling_price: Number(r.sale_price || r.selling_price) || 0,
                    cost_price: Number(r.purchase_price || r.cost_price) || 0,
                    stock_quantity: Number(r.stock_quantity || r.quantity) || 0,
                    sku: r.sku || '',
                }));
                allMatches.push(...mapped);
            } catch {
                // Search failed for this term, try next
            }
        }

        // Deduplicate by product ID
        const seen = new Set<string>();
        allMatches = allMatches.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });

        // If manufacturer is specified, prioritize matching brands
        if (item.manufacturer && allMatches.length > 1) {
            const mfr = item.manufacturer.toLowerCase();
            const brandMatches = allMatches.filter(m => 
                m.brand.toLowerCase().includes(mfr) || mfr.includes(m.brand.toLowerCase())
            );
            // If brand filter narrows results, use filtered list
            if (brandMatches.length > 0 && brandMatches.length < allMatches.length) {
                allMatches = brandMatches;
            }
        }

        const displayTerm = item.productCode || item.productName || 'صنف غير محدد';
        const result: LookupResult = {
            searchTerm: displayTerm,
            requestedQty: item.quantity || 1,
            matches: allMatches,
        };

        // Auto-select if only one match
        if (allMatches.length === 1) {
            result.selectedProduct = allMatches[0];
            // Override price if user specified one
            if (item.unitPrice && item.unitPrice > 0) {
                result.selectedProduct = {
                    ...result.selectedProduct,
                    selling_price: item.unitPrice,
                };
            }
        }

        results.push(result);
    }

    return results;
}
