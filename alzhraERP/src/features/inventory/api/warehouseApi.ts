import { supabase } from '../../../lib/supabaseClient';
import { TableInsert } from '@/core/types/supabase-helpers';

/** Warehouse and stock management */
export const warehouseApi = {
    getWarehouses: async (companyId: string, branchId?: string | null) => {
        return await supabase.rpc('get_warehouses_with_stats', { p_company_id: companyId, p_branch_id: branchId || null });
    },

    createInventoryTransactions: async (transactions: TableInsert<'inventory_transactions'>[]) => {
        return await supabase.from('inventory_transactions')
            .insert(transactions);
    },

    getProductMovements: async (productId: string, from?: string, to?: string) => {
        let query = supabase.from('inventory_transactions')
            .select('*') // Fix: removed invalid created_by(*) relation
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (from) {
            query = query.gte('created_at', from);
        }
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('created_at', toDate.toISOString());
        }

        return await query;
    },

    recordTransaction: async (companyId: string, userId: string, tx: Omit<TableInsert<'inventory_transactions'>, 'company_id' | 'created_by'>) => {
        return await supabase.from('inventory_transactions')
            .insert({
                ...tx,
                company_id: companyId,
                created_by: userId
            } as TableInsert<'inventory_transactions'>);
    },

    initializeStock: async (companyId: string, userId: string, stockData: { product_id: string, warehouse_id: string, quantity: number }) => {
        return await supabase.from('inventory_transactions')
            .insert({
                company_id: companyId,
                created_by: userId,
                product_id: stockData.product_id,
                warehouse_id: stockData.warehouse_id,
                quantity: stockData.quantity,
                transaction_type: 'initial',
                reference_type: 'opening_balance'
            });
    },

    updateStock: async (companyId: string, productId: string, warehouseId: string, quantity: number, userId?: string) => {
        // Since the system uses a derivation trigger, we record an adjustment to reach the desired quantity
        // Step 1: Get current stock
        const { data: currentStock } = await supabase.from('product_stock')
            .select('quantity')
            .eq('product_id', productId)
            .eq('warehouse_id', warehouseId)
            .maybeSingle();
        
        const currentQty = currentStock?.quantity || 0;
        const adjustment = quantity - currentQty;

        if (adjustment === 0) return { data: null, error: null };

        return await supabase.from('inventory_transactions')
            .insert({
                company_id: companyId,
                created_by: userId,
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: adjustment,
                transaction_type: 'adjustment',
                reference_type: 'manual_update'
            });
    },

    saveWarehouse: async (companyId: string, data: { id?: string, name_ar: string, location: string, branch_id?: string | null }) => {
        const { id, ...formData } = data;
        if (id) {
            return await supabase.from('warehouses').update(formData as any).eq('id', id);
        } else {
            return await supabase.from('warehouses').insert({
                ...formData,
                company_id: companyId,
                status: 'active'
            } as any);
        }
    },

    deleteWarehouse: async (id: string) => {
        return await supabase.from('warehouses')
            .update({ deleted_at: new Date().toISOString() } as any)
            .eq('id', id);
    },
};
