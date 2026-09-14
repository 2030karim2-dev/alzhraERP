import { logger } from '../../core/utils/logger';

import { supabase } from '../../lib/supabaseClient';
import type { BondFormData, BondType } from './types';

export const bondsApi = {
  getBonds: async (companyId: string, branchId?: string | null, type?: BondType) => {
    // Map BondType → payments.type
    const paymentType =
      type === 'receipt' ? 'receipt' : type === 'transfer' ? 'transfer' : 'disbursement';

    let query = supabase
      .from('payments')
      .select(
        `
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
      `
      )
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

  createPaymentRPC: async (
    companyId: string,
    userId: string,
    data: BondFormData & { branchId?: string | null }
  ) => {
    if (!data.cash_account_id || !data.counterparty_id) {
      throw new Error('يجب اختيار الحسابات المطلوبة');
    }

    if (Number(data.amount) <= 0) {
      throw new Error('لا يمكن إنشاء سند بقيمة صفر أو قيمة سالبة');
    }

    const paymentType =
      data.type === 'receipt' ? 'receipt' : data.type === 'transfer' ? 'transfer' : 'disbursement';

    const { data: resultData, error } = await supabase.rpc('create_financial_bond', {
      p_bond_type: paymentType,
      p_company_id: companyId,
      p_user_id: userId,
      p_amount: data.amount,
      p_date: data.date,
      p_cash_account_id: data.cash_account_id,
      p_counterparty_type: data.counterparty_type,
      p_counterparty_id: data.counterparty_id,
      p_description: data.description,
      p_payment_method: data.payment_method || 'cash',
      ...(data.invoice_id ? { p_invoice_id: data.invoice_id } : {}), // Atomic allocation!
      ...(data.currency_code ? { p_currency_code: data.currency_code } : {}),
      ...(data.exchange_rate ? { p_exchange_rate: data.exchange_rate } : {}),
      ...(data.foreign_amount ? { p_foreign_amount: data.foreign_amount } : {}),
      ...(data.branchId ? { p_branch_id: data.branchId } : {}),
    });

    if (error) {
      throw error;
    }

    const result = resultData as any;

    // Handle Commission / Discount if provided
    if (data.commission_amount && data.commission_amount > 0 && data.commission_account_id) {
      const { error: commError } = await supabase.rpc('create_financial_bond', {
        p_bond_type: paymentType, // receipt for customers, payment for suppliers
        p_company_id: companyId,
        p_user_id: userId,
        p_amount: data.commission_amount,
        p_date: data.date,
        p_cash_account_id: data.commission_account_id, // The discount/commission expense account
        p_counterparty_type: data.counterparty_type,
        p_counterparty_id: data.counterparty_id,
        p_description: `تسوية خصم/عمولة: ${data.description}`,
        p_payment_method: 'cash',
        ...(data.invoice_id ? { p_invoice_id: data.invoice_id } : {}), // Atomic allocation to the same invoice
        ...(data.currency_code ? { p_currency_code: data.currency_code } : {}),
        ...(data.exchange_rate ? { p_exchange_rate: data.exchange_rate } : {}),
        ...(data.branchId ? { p_branch_id: data.branchId } : {}),
      });

      if (commError) {
        logger.error('bondsApi', 'Failed to create commission bond', commError);
      }
    }

    return result;
  },

  getUnpaidPartyInvoices: async (
    companyId: string,
    partyId: string,
    partyType: 'customer' | 'supplier',
    branchId?: string | null
  ) => {
    let query = supabase
      .from('invoices')
      .select(
        `
        *,
        invoice_items(
          *,
          product:product_id(name_ar, sku, part_number, brand)
        )
      `
      )
      .eq('company_id', companyId)
      .eq('party_id', partyId)
      .eq('type', partyType === 'customer' ? 'sale' : 'purchase')
      .in('status', ['posted', 'partially_paid'])
      .is('deleted_at', null)
      .order('issue_date', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).filter(
      (inv: any) => Number(inv.total_amount) > Number(inv.paid_amount || 0)
    );
  },

  deleteBond: async (id: string) => {
    // void_bond RPC (hardened 2026-08-19):
    //  - verifies company access + open fiscal year,
    //  - posts a balanced REVERSAL journal via fn_reverse_journal_entries
    //    (the posted journal is immutable) and then voids the payment.
    // Failure must abort the whole delete to prevent double-entry imbalance.
    const { error: rpcError } = await supabase.rpc('void_bond', {
      p_payment_id: id,
    });

    if (rpcError) {
      // Must fail strictly to prevent double-entry imbalance
      logger.error('api', 'Fatal: void_bond RPC failed', rpcError);
      throw new Error('تعذر إلغاء السند: فشل في إنشاء القيود العكسية');
    }

    return { error: null };
  },

  getBondsStats: async (companyId: string, branchId?: string | null) => {
    return await supabase.rpc('get_bonds_stats', {
      p_company_id: companyId,
      ...(branchId ? { p_branch_id: branchId } : {}),
    });
  },
};
