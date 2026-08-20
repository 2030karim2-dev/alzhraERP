
import { Account, AccountFormData } from '../types/index';
import { accountsApi } from '../api/accountsApi';
// Fix: Added missing supabase import
import { supabase } from '../../../lib/supabaseClient';

// دليل الحسابات الافتراضي (بالريال السعودي) — يستخدمه seedDefaultAccounts
const DEFAULT_CHART_OF_ACCOUNTS: Array<{
  code: string;
  name_ar: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent?: string;
}> = [
  { code: '1000', name_ar: 'الأصول', type: 'asset' },
  { code: '1010', name_ar: 'الصناديق', type: 'asset', parent: '1000' },
  { code: '1020', name_ar: 'البنوك', type: 'asset', parent: '1000' },
  { code: '1030', name_ar: 'شركات الصرافة', type: 'asset', parent: '1000' },
  { code: '1100', name_ar: 'ذمم العملاء', type: 'asset', parent: '1000' },
  { code: '1200', name_ar: 'المخزون', type: 'asset', parent: '1000' },
  { code: '2000', name_ar: 'الخصوم', type: 'liability' },
  { code: '2100', name_ar: 'ذمم الموردين', type: 'liability', parent: '2000' },
  { code: '2200', name_ar: 'ضريبة القيمة المضافة', type: 'liability', parent: '2000' },
  { code: '3000', name_ar: 'حقوق الملكية', type: 'equity' },
  { code: '3100', name_ar: 'رأس المال', type: 'equity', parent: '3000' },
  { code: '3900', name_ar: 'رصيد افتتاحي', type: 'equity', parent: '3000' },
  { code: '4000', name_ar: 'الإيرادات', type: 'revenue' },
  { code: '4100', name_ar: 'المبيعات', type: 'revenue', parent: '4000' },
  { code: '5000', name_ar: 'المصروفات', type: 'expense' },
  { code: '5100', name_ar: 'تكلفة البضاعة المباعة', type: 'expense', parent: '5000' },
];

// Verification point
export const accountsService = {
  getAccounts: async (companyId: string, options?: { includeBalances?: boolean }): Promise<Account[]> => {
    // Fetch account metadata
    const { data, error } = await accountsApi.getAccounts(companyId);
    if (error) throw error;

    // Balances are fetched from the cumulative-balance RPC (the accounts table
    // has no balance column). `report_account_balances` sums ALL posted
    // movements up to today (not just the current calendar year), so opening
    // balances from previous years are included. It is only run when balances
    // are actually needed (e.g. the accounts list view); callers that only
    // route by account metadata (id/code/type) skip it entirely.
    let balanceMap = new Map<string, number>();
    if (options?.includeBalances) {
      const now = new Date();
      const { data: balances, error: balancesError } = await supabase.rpc('report_account_balances', {
        p_company_id: companyId,
        p_as_of_date: now.toISOString().split('T')[0]
      });
      // Fail loudly rather than silently zeroing every account balance.
      if (balancesError) throw balancesError;

      for (const row of balances ?? []) {
        balanceMap.set(row.account_id, Number(row.balance) || 0);
      }
    }

    // Map to Account model
    return (data ?? []).map((acc) => {
        // report_trial_balance returns flat `balance = SUM(debit) - SUM(credit)`
        // for every account type. Normalise the sign by type so that
        // liabilities / equity / revenue appear as positive CREDIT balances
        // (standard accounting presentation) instead of negative numbers.
        const rawBalance = balanceMap.get(acc.id) ?? 0;
        const isCreditNormal = acc.type === 'liability' || acc.type === 'equity' || acc.type === 'revenue';
        return {
            id: acc.id,
            company_id: acc.company_id,
            code: acc.code,
            name: acc.name_ar,
            type: acc.type as Account['type'],
            balance: isCreditNormal ? -rawBalance : rawBalance,
            currency_code: acc.currency_code || 'SAR',
            is_system: acc.is_system,
            parent_id: acc.parent_id ?? undefined,
            allow_posting: acc.allow_posting ?? true
        };
    });
  },


  createAccount: async (data: AccountFormData, companyId: string): Promise<Account> => {
    const { data: account, error } = await accountsApi.createAccount({
      company_id: companyId,
      code: data.code,
      name_ar: data.name,
      type: data.type,
      parent_id: data.parent_id || null,
      currency_code: data.currency_code ?? 'SAR',
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
  // إنشاء دليل الحسابات الافتراضي — إدراج الرموز الناقصة فقط (idempotent)
  seedDefaultAccounts: async (companyId: string) => {
    const { data: existing } = await supabase
      .from('accounts')
      .select('code')
      .eq('company_id', companyId)
      .is('deleted_at', null);
    const existingCodes = new Set(existing?.map((a) => a.code) || []);
    const codeToId = new Map<string, string>();

    for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
      if (existingCodes.has(acc.code)) {
        const { data: row } = await supabase
          .from('accounts')
          .select('id')
          .eq('company_id', companyId)
          .eq('code', acc.code)
          .maybeSingle();
        if (row) codeToId.set(acc.code, row.id);
        continue;
      }

      const { data: created, error } = await supabase
        .from('accounts')
        .insert({
          company_id: companyId,
          code: acc.code,
          name_ar: acc.name_ar,
          type: acc.type,
          currency_code: 'SAR',
          is_system: true,
          parent_id: typeof acc.parent === 'string' ? codeToId.get(acc.parent) ?? null : null,
        })
        .select()
        .single();
      if (error) throw error;
      codeToId.set(acc.code, created.id);
    }

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

    const existingCurrencies = new Set(existingChildren?.map((c) => c.currency_code) || []);

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

    const existingCodes = new Set(existingChildren?.map((c) => c.code) || []);

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
