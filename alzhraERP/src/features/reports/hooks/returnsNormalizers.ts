// ============================================================
// Normalizers نقية لسجلات المرتجعات
// توحّد أنواع المبيعات (SalesReturn) والمشتريات (PurchaseListRow)
// في نوع واحد (ReturnReportRow) بعيداً عن طبقة الـ hooks حتى
// يمكن اختبارها مباشرة دون تحميل React Query / Supabase.
// ============================================================

import type { SalesReturn } from '../../sales/hooks/useSalesReturns';
import type { PurchaseListRow } from '../../purchases/service';

/**
 * نوع موحد لسجلات المرتجعات (مبيعات ومشتريات) بعد normalization،
 * يطابق البيانات الفعلية القادمة من قاعدة البيانات بدل الاعتماد على
 * أنواع الـ hooks المختلفة.
 */
export interface ReturnReportRow {
    id: string;
    invoice_number: string | null;
    issue_date: string | null;
    created_at: string;
    total_amount: number | string | null;
    status: string | null;
    notes: string | null;
    exchange_rate: number | string | null;
    party: { name: string | null } | null;
    reference_invoice_id: string | null;
    reference_invoice?: { invoice_number: string | null } | null;
    return_reason: string | null;
    invoice_items: unknown[] | null;
}

const asText = (value: string | null | undefined): string | null =>
    value === undefined ? null : value;

/** تحويل سجل مرتجع مبيعات إلى النوع الموحد */
export const normalizeSalesReturn = (row: SalesReturn): ReturnReportRow => ({
    id: row.id,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    created_at: row.created_at,
    total_amount: row.total_amount,
    status: row.status,
    notes: asText(row.notes),
    exchange_rate: row.exchange_rate ?? null,
    party: row.party === null || row.party === undefined ? null : { name: row.party.name },
    reference_invoice_id: row.reference_invoice_id ?? null,
    return_reason: null,
    invoice_items: row.invoice_items ?? null,
});

/** تحويل سجل مرتجع مشتريات إلى النوع الموحد */
export const normalizePurchaseReturn = (row: PurchaseListRow): ReturnReportRow => ({
    id: row.id,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    // created_at غير متاح في استعلام المشتريات — نستخدم issue_date
    created_at: row.issue_date,
    total_amount: row.total_amount,
    status: row.status,
    notes: null,
    exchange_rate: row.exchange_rate,
    party: row.party === null ? null : { name: row.party.name },
    reference_invoice_id: null,
    reference_invoice: null,
    return_reason: null,
    invoice_items: row.invoice_items,
});
