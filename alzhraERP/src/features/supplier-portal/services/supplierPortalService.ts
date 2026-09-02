import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { parseError } from '../../../core/utils/errorUtils';
import type {
  VendorProductItem,
  VendorRFQ,
  VendorQuotation,
  QuotationRevision,
  RFQStatus,
  QuotationStatus,
  ItemAvailability,
  QuotationItemDraft,
  ComparisonVendorScore,
  PublicPortalContext,
  SubmitPortalQuotationPayload,
  SubmitPortalQuotationResult,
} from '../types';

/**
 * Escape PostgREST filter special characters to prevent query injection.
 * Characters like `.`, `(`, `)`, `,`, `%` have special meaning in PostgREST
 * filter strings and must be escaped or the query may break/return unexpected results.
 */
const sanitizeSearchInput = (input: string): string => input.replace(/[.(),\\%]/g, '');

/**
 * In-flight mutation guard — prevents double-submission of quotation revisions
 * and PO conversions while a request is still pending.
 */
const inflightMutations = new Set<string>();

interface RawSupplierProductRel {
  supplier_sku?: string | null;
  lead_time_days?: number | null;
  preferred_supplier?: boolean | null;
  supplier_id?: string | null;
}

interface RawProductRow {
  id: string;
  company_id: string;
  name_ar?: string | null;
  description?: string | null;
  sku: string;
  part_number?: string | null;
  brand?: string | null;
  cost_price: number | string | null;
  sale_price?: number | string | null;
  min_stock_level: number | string | null;
  unit?: string | null;
  image_url?: string | null;
  prc_supplier_products?: RawSupplierProductRel[] | null;
}

interface RawRFQItemRow {
  rfq_item_id: string;
  product_id?: string | null;
  description: string;
  quantity: number | string;
  unit_of_measure?: string | null;
  target_unit_price?: number | string | null;
  oem_number?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  vin_number?: string | null;
  notes?: string | null;
}

interface RawRFQRow {
  rfq_id: string;
  company_id: string;
  rfq_number: string;
  title: string;
  status: string;
  submission_deadline: string;
  delivery_date?: string | null;
  terms_and_conditions?: string | null;
  created_at: string;
  prc_rfq_items?: RawRFQItemRow[] | null;
}

interface RawQuotationItemRow {
  quotation_item_id: string;
  rfq_item_id?: string | null;
  product_id?: string | null;
  offered_quantity: number | string;
  unit_of_measure?: string | null;
  unit_price: number | string;
  discount_percentage?: number | string | null;
  tax_percentage?: number | string | null;
  total_price: number | string;
  vendor_sku?: string | null;
  availability?: string | null;
  lead_time_days?: number | string | null;
  warranty_days?: number | string | null;
  vendor_notes?: string | null;
  product?: {
    name_ar?: string | null;
    description?: string | null;
    part_number?: string | null;
  } | null;
}

interface RawQuotationRow {
  quotation_id: string;
  company_id: string;
  quotation_number?: string | null;
  rfq_id?: string | null;
  supplier_id: string;
  status: string;
  current_revision_number?: number | null;
  valid_until?: string | null;
  currency?: string | null;
  exchange_rate?: number | string | null;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  tax_amount?: number | string | null;
  total_amount?: number | string | null;
  delivery_lead_time_days?: number | string | null;
  warranty_terms?: string | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
  converted_po_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  prc_suppliers?: {
    supplier_id: string;
    legal_name: string;
    trade_name?: string | null;
  } | null;
  rfq?: {
    rfq_number: string;
  } | null;
  prc_quotation_items?: RawQuotationItemRow[] | null;
}

/**
 * Typed RPC wrappers. The public portal RPCs exist on the server but are
 * not yet part of the generated `database.types.ts` (Functions section),
 * so we declare the exact argument/return shapes here (mirrors the
 * chatService pattern) instead of scattering `(supabase as any)` casts.
 */
interface RpcGetContextArgs {
  p_token: string;
}
interface RpcSubmitQuotationArgs {
  p_token: string;
  p_payload: SubmitPortalQuotationPayload;
}
interface RpcRegenerateTokenArgs {
  p_party_id: string;
}

type PortalRpcArgs = RpcGetContextArgs | RpcSubmitQuotationArgs | RpcRegenerateTokenArgs;

/** Call a named portal RPC with typed args; returns the raw result payload. */
async function callPortalRpc<Result>(fn: string, args: PortalRpcArgs): Promise<Result> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: PortalRpcArgs
    ) => Promise<{ data: Result | null; error: { message: string } | null }>
  )(fn, args);
  if (error) throw new Error(error.message);
  return data as Result;
}

export const supplierPortalService = {
  /**
   * Fetches assigned products for a vendor with live stock, OEM, and car compatibility
   */
  getVendorProducts: async (
    companyId: string,
    supplierId?: string,
    search?: string
  ): Promise<VendorProductItem[]> => {
    try {
      let query = supabase
        .from('products')
        .select(
          `
          id,
          company_id,
          name_ar,
          description,
          sku,
          part_number,
          brand,
          cost_price,
          sale_price,
          min_stock_level,
          unit,
          image_url,
          prc_supplier_products (
            supplier_sku,
            lead_time_days,
            preferred_supplier,
            supplier_id
          )
        `
        )
        .eq('company_id', companyId)
        .is('deleted_at', null);

      if (search && search.trim() !== '') {
        const safe = sanitizeSearchInput(search.trim());
        if (safe.length > 0) {
          query = query.or(
            `name_ar.ilike.%${safe}%,sku.ilike.%${safe}%,part_number.ilike.%${safe}%`
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const rawProducts = (data || []) as unknown as RawProductRow[];

      return rawProducts.map((row): VendorProductItem => {
        const supplierProd = Array.isArray(row.prc_supplier_products)
          ? row.prc_supplier_products.find(sp => !supplierId || sp.supplier_id === supplierId)
          : null;

        return {
          id: row.id,
          company_id: row.company_id,
          product_id: row.id,
          product_name: row.name_ar || row.description || row.part_number || 'قطعة غيار',
          ...(row.name_ar ? { product_name_ar: row.name_ar } : {}),
          sku: row.sku,
          oem_number: row.part_number || null,
          brand: row.brand || null,
          category: null,
          vendor_sku: supplierProd?.supplier_sku || null,
          cost_price: Number(row.cost_price) || 0,
          last_quoted_price: null,
          stock_quantity: 0,
          min_stock_level: Number(row.min_stock_level) || 0,
          unit: row.unit || 'حبة',
          image_url: row.image_url || null,
          lead_time_days: supplierProd?.lead_time_days || 3,
          is_preferred: !!supplierProd?.preferred_supplier,
        };
      });
    } catch (err) {
      logger.error('supplierPortalService.getVendorProducts', 'Failed to load products', err);
      throw parseError(err);
    }
  },

  /**
   * Fetches RFQs invited to or managed
   */
  getVendorRFQs: async (companyId: string, _supplierId?: string): Promise<VendorRFQ[]> => {
    try {
      const query = supabase
        .from('prc_rfqs')
        .select(
          `
          rfq_id,
          company_id,
          rfq_number,
          title,
          status,
          submission_deadline,
          delivery_date,
          terms_and_conditions,
          created_at,
          prc_rfq_items (
            rfq_item_id,
            product_id,
            description,
            quantity,
            unit_of_measure,
            target_unit_price,
            oem_number,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            vin_number,
            notes
          )
        `
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const rawRFQs = (data || []) as unknown as RawRFQRow[];

      return rawRFQs.map((row): VendorRFQ => ({
        rfq_id: row.rfq_id,
        company_id: row.company_id,
        rfq_number: row.rfq_number,
        title: row.title,
        status: row.status as RFQStatus,
        submission_deadline: row.submission_deadline,
        delivery_date: row.delivery_date || null,
        terms_and_conditions: row.terms_and_conditions || null,
        items_count: Array.isArray(row.prc_rfq_items) ? row.prc_rfq_items.length : 0,
        created_at: row.created_at,
        items: (row.prc_rfq_items || []).map(item => ({
          rfq_item_id: item.rfq_item_id,
          rfq_id: row.rfq_id,
          product_id: item.product_id || null,
          product_name: item.description,
          oem_number: item.oem_number || null,
          quantity: Number(item.quantity) || 1,
          unit_of_measure: item.unit_of_measure || 'حبة',
          target_unit_price: item.target_unit_price ? Number(item.target_unit_price) : null,
          vehicle_make: item.vehicle_make || null,
          vehicle_model: item.vehicle_model || null,
          vehicle_year: item.vehicle_year || null,
          vin_number: item.vin_number || null,
          notes: item.notes || null,
        })),
      }));
    } catch (err) {
      logger.error('supplierPortalService.getVendorRFQs', 'Failed to load RFQs', err);
      throw parseError(err);
    }
  },

  /**
   * Fetches Vendor Quotations
   */
  getVendorQuotations: async (
    companyId: string,
    supplierId?: string
  ): Promise<VendorQuotation[]> => {
    try {
      let query = supabase
        .from('prc_quotations')
        .select(
          `
          quotation_id,
          company_id,
          quotation_number,
          rfq_id,
          supplier_id,
          status,
          current_revision_number,
          valid_until,
          currency,
          exchange_rate,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          delivery_lead_time_days,
          warranty_terms,
          terms_and_conditions,
          notes,
          converted_po_id,
          created_at,
          updated_at,
          prc_suppliers (
            supplier_id,
            legal_name,
            trade_name
          ),
          rfq:rfq_id (
            rfq_number
          ),
          prc_quotation_items (
            quotation_item_id,
            rfq_item_id,
            product_id,
            offered_quantity,
            unit_of_measure,
            unit_price,
            discount_percentage,
            tax_percentage,
            total_price,
            vendor_sku,
            availability,
            lead_time_days,
            warranty_days,
            vendor_notes,
            product:product_id (
              name_ar,
              description,
              part_number
            )
          )
        `
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rawQuotes = (data || []) as unknown as RawQuotationRow[];

      return rawQuotes.map((row): VendorQuotation => ({
        quotation_id: row.quotation_id,
        company_id: row.company_id,
        quotation_number: row.quotation_number || 'VQ-DRAFT',
        rfq_id: row.rfq_id || null,
        rfq_number: row.rfq?.rfq_number || null,
        supplier_id: row.supplier_id,
        supplier_name:
          row.prc_suppliers?.trade_name || row.prc_suppliers?.legal_name || 'مورد معتمد',
        status: row.status as QuotationStatus,
        current_revision_number: row.current_revision_number || 1,
        valid_until: row.valid_until || null,
        currency: row.currency || 'SAR',
        exchange_rate: Number(row.exchange_rate) || 1,
        subtotal: Number(row.subtotal) || 0,
        discount_amount: Number(row.discount_amount) || 0,
        tax_amount: Number(row.tax_amount) || 0,
        total_amount: Number(row.total_amount) || 0,
        delivery_lead_time_days: Number(row.delivery_lead_time_days) || 0,
        warranty_terms: row.warranty_terms || null,
        terms_and_conditions: row.terms_and_conditions || null,
        notes: row.notes || null,
        converted_po_id: row.converted_po_id || null,
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        items: (row.prc_quotation_items || []).map((item): QuotationItemDraft => ({
          id: item.quotation_item_id,
          ...(item.rfq_item_id ? { rfq_item_id: item.rfq_item_id } : {}),
          product_id: item.product_id || '',
          product_name: item.product?.name_ar || item.product?.description || 'صنف',
          oem_number: item.product?.part_number ?? null,
          vendor_sku: item.vendor_sku ?? null,
          quantity: Number(item.offered_quantity) || 1,
          unit_of_measure: item.unit_of_measure || 'حبة',
          unit_price: Number(item.unit_price) || 0,
          discount_percentage: Number(item.discount_percentage) || 0,
          discount_amount: 0,
          tax_percentage: Number(item.tax_percentage) || 0,
          tax_amount: 0,
          net_unit_price: Number(item.unit_price) || 0,
          total_price: Number(item.total_price) || 0,
          availability: (item.availability as ItemAvailability) || 'in_stock',
          lead_time_days: Number(item.lead_time_days) || 0,
          warranty_days: Number(item.warranty_days) || 0,
          vendor_notes: item.vendor_notes || '',
        })),
      }));
    } catch (err) {
      logger.error('supplierPortalService.getVendorQuotations', 'Failed to load quotations', err);
      throw parseError(err);
    }
  },

  /**
   * Submits a new quotation revision via secure atomic RPC
   */
  submitQuotationRevision: async (payload: {
    companyId: string;
    quotationId: string;
    items: QuotationItemDraft[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    currency: string;
    leadTimeDays?: number;
    warrantyDays?: number;
    validityDate?: string | null;
    terms?: string | null;
    notes?: string | null;
  }): Promise<{ success: boolean; revision_number: number; total_amount: number }> => {
    // Double-submit guard
    const mutationKey = `revision:${payload.quotationId}`;
    if (inflightMutations.has(mutationKey)) {
      throw new Error('جارٍ إرسال المراجعة بالفعل، يرجى الانتظار');
    }
    inflightMutations.add(mutationKey);
    try {
      const { data, error } = await supabase.rpc(
        'submit_vendor_quotation_revision' as never,
        {
          p_company_id: payload.companyId,
          p_quotation_id: payload.quotationId,
          p_items: JSON.stringify(payload.items),
          p_subtotal: payload.subtotal,
          p_discount: payload.discount,
          p_tax: payload.tax,
          p_total: payload.total,
          p_currency: payload.currency,
          p_lead_time_days: payload.leadTimeDays || 0,
          p_warranty_days: payload.warrantyDays || 0,
          p_validity_date: payload.validityDate || null,
          p_terms: payload.terms || null,
          p_notes: payload.notes || null,
        } as never
      );

      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      logger.error('supplierPortalService.submitQuotationRevision', 'RPC failed', err);
      throw parseError(err);
    } finally {
      inflightMutations.delete(mutationKey);
    }
  },

  /**
   * Converts a quotation to a Purchase Order (PO) via atomic RPC with idempotency & row locking
   */
  convertQuotationToPO: async (payload: {
    companyId: string;
    quotationId: string;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
  }): Promise<{ success: boolean; po_id: string; po_number: string; quotation_id: string }> => {
    // Double-submit guard
    const mutationKey = `po:${payload.quotationId}`;
    if (inflightMutations.has(mutationKey)) {
      throw new Error('جارٍ تحويل عرض السعر بالفعل، يرجى الانتظار');
    }
    inflightMutations.add(mutationKey);
    try {
      const { data, error } = await supabase.rpc(
        'convert_quotation_to_po_transactional' as never,
        {
          p_company_id: payload.companyId,
          p_quotation_id: payload.quotationId,
          p_expected_delivery_date: payload.expectedDeliveryDate || null,
          p_notes: payload.notes || null,
        } as never
      );

      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      logger.error('supplierPortalService.convertQuotationToPO', 'PO conversion failed', err);
      throw parseError(err);
    } finally {
      inflightMutations.delete(mutationKey);
    }
  },

  /**
   * Calculates comprehensive multi-criteria comparison matrix for competing quotations
   */
  calculateComparisonMatrix: (quotations: VendorQuotation[]): ComparisonVendorScore[] => {
    if (quotations.length === 0) return [];

    const minPrice = Math.min(...quotations.map(q => q.total_amount).filter(p => p > 0)) || 1;
    const minDelivery =
      Math.min(...quotations.map(q => q.delivery_lead_time_days).filter(d => d > 0)) || 1;
    const maxWarranty =
      Math.max(
        ...quotations.map(q => q.items.reduce((max, i) => Math.max(max, i.warranty_days), 0))
      ) || 1;

    const scored: ComparisonVendorScore[] = quotations.map(quote => {
      // 1. Price Score (40% weight): Lower price gets higher score
      const priceScore =
        quote.total_amount > 0 ? Math.round((minPrice / quote.total_amount) * 100) : 0;

      // 2. Delivery Speed Score (25% weight): Faster delivery gets higher score
      const leadDays = quote.delivery_lead_time_days > 0 ? quote.delivery_lead_time_days : 7;
      const deliveryScore = Math.round((minDelivery / leadDays) * 100);

      // 3. Stock Availability Score (20% weight)
      const inStockCount = quote.items.filter(i => i.availability === 'in_stock').length;
      const availabilityRate =
        quote.items.length > 0 ? Math.round((inStockCount / quote.items.length) * 100) : 100;

      // 4. Warranty Score (15% weight)
      const quoteWarranty = quote.items.reduce((max, i) => Math.max(max, i.warranty_days), 0);
      const warrantyScore = maxWarranty > 0 ? Math.round((quoteWarranty / maxWarranty) * 100) : 50;

      // Total Weighted Composite Score
      const totalScore = Math.round(
        priceScore * 0.4 + deliveryScore * 0.25 + availabilityRate * 0.2 + warrantyScore * 0.15
      );

      return {
        quotation_id: quote.quotation_id,
        supplier_id: quote.supplier_id,
        supplier_name: quote.supplier_name || 'مورد',
        quotation_number: quote.quotation_number,
        total_amount: quote.total_amount,
        currency: quote.currency,
        delivery_lead_time_days: quote.delivery_lead_time_days,
        availability_rate: availabilityRate,
        warranty_days: quoteWarranty,
        price_score: priceScore,
        delivery_score: deliveryScore,
        availability_score: availabilityRate,
        warranty_score: warrantyScore,
        overall_score: totalScore,
        rank: 1,
        is_recommended: false,
        badges: {
          is_lowest_price: quote.total_amount === minPrice && minPrice > 0,
          is_fastest_delivery: leadDays === minDelivery,
          is_best_availability: availabilityRate === 100,
          is_best_warranty: quoteWarranty === maxWarranty && maxWarranty > 0,
        },
        items: quote.items,
      };
    });

    // Sort by Total Composite Score descending
    scored.sort((a, b) => b.overall_score - a.overall_score);

    // Assign Ranks and Recommendation
    scored.forEach((s, idx) => {
      s.rank = idx + 1;
      s.is_recommended = idx === 0;
    });

    return scored;
  },

  /**
   * Fetches full revision history for a given vendor quotation
   */
  getQuotationRevisions: async (quotationId: string): Promise<QuotationRevision[]> => {
    try {
      const { data, error } = await supabase
        .from('prc_quotation_revisions')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('revision_number', { ascending: false });

      if (error) throw error;

      return (data || []).map((r): QuotationRevision => ({
        id: r.id,
        quotation_id: r.quotation_id,
        revision_number: r.revision_number,
        status: r.status,
        subtotal: r.subtotal,
        discount_amount: r.discount_amount,
        tax_amount: r.tax_amount,
        total_amount: r.total_amount,
        currency: r.currency || 'SAR',
        delivery_lead_time_days: Number(r.delivery_lead_time_days) || 0,
        warranty_days: Number(r.warranty_days) || 0,
        notes: r.notes ?? null,
        terms_and_conditions: r.terms_and_conditions ?? null,
        items_snapshot: Array.isArray(r.items_snapshot)
          ? (r.items_snapshot as unknown as QuotationItemDraft[])
          : [],
        created_at: r.created_at,
      }));
    } catch (err) {
      logger.error(
        'supplierPortalService.getQuotationRevisions',
        'Failed to load quotation revisions',
        err
      );
      throw parseError(err);
    }
  },

  /* ── Public (token-based) supplier portal — typed RPC wrappers ─────
   * The public portal RPCs are not yet part of the generated
   * `database.types.ts`, so we declare the exact argument/return shapes
   * here (same pattern as chatService) instead of scattering
   * `(supabase as any)` casts across components. Access is authorized
   * server-side by the token itself; RLS/SECURITY DEFINER scope applies.
   */

  getPublicPortalContext: async (token: string): Promise<PublicPortalContext> => {
    try {
      return await callPortalRpc<PublicPortalContext>('get_supplier_portal_context', {
        p_token: token,
      });
    } catch (err) {
      logger.error(
        'supplierPortalService.getPublicPortalContext',
        'Failed to load public portal context',
        err
      );
      throw parseError(err);
    }
  },

  submitPublicQuotation: async (
    token: string,
    payload: SubmitPortalQuotationPayload
  ): Promise<SubmitPortalQuotationResult> => {
    try {
      return await callPortalRpc<SubmitPortalQuotationResult>('submit_supplier_portal_quotation', {
        p_token: token,
        p_payload: payload,
      });
    } catch (err) {
      logger.error(
        'supplierPortalService.submitPublicQuotation',
        'Failed to submit public portal quotation',
        err
      );
      throw parseError(err);
    }
  },

  regeneratePortalToken: async (partyId: string): Promise<string> => {
    try {
      const newToken = await callPortalRpc<string>('regenerate_supplier_portal_token', {
        p_party_id: partyId,
      });
      return newToken;
    } catch (err) {
      logger.error(
        'supplierPortalService.regeneratePortalToken',
        'Failed to regenerate supplier portal token',
        err
      );
      throw parseError(err);
    }
  },
};
