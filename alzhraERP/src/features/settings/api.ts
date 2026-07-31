import { supabase } from '../../lib/supabaseClient';
import { CompanyFormData, WarehouseFormData, FiscalYearFormData, ExchangeRateFormData, BranchFormData } from './types';

export const settingsApi = {
  getCompany: async (companyId: string) => {
    return await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
  },

  updateCompany: async (companyId: string, data: CompanyFormData) => {
    return await supabase
      .from('companies')
      .update(data)
      .eq('id', companyId)
      .select()
      .select()
      .single();
  },

  getBranches: async (companyId: string) => {
    return await supabase
      .from('branches')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
  },

  createBranch: async (companyId: string, data: BranchFormData) => {
    return await supabase
      .from('branches')
      .insert({ ...data, company_id: companyId })
      .select()
      .single();
  },

  updateBranch: async (id: string, data: BranchFormData) => {
    return await supabase
      .from('branches')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  deleteBranch: async (id: string) => {
    return await supabase.from('branches').delete().eq('id', id);
  },

  // إدارة الفريق والدعوات (Team Management)
  getInvitations: async (companyId: string) => {
    return await supabase
      .from('invitations')
      .select('*, branches(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
  },

  inviteUser: async (email: string, role: string, companyId: string, userId: string, branchId?: string | null) => {
    return await supabase
      .from('invitations')
      .insert({
        email,
        role,
        company_id: companyId,
        created_by: userId,
        ...(branchId ? { branch_id: branchId } : {}),
      })
      .select()
      .single();
  },

  revokeInvitation: async (id: string) => {
    return await supabase.from('invitations').delete().eq('id', id);
  },

  getAuditLogs: async (companyId: string) => {
    return await supabase
      .from('audit_logs')
      .select('*, profiles:user_id(full_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100)
      .limit(100);
  },

  getWarehouses: async (companyId: string, branchId?: string | null) => {
    let query = supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name_ar', { ascending: true });
      
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    
    return await query;
  },

  createWarehouse: async (companyId: string, data: WarehouseFormData) => {
    return await supabase
      .from('warehouses')
      .insert({ ...data, company_id: companyId })
      .select()
      .select()
      .single();
  },

  deleteWarehouse: async (id: string) => {
    return await supabase.from('warehouses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },

  setPrimaryWarehouse: async (companyId: string, warehouseId: string) => {
    // أولاً: إلغاء أساسي من جميع المستودعات
    const { error: resetError } = await supabase
      .from('warehouses')
      .update({ is_primary: false })
      .eq('company_id', companyId);

    if (resetError) throw resetError;

    // ثانياً: تعيين المستودع المحدد كأساسي
    const result = await supabase
      .from('warehouses')
      .update({ is_primary: true })
      .eq('id', warehouseId)
      .select()
      .single();

    // Rollback: إذا فشل التعيين، نعيد المستودع الأصلي
    if (result.error) {
      console.error('[Settings] setPrimaryWarehouse failed, attempting no rollback available:', result.error);
    }

    return result;
  },

  getSupportedCurrencies: async () => {
    return await supabase.from('supported_currencies').select('*')
    return await supabase.from('supported_currencies').select('*');
  },

  createCurrency: async (data: { code: string, name_ar: string, symbol: string, exchange_operator?: 'multiply' | 'divide' }) => {
    return await supabase.from('supported_currencies').insert({ ...data, is_base: false });
  },

  deleteCurrency: async (code: string) => {
    return await supabase.from('supported_currencies').delete().eq('code', code);
  },

  getExchangeRates: async (companyId: string) => {
    return await supabase
      .from('exchange_rates')
      .select('*')
      .eq('company_id', companyId)
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('created_at', { ascending: false });
  },

  updateExchangeRate: async (companyId: string, data: ExchangeRateFormData, userId: string) => {
    return await supabase
      .from('exchange_rates')
      .insert({
        company_id: companyId,
        currency_code: data.currency_code,
        rate_to_base: data.rate_to_base,
        effective_date: data.effective_date,
        created_by: userId
      })
      .select()
      .select()
      .single();
  },

  getFiscalYears: async (companyId: string) => {
    return await supabase
      .from('fiscal_years')
      .select('*')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
      .order('start_date', { ascending: false });
  },

  createFiscalYear: async (companyId: string, data: FiscalYearFormData) => {
    return await supabase
      .from('fiscal_years')
      .insert({ ...data, company_id: companyId, is_closed: false })
      .select()
      .select()
      .single();
  },

  closeFiscalYear: async (id: string) => {
    return await supabase
      .from('fiscal_years')
      .update({ is_closed: true })
      .eq('id', id);
  },

  /**
   * جلب أسعار الصرف من السوق (Edge Function)
   */
  fetchMarketRates: async (companyId?: string) => {
    const { data, error } = await supabase.functions.invoke('fetch-exchange-rates-aden', {
      body: { company_id: companyId }
    });
    if (error) throw error;
    return data;
  }
};

export default settingsApi;
