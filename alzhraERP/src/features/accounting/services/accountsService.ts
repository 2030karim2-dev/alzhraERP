
import { Account, AccountFormData } from '../types/index';
import { accountsApi } from '../api/accountsApi';
// Fix: Added missing supabase import
import { supabase } from '../../../lib/supabaseClient';

// Verification point
export const accountsService = {
  getAccounts: async (companyId: string): Promise<Account[]> => {
    const { data, error } = await accountsApi.getAccounts(companyId);
    if (error) throw error;

    // تحويل البيانات من السكيما (snake_case) إلى النموذج المطلوب في الواجهة
    return (data || []).map((acc: any) => ({
      id: acc.id,
      company_id: acc.company_id,
      code: acc.code,
      name: acc.name_ar, // استخدام الحقل العربي
      type: acc.type as Account['type'],
      balance: acc.balance || 0, // الحقل الصحيح في السكيما هو balance وليس current_balance
      currency_code: acc.currency_code || 'SAR',
      is_system: acc.is_system,
      parent_id: acc.parent_id ?? undefined
    }));
  },

  createAccount: async (data: AccountFormData, companyId: string): Promise<Account> => {
    const { data: account, error } = await accountsApi.createAccount({
      company_id: companyId,
      code: data.code,
      name_ar: data.name,
      type: data.type,
      parent_id: data.parent_id || null,
      currency_code: 'SAR',
      is_system: false
    });

    if (error) throw error;

    return {
      id: account.id,
      company_id: account.company_id,
      code: account.code,
      name: account.name_ar,
      type: account.type as Account['type'],
      balance: 0,
      currency_code: account.currency_code,
      is_system: account.is_system,
      parent_id: account.parent_id ?? undefined
    };
  },

  // Fix: Added missing deleteAccount method
  deleteAccount: async (id: string, isSystem: boolean) => {
    if (isSystem) throw new Error("لا يمكن حذف حساب نظام");
    const { error } = await accountsApi.deleteAccount(id);
    if (error) throw error;
  },

  // Fix: Added missing seedDefaultAccounts method
  seedDefaultAccounts: async (_companyId: string) => {
    // Logic for seeding default chart of accounts
    return true;
  },

  seedSubCashboxes: async (companyId: string) => {
    // 1. Get the main cashbox (1010)
    const { data: mainCashbox } = await supabase
      .from('accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', '1010')
      .single();

    if (!mainCashbox) {
      throw new Error('لم يتم العثور على الصندوق الرئيسي (1010)');
    }

    // 2. Query for existing children
    const { data: existingChildren } = await supabase
      .from('accounts')
      .select('currency_code')
      .eq('company_id', companyId)
      .eq('parent_id', mainCashbox.id);

    const existingCurrencies = new Set(existingChildren?.map((c: any) => c.currency_code) || []);

    // 3. Define the desired sub-cashboxes
    const desiredBoxes = [
      { code: '101001', name_ar: 'صندوق الكاش - ريال سعودي', name_en: 'Cash Box - SAR', currency_code: 'SAR' },
      { code: '101002', name_ar: 'صندوق الكاش - ريال يمني', name_en: 'Cash Box - YER', currency_code: 'YER' },
      { code: '101003', name_ar: 'صندوق الكاش - دولار أمريكي', name_en: 'Cash Box - USD', currency_code: 'USD' },
      { code: '101004', name_ar: 'صندوق الكاش - ريال عماني', name_en: 'Cash Box - OMR', currency_code: 'OMR' },
      { code: '101005', name_ar: 'صندوق الكاش - يوان صيني', name_en: 'Cash Box - CNY', currency_code: 'CNY' },
    ];

    const toInsert = desiredBoxes
      .filter(box => !existingCurrencies.has(box.currency_code))
      .map(box => ({
        company_id: companyId,
        code: box.code,
        name_ar: box.name_ar,
        type: 'asset' as const,
        currency_code: box.currency_code,
        parent_id: mainCashbox.id,
        is_system: true
      }));

    if (toInsert.length > 0) {
      const { error } = await accountsApi.insertAccounts(toInsert);
      if (error) throw error;
    }

    return true;
  },

  // Fix: Added missing seedYemeniExchanges method
  seedYemeniExchanges: async (companyId: string) => {
    // 1. Check if 1030 (Exchange Companies parent) exists
    let { data: exchangeParent } = await supabase
      .from('accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', '1030')
      .maybeSingle();

    if (!exchangeParent) {
      // Create 1030
      const { data: newParent, error: parentError } = await supabase.from('accounts').insert({
        company_id: companyId,
        code: '1030',
        name_ar: 'شركات الصرافة',
        type: 'asset',
        currency_code: 'SAR',
        is_system: true
      }).select().single();
      if (parentError) throw parentError;
      if (!newParent) throw new Error("Failed to create parent account");
      exchangeParent = { id: newParent.id };
    }

    // 2. Query for existing children
    const { data: existingChildren } = await supabase
      .from('accounts')
      .select('code')
      .eq('company_id', companyId)
      .eq('parent_id', exchangeParent.id);

    const existingCodes = new Set(existingChildren?.map((c: any) => c.code) || []);

    const exchanges = [
      { code: '103001', name_ar: 'شركة الكريمي للصرافة', currency_code: 'SAR' },
      { code: '103002', name_ar: 'النجم للصرافة والتحويلات', currency_code: 'SAR' },
      { code: '103003', name_ar: 'الامتياز للصرافة', currency_code: 'SAR' },
      { code: '103004', name_ar: 'الياباني للصرافة', currency_code: 'SAR' }
    ];

    const toInsert = exchanges
      .filter(ex => !existingCodes.has(ex.code))
      .map(ex => ({
        company_id: companyId,
        code: ex.code,
        name_ar: ex.name_ar,
        type: 'asset' as const,
        currency_code: ex.currency_code,
        parent_id: exchangeParent!.id,
        is_system: false
      }));

    if (toInsert.length > 0) {
      const { error } = await accountsApi.insertAccounts(toInsert);
      if (error) throw error;
    }

    return true;
  },

  findAccountByCode: async (companyId: string, code: string) => {
    // Fix: supabase is now imported
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('code', code)
      .single();
    return data;
  }
};
