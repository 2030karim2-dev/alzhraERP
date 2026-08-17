// Warehouse Service - Handles all warehouse-related operations
import { supabase } from '../../../lib/supabaseClient';
import { inventoryApi } from '../api';

interface WarehouseStockRow {
    quantity: number;
    product: {
        name_ar: string;
        sale_price: number | null;
        location?: string | null;
    } | null;
    warehouse: { name_ar?: string | null; location?: string | null } | null;
}

export const warehouseService = {
    /**
     * Get all warehouses for a company
     */
    getWarehouses: async (companyId: string) => {
        const { data, error } = await inventoryApi.getWarehouses(companyId);
        if (error) throw error;
        return data || [];
    },

    /**
     * Get products for a specific warehouse
     */
    getProductsForWarehouse: async (warehouseId: string) => {
        const { data, error } = await supabase
            .from('product_stock')
            .select(`
                quantity,
                product:products!inner(id, name_ar, sale_price, location),
                warehouse:warehouses(name_ar, location)
            `)
            .eq('warehouse_id', warehouseId)
            .is('products.deleted_at', null);

        if (error) throw error;

        // cast صريح: النوع المستنتج من الاستعلام قد يكون {} رغم تحديد الحقول
        return (data || []).map((item) => {
            const typed = item as unknown as WarehouseStockRow;
            const product = typed.product ?? { name_ar: '', sale_price: null, location: null };
            const warehouse = typed.warehouse ?? { name_ar: null, location: null };
            
            // Combine Warehouse Name and Product Shelf Location
            const warehouseName = warehouse.name_ar || '';
            const shelfLocation = product.location || '';
            const compositeLocation = shelfLocation 
                ? `${warehouseName} / ${shelfLocation}`
                : warehouseName;

            return {
                ...product,
                stock_quantity: Number(typed.quantity) || 0,
                name_ar: product.name_ar || '',
                sale_price: Number(product.sale_price) || 0,
                location: compositeLocation
            };
        });
    }
};

export default warehouseService;
