import { supabase } from '../../../lib/supabaseClient';
import { parseError } from '../../../core/utils/errorUtils';
import type { Database } from '../../../core/database.types';

type AccountInsert = Database['public']['Tables']['accounts']['Insert'];

export interface GuardedDeleteResult {
  ok: boolean;
}

/** رسائل المسار الاحتياطي — مطابقة لنصوص RPC كي لا يتغير UX بين المسارين */
const FALLBACK_ERRORS = {
  hasJournalEntries: 'لا يمكن حذف حساب له قيود محاسبية مرتبطة. قم بتصفير الرصيد أولاً.',
  hasChildren: 'لا يمكن حذف حساب رئيسي له حسابات فرعية مرتبطة.',
} as const;

/** هل الخطأ «الدالة غير موجودة»؟ (قاعدة لم تُطبَّق عليها الـ migration بعد) */
const isMissingRpcError = (err: unknown): boolean => {
  const e = err as { code?: string; message?: string };
  return e?.code === '42883' || /does not exist/i.test(e?.message ?? '');
};

/** يلتف على قيد رمي قيم غير موروثة من Error مع إبقاء تحويل الرسائل عبر parseError */
const throwParsed = (err: unknown): never => {
  const parsed = parseError(err);
  throw new Error(parsed.message);
};

export const accountsApi = {
  getAccounts: async (companyId: string) => {
    return await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .limit(5000)
      .order('code', { ascending: true });
  },

  createAccount: async (account: AccountInsert) => {
    return await supabase.from('accounts').insert(account).select().single();
  },

  insertAccounts: async (accounts: AccountInsert[]) => {
    return await supabase.from('accounts').insert(accounts).select();
  },

  /**
   * Atomic guarded soft-delete — closes the TOCTOU window of the old
   * client-side check-then-update flow (an account could gain journal
   * lines between the count and the UPDATE).
   *
   * Preferred path: server RPC performs guards + delete in ONE implicit
   * transaction (`soft_delete_account_guarded`). Fallback for databases
   * not yet migrated: the legacy two-step flow, hardened with explicit
   * company_id filters (defense-in-depth on top of RLS).
   */
  deleteAccount: async (companyId: string, id: string): Promise<GuardedDeleteResult> => {
    // 1) المسار الذري المحصّن (يتطلب تطبيق migration 20260826000014)
    const { data, error } = await supabase.rpc('soft_delete_account_guarded', {
      p_company_id: companyId,
      p_account_id: id,
    });
    if (!error) {
      return data as unknown as GuardedDeleteResult;
    }

    // الدالة غير منشورة بعد → المسار الاحتياطي القديم أدناه
    if (!isMissingRpcError(error)) {
      throwParsed(error);
    }

    // 2) Fallback legacy: فحص القيود المرتبطة
    const { count, error: checkError } = await supabase
      .from('journal_entry_lines')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (checkError) throw checkError;
    if ((count ?? 0) > 0) {
      throw new Error(FALLBACK_ERRORS.hasJournalEntries);
    }

    // Safety check: prevent deleting an account that has children accounts
    const { count: childrenCount, error: childrenError } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (childrenError) throw childrenError;
    if ((childrenCount ?? 0) > 0) {
      throw new Error(FALLBACK_ERRORS.hasChildren);
    }

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) throw updateError;
    return { ok: true };
  },
};
