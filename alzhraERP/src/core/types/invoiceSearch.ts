export type DatePreset =
  'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom';

export interface MatchedInvoiceItem {
  id: string;
  product_id?: string | null | undefined;
  product_name: string;
  sku?: string | null | undefined;
  part_number?: string | null | undefined;
  brand?: string | null | undefined;
  quantity: number;
  unit_price: number;
  total: number;
  is_direct_match?: boolean | undefined;
}

export interface InvoiceSearchParams {
  searchTerm?: string | undefined;
  datePreset?: DatePreset | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: string | undefined;
  paymentMethod?: string | undefined;
  type?: string | undefined;
  branchId?: string | null | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface SearchInvoiceResultRow {
  id: string;
  company_id: string;
  invoice_number: string;
  type: string;
  status: string;
  payment_method: string;
  total_amount: number;
  currency_code: string;
  exchange_rate: number;
  issue_date: string;
  party_id: string | null;
  party_name: string | null;
  party_phone: string | null;
  notes: string | null;
  reference_invoice_id: string | null;
  item_count: number;
  matched_items: MatchedInvoiceItem[];
  total_matching_count: number;
}
