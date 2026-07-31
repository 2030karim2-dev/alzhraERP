
import { supabase } from '../../lib/supabaseClient';
import { BondFormData, BondType } from './types';

export const bondsApi = {
  getBonds: async (companyId: string, branchId?: string | null, type?: BondType) => {
    // Map BondType → payments.type
    const paymentType = type === 'receipt' ? 'receipt' : (type === 'transfer' ? 'transfer' : 'disbursement');

    let query = supabase.from('payments')
      .select(`
        id,
        payment_number,
        payment_date,
        amount,
        currency_code,
        exchange_rate,
        payment_method,
        type,
        notes,
        status,
        party:party_id(name),
        account:account_id(name_ar, code)
      `)
      .eq('company_id', companyId)
      .eq('type', paymentType)
      .is('deleted_at', null)
      .neq('status', 'void')
      .order('payment_date', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    return await query;
  },

  createPaymentRPC: async (companyId: string, userId: string, data: BondFormData & { branchId?: string | null }) => {
    if (!data.cash_account_id || !data.counterparty_id) {
      throw new Error("يجب اختيار الحسابات المطلوبة");
    }
    
    // Explicit bounds check preventing logical crashes
    if (Number(data.amount) <= 0) {
      throw new Error("لا يمكن إنشاء سند بقيمة صفر أو قيمة سالبة");
    }

    // Map BondType (receipt/payment/transfer) to payments.type (receipt/disbursement/transfer)
    const paymentType = data.type === 'receipt' ? 'receipt' : (data.type === 'transfer' ? 'transfer' : 'disbursement');

    const { data: result, error } = await supabase.rpc('commit_payment', {
      p_company_id: companyId,
      p_user_id: userId,
      p_type: paymentType,
      p_amount: data.amount,
      p_date: data.date,
      p_cash_account_id: data.cash_account_id,
      p_counterparty_type: data.counterparty_type,
      p_counterparty_id: data.counterparty_id,
      p_description: data.description,
      p_payment_method: data.payment_method || 'cash',
      p_reference_number: data.reference_number || '',
      ...(data.currency_code ? { p_currency_code: data.currency_code } : {}),
      ...(data.exchange_rate ? { p_exchange_rate: data.exchange_rate } : {}),
      ...(data.foreign_amount ? { p_foreign_amount: data.foreign_amount } : {}),
      p_branch_id: data.branchId || null
    });

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    return result;
  },

  deleteBond: async (id: string) => {
    // Use void_bond RPC to create a reversal journal entry before voiding
    const { error: rpcError } = await supabase.rpc('void_bond', {
      p_payment_id: id
    });

    if (rpcError) {
      // Must fail strictly to prevent double-entry imbalance
      console.error('Fatal: void_bond RPC failed', rpcError);
      throw new Error('تعذر إلغاء السند: فشل في إنشاء القيود العكسية');
    }

    return { error: null };
  },

  getBondsStats: async (companyId: string, branchId?: string | null) => {
    return await supabase.rpc('get_bonds_stats', { p_company_id: companyId, p_branch_id: branchId || null });
  }
};
