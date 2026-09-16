export type InspectEntityType = 'customer' | 'supplier' | 'invoice' | 'product';

export interface CurrencyBalanceRow {
  currency_code: string;
  currency_name: string;
  branch_name?: string | undefined;
  total_debit: number;
  total_credit: number;
  balance: number;
  balance_type: 'debit' | 'credit' | 'zero';
}

export interface PartyCompanionData {
  id: string;
  name: string;
  code?: string | undefined;
  phone?: string | undefined;
  type: 'customer' | 'supplier' | 'both';
  tax_number?: string | undefined;
  credit_limit?: number | undefined;
  payment_terms_days?: number | undefined;
  currencies: CurrencyBalanceRow[];
  recent_invoices?:
    | Array<{
        id: string;
        invoice_number: string;
        issue_date: string;
        total_amount: number;
        paid_amount: number;
        status: string;
      }>
    | undefined;
}

export interface InvoiceCompanionData {
  id: string;
  invoice_number: string;
  branch_name: string;
  warehouse_name: string;
  issue_date: string;
  currency_code: string;
  exchange_rate: number;
  payment_method: string;
  items_count: number;
  total_quantity: number;
  expenses_amount: number;
  subtotal: number;
  discount_amount: number;
  additions_amount: number;
  tax_amount: number;
  net_total: number;
  paid_amount: number;
  remaining_amount: number;
  estimated_profit?: number | undefined;
  profit_percentage?: number | undefined;
}

export interface ProductWarehouseStock {
  warehouse_id: string;
  warehouse_name: string;
  branch_name?: string | undefined;
  quantity: number;
  min_stock_level?: number | undefined;
}

export interface ProductCompanionData {
  id: string;
  name_ar: string;
  sku?: string | undefined;
  part_number?: string | undefined;
  brand?: string | undefined;
  unit?: string | undefined;
  sale_price: number;
  purchase_price: number;
  cost_price?: number | undefined;
  min_allowed_price?: number | undefined;
  total_stock: number;
  warehouses_stock: ProductWarehouseStock[];
  alternatives: string[];
}

export interface CompanionEntityTarget {
  type: InspectEntityType;
  id: string;
  title?: string | undefined;
  subtitle?: string | undefined;
}
