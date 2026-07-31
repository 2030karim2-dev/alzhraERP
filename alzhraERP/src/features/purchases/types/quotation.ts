/**
 * Purchase Quotation Types
 */

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface PurchaseQuotationItem {
  id?: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
  notes?: string;
}

export interface PurchaseQuotation {
  id: string;
  quotationNumber: string;
  type: 'purchase';
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
  rfqGroupId?: string | null;
  convertedInvoiceId?: string | null;
  createdAt: string;
  items?: PurchaseQuotationItem[];
}

export interface CreatePurchaseQuotationDTO {
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
  deliveryTerms?: string | undefined;
  paymentTerms?: string | undefined;
  currencyCode?: string | undefined;
  exchangeRate?: number | undefined;
  rfqGroupId?: string | undefined;
}

/**
 * Comparison data structure
 */
export interface ComparisonSupplier {
  quotationId: string;
  supplierName: string;
  totalAmount: number;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface ComparisonData {
  rfqGroupId: string;
  productDescriptions: string[];
  suppliers: ComparisonSupplier[];
  recommendations: {
    cheapest: string | null;     // quotation id
    fastestDelivery: string | null;
  };
}
