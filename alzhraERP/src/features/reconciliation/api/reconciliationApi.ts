import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type {
  DailyDrawerSummary,
  CommitDailyReconciliationDTO,
  QuickDrawerExpenseDTO,
  ExistingReconciliationRecord,
} from '../types';

// Helper for newly defined database RPCs not yet in the generated TypeScript snapshot
const callRpc = async (name: string, params: Record<string, unknown>) => {
  const rpcFn = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
  return await rpcFn(name, params);
};

export const reconciliationApi = {
  /**
   * استرجاع ملخص حركات الصندوق واليومية ومبيعات الموظفين
   */
  fetchDailyDrawerSummary: async (
    companyId: string,
    date: string,
    branchId?: string | null
  ): Promise<DailyDrawerSummary> => {
    try {
      const { data, error } = await callRpc('get_daily_drawer_summary', {
        p_company_id: companyId,
        p_date: date,
        p_branch_id: branchId || null,
      });

      if (error) {
        logger.error('reconciliationApi', 'Failed to fetch drawer summary', {
          companyId,
          date,
          error,
        });
        throw error;
      }

      return data as unknown as DailyDrawerSummary;
    } catch (err) {
      logger.error('reconciliationApi', 'fetchDailyDrawerSummary exception', err);
      throw err;
    }
  },

  /**
   * اعتماد وإقفال يومية الصندوق
   */
  commitReconciliation: async (
    payload: CommitDailyReconciliationDTO
  ): Promise<{ success: boolean; reconciliation_id: string; message: string }> => {
    try {
      const { data, error } = await callRpc('commit_daily_reconciliation', {
        p_company_id: payload.company_id,
        p_date: payload.date,
        p_branch_id: payload.branch_id || null,
        p_opening_float: payload.opening_float,
        p_actual_cash_counted: payload.actual_cash_counted,
        p_cash_denominations: payload.cash_denominations,
        p_card_terminal_receipt_total: payload.card_terminal_receipt_total,
        p_float_retained_for_tomorrow: payload.float_retained_for_tomorrow,
        p_cash_handed_to_owner: payload.cash_handed_to_owner,
        p_variance_reason: payload.variance_reason || null,
        p_notes: payload.notes || null,
      });

      if (error) {
        logger.error('reconciliationApi', 'Failed to commit daily reconciliation', {
          payload,
          error,
        });
        throw error;
      }

      return data as unknown as { success: boolean; reconciliation_id: string; message: string };
    } catch (err) {
      logger.error('reconciliationApi', 'commitReconciliation exception', err);
      throw err;
    }
  },

  /**
   * تسجيل سريع لمصروف نثري من الدرج في 3 ثوانٍ
   */
  recordQuickExpense: async (
    payload: QuickDrawerExpenseDTO
  ): Promise<{ success: boolean; expense_id: string; message: string }> => {
    try {
      const { data, error } = await callRpc('record_quick_drawer_expense', {
        p_company_id: payload.company_id,
        p_amount: payload.amount,
        p_description: payload.description,
        p_branch_id: payload.branch_id || null,
        p_expense_date: payload.expense_date || null,
      });

      if (error) {
        logger.error('reconciliationApi', 'Failed to record quick drawer expense', {
          payload,
          error,
        });
        throw error;
      }

      return data as unknown as { success: boolean; expense_id: string; message: string };
    } catch (err) {
      logger.error('reconciliationApi', 'recordQuickExpense exception', err);
      throw err;
    }
  },

  /**
   * جلب أرشيف وسجل المطابقات السابقة
   */
  fetchReconciliationHistory: async (
    companyId: string,
    limit = 30,
    branchId?: string | null
  ): Promise<ExistingReconciliationRecord[]> => {
    try {
      let query = supabase
        .from('daily_reconciliations' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('reconciliation_date', { ascending: false })
        .limit(limit);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) {
        logger.error('reconciliationApi', 'Failed to fetch reconciliation history', {
          companyId,
          error,
        });
        throw error;
      }

      return (data || []) as unknown as ExistingReconciliationRecord[];
    } catch (err) {
      logger.error('reconciliationApi', 'fetchReconciliationHistory exception', err);
      throw err;
    }
  },
};
