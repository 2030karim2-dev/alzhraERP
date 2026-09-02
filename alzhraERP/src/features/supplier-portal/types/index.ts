/**
 * Supplier Portal & Smart Procurement Domain Types
 */

export type RFQStatus =
  'draft' | 'sent' | 'partially_responded' | 'fully_responded' | 'closed' | 'cancelled';
export type QuotationStatus =
  'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type ItemAvailability = 'in_stock' | 'on_order' | 'unavailable' | 'partial';

export interface VendorProductItem {
  id: string;
  company_id: string;
  product_id: string;
  product_name: string;
  product_name_ar?: string;
  sku: string;
  oem_number: string | null;
  brand: string | null;
  category: string | null;
  vendor_sku: string | null;
  cost_price: number;
  last_quoted_price: number | null;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  image_url: string | null;
  lead_time_days: number;
  is_preferred: boolean;
  vehicle_compatibility?: Array<{
    make: string;
    model: string;
    year_from?: number;
    year_to?: number;
    engine?: string;
  }>;
}

export interface RFQLineItem {
  rfq_item_id: string;
  rfq_id: string;
  product_id: string | null;
  product_name: string;
  oem_number: string | null;
  quantity: number;
  unit_of_measure: string;
  target_unit_price: number | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  vin_number?: string | null;
  notes?: string | null;
}

export interface VendorRFQ {
  rfq_id: string;
  company_id: string;
  rfq_number: string;
  title: string;
  status: RFQStatus;
  submission_deadline: string;
  delivery_date: string | null;
  terms_and_conditions: string | null;
  items_count: number;
  items?: RFQLineItem[];
  created_at: string;
}

export interface QuotationItemDraft {
  id?: string;
  rfq_item_id?: string;
  product_id: string;
  product_name: string;
  oem_number?: string | null;
  vendor_sku?: string | null;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  net_unit_price: number;
  total_price: number;
  availability: ItemAvailability;
  lead_time_days: number;
  warranty_days: number;
  vendor_notes?: string | null;
}

export interface VendorQuotation {
  quotation_id: string;
  company_id: string;
  quotation_number: string;
  rfq_id: string | null;
  rfq_number?: string | null;
  supplier_id: string;
  supplier_name?: string;
  status: QuotationStatus;
  current_revision_number: number;
  valid_until: string | null;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  delivery_lead_time_days: number;
  warranty_terms?: string | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
  converted_po_id?: string | null;
  created_at: string;
  updated_at: string;
  items: QuotationItemDraft[];
}

export interface QuotationRevision {
  id: string;
  quotation_id: string;
  revision_number: number;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  delivery_lead_time_days: number;
  warranty_days: number;
  notes: string | null;
  terms_and_conditions: string | null;
  items_snapshot: QuotationItemDraft[];
  created_at: string;
}

export interface ComparisonVendorScore {
  supplier_id: string;
  supplier_name: string;
  quotation_id: string;
  quotation_number: string;
  total_amount: number;
  currency: string;
  delivery_lead_time_days: number;
  warranty_days: number;
  availability_rate: number;
  price_score: number; // 0 - 100
  delivery_score: number; // 0 - 100
  warranty_score: number; // 0 - 100
  availability_score: number; // 0 - 100
  overall_score: number; // 0 - 100
  rank: number;
  is_recommended: boolean;
  badges: {
    is_lowest_price: boolean;
    is_fastest_delivery: boolean;
    is_best_warranty: boolean;
    is_best_availability: boolean;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    availability: ItemAvailability;
    lead_time_days: number;
  }>;
}

export interface ExcelImportRow {
  rowNumber: number;
  rawProductIdentifier: string;
  rawPartNumber?: string;
  rawVendorSku?: string;
  rawProductName?: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  taxPercentage?: number;
  availability?: ItemAvailability;
  leadTimeDays?: number;
  warrantyDays?: number;
  notes?: string;
  // Match Status
  matchStatus: 'matched' | 'unmatched' | 'invalid_price' | 'invalid_quantity' | 'duplicate';
  matchedProduct?: {
    id: string;
    name: string;
    part_number: string | null;
    sku: string;
  };
  validationError?: string;
}

/* ── Public (token-based) Supplier Portal — unauthenticated context ── */

export interface PublicPortalSupplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  tax_number?: string | null;
  address?: string | null;
  commercial_registration?: string | null;
  payment_terms_days?: number | null;
}

export interface PublicPortalCompany {
  id: string;
  name_ar?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_number?: string | null;
}

export interface PublicPortalReorderProduct {
  id: string;
  name_ar: string;
  sku: string;
  part_number?: string | null;
  brand?: string | null;
  size?: string | null;
  unit?: string | null;
  cost_price: number;
  sale_price: number;
  min_stock_level: number;
  current_stock: number;
  needs_reorder: boolean;
}

export interface PublicPortalRfqItem {
  id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_of_measure?: string | null;
  target_unit_price?: number | null;
  oem_number?: string | null;
  notes?: string | null;
}

export interface PublicPortalRfq {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  submission_deadline?: string | null;
  delivery_date?: string | null;
  terms_and_conditions?: string | null;
  created_at: string;
  items?: PublicPortalRfqItem[];
}

export interface PublicPortalQuotationItem {
  id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PublicPortalQuotation {
  id: string;
  quotation_number: string;
  status: string;
  issue_date: string;
  valid_until?: string | null;
  total_amount: number;
  currency_code: string;
  notes?: string | null;
  delivery_terms?: string | null;
  payment_terms?: string | null;
  created_at: string;
  items?: PublicPortalQuotationItem[];
}

export interface PublicPortalContext {
  supplier: PublicPortalSupplier;
  company: PublicPortalCompany;
  reorder_products: PublicPortalReorderProduct[];
  rfqs: PublicPortalRfq[];
  quotations: PublicPortalQuotation[];
}

/** Draft line as submitted by the supplier through the public portal RPC. */
export interface PublicPortalQuotationDraftItem {
  product_id: string | null;
  description: string;
  oem_number: string | null;
  brand: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  notes: string | null;
}

export interface SubmitPortalQuotationPayload {
  items: PublicPortalQuotationDraftItem[];
  notes: string;
  delivery_terms: string;
  payment_terms: string;
  currency_code: string;
}

export interface SubmitPortalQuotationResult {
  quotation_number: string;
  total_amount: number;
}
