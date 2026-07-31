
import { warehouseApi } from '../api/warehouseApi';

export const warehouseService = {
  getWarehouses: async (companyId: string) => {
    const { data, error } = await warehouseApi.fetchWarehouses(companyId);
    if (error) throw error;
    return data;
  },

  saveWarehouse: async (companyId: string, data: any) => {
    const { error } = await warehouseApi.upsertWarehouse({
      ...data,
      company_id: companyId
    });
    if (error) throw error;
  },

  removeWarehouse: async (id: string) => {
    const { error } = await warehouseApi.deleteWarehouse(id);
    if (error) throw error;
  }
};
