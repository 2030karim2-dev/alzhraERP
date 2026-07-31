import { Product } from '../../inventory/types';
import type { POSSearchResult } from '../services/searchService';

export function buildProductFromSearchResult(result: POSSearchResult, companyId: string): Product {
    return {
        id: result.id,
        company_id: companyId,
        name: result.name_ar,
        name_ar: result.name_ar,
        sku: result.sku || '---',
        part_number: result.part_number || null,
        brand: result.brand || null,
        category: result.category || null,
        size: result.size || null,
        specifications: null,
        cost_price: result.cost_price,
        sale_price: result.selling_price,
        selling_price: result.selling_price,
        stock_quantity: result.stock_quantity,
        min_stock_level: 0,
        unit: result.unit || 'pcs',
        image_url: result.image_url ?? null,
        alternative_numbers: result.alternative_numbers ?? null,
        warehouse_distribution: result.warehouse_distribution ?? [],
        created_at: new Date().toISOString(),
    };
}