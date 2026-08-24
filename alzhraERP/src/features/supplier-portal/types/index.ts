/**
 * Supplier Portal & Smart Procurement Domain Types
 */

export type RFQStatus = 'draft' | 'sent' | 'partially_responded' | 'fully_responded' | 'closed' | 'cancelled';
export type QuotationStatus = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'expired' | 'converted';
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
  vehicle_compatibility?: {
    make: string;
    model: string;
    year_from?: number;
    year_to?: number;
    engine?: string;
  }[];
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
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    availability: ItemAvailability;
    lead_time_days: number;
  }[];
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
