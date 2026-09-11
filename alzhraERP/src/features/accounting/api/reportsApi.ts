import { supabase } from '../../../lib/supabaseClient';

export const reportsApi = {
  getAuditJournals: async (companyId: string, branchId?: string | null) => {
    let query = supabase
      .from('journal_entries')
      .select(
        `
        id,
        entry_date,
        description,
        status,
        journal_entry_lines (
          debit_amount,
          credit_amount
        )
      `
      )
      .eq('company_id', companyId)
      .neq('status', 'void')
      .is('deleted_at', null)
      .order('entry_date', { ascending: false })
      .limit(500); // فحص تشخيصي — آخر 500 قيد لتجنب جلب كل التاريخ دفعة واحدة

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    return await query;
  },
};
