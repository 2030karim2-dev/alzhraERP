
import { supabase } from '../../../lib/supabaseClient';

export const reportsApi = {
  getJournalLines: async (companyId: string, branchId?: string | null, fromDate?: string, toDate?: string) => {
    let query = supabase.from('journal_entry_lines')
      .select(`
        *,
        journal:journal_entries!inner (
          id,
          entry_date,
          entry_number,
          description,
          status,
          company_id
        ),
        account:accounts (
          id,
          code,
          name_ar,
          type,
          currency_code
        )
      `)
      .eq('journal.company_id', companyId)
      .eq('journal.status', 'posted')
      .is('deleted_at', null);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (fromDate) {
      query = query.gte('journal.entry_date', fromDate);
    }
    if (toDate) {
      query = query.lte('journal.entry_date', toDate);
    }

    return await query;
  },

  getAuditJournals: async (companyId: string, branchId?: string | null) => {
    let query = supabase.from('journal_entries')
      .select(`
        id,
        entry_date,
        description,
        status,
        journal_entry_lines (
          debit_amount,
          credit_amount
        )
      `)
      .eq('company_id', companyId)
      .neq('status', 'void')
      .is('deleted_at', null)
      .order('entry_date', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    return await query;
  }
};