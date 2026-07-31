/**
 * Purchases Feature - Domain Types
 * Al-Zahra Smart ERP
 */

import type { Database } from '../../../core/database.types';
import type { Money, CurrencyCode } from '../../sales/types/domain';

// ============================================================================
// Database Type Aliases
// ============================================================================

export type PurchaseInvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type PurchaseInvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type PurchaseInvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
export type PurchaseInvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];

// ============================================================================
// Domain Entities
// ============================================================================

/**
 * Purchase Invoice Entity
 */
export interface PurchaseInvoice {
    readonly id: string;
    readonly invoiceNumber: string;
    readonly supplierId: string | null;
    readonly supplierName: string | null;
    readonly issueDate: Date;
    readonly dueDate: Date | null;
    readonly items: PurchaseInvoiceItem[];
    readonly subtotal: Money;
    readonly discount: Money;

    readonly total: Money;
    readonly paidAmount: Money;
    readonly balanceDue: Money;
    readonly status: PurchaseInvoiceStatus;
    readonly paymentMethod: PaymentMethod;
    readonly notes: string | null;
    readonly currency: CurrencyCode;
    readonly exchangeRate: number;
    readonly createdAt: Date;
}

export type PurchaseInvoiceStatus = 'draft' | 'posted' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'credit' | 'bank';

/**
 * Purchase Invoice Item
 */
export interface PurchaseInvoiceItem {
    readonly id: string;
    readonly productId: string | null;
    readonly description: string | null;
    readonly quantity: number;
    readonly unitPrice: Money;
    readonly costPrice: Money;

    readonly discountAmount: Money;
    readonly total: Money;
}

// ============================================================================
// DTOs
// ============================================================================

/**
 * Create Purchase Invoice DTO
 */
export interface CreatePurchaseInvoiceDTO {
    readonly supplierId: string | null;
    readonly invoiceNumber?: string | null;
    readonly issueDate: Date;
    readonly dueDate?: Date | null;
    readonly items: CreatePurchaseInvoiceItemDTO[];
    readonly paymentMethod: PaymentMethod;
    readonly notes?: string | null;
    readonly currencyCode: CurrencyCode;
    readonly exchangeRate: number;
}

export interface CreatePurchaseInvoiceItemDTO {
    readonly productId: string | null;
    readonly description?: string | null;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly costPrice?: number;

    readonly discountAmount?: number;
}

// ============================================================================
// RPC Results
// ============================================================================

export interface PurchaseInvoiceResult {
    id: string;
    invoice_number: string;
    total_amount: number;
    status: 'posted' | 'draft';
}

// ============================================================================
// Mappers
// ============================================================================

import { MoneyUtils } from '../../sales/types/domain';

export const PurchaseInvoiceMapper = {
    fromDB(row: PurchaseInvoiceRow & { items?: PurchaseInvoiceItemRow[] }): PurchaseInvoice {
        const currency: CurrencyCode = (row.currency_code as CurrencyCode) || 'SAR';
        const total = row.total_amount || 0;
        const paid = row.paid_amount || 0;

        return {
            id: row.id,
            invoiceNumber: row.invoice_number || '',
            supplierId: row.party_id,
            supplierName: null, // Will be populated from join
            issueDate: new Date(row.issue_date),
            dueDate: row.due_date ? new Date(row.due_date) : null,
            items: row.items?.map(PurchaseInvoiceItemMapper.fromDB) || [],
            subtotal: MoneyUtils.create(row.subtotal || 0, currency, row.exchange_rate || 1),
            discount: MoneyUtils.create(row.discount_amount || 0, currency, row.exchange_rate || 1),

            total: MoneyUtils.create(total, currency, row.exchange_rate || 1),
            paidAmount: MoneyUtils.create(paid, currency, row.exchange_rate || 1),
            balanceDue: MoneyUtils.create(total - paid, currency, row.exchange_rate || 1),
            status: (row.status as PurchaseInvoiceStatus) || 'draft',
            paymentMethod: (row.payment_method as PaymentMethod) || 'cash',
            notes: row.notes,
            currency,
            exchangeRate: row.exchange_rate || 1,
            createdAt: new Date(row.created_at),
        };
    },
};

export const PurchaseInvoiceItemMapper = {
    fromDB(row: PurchaseInvoiceItemRow): PurchaseInvoiceItem {
        return {
            id: row.id,
            productId: row.product_id,
            description: row.description,
            quantity: row.quantity,
            unitPrice: MoneyUtils.create(row.unit_price || 0),
            costPrice: MoneyUtils.create(row.cost_price || 0),

            discountAmount: MoneyUtils.create(row.discount_amount || 0),
            total: MoneyUtils.create(row.total || 0),
        };
    },
};