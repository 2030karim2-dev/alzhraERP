
import { expensesApi } from './api';
import { Expense, ExpenseFormData, ExpenseCategorySummary, ExpenseStats } from './types';
import { messagingService } from '../notifications/messagingService';
import { toBaseCurrency } from '../../core/utils/currencyUtils';
import { supabase } from '../../lib/supabaseClient';

export const expensesService = {
  getExpensesList: async (companyId: string, branchId?: string | null): Promise<Expense[]> => {
    const { data, error } = await expensesApi.getExpensesRaw(companyId, branchId);
    if (error) throw error;

    return (data || []).map((exp: Record<string, unknown>) => ({
      ...exp,
      category_name: (exp.expense_categories as Record<string, unknown>)?.name || 'غير مصنف'
    })) as Expense[];
  },

  getExpenseCategories: async (companyId: string) => {
    const { data, error } = await expensesApi.getExpenseCategories(companyId);
    if (error) throw error;
    return data || [];
  },

  createCategory: async (companyId: string, name: string) => {
    const { data, error } = await expensesApi.createExpenseCategory({
      company_id: companyId,
      name,
      is_system: false
    });
    if (error) throw error;
    return data;
  },

  processNewExpense: async (formData: ExpenseFormData, companyId: string, userId: string) => {
    // استدعاء RPC الموحد الذي يقوم بإنشاء السجل والقيد المحاسبي معاً
    const { error } = await expensesApi.createExpenseRPC(companyId, userId, formData);
    if (error) throw error;

    // 🔔 Fire-and-forget notification
    messagingService.notify(companyId, 'expense', {
      voucherNumber: formData.voucher_number || '',
      category: (formData as unknown as Record<string, unknown>).categoryName as string || 'غير مصنف',
      amount: formData.amount || 0,
      currency: formData.currency_code || 'YER',
      description: formData.description || '',
      date: new Date().toLocaleDateString('en-GB'),
    });

    return true;
  },

  deleteExpense: async (id: string): Promise<void> => {
    await expensesApi.deleteExpenseRecord(id);
  },

  // ⚡ Server-side stats via RPC — no frontend aggregation
  getStatsFromServer: async (companyId: string): Promise<ExpenseStats> => {
    const { data, error } = await supabase.rpc('get_expense_stats', {
      p_company_id: companyId
    });
    if (error) throw error;
    const result = data as any;
    return {
      totalExpenses: result.totalExpenses || 0,
      paidExpenses: result.paidExpenses || 0,
      pendingExpenses: result.pendingExpenses || 0,
      categoriesCount: result.categoriesCount || 0
    };
  },

  // Legacy: Used when expenses list is already loaded in memory
  calculateStats: (expenses: Expense[]): ExpenseStats => {
    const totalExpenses = expenses.reduce((sum, e) => sum + toBaseCurrency({ amount: Number(e.amount), currency_code: e.currency_code, exchange_rate: e.exchange_rate }), 0);
    const paidExpenses = expenses.filter(e => e.status === 'paid' || e.status === 'posted').reduce((sum, e) => sum + toBaseCurrency({ amount: Number(e.amount), currency_code: e.currency_code, exchange_rate: e.exchange_rate }), 0);
    const pendingExpenses = expenses.filter(e => e.status === 'draft').reduce((sum, e) => sum + toBaseCurrency({ amount: Number(e.amount), currency_code: e.currency_code, exchange_rate: e.exchange_rate }), 0);
    const categoriesCount = new Set(expenses.map(e => e.category_id)).size;

    return {
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      categoriesCount
    };
  },

  getCategoryBreakdown: (expenses: Expense[]): ExpenseCategorySummary[] => {
    const map: Record<string, number> = {};
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    expenses.forEach(exp => {
      const cat = exp.category_name || 'أخرى';
      const baseAmount = toBaseCurrency({ amount: Number(exp.amount), currency_code: exp.currency_code, exchange_rate: exp.exchange_rate });
      map[cat] = (map[cat] || 0) + baseAmount;
    });

    return Object.entries(map).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  }
};
