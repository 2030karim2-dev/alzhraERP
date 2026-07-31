
import { supabase } from '../../../lib/supabaseClient';

export const warehouseApi = {
  fetchWarehouses: async (companyId: string) => {
    return await supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name_ar', { ascending: true });
  },

  upsertWarehouse: async (data: Record<string, unknown>) => {
    return await supabase.from('warehouses').upsert(data as any).select().single();
  },

  deleteWarehouse: async (id: string) => {
    return await supabase.from('warehouses').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }
};
