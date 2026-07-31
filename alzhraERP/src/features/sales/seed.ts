// ============================================
// Sales Seed Data
// Initial seed data for sales
// ============================================

import { InvoiceStatus, InvoiceType } from './types';

export interface SeedInvoice {
    invoice_number: string;
    type: InvoiceType;
    status: InvoiceStatus;
    total_amount: number;
    issue_date: string;
}

export const SALES_SEED_DATA: SeedInvoice[] = [
    {
        invoice_number: 'INV-00001',
        type: 'sale',
        status: 'paid',
        total_amount: 15000,
        issue_date: new Date().toISOString().split('T')[0],
    },
    {
        invoice_number: 'INV-00002',
        type: 'sale',
        status: 'paid',
        total_amount: 8500,
        issue_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    },
    {
        invoice_number: 'INV-00003',
        type: 'sale',
        status: 'posted',
        total_amount: 22000,
        issue_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    },
    {
        invoice_number: 'INV-00004',
        type: 'return_sale',
        status: 'paid',
        total_amount: -1500,
        issue_date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    },
    {
        invoice_number: 'INV-00005',
        type: 'sale',
        status: 'paid',
        total_amount: 12500,
        issue_date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
    },
];

export const DEFAULT_SEED_COUNT = 20;
