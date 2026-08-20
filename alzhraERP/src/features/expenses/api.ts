
import { supabase } from '../../lib/supabaseClient';
import type { Json } from '../../core/database.types';
import { parseError } from '../../core/utils/errorUtils';
import { ExpenseFormData } from './types';

// Typed interfaces for category create payload
interface CategoryInsert {
  company_id: string;
  name: string;
  [key: string]: unknown;
}

export const expensesApi = {
  getExpenseCategories: async (companyId: string) => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);
    if (error) throw parseError(error);
    return { data: data || [], error: null };
  },

  getExpensesRaw: async (companyId: string, branchId?: string | null) => {
    let query = supabase
      .from('expenses')
      .select(`
        id,
        category_id,
        voucher_number,
        description,
        amount,
        currency_code,
        exchange_rate,
        expense_date,
        status,
        payment_method,
        is_recurring,
        frequency,
        recurring_end_date,
        created_at,
        branch_id,
        expense_categories:category_id(name)
      `)
      .eq('company_id', companyId)
      .neq('status', 'void')
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })
      .limit(1000);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw parseError(error);
    return { data: data || [], error: null };
  },

  // استخدام RPC الموحد v2 الذي يدعم الربط المباشر بالحسابات وتحسين الأداء
  createExpenseRPC: async (companyId: string, userId: string, data: ExpenseFormData) => {
    return await supabase.rpc('commit_expense_v2', {
      p_company_id: companyId,
      p_user_id: userId,
      p_data: {
        category_id: data.category_id,
        amount: data.amount,
        description: data.description,
        date: data.expense_date,
        payment_method: data.payment_method,
        ...(data.voucher_number ? { voucher_number: data.voucher_number } : {}),
        currency: data.currency_code || 'SAR',
        exchange_rate: data.exchange_rate || 1,
        ...(data.branch_id ? { branch_id: data.branch_id } : {}),
      } as unknown as Json,
    });
  },

  createExpenseCategory: async (categoryData: CategoryInsert) => {
    return await supabase.from('expense_categories')
      .insert({
        company_id: categoryData.company_id,
        name: categoryData.name
      })
      .select()
      .single();
  },

  deleteExpenseRecord: async (id: string) => {
    // Use the void_expense RPC: it voids the expense AND creates the reversal
    // journal entry atomically. There is deliberately NO soft-delete fallback —
    // voiding without reversing the journal would leave the ledger unbalanced.
    const { error: rpcError } = await supabase.rpc('void_expense', {
      p_expense_id: id
    });

    if (rpcError) {
      throw parseError(rpcError);
    }
  }
};
