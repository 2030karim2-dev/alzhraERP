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

const isCurrencyCode = (value: string | null): value is CurrencyCode =>
    value === 'SAR' || value === 'YER' || value === 'USD' || value === 'EUR' || value === 'OMR' || value === 'CNY';

const toMoney = (value: number | null, currency: CurrencyCode, exchangeRate: number): Money => MoneyUtils.create(value ?? 0, currency, exchangeRate);
const toOptionalDate = (value: string | null): Date | null => value === null ? null : new Date(value);
const toPurchaseItems = (items: PurchaseInvoiceItemRow[] | undefined): PurchaseInvoiceItem[] => items?.map(item => PurchaseInvoiceItemMapper.fromDB(item)) ?? [];

export const PurchaseInvoiceMapper = {
    fromDB(row: PurchaseInvoiceRow & { items?: PurchaseInvoiceItemRow[] }): PurchaseInvoice {
        const currency: CurrencyCode = isCurrencyCode(row.currency_code) ? row.currency_code : 'SAR';
        const exchangeRate = row.exchange_rate;
        const total = row.total_amount;
        const paid = row.paid_amount;
        return {
            id: row.id,
            invoiceNumber: row.invoice_number ?? '',
            supplierId: row.party_id,
            supplierName: null,
            issueDate: new Date(row.issue_date),
            dueDate: toOptionalDate(row.due_date),
            items: toPurchaseItems(row.items),
            subtotal: toMoney(row.subtotal, currency, exchangeRate),
            discount: toMoney(row.discount_amount, currency, exchangeRate),
            total: toMoney(total, currency, exchangeRate),
            paidAmount: toMoney(paid, currency, exchangeRate),
            balanceDue: toMoney(total - paid, currency, exchangeRate),
            status: row.status as PurchaseInvoiceStatus,
            paymentMethod: row.payment_method as PaymentMethod,
            notes: row.notes,
            currency,
            exchangeRate,
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