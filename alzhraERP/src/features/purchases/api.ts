import { supabase } from '../../lib/supabaseClient';
import { parseError } from '../../core/utils/errorUtils';
import type { CreatePurchaseDTO, SupplierPaymentData } from './types';
import type { Json } from '../../core/database.types';

type PurchaseItem = CreatePurchaseDTO['items'][number];
interface PurchaseItemPayload {
  product_id: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  /** The create RPC (`commit_purchase_invoice`) reads `discount_amount`,
   *  while the return RPC (`commit_purchase_return`) reads `discount` — send
   *  both keys so the two functions each get the value they expect. */
  discount_amount: number;
  line_total: number;
  warehouse_id?: string;
}
interface PurchaseRpcParams {
  p_company_id: string;
  p_user_id: string;
  p_supplier_id: string;
  p_items: Json;
  p_currency: string;
  p_exchange_rate: number;
  p_payment_method: string;
  p_payment_account_id?: string;
  p_invoice_number?: string;
  p_issue_date?: string;
  p_due_date?: string;
  p_notes?: string;
  p_branch_id?: string;
}
interface PurchaseReturnRpcParams {
  p_company_id: string;
  p_user_id: string;
  p_supplier_id: string;
  p_items: Json;
  p_currency: string;
  p_exchange_rate: number;
  p_notes: string;
  p_return_reason?: string;
  p_branch_id?: string;
}

const hasText = (value: string | null | undefined): value is string => value !== null && value !== undefined && value !== '';
const requireText = (value: string | null | undefined, field: string): string => {
  if (!hasText(value)) throw new Error(`${field} is required`);
  return value;
};
const asError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message));
  }
  return new Error(String(error));
};
const warehousePayload = (warehouseId: string | null | undefined): Pick<PurchaseItemPayload, 'warehouse_id'> => hasText(warehouseId) ? { warehouse_id: warehouseId } : {};

const itemPayload = (item: PurchaseItem): PurchaseItemPayload => {
  const discount = item.discount ?? 0;
  return {
    product_id: item.productId,
    quantity: item.quantity,
    unit_cost: item.costPrice,
    discount,
    discount_amount: discount,
    line_total: Math.max(0, item.quantity * item.costPrice - discount),
    ...warehousePayload(item.warehouseId),
  };
};

const buildPurchaseParams = (companyId: string, userId: string, data: CreatePurchaseDTO): PurchaseRpcParams => {
  const paymentAccountId = data.paymentMethod === 'cash' ? data.cashAccountId : data.bankAccountId;
  return {
    p_company_id: companyId,
    p_user_id: userId,
    p_supplier_id: requireText(data.supplierId, 'Supplier'),
    ...(hasText(data.invoiceNumber) ? { p_invoice_number: data.invoiceNumber } : {}),
    ...(hasText(data.issueDate) ? { p_issue_date: data.issueDate } : {}),
    ...(hasText(data.dueDate) ? { p_due_date: data.dueDate } : {}),
    p_items: data.items.map(itemPayload) as unknown as Json,
    ...(hasText(data.notes) ? { p_notes: data.notes } : {}),
    p_currency: data.currency ?? 'SAR',
    p_exchange_rate: data.exchangeRate ?? 1,
    p_payment_method: data.paymentMethod,
    ...(hasText(paymentAccountId) ? { p_payment_account_id: paymentAccountId } : {}),
    ...(hasText(data.branchId) ? { p_branch_id: data.branchId } : {}),
  };
};

const buildReturnParams = (companyId: string, userId: string, data: CreatePurchaseDTO): PurchaseReturnRpcParams => ({
  p_company_id: companyId,
  p_user_id: userId,
  p_supplier_id: requireText(data.supplierId, 'Supplier'),
  p_items: data.items.map(itemPayload) as unknown as Json,
  p_currency: data.currency ?? 'SAR',
  p_exchange_rate: data.exchangeRate ?? 1,
  p_notes: data.notes ?? '',
  ...(hasText(data.returnReason) ? { p_return_reason: data.returnReason } : {}),
  ...(hasText(data.branchId) ? { p_branch_id: data.branchId } : {}),
});

export const purchasesApi = {
  getPurchases: async (companyId: string, branchId?: string | null) => {
    let query = supabase.from('invoices').select(`
      id, invoice_number, issue_date, total_amount, status, type, payment_method,
      currency_code, exchange_rate, party:party_id(name), invoice_items(id, cost_price)
    `).eq('company_id', companyId).in('type', ['purchase', 'purchase_return']).is('deleted_at', null);
    if (hasText(branchId)) query = query.eq('branch_id', branchId);
    return query.order('issue_date', { ascending: false });
  },

  getPurchaseDetails: async (purchaseId: string) => {
    const { data, error } = await supabase.from('invoices').select(`
      *, party:party_id(*), invoice_items(*, product:product_id(name_ar, sku))
    `).eq('id', purchaseId).single();
    return { data, error };
  },

  createPurchaseRPC: async (companyId: string, userId: string, data: CreatePurchaseDTO) => {
    const { data: result, error } = await supabase.rpc('commit_purchase_invoice', buildPurchaseParams(companyId, userId, data));
    if (error) throw asError(parseError(error));
    return result;
  },

  createPurchaseReturnRPC: async (companyId: string, userId: string, data: CreatePurchaseDTO) => {
    const { data: result, error } = await supabase.rpc('commit_purchase_return', buildReturnParams(companyId, userId, data));
    if (error) throw asError(parseError(error));
    return result;
  },

  createSupplierPayment: async (paymentData: SupplierPaymentData, companyId: string, userId: string) => {
    const { data: cashAccount } = await supabase.from('accounts').select('id').eq('company_id', companyId).eq('code', '1010').single();
    if (cashAccount === null) throw new Error('Cash account (1010) not found');
    return supabase.rpc('create_financial_bond', {
      p_bond_type: 'payment',
      p_company_id: companyId,
      p_user_id: userId,
      p_amount: paymentData.amount,
      p_date: paymentData.date,
      p_cash_account_id: cashAccount.id,
      p_counterparty_type: 'party',
      p_counterparty_id: paymentData.supplierId,
      p_description: paymentData.notes ?? 'سند صرف لمورد',
      p_currency_code: paymentData.currencyCode ?? 'SAR',
      p_exchange_rate: paymentData.exchangeRate ?? 1,
      p_foreign_amount: paymentData.foreignAmount ?? paymentData.amount,
    });
  },

  getPurchaseInvoicesForReturn: async (companyId: string, supplierId: string | null, branchId?: string | null) => {
    let query = supabase.from('invoices').select(`
      id, invoice_number, issue_date, total_amount, status, type, payment_method,
      currency_code, exchange_rate, party:party_id(id, name),
      invoice_items(id, product_id, description, quantity, unit_price, total, cost_price)
    `).eq('company_id', companyId).eq('type', 'purchase').eq('status', 'posted').is('deleted_at', null);
    if (hasText(branchId)) query = query.eq('branch_id', branchId);
    if (hasText(supplierId)) query = query.eq('party_id', supplierId);
    return query.order('issue_date', { ascending: false });
  },

  deletePurchase: async (id: string) => supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id),
};
