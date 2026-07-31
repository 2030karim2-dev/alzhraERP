// Transfer Service - Handles stock transfer operations
import { CreateTransferDTO } from '../types';
import { supabase } from '../../../lib/supabaseClient';

export const transferService = {
    /**
     * Create a new stock transfer
     */
    createTransfer: async (data: CreateTransferDTO) => {
        const { data: transfer, error } = await supabase.rpc('process_stock_transfer', {
            p_from_warehouse: data.from_warehouse_id,
            p_to_warehouse: data.to_warehouse_id,
            p_items: data.items,
            p_company_id: data.company_id,
            p_user_id: data.user_id,
            ...(data.notes !== undefined && { p_notes: data.notes })
        });
        if (error) throw error;
        return transfer;
    },

    /**
     * Get all transfers for a company
     */
    getTransfers: async (companyId: string) => {
        const { data, error } = await supabase.from('stock_transfers')
            .select(`
                *,
                from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name_ar),
                to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name_ar),
                items:stock_transfer_items(*, product:products!stock_transfer_items_product_id_fkey(name_ar, sku))
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }
};

export default transferService;
