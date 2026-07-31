/**
 * Sales Quotations API
 * Handles CRUD operations for sales quotations
 */
import { supabase } from '../../../lib/supabaseClient';
import { CreateQuotationDTO } from '../types/quotation';

// DB row types
interface QuotationRow {
  id: string;
  quotation_number: string;
  type: string;
  status: string;
  party_id: string | null;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  exchange_rate: number;
  notes: string | null;
  terms_and_conditions: string | null;
  delivery_terms: string | null;
  payment_terms: string | null;
  converted_invoice_id: string | null;
  converted_at: string | null;
  created_by: string | null;
  created_at: string;
  party: { name: string } | null;
  quotation_items: Array<{ id: string }>;
}

interface QuotationDetailRow extends Omit<QuotationRow, 'party' | 'quotation_items'> {
  party: { id: string; name: string; phone: string | null; email: string | null } | null;
  quotation_items: Array<{
    id: string;
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    total: number;
    notes: string | null;
    sort_order: number;
    product: { name_ar: string; sku: string; part_number: string | null } | null;
  }>;
}

export const salesQuotationsApi = {
  /**
   * Get all sales quotations
   */
  getQuotations: async (companyId: string, branchId?: string | null) => {
    let query = supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        type,
        status,
        party_id,
        issue_date,
        valid_until,
        total_amount,
        currency_code,
        created_at,
        party:party_id(name),
        quotation_items(id)
      `)
      .eq('company_id', companyId)
      .eq('type', 'sales')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    
    const { data, error } = await query;
    return { data: data as QuotationRow[] | null, error };
  },

  /**
   * Get quotation details with items
   */
  getQuotationDetails: async (quotationId: string) => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        party:party_id(id, name, phone, email),
        quotation_items(
          *,
          product:product_id(name_ar, sku, part_number)
        )
      `)
      .eq('id', quotationId)
      .single();
    
    return { data: data as QuotationDetailRow | null, error };
  },

  /**
   * Create a new sales quotation
   */
  createQuotation: async (companyId: string, userId: string, dto: CreateQuotationDTO) => {
    // Calculate totals
    const items = dto.items.map((item, idx) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      return { ...item, total: Math.round(lineTotal * 100) / 100, sortOrder: idx };
    });
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const discountAmount = dto.discountAmount || 0;
    const totalAmount = subtotal - discountAmount;

    // Get next quotation number
    const { count } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('type', 'sales');

    const quotationNumber = `QS-${String((count || 0) + 1).padStart(4, '0')}`;

    // Insert quotation
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert({
        company_id: companyId,
        branch_id: dto.branchId || null,
        quotation_number: quotationNumber,
        type: 'sales',
        status: 'draft',
        party_id: dto.partyId,
        issue_date: dto.issueDate,
        valid_until: dto.validUntil || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        currency_code: dto.currencyCode || 'SAR',
        exchange_rate: dto.exchangeRate || 1,
        notes: dto.notes || null,
        terms_and_conditions: dto.termsAndConditions || null,
        delivery_terms: dto.deliveryTerms || null,
        payment_terms: dto.paymentTerms || null,
        created_by: userId,
      })
      .select('id, quotation_number')
      .single();

    if (qError) throw qError;

    // Insert items
    const itemRows = items.map((item, idx) => ({
      quotation_id: quotation.id,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_percent: item.discountPercent || 0,
      total: item.total,
      sort_order: idx,
    }));

    const { error: iError } = await supabase
      .from('quotation_items')
      .insert(itemRows);

    if (iError) throw iError;

    return quotation;
  },

  /**
   * Update quotation status
   */
  updateStatus: async (quotationId: string, status: string) => {
    return await supabase
      .from('quotations')
      .update({ status })
      .eq('id', quotationId);
  },

  /**
   * Convert quotation to invoice (marks it as converted)
   */
  markAsConverted: async (quotationId: string, invoiceId?: string) => {
    return await supabase
      .from('quotations')
      .update({
        status: 'converted',
        converted_invoice_id: invoiceId || null,
        converted_at: new Date().toISOString(),
      })
      .eq('id', quotationId);
  },

  /**
   * Soft delete a quotation
   */
  deleteQuotation: async (quotationId: string) => {
    return await supabase
      .from('quotations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', quotationId);
  },
};

