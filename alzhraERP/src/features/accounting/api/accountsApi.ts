import { supabase } from '../../../lib/supabaseClient';
import { Database } from '../../../core/database.types';

type AccountInsert = Database['public']['Tables']['accounts']['Insert'];

export const accountsApi = {
  getAccounts: async (companyId: string) => {
    return await supabase.from('active_accounts')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .limit(5000)
      .order('code', { ascending: true });
  },

  createAccount: async (account: AccountInsert) => {
    return await supabase.from('accounts')
      .insert(account)
      .select()
      .single();
  },

  insertAccounts: async (accounts: AccountInsert[]) => {
    return await supabase.from('accounts')
      .insert(accounts)
      .select();
  },

  deleteAccount: async (id: string) => {
    // Safety check: prevent deleting accounts with existing journal entries
    const { count, error: checkError } = await supabase.from('journal_entry_lines')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .is('deleted_at', null);

    if (checkError) throw checkError;
    if (count && count > 0) {
      throw new Error('لا يمكن حذف حساب له قيود محاسبية مرتبطة. قم بتصفير الرصيد أولاً.');
    }

    return await supabase.from('accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  }
};
