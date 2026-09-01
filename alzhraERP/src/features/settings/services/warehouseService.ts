// Warehouse Service — unified onto the canonical inventory warehouseApi
// (the duplicate settings/api/warehouseApi.ts was removed; one source of truth).
import { warehouseApi } from '../../inventory/api/warehouseApi';

export const warehouseService = {
  getWarehouses: async (companyId: string) => {
    const { data, error } = await warehouseApi.fetchWarehouses(companyId);
    if (error) throw error;
    return data;
  },

  saveWarehouse: async (companyId: string, data: Record<string, unknown>) => {
    const { error } = await warehouseApi.upsertWarehouse({
      ...data,
      company_id: companyId,
    });
    if (error) throw error;
  },

  removeWarehouse: async (id: string) => {
    const { error } = await warehouseApi.deleteWarehouse(id);
    if (error) throw error;
  },
};
