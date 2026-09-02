import { supabase } from '@/lib/supabaseClient';
import { parseError } from '@/core/utils/errorUtils';
import type { CreateInvoicePayload, InvoiceResponse } from '../types';
import { logger } from '@/core/utils/logger';
import type { Invoice, Party } from '@/core/types/supabase-helpers';
import { salesQuotationsApi } from './quotationsApi';

// Re-export quotations API
export { salesQuotationsApi };

// Define types for invoice with relations
type InvoiceWithParty = Invoice & {
  party: Pick<Party, 'name'>;
  invoice_items: Array<{ id: string }>;
};

export interface InvoiceDetailItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  returned_at: string | null;
  name?: string;
  price?: number;
  product: {
    name_ar: string;
    sku: string;
    cost_price?: number;
    part_number?: string;
    brand?: string;
  };
}

export type InvoiceWithDetails = Invoice & {
  parties: Party;
  payment_allocations: Array<{
    payments: { amount: number; created_at: string; payment_method: string };
  }>;
  invoice_items: InvoiceDetailItem[];
};

export const salesApi = {
  getInvoices: async (companyId: string, page = 0, limit = 50, branchId?: string | null) => {
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('invoices')
      .select(
        `
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
      `
      )
      .eq('company_id', companyId)
      .eq('type', 'sale')
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

  commitInvoiceRPC: async (
    companyId: string,
    _userId: string,
    payload: CreateInvoicePayload
  ): Promise<InvoiceResponse> => {
    if (payload.paymentMethod === 'credit' && !payload.partyId) {
      throw new Error('يجب اختيار العميل للفاتورة الآجلة');
    }

    // Idempotency: prefer the caller-provided key, which is stable per user
    // intent (form session). Double-clicks, network retries and offline-queue
    // replays all reuse the SAME key, so the DB UNIQUE(company_id, idempotency_key)
    // constraint rejects duplicates. The fallback only covers legacy callers
    // that do not pass a key.
    const idempotencyKey =
      payload.idempotencyKey ??
      `${companyId}_${Date.now()}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

    const rpcParams = {
      p_party_id: payload.partyId || null,
      p_invoice_date: payload.issueDate || new Date().toISOString().split('T')[0],
      p_due_date: payload.dueDate || new Date().toISOString().split('T')[0],
      p_items: payload.items.map(i => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        tax_rate: i.taxRate ?? 15,
        ...(i.warehouseId ? { warehouse_id: i.warehouseId } : {}),
      })),
      p_payment_type: payload.paymentMethod || 'cash',
      ...(payload.treasuryAccountId ? { p_payment_account_id: payload.treasuryAccountId } : {}),
      ...(payload.notes ? { p_notes: payload.notes } : {}),
      p_currency_code: payload.currency || 'SAR',
      p_exchange_rate: payload.exchangeRate || 1,
      p_idempotency_key: idempotencyKey,
      ...(payload.branchId ? { p_branch_id: payload.branchId } : {}),
    };

    const { data: result, error } = await supabase.rpc('commit_sales_invoice_v2', rpcParams);
    if (error) throw parseError(error);
    return result as unknown as InvoiceResponse;
  },

  commitReturnRPC: async (
    companyId: string,
    userId: string,
    payload: CreateInvoicePayload
  ): Promise<InvoiceResponse> => {
    if (!payload.partyId) {
      throw new Error('يجب اختيار العميل قبل إنشاء مرتجع المبيعات');
    }

    const rpcParams = {
      p_company_id: companyId,
      p_user_id: userId,
      p_party_id: payload.partyId,
      p_items: payload.items.map(i => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
      ...(payload.notes ? { p_notes: payload.notes } : {}),
      ...(payload.currency ? { p_currency: payload.currency } : {}),
      ...(payload.exchangeRate ? { p_exchange_rate: Number(payload.exchangeRate) } : {}),
      ...(payload.referenceInvoiceId ? { p_reference_invoice_id: payload.referenceInvoiceId } : {}),
      ...(payload.returnReason ? { p_return_reason: payload.returnReason } : {}),
      ...(payload.branchId ? { p_branch_id: payload.branchId } : {}),
    };

    const { data: result, error } = await supabase.rpc('commit_sale_return', rpcParams);
    if (error) throw parseError(error);
    return result as unknown as InvoiceResponse;
  },

  getInvoiceDetails: async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        parties:party_id(*),
        payment_allocations(
          payments:payment_id(amount, created_at, payment_method)
        ),
        invoice_items(
          *,
          product:product_id(name_ar, sku, cost_price, part_number, brand)
        )
      `
      )
      .eq('id', invoiceId)
      .single();

    if (error) throw parseError(error);
    return data as unknown as InvoiceWithDetails;
  },

  getNextInvoiceNumber: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_next_invoice_number', {
      p_company_id: companyId,
      p_type: 'INV',
    });

    if (error) return { data: null, error };
    return { data: data as string | null, error: null };
  },

  getNextSequence: async (companyId: string, type: string) => {
    const { data, error } = await supabase.rpc('get_next_sequence', {
      p_company_id: companyId,
      p_sequence_name: type,
    });
    if (error) {
      logger.error('Sales', 'Error fetching next sequence', error);
      return { data: null, error: parseError(error) };
    }
    return { data, error: null };
  },

  getSalesAnalytics: async (params: {
    company_id: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const rpcParams = {
      p_company_id: params.company_id,
      ...(params.start_date ? { p_start_date: params.start_date } : {}),
      ...(params.end_date ? { p_end_date: params.end_date } : {}),
    };
    const { data, error } = await supabase.rpc('get_sales_analytics', rpcParams);

    if (error) {
      logger.error('Sales', 'Error fetching sales analytics', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  deleteInvoice: async (id: string) => {
    // Strictly invoke void_invoice RPC to reverse inventory and accounting atomically.
    // Zero client-side fallback to prevent unauthorized bypass or un-reversed ledgers.
    const { data, error } = await supabase.rpc('void_invoice', { p_invoice_id: id });
    if (error) throw parseError(error);
    return { data, error: null };
  },
};
