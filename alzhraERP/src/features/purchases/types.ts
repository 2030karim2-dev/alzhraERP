
export interface PurchaseStats {
  invoiceCount: number;
  totalPurchases: number;
  pendingPaymentCount: number;
  totalDebt: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  sku: string;
  partNumber: string;
  brand: string;
  quantity: number;
  costPrice: number; // سعر الشراء (قد يختلف عن المسجل في النظام)

  total: number;
}

export interface CreatePurchaseDTO {
  branchId?: string | null;
  supplierId: string | null;
  invoiceNumber: string; // رقم فاتورة المورد المرجعي
  items: PurchaseItem[];
  issueDate: string;
  dueDate?: string | undefined;
  notes?: string | undefined;
  status: 'draft' | 'posted';
  paymentMethod: 'cash' | 'credit';
  cashAccountId?: string | undefined;
  bankAccountId?: string | undefined;
  currency?: string | undefined;
  exchangeRate?: number | undefined;
  // Return-specific fields
  referenceInvoiceId?: string | null | undefined;
  returnReason?: string | null | undefined;
}

export interface CreatePaymentDTO {
  supplierId: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank';
  reference?: string | undefined;
  notes?: string | undefined;
  currencyCode?: string | undefined;
  exchangeRate?: number | undefined;
  foreignAmount?: number | undefined;
}

export interface SupplierPaymentData {
  supplierId: string;
  amount: number;
  date: string;
  notes?: string | undefined;
  currencyCode?: string | undefined;
  exchangeRate?: number | undefined;
  foreignAmount?: number | undefined;
}

export interface PurchaseInvoiceResponse {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
}
