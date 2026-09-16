-- ============================================================
-- Migration: Drop Redundant Indexes on `invoices`
--
-- Problem: The invoices table accumulated duplicate and
-- redundant indexes over multiple migration iterations. Each
-- extra index adds overhead to every INSERT/UPDATE on invoices,
-- which is a hot path (every sale, purchase, return, void).
--
-- NOTE: invoices_company_id_uq cannot be dropped — it is the
-- actual FK target for 4 foreign key constraints even though
-- it appears as a plain index. Keep it.
-- ============================================================

-- 1. Plain (company_id) - subsumed by invoices_company_id_uq (company_id, id)
--    and by idx_invoices_company_type_date (company_id, type, issue_date).
DROP INDEX IF EXISTS public.idx_invoices_company_id;

-- 2. Non-partial (company_id, issue_date DESC) - duplicates
--    idx_invoices_issue_date_company which has WHERE deleted_at IS NULL.
--    The partial index is more selective for all real query patterns.
DROP INDEX IF EXISTS public.idx_invoices_company_issue_date;

-- 3. (company_id, type) - fully subsumed by:
--    idx_invoices_company_type_date: (company_id, type, issue_date DESC)
--    idx_invoices_company_type_status: (company_id, type, status)
DROP INDEX IF EXISTS public.idx_invoices_type;

-- 4. (type, status) without company_id — never useful for multi-tenant queries.
--    Every real query filters company_id first.
DROP INDEX IF EXISTS public.idx_invoices_type_status;

-- 5. (party_id) alone — subsumed by idx_invoices_company_party (company_id, party_id).
DROP INDEX IF EXISTS public.idx_invoices_party_id;

-- 6. (reference_invoice_id) alone — subsumed by
--    idx_invoices_company_reference (company_id, reference_invoice_id).
DROP INDEX IF EXISTS public.idx_invoices_reference_invoice_id;

-- 7. Redundant partial unique index for invoice_number.
--    ux_invoices_company_invoice_number is strictly more selective
--    (also filters IS NOT NULL AND <> ''). The backing constraint
--    uq_invoice_number_company enforces global uniqueness.
DROP INDEX IF EXISTS public.uq_invoices_company_number;

-- ============================================================
-- invoice_items: same cleanup pattern
-- ============================================================

-- 8. (company_id) alone on invoice_items - subsumed by
--    idx_invoice_items_company_invoice (company_id, invoice_id)
--    and idx_invoice_items_company_product (company_id, product_id)
DROP INDEX IF EXISTS public.idx_invoice_items_company_id_fk;

-- 9. (invoice_id) alone - subsumed by
--    idx_invoice_items_invoice_product (invoice_id, product_id)
DROP INDEX IF EXISTS public.idx_invoice_items_invoice_id;

-- 10. (product_id) alone - subsumed by
--     idx_invoice_items_product_company (product_id, company_id)
DROP INDEX IF EXISTS public.idx_invoice_items_product_id;
