/**
 * POS Smart Search — shared types
 */

export interface POSSearchResult {
    id: string;
    type: 'product' | 'category' | 'code';
    name: string;
    name_ar: string;
    sku?: string;
    part_number?: string;
    brand?: string;
    category?: string;
    category_id?: string;
    size?: string;
    selling_price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    image_url?: string | null;
    alternative_numbers?: string | null;
    barcode?: string | null;
    warehouse_distribution?: Array<{
        warehouse_id: string;
        warehouse_name: string;
        quantity: number;
    }>;
    // Scoring & metadata
    score: number;
    sales_count?: number;
    last_sale_date?: string;
    is_popular?: boolean;
    match_type?: 'exact' | 'fuzzy' | 'alternative' | 'barcode';
}

/** Raw Supabase row for barcode search queries */
export interface BarcodeSearchRow {
    id: string;
    name_ar: string;
    sku: string | null;
    part_number: string | null;
    brand: string | null;
    size: string | null;
    sale_price: number | null;
    purchase_price: number | null;
    unit: string | null;
    image_url: string | null;
    alternative_numbers: string | null;
    barcode: string | null;
    product_stock: Array<{ quantity: number; warehouse_id: string; warehouses: { name_ar: string } | null }>;
}

/** Raw Supabase row for sales counts query */
export interface SalesCountRow {
    product_id: string;
    invoices: { created_at: string } | null;
}

/** Raw Supabase row for recent sales with nested product data */
export interface RecentSalesRow {
    products: {
        id: string;
        name_ar: string;
        sku: string | null;
        part_number: string | null;
        brand: string | null;
        sale_price: number | null;
        purchase_price: number | null;
        unit: string | null;
        image_url: string | null;
        alternative_numbers: string | null;
    };
    invoices?: { created_at: string } | null;
}

export interface POSSearchFilters {
    /** Filter by category ID */
    category_id?: string;
    /** Only show items with stock */
    in_stock_only?: boolean;
    /** Minimum stock level */
    min_stock?: number;
    /** Brand filter */
    brand?: string;
}

export interface POSSearchResponse {
    results: POSSearchResult[];
    total: number;
    popular_suggestions: string[];
    corrected_query?: string;
    search_time_ms: number;
}
