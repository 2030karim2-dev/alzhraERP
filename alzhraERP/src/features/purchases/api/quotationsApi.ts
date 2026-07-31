/**
 * Purchase Quotations API
 * Handles CRUD + RFQ comparison for purchase quotations
 */
import { supabase } from '../../../lib/supabaseClient';
import { CreatePurchaseQuotationDTO } from '../types/quotation';

export const purchaseQuotationsApi = {
  /**
   * Get all purchase quotations
   */
  getQuotations: async (companyId: string) => {
    const { data, error } = await supabase
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
        rfq_group_id,
        created_at,
        party:party_id(name),
        quotation_items(id)
      `)
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    return { data, error };
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
    
    return { data, error };
  },

  /**
   * Create a new purchase quotation (supplier response)
   */
  createQuotation: async (companyId: string, userId: string, dto: CreatePurchaseQuotationDTO) => {
    const items = dto.items.map((item, idx) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      return { ...item, total: Math.round(lineTotal * 100) / 100, sortOrder: idx };
    });
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const totalAmount = subtotal;

    // Get next quotation number
    const { count } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('type', 'purchase');

    const quotationNumber = `QP-${String((count || 0) + 1).padStart(4, '0')}`;

    // If no rfqGroupId is provided, create a new group
    const rfqGroupId = dto.rfqGroupId || crypto.randomUUID();

    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert({
        company_id: companyId,
        quotation_number: quotationNumber,
        type: 'purchase',
        status: 'draft',
        party_id: dto.partyId,
        issue_date: dto.issueDate,
        valid_until: dto.validUntil || null,
        subtotal,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: totalAmount,
        currency_code: dto.currencyCode || 'SAR',
        exchange_rate: dto.exchangeRate || 1,
        notes: dto.notes || null,
        delivery_terms: dto.deliveryTerms || null,
        payment_terms: dto.paymentTerms || null,
        rfq_group_id: rfqGroupId,
        created_by: userId,
      })
      .select('id, quotation_number, rfq_group_id')
      .single();

    if (qError) throw qError;

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
   * Get all quotations in an RFQ group (for comparison)
   */
  getComparisonData: async (rfqGroupId: string) => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        status,
        total_amount,
        delivery_terms,
        payment_terms,
        party:party_id(name),
        quotation_items(
          id,
          product_id,
          description,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('rfq_group_id', rfqGroupId)
      .is('deleted_at', null)
      .order('total_amount', { ascending: true });

    return { data, error };
  },

  /**
   * Get distinct RFQ groups
   */
  getRFQGroups: async (companyId: string) => {
    const { data, error } = await supabase
      .from('quotations')
      .select('rfq_group_id, created_at')
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .is('deleted_at', null)
      .not('rfq_group_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Deduplicate by rfq_group_id
    const seen = new Set<string>();
    const unique = (data || []).filter((row: any) => {
      if (!row.rfq_group_id || seen.has(row.rfq_group_id)) return false;
      seen.add(row.rfq_group_id);
      return true;
    });

    return { data: unique, error: null };
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
   * Soft delete
   */
  deleteQuotation: async (quotationId: string) => {
    return await supabase
      .from('quotations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', quotationId);
  },
};
