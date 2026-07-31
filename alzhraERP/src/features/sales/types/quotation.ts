/**
 * Sales Quotation Types
 */

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuotationItem {
  id?: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
  notes?: string;
  sortOrder?: number;
}

export interface SalesQuotation {
  id: string;
  quotationNumber: string;
  type: 'sales';
  status: QuotationStatus;
  partyId: string | null;
  partyName?: string;
  issueDate: string;
  validUntil: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  exchangeRate: number;
  notes?: string;
  termsAndConditions?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  convertedInvoiceId?: string | null;
  convertedAt?: string | null;
  createdBy?: string;
  createdAt: string;
  items?: QuotationItem[];
}

export interface CreateQuotationDTO {
  branchId?: string | null;
  partyId: string | null;
  issueDate: string;
  validUntil?: string | undefined;
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number | undefined;
  }>;
  notes?: string | undefined;
  termsAndConditions?: string | undefined;
  deliveryTerms?: string | undefined;
  paymentTerms?: string | undefined;
  currencyCode?: string | undefined;
  exchangeRate?: number | undefined;
  discountAmount?: number | undefined;
}

export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  partyName: string;
  issueDate: string;
  validUntil: string | null;
  totalAmount: number;
  status: QuotationStatus;
  currencyCode: string;
  itemCount: number;
}
