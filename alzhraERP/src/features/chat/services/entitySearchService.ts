import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { parseError } from '../../../core/utils/errorUtils';
import { buildIlikeOrFilter } from '../../../core/utils/postgrestFilter';

export const entitySearchService = {
  /**
   * Search products for entity sharing in chat
   */
  searchProducts: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('products')
        .select(
          `
          id,
          name_ar,
          part_number,
          sku,
          brand,
          sale_price,
          product_stock (
            quantity
          )
        `
        )
        .eq('company_id', companyId)
        .or(buildIlikeOrFilter(['part_number', 'name_ar', 'sku'], term))
        .limit(10);

      if (error) throw error;
      return (data || []).map(p => {
        const totalStock = Array.isArray(p.product_stock)
          ? p.product_stock.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
          : 0;
        return {
          id: p.id,
          name: p.name_ar || p.part_number || p.sku || 'بدون اسم',
          part_number: p.part_number || p.sku || '',
          brand: p.brand || '',
          sale_price: Number(p.sale_price) || 0,
          total_stock: totalStock,
          stock: totalStock,
        };
      });
    } catch (err) {
      logger.error('ChatService', 'Error searching products for sharing', err);
      throw parseError(err);
    }
  },

  /**
   * Search invoices for entity sharing in chat
   */
  searchInvoices: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          id,
          invoice_number,
          total_amount,
          created_at,
          status,
          type,
          party:party_id (
            name
          )
        `
        )
        .eq('company_id', companyId)
        .ilike('invoice_number', `%${term}%`)
        .limit(10);

      if (error) throw error;
      return (data || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number || 'INV',
        total: Number(inv.total_amount) || 0,
        customer_name: inv.party?.name || (inv.type === 'purchase' ? 'مورد' : 'عميل نقدي'),
        status: inv.status,
        created_at: inv.created_at,
      }));
    } catch (err) {
      logger.error('ChatService', 'Error searching invoices for sharing', err);
      throw parseError(err);
    }
  },

  /**
   * Search stock transfers for entity sharing in chat
   */
  searchTransfers: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('stock_transfers')
        .select(
          `
          id,
          status,
          created_at,
          from_warehouse:warehouses!from_warehouse_id (name_ar),
          to_warehouse:warehouses!to_warehouse_id (name_ar)
        `
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map(tr => ({
        id: tr.id,
        transfer_number: tr.id.slice(0, 8).toUpperCase(),
        status: tr.status,
        from_warehouse: tr.from_warehouse?.name_ar || 'مستودع المصدر',
        to_warehouse: tr.to_warehouse?.name_ar || 'مستودع الوجهة',
        created_at: tr.created_at,
      }));
    } catch (err) {
      logger.error('ChatService', 'Error searching transfers for sharing', err);
      throw parseError(err);
    }
  },

  /**
   * Search VIN analyses for entity sharing in chat
   */
  searchVins: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('vin_analyses')
        .select('id, vin, vehicle_id, decoded')
        .eq('company_id', companyId)
        .ilike('vin', `%${term}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('ChatService', 'Error searching VINs for sharing', err);
      throw parseError(err);
    }
  },
};
