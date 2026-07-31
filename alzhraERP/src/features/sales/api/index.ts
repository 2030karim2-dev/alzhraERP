
import { supabase } from '@/lib/supabaseClient';
import { parseError } from '@/core/utils/errorUtils';
import { CreateInvoicePayload, InvoiceResponse } from '../types';
import { logger } from '@/core/utils/logger';
import type { Invoice, Party } from '@/core/types/supabase-helpers';
import { salesQuotationsApi } from './quotationsApi';

// Re-export quotations API
export { salesQuotationsApi };

// Define types for invoice with relations
type InvoiceWithParty = Invoice & {
  party: Pick<Party, 'name'>;
  invoice_items: { id: string }[];
};

type InvoiceWithDetails = Invoice & {
  parties: Party;
  payment_allocations: Array<{ payments: { amount: number; created_at: string; payment_method: string } }>;
  invoice_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    returned_at: string | null;
    product: { name_ar: string; sku: string; cost_price?: number; part_number?: string; brand?: string };
  }>;
};

export const salesApi = {
  getInvoices: async (companyId: string, page: number = 0, limit: number = 50, branchId?: string | null) => {
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        issue_date,
        total_amount,
        status,
        type,
        payment_method,
        currency_code,
        exchange_rate,
        party:party_id(name),
        invoice_items(id),
        reference_invoice_id
      `)
      .eq('company_id', companyId)
      .in('type', ['sale', 'return_sale'])
      .neq('status', 'void')
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
      .range(from, to);
      
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw parseError(error);
    return data as unknown as InvoiceWithParty[];
  },

  commitInvoiceRPC: async (companyId: string, userId: string, payload: CreateInvoicePayload): Promise<InvoiceResponse> => {
    if (!payload.partyId) {
      throw new Error('يجب اختيار العميل قبل إنشاء الفاتورة');
    }

    const rpcParams = {
      p_company_id: companyId,
      p_user_id: userId,
      p_party_id: payload.partyId,
      p_items: payload.items.map(i => ({ product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice })),
      ...(payload.paymentMethod ? { p_payment_method: payload.paymentMethod } : {}),
      ...(payload.notes ? { p_notes: payload.notes } : {}),
      ...(payload.treasuryAccountId ? { p_treasury_account_id: payload.treasuryAccountId } : {}),
      ...(payload.currency ? { p_currency: payload.currency } : {}),
      ...(payload.exchangeRate ? { p_exchange_rate: payload.exchangeRate } : {}),
      ...(payload.branchId ? { p_branch_id: payload.branchId } : {}),
      p_discount_amount: payload.discount || 0
    };

    const { data: result, error } = await supabase.rpc('commit_sales_invoice', rpcParams);
    if (error) throw parseError(error);
    return result as unknown as InvoiceResponse;
  },

  commitReturnRPC: async (companyId: string, userId: string, payload: CreateInvoicePayload): Promise<InvoiceResponse> => {
    if (!payload.partyId) {
      throw new Error('يجب اختيار العميل قبل إنشاء مرتجع المبيعات');
    }

    const rpcParams = {
      p_company_id: companyId,
      p_user_id: userId,
      p_party_id: payload.partyId,
      p_items: payload.items.map(i => ({ product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice })),
      ...(payload.notes ? { p_notes: payload.notes } : {}),
      ...(payload.currency ? { p_currency: payload.currency } : {}),
      ...(payload.exchangeRate ? { p_exchange_rate: Number(payload.exchangeRate) } : {}),
      ...(payload.referenceInvoiceId ? { p_reference_invoice_id: payload.referenceInvoiceId } : {}),
      ...(payload.returnReason ? { p_return_reason: payload.returnReason } : {}),
      ...(payload.branchId ? { p_branch_id: payload.branchId } : {})
    };

    const { data: result, error } = await supabase.rpc('commit_sale_return', rpcParams);
    if (error) throw parseError(error);
    return result as unknown as InvoiceResponse;
  },

  getInvoiceDetails: async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        parties:party_id(*),
        payment_allocations:invoice_payments(
          payments:payment_id(amount, created_at, payment_method)
        ),
        invoice_items:invoice_items(
          *,
          product:product_id(name_ar, sku, cost_price, part_number, brand)
        )
      `)
      .eq('id', invoiceId)
      .single();
    
    if (error) throw parseError(error);
    return data as unknown as InvoiceWithDetails;
  },

  getNextInvoiceNumber: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_next_invoice_number', {
      p_company_id: companyId,
      p_prefix: 'INV'
    });

    if (error) return { data: null, error };
    return { data: data as string | null, error: null };
  },

  getNextSequence: async (companyId: string, type: string) => {
    const { data, error } = await supabase.rpc('get_next_sequence', {
      p_company_id: companyId,
      p_type: type
    });
    if (error) return { data: null, error };
    return { data, error: null };
  },

  getSalesAnalytics: async (params: { company_id: string; start_date?: string; end_date?: string }) => {
    const rpcParams = {
      p_company_id: params.company_id,
      ...(params.start_date ? { p_start_date: params.start_date } : {}),
      ...(params.end_date ? { p_end_date: params.end_date } : {})
    };
    const { data, error } = await supabase.rpc('get_sales_analytics', rpcParams);

    if (error) {
      logger.error('Sales', 'Error fetching sales analytics', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  deleteInvoice: async (id: string) => {
    // Avoid providing client-system dates to auditing timestamps, relying instead on 
    // remote RPCs for secure soft deletion logging where feasible.
    const { error } = await supabase.rpc('void_invoice', { p_invoice_id: id });
    if(error) {
      // Direct update fallback (for envs lacking void_invoice)
      return await supabase
        .from('invoices')
        .update({ deleted_at: ((new Date()).toISOString() as unknown as string), status: 'void' })
        .eq('id', id);
    }
    return { error: null };
  }
};
