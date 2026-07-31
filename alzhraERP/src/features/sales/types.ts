


export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'void';
export type InvoiceType = 'sale' | 'return_sale';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // Hidden from UI, needed for profit calc

  maxStock: number; // To prevent overselling
  estimatedPrice?: number;
  isCoreReturn?: boolean; // Added for core charge processing
}

export interface InvoiceSummary {
  subtotal: number;

  discountAmount: number;
  totalAmount: number;
}

export interface CreateInvoicePayload {
  partyId: string | null;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  paymentMethod: 'cash' | 'credit';
  notes?: string;
  treasuryAccountId?: string;
  discount?: number;
  currency?: string;
  exchangeRate?: number;
  // Return-specific fields
  referenceInvoiceId?: string | null;
  returnReason?: string | null;
  branchId?: string | null;
}

export interface CreateInvoiceDTO {
  partyId: string | null; // Null for cash customer
  type: InvoiceType;
  items: CartItem[];
  discount: number;
  notes?: string;
  dueDate?: string;
  status: InvoiceStatus;
  paymentMethod: 'cash' | 'credit';
  treasuryAccountId?: string;
  currency?: string;
  exchangeRate?: number;
  // Return-specific fields
  referenceInvoiceId?: string | null;
  returnReason?: string | null;
  branchId?: string | null;
}

export interface InvoiceResponse {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: InvoiceStatus;
  type: InvoiceType;
  paymentMethod: string;
  itemCount: number;
  currencyCode: string;
  exchangeRate: number;
  baseTotal: number;
}
