
import { supabase } from '../../lib/supabaseClient';
import { ExpenseFormData } from './types';

// Typed interfaces for category create payload
interface CategoryInsert {
  company_id: string;
  name: string;
  [key: string]: unknown;
}

export const expensesApi = {
  getExpenseCategories: async (companyId: string) => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);
    return { data: data || [], error: null };
  },

  getExpensesRaw: async (companyId: string, branchId?: string | null) => {
    let query = supabase
      .from('expenses')
      .select(`
        *,
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

    return await query;
  },

  // استخدام RPC الموحد v2 الذي يدعم الربط المباشر بالحسابات وتحسين الأداء
  createExpenseRPC: async (companyId: string, userId: string, data: ExpenseFormData) => {
    return await supabase.rpc('commit_expense_v2', {
      p_company_id: companyId,
      p_user_id: userId,
      p_category_id: data.category_id,
      p_amount: data.amount,
      p_description: data.description,
      p_date: data.expense_date,
      p_payment_method: data.payment_method,
      ...(data.voucher_number ? { p_voucher_number: data.voucher_number } : {}),
      p_currency: data.currency_code || 'SAR',
      p_exchange_rate: data.exchange_rate || 1,
      ...(data.branch_id ? { p_branch_id: data.branch_id } : {})
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
    // Try RPC that both voids the expense and creates a reversal journal entry
    const { error: rpcError } = await supabase.rpc('void_expense', {
      p_expense_id: id
    });

    if (rpcError) {
      // Fallback: if RPC doesn't exist yet, do a soft delete (status = void)
      // WARNING: this does NOT reverse the journal entry
      console.warn('void_expense RPC not available, falling back to soft delete:', rpcError.message);
      const { error } = await supabase.from('expenses')
        .update({ status: 'void' })
        .eq('id', id);
      if (error) throw error;
      return;
    }
  }
};
