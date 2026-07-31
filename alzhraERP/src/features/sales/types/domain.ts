/**
 * Domain Types for Sales Feature
 * Al-Zahra Smart ERP
 *
 * These types provide type-safe representations of sales domain entities
 * with proper mapping to and from database types.
 */

import type { Database } from '../../../core/database.types';

// ============================================================================
// Database Type Aliases
// ============================================================================

export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];

export type PartyRow = Database['public']['Tables']['parties']['Row'];
export type ProductRow = Database['public']['Tables']['products']['Row'];

// ============================================================================
// Value Objects
// ============================================================================

/**
 * Represents a monetary amount with currency
 */
export interface Money {
    readonly amount: number;
    readonly currency: CurrencyCode;
    readonly exchangeRate: number;
}

export type CurrencyCode = 'SAR' | 'YER' | 'USD' | 'EUR' | 'OMR' | 'CNY';

// ============================================================================
// Domain Entities
// ============================================================================

/**
 * Sales Invoice Entity - the aggregate root for sales
 */
export interface SalesInvoice {
    readonly id: string;
    readonly invoiceNumber: string;
    readonly type: InvoiceType;
    readonly status: InvoiceStatus;
    readonly issueDate: Date;
    readonly dueDate: Date | null;
    readonly party: Customer | null;
    readonly partyId: string | null;
    readonly items: InvoiceItem[];
    readonly subtotal: Money;
    readonly discount: Money;
    readonly total: Money;
    readonly paidAmount: Money;
    readonly balanceDue: Money;
    readonly paymentMethod: PaymentMethod;
    readonly notes: string | null;
    readonly currency: CurrencyCode;
    readonly exchangeRate: number;
    readonly createdAt: Date;
}

export type InvoiceType = 'sale' | 'sale_return' | 'purchase' | 'return_purchase';
export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'credit' | 'bank';

/**
 * Invoice Item Entity
 */
export interface InvoiceItem {
    readonly id: string;
    readonly productId: string | null;
    readonly description: string | null;
    readonly quantity: number;
    readonly unitPrice: Money;
    readonly costPrice: Money;
    readonly discountAmount: Money;
    readonly total: Money;
}

/**
 * Customer Entity (simplified from Party)
 */
export interface Customer {
    readonly id: string;
    readonly name: string;
    readonly phone: string | null;
    readonly email: string | null;
    readonly address: string | null;
    readonly balance: number;
    readonly status: 'active' | 'blocked';
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a new sales invoice
 */
export interface CreateInvoiceDTO {
    readonly partyId: string | null;
    readonly issueDate: Date;
    readonly dueDate?: Date | null;
    readonly items: CreateInvoiceItemDTO[];
    readonly paymentMethod: PaymentMethod;
    readonly notes?: string | null;
    readonly currencyCode: CurrencyCode;
    readonly exchangeRate: number;
}

/**
 * DTO for creating an invoice item
 */
export interface CreateInvoiceItemDTO {
    readonly productId: string | null;
    readonly description?: string | null;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly costPrice?: number;
    readonly discountAmount?: number;
}

// ============================================================================
// RPC Result Types
// ============================================================================

/**
 * Result from commit_sales_invoice RPC
 */
export interface SalesInvoiceResult {
    id: string;
    invoice_number: string;
    total_amount: number;
    status: 'posted' | 'draft';
}

/**
 * Result from commit_sale_return RPC
 */
export interface SalesReturnResult {
    id: string;
    invoice_number: string;
    total_amount: number;
    status: 'posted' | 'draft';
}

// ============================================================================
// Mappers
// ============================================================================

export const MoneyUtils = {
    create(amount: number, currency: CurrencyCode = 'SAR', exchangeRate: number = 1): Money {
        return {
            amount: Math.round(amount * 100) / 100,
            currency,
            exchangeRate,
        };
    },

    zero(currency: CurrencyCode = 'SAR'): Money {
        return { amount: 0, currency, exchangeRate: 1 };
    },

    add(a: Money, b: Money): Money {
        if (a.currency !== b.currency) {
            throw new Error(`Cannot add ${a.currency} to ${b.currency}`);
        }
        return {
            amount: a.amount + b.amount,
            currency: a.currency,
            exchangeRate: a.exchangeRate,
        };
    },

    subtract(a: Money, b: Money): Money {
        if (a.currency !== b.currency) {
            throw new Error(`Cannot subtract ${b.currency} from ${a.currency}`);
        }
        return {
            amount: a.amount - b.amount,
            currency: a.currency,
            exchangeRate: a.exchangeRate,
        };
    },

    multiply(money: Money, factor: number): Money {
        return {
            amount: Math.round(money.amount * factor * 100) / 100,
            currency: money.currency,
            exchangeRate: money.exchangeRate,
        };
    },

    format(money: Money, locale: string = 'ar-SA'): string {
        const symbols: Record<CurrencyCode, string> = {
            SAR: 'ر.س',
            YER: 'ر.ي',
            USD: '$',
            EUR: '€',
            OMR: 'ر.ع',
            CNY: '¥',
        };

        const symbol = symbols[money.currency] || money.currency;

        if (money.currency === 'USD') {
            return `${symbol}${money.amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        return `${money.amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
    },
};

export const InvoiceMapper = {
    fromDB(row: InvoiceRow & { items?: InvoiceItemRow[]; party?: PartyRow | null }): SalesInvoice {
        const currency: CurrencyCode = (row.currency_code as CurrencyCode) || 'SAR';
        const total = row.total_amount || 0;
        const paid = row.paid_amount || 0;

        return {
            id: row.id,
            invoiceNumber: row.invoice_number || '',
            type: (row.type as InvoiceType) || 'sale',
            status: (row.status as InvoiceStatus) || 'draft',
            issueDate: new Date(row.issue_date),
            dueDate: row.due_date ? new Date(row.due_date) : null,
            party: row.party ? CustomerMapper.fromDB(row.party) : null,
            partyId: row.party_id,
            items: row.items?.map(InvoiceItemMapper.fromDB) || [],
            subtotal: MoneyUtils.create(row.subtotal || 0, currency, row.exchange_rate || 1),
            discount: MoneyUtils.create(row.discount_amount || 0, currency, row.exchange_rate || 1),
            total: MoneyUtils.create(total, currency, row.exchange_rate || 1),
            paidAmount: MoneyUtils.create(paid, currency, row.exchange_rate || 1),
            balanceDue: MoneyUtils.create(total - paid, currency, row.exchange_rate || 1),
            paymentMethod: (row.payment_method as PaymentMethod) || 'cash',
            notes: row.notes,
            currency,
            exchangeRate: row.exchange_rate || 1,
            createdAt: new Date(row.created_at),
        };
    },

    toDB(dto: CreateInvoiceDTO, companyId: string, userId: string): InvoiceInsert {
        const insert: any = {
            company_id: companyId,
            created_by: userId,
            party_id: dto.partyId,
            issue_date: dto.issueDate.toISOString(),
            type: 'sale',
            status: 'draft',
            payment_method: dto.paymentMethod,
            currency_code: dto.currencyCode,
            exchange_rate: dto.exchangeRate,
        };
        if (dto.dueDate !== undefined) insert.due_date = dto.dueDate?.toISOString() || null;
        if (dto.notes !== undefined) insert.notes = dto.notes;
        return insert as InvoiceInsert;
    },
};

export const InvoiceItemMapper = {
    fromDB(row: InvoiceItemRow): InvoiceItem {
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

    toDB(dto: CreateInvoiceItemDTO, invoiceId: string): InvoiceItemInsert {
        const insert: any = {
            invoice_id: invoiceId,
            product_id: dto.productId,
            quantity: dto.quantity,
            unit_price: dto.unitPrice,
        };
        if (dto.costPrice !== undefined) insert.cost_price = dto.costPrice;
        if (dto.discountAmount !== undefined) insert.discount_amount = dto.discountAmount;
        if (dto.description !== undefined) insert.description = dto.description;
        return insert as InvoiceItemInsert;
    },
};

export const CustomerMapper = {
    fromDB(row: PartyRow): Customer {
        return {
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            balance: (row as any).balance || 0,
            status: (row.status as 'active' | 'blocked') || 'active',
        };
    },
};

// ============================================================================
// Validation
// ============================================================================

export const SalesValidation = {
    validateCreateInvoice(dto: CreateInvoiceDTO): string[] {
        const errors: string[] = [];

        if (!dto.items || dto.items.length === 0) {
            errors.push('Invoice must have at least one item');
        }

        if (dto.items.some(item => item.quantity <= 0)) {
            errors.push('All items must have positive quantity');
        }

        if (dto.items.some(item => item.unitPrice < 0)) {
            errors.push('All items must have non-negative unit price');
        }

        if (dto.exchangeRate <= 0) {
            errors.push('Exchange rate must be positive');
        }

        return errors;
    },

    validateCanPost(invoice: SalesInvoice): string[] {
        const errors: string[] = [];

        if (invoice.status !== 'draft') {
            errors.push('Only draft invoices can be posted');
        }

        if (invoice.items.length === 0) {
            errors.push('Invoice has no items');
        }

        if (invoice.total.amount <= 0) {
            errors.push('Invoice total must be positive');
        }

        return errors;
    },
};

export default {
    MoneyUtils,
    InvoiceMapper,
    InvoiceItemMapper,
    CustomerMapper,
    SalesValidation,
};