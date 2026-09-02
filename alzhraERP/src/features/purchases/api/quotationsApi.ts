import { supabase } from '../../../lib/supabaseClient';
import type { CreatePurchaseQuotationDTO, QuotationStatus } from '../types/quotation';
import type { Database } from '../../../core/database.types';
import { generateQuotationNumber } from '../../../lib/quotationNumbering';

type QuotationItemDraft = CreatePurchaseQuotationDTO['items'][number] & {
  total: number;
  sortOrder: number;
};
interface RFQGroupRow {
  rfq_group_id: string | null;
  created_at: string;
}
type CreatedQuotation = Pick<
  Database['public']['Tables']['quotations']['Row'],
  'id' | 'quotation_number' | 'rfq_group_id'
>;

const calculateQuotationItems = (
  items: CreatePurchaseQuotationDTO['items']
): { items: QuotationItemDraft[]; subtotal: number } => {
  const calculatedItems = items.map((item, index) => {
    const discountPercent = item.discountPercent ?? 0;
    const lineTotal = item.quantity * item.unitPrice * (1 - discountPercent / 100);
    return { ...item, discountPercent, total: Math.round(lineTotal * 100) / 100, sortOrder: index };
  });
  return {
    items: calculatedItems,
    subtotal: calculatedItems.reduce((sum, item) => sum + item.total, 0),
  };
};

const buildQuotationItemRows = (
  companyId: string,
  items: QuotationItemDraft[]
): Array<Omit<Database['public']['Tables']['quotation_items']['Insert'], 'quotation_id'>> =>
  // quotation_id مستبعد عمداً: PostgREST يستنبطه من سياق الإدراج المتداخل تحت الأب
  items.map(item => ({
    company_id: companyId,
    product_id: item.productId !== '' ? item.productId : null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount_percent: item.discountPercent ?? 0,
    total: item.total,
    sort_order: item.sortOrder,
  }));

export const purchaseQuotationsApi = {
  getQuotations: async (companyId: string) =>
    supabase
      .from('quotations')
      .select(
        'id, quotation_number, type, status, party_id, issue_date, valid_until, total_amount, currency_code, rfq_group_id, created_at, party:party_id(name), quotation_items(id)'
      )
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

  getQuotationDetails: async (quotationId: string) =>
    supabase
      .from('quotations')
      .select(
        '*, party:party_id(id, name, phone, email), quotation_items(*, product:product_id(name_ar, sku, part_number))'
      )
      .eq('id', quotationId)
      .single(),

  /**
   * إنشاء عرض شراء جديد — كتابة ذرّية واحدة.
   *
   * سابقاً كان يتم إدراج رأس العرض ثم الأصناف في طلبين منفصلين؛ فشل الثاني
   * كان يترك عرضاً يتيم بلا أصناف. الآن يُرسَل الرأس والأصناف معاً في POST
   * واحد عبر موارد PostgREST المترابطة (FK quotation_items.quotation_id)،
   * وفشل أي جزء يُجهض الكل داخل Transaction واحد على الخادم.
   */
  createQuotation: async (
    companyId: string,
    userId: string,
    dto: CreatePurchaseQuotationDTO
  ): Promise<CreatedQuotation> => {
    const { items, subtotal } = calculateQuotationItems(dto.items);
    if (items.length === 0) {
      throw new Error('لا يمكن حفظ عرض سعر بدون أصناف — أضف صنفاً واحداً على الأقل');
    }
    const quotationNumber = await generateQuotationNumber(companyId, 'purchase');
    const rfqGroupId = dto.rfqGroupId ?? crypto.randomUUID();

    // تحويل موثّق: PostgREST يقبل مصفوفة quotation_items المتداخلة كموارد
    // مترابطة ويُدرجها ذرّياً، بينما لا يمثلها نوع Insert المولَّد للرأس وحده.
    const payload = {
      company_id: companyId,
      quotation_number: quotationNumber,
      type: 'purchase',
      status: 'draft',
      party_id: dto.partyId,
      issue_date: dto.issueDate,
      valid_until: dto.validUntil ?? null,
      subtotal,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: subtotal,
      currency_code: dto.currencyCode ?? 'SAR',
      exchange_rate: dto.exchangeRate ?? 1,
      notes: dto.notes ?? null,
      delivery_terms: dto.deliveryTerms ?? null,
      payment_terms: dto.paymentTerms ?? null,
      rfq_group_id: rfqGroupId,
      created_by: userId,
      quotation_items: buildQuotationItemRows(companyId, items),
    } as unknown as Database['public']['Tables']['quotations']['Insert'];

    const { data: quotation, error } = await supabase
      .from('quotations')
      .insert(payload)
      .select('id, quotation_number, rfq_group_id')
      .single();
    if (error !== null) throw error;
    return quotation;
  },

  getComparisonData: async (rfqGroupId: string) =>
    supabase
      .from('quotations')
      .select(
        'id, quotation_number, status, total_amount, delivery_terms, payment_terms, party:party_id(name), quotation_items(id, product_id, description, quantity, unit_price, total)'
      )
      .eq('rfq_group_id', rfqGroupId)
      .is('deleted_at', null)
      .order('total_amount', { ascending: true }),

  getRFQGroups: async (companyId: string) => {
    const { data, error } = await supabase
      .from('quotations')
      .select('rfq_group_id, created_at')
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .is('deleted_at', null)
      .not('rfq_group_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error !== null) return { data: null, error };
    const seen = new Set<string>();
    const unique = (data as RFQGroupRow[]).filter(row => {
      if (row.rfq_group_id === null || seen.has(row.rfq_group_id)) return false;
      seen.add(row.rfq_group_id);
      return true;
    });
    return { data: unique, error: null };
  },

  updateStatus: async (quotationId: string, status: QuotationStatus) =>
    supabase.from('quotations').update({ status }).eq('id', quotationId),

  deleteQuotation: async (quotationId: string) =>
    supabase
      .from('quotations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', quotationId),
};
