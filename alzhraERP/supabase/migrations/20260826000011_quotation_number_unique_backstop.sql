-- ============================================================
-- Quotation numbering uniqueness backstop (QP-/QS-)
-- ------------------------------------------------------------
-- Problem (found in code review 2026-08-26):
--   Both quotation creators derived their number client-side from
--   COUNT(*) + 1 in a request separate from the INSERT:
--     - src/features/purchases/api/quotationsApi.ts  → QP-#### 
--     - src/features/sales/api/quotationsApi.ts      → QS-####
--   Two concurrent creations could compute the same number, and no
--   constraint existed, so duplicates were silently accepted.
--
-- Fix:
--   1) Frontend now numbers via a single scan of existing numbers
--      (max trailing sequence + 1, soft-deleted included):
--      src/lib/quotationNumbering.ts
--      and writes header + items atomically via one nested PostgREST
--      related-resource insert.
--   2) THIS migration adds the hard DB guarantee: any residual race
--      now REJECTS with a unique-violation error instead of storing
--      a duplicate number.
--
-- Apply through the normal migration pipeline. The DO block below
-- fails loudly listing duplicates if legacy data already contains
-- them so they are resolved deliberately first.
-- Date: 2026-08-26
-- ============================================================

DO $$
DECLARE
    v_duplicates text;
BEGIN
    SELECT string_agg(company_id::text || ' / ' || q.type || ' / ' || q.quotation_number, E'\n  ')
      INTO v_duplicates
      FROM public.quotations q
     GROUP BY q.company_id, q.type, q.quotation_number
     HAVING count(*) > 1
     LIMIT 20;

    IF v_duplicates IS NOT NULL THEN
        RAISE EXCEPTION USING
            message = 'duplicate quotation numbers detected — resolve before applying this migration',
            detail = 'company / type / quotation_number:' || E'\n  ' || v_duplicates,
            hint   = 'Renumber or soft-delete the duplicate rows, then re-run this migration';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotations_company_type_number
    ON public.quotations (company_id, type, quotation_number);

COMMENT ON INDEX ux_quotations_company_type_number IS
    'Backstop for race-resistant client numbering (quotationNumbering.ts): guarantees QP-/QS- numbers are unique per company per kind.';
