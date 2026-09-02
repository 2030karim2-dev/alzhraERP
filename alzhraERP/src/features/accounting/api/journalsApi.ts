// Refactored for type safety
import { supabase } from '../../../lib/supabaseClient';
import { parseError } from '../../../core/utils/errorUtils';
import { safeDecimal, SOX_BALANCE_TOLERANCE } from '../../../core/utils/decimalUtils';
import { logger } from '../../../core/utils/logger';

export interface PostJournalEntryInput {
  date: string;
  description: string;
  reference_type?: string | undefined;
  currency_code?: string | undefined;
  exchange_rate?: number | undefined;
  lines: Array<{
    debit?: number | string | undefined;
    credit?: number | string | undefined;
    account_id: string;
    party_id?: string | undefined;
    description?: string | undefined;
  }>;
  branchId?: string | null;
}

/**
 * Client-side validation for manual journals (audit fixes R2/R3).
 * The same rules are enforced server-side by `post_manual_journal`
 * since migration 20260820000004 — this helper fails fast before a
 * bad journal ever reaches the network. Returns the decimal-safe
 * exchange rate to use in the RPC payload.
 */
const validateJournalInput = (data: PostJournalEntryInput): number => {
  const totalDebit = data.lines.reduce(
    (sum: number, l) => sum + safeDecimal(l.debit).toNumber(),
    0
  );
  const totalCredit = data.lines.reduce(
    (sum: number, l) => sum + safeDecimal(l.credit).toNumber(),
    0
  );

  // R2: never send a zero-amount journal.
  if (totalDebit <= 0) {
    throw parseError('لا يمكن ترحيل قيد بمبلغ صفري');
  }

  // R3: a 0/negative rate would silently zero out the whole entry.
  const exchangeRate = safeDecimal(data.exchange_rate ?? 1).toNumber();
  if (!(exchangeRate > 0)) {
    throw parseError('سعر صرف غير صالح (يجب أن يكون أكبر من صفر)');
  }

  if (Math.abs(totalDebit - totalCredit) > SOX_BALANCE_TOLERANCE.toNumber()) {
    throw parseError(
      `القيد غير متوازن: مدين ${totalDebit.toFixed(2)} ≠ دائن ${totalCredit.toFixed(2)}`
    );
  }

  return exchangeRate;
};

export const journalsApi = {
  fetchJournals: async (companyId: string, branchId?: string | null, pageParam = 0) => {
    const limit = 50;
    const from = pageParam * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('journal_entries')
      .select(
        `
        *,
        journal_entry_lines (
          id,
          debit_amount,
          credit_amount,
          description,
          account_id,
          account:accounts (
            id,
            name_ar,
            code
          )
        ),
        created_by_profile:profiles(id, full_name)
      `
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    return await query.range(from, to);
  },

  postJournalEntryRPC: async (companyId: string, userId: string, data: PostJournalEntryInput) => {
    // 1. Validate balance / zero amounts / exchange rate (R2 + R3)
    const exchangeRate = validateJournalInput(data);

    // 2. Call the Atomic RPC
    const { data: journalId, error } = await supabase.rpc('post_manual_journal', {
      p_company_id: companyId,
      p_user_id: userId,
      ...(data.branchId ? { p_branch_id: data.branchId } : {}),
      p_date: data.date,
      p_description: data.description,
      p_reference_type: data.reference_type || 'manual',
      p_currency_code: data.currency_code || 'SAR',
      p_exchange_rate: exchangeRate,
      p_lines: data.lines.map(l => ({
        account_id: l.account_id,
        party_id: l.party_id || null,
        debit: safeDecimal(l.debit).toNumber(),
        credit: safeDecimal(l.credit).toNumber(),
        description: l.description || null,
      })),
    });

    if (error) {
      logger.error('journalsApi', 'Error in post_manual_journal RPC', error);
      throw parseError(error);
    }

    return journalId;
  },
};
