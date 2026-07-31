// أنواع نظام المرتجعات المشتركة

export interface ReturnItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    returnQuantity: number;
    costPrice?: number;
}

export interface ReturnInvoice {
    id: string;
    invoiceNumber: string;
    type: 'return_sale' | 'return_purchase';
    referenceInvoiceId?: string;
    issueDate: string;
    partyId?: string;
    partyName: string;
    items: ReturnItem[];
    totalAmount: number;
    status: 'draft' | 'posted' | 'paid';
    notes?: string;
    returnReason?: string;
}

export interface InvoiceItem {
    id: string;
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    cost_price?: number;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    type: 'sale' | 'purchase' | 'return_sale' | 'return_purchase';
    issue_date: string;
    party?: {
        id: string;
        name: string;
    };
    total_amount: number;
    currency_code?: string;
    exchange_rate?: number;
    payment_method?: string;
    created_by?: {
        full_name?: string;
    } | any;
    invoice_items?: InvoiceItem[];
}

export interface ReturnFormData {
    invoiceId: string;
    items: ReturnItem[];
    returnReason: string;
    notes: string;
    date: string;
}

export type ReturnType = 'sale' | 'purchase';
