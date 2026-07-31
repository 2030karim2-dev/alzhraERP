/**
 * AI Module - Unified Type Definitions
 * All TypeScript types for the AI assistant in one place.
 */

// ============================================================
// Chat Types
// ============================================================

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isVoice?: boolean;
    parsedAction?: AIParsedResponse;
}

// ============================================================
// Intent & Entity Types
// ============================================================

export type AIIntent =
    | 'create_sales_invoice'
    | 'create_return_sale'
    | 'create_purchase_invoice'
    | 'create_return_purchase'
    | 'create_expense'
    | 'create_bond_receipt'
    | 'create_bond_payment'
    | 'create_customer'
    | 'create_supplier'
    | 'create_product'
    | 'statement_of_account'
    | 'journal_entry'
    | 'chat'
    | 'unknown';

export interface AIEntityItem {
    productName?: string;
    productCode?: string;
    manufacturer?: string;
    size?: string;
    quantity?: number;
    unitPrice?: number;
    productId?: string;  // Real product ID from DB lookup
    sku?: string;        // Real SKU from DB lookup
}

export interface AIEntities {
    partyName?: string;
    amount?: number;
    paymentMethod?: 'cash' | 'bank' | 'credit';
    date?: string;
    items?: AIEntityItem[];
    description?: string;
}

export interface AIParsedResponse {
    intent: AIIntent;
    entities?: AIEntities;
    replyText: string;
}

// ============================================================
// Product Lookup Types
// ============================================================

export interface ProductMatch {
    id: string;
    name: string;
    part_number: string;
    brand: string;
    size: string;
    selling_price: number;
    cost_price: number;
    stock_quantity: number;
    sku: string;
}

export interface LookupResult {
    searchTerm: string;
    requestedQty: number;
    matches: ProductMatch[];
    selectedProduct?: ProductMatch;
}
