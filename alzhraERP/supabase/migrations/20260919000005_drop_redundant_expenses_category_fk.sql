-- ============================================================
-- Migration: 20260919000005_drop_redundant_expenses_category_fk.sql
-- Description:
--   `expenses` carries TWO foreign keys to `expense_categories`:
--     1. expenses_category_id_fkey    (category_id) -> expense_categories(id)
--     2. fk_expenses_company_category (company_id, category_id) -> expense_categories(company_id, id)
--
--   Because both exist, PostgREST sees two candidate relationships and ANY
--   unhinted embed fails with PGRST201 ("Could not embed because more than one
--   relationship was found between expenses and expense_categories"):
--     • the dashboard recent-expenses feed (`expense_categories(name)`), and
--     • older deployed bundles that embed `expense_categories:category_id(name)`
--       (the browser error reported on 2026-09-19: HTTP 400 on /rest/v1/expenses).
--
--   The COMPOSITE FK is strictly stronger: it keeps ON DELETE RESTRICT AND
--   guarantees the category belongs to the same company (tenant integrity), so
--   the single-column FK is redundant. Dropping it leaves exactly ONE
--   relationship, making every embed form work — hinted or not.
--
--   NOTE: the frontend keeps the explicit `!fk_expenses_company_category` hint
--   (harmless and self-documenting), but no longer depends on it.
-- ============================================================

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;

NOTIFY pgrst, 'reload schema';
