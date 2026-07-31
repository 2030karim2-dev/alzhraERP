
import { companyApi } from '../api/companyApi';
import { CompanyFormData } from '../types';

export const settingsService = {
  getCompanyProfile: async (companyId: string) => {
    const { data, error } = await companyApi.getCompany(companyId);
    if (error) throw error;
    return data;
  },

  updateProfile: async (companyId: string, data: CompanyFormData) => {
    const { error } = await companyApi.updateCompany(companyId, data);
    if (error) throw error;
  },

  exportDataAsJSON: (data: unknown, fileName: string) => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(data)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${fileName}.json`;
    link.click();
  }
};
