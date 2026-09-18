-- Migration: 20260918000001_fix_expenses_fk_and_optimize_party_balances.sql
-- Description:
-- 1. Add single-column FK fk_expenses_category_id on expenses(category_id) -> expense_categories(id)
--    This resolves PostgREST relationship ambiguity so both 'expense_categories:category_id(...)'
--    and 'expense_categories!fk_expenses_company_category(...)' work transparently.
-- 2. Optimize party_balances_by_currency view using UNION ALL to allow PostgreSQL query planner
--    to push company_id predicate directly down into indexed table scans, eliminating the cross-company
--    full table scan that caused HTTP 500 statement timeouts.
-- 3. Formalize get_party_currencies_by_company RPC for fast direct party balance retrieval.

-- 1) Foreign key for PostgREST embedding compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_category_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT fk_expenses_category_id
      FOREIGN KEY (category_id)
      REFERENCES public.expense_categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2) High-performance party_balances_by_currency view
CREATE OR REPLACE VIEW public.party_balances_by_currency AS
WITH combined AS (
  SELECT 
    jel.party_id,
    jel.company_id,
    jel.currency_code,
    SUM(
      CASE
        WHEN jel.currency_code IS NOT NULL AND upper(TRIM(BOTH FROM jel.currency_code)) <> 'SAR'::text 
          THEN COALESCE(NULLIF(jel.foreign_amount, 0::numeric),
            CASE
              WHEN a.code ~~ '1100%'::text THEN jel.debit_amount - jel.credit_amount
              WHEN a.code ~~ '2100%'::text THEN jel.credit_amount - jel.debit_amount
              ELSE jel.debit_amount - jel.credit_amount
            END) *
            CASE
              WHEN a.code ~~ '1100%'::text THEN
                CASE WHEN jel.debit_amount >= jel.credit_amount THEN 1 ELSE -1 END
              WHEN a.code ~~ '2100%'::text THEN
                CASE WHEN jel.credit_amount >= jel.debit_amount THEN 1 ELSE -1 END
              ELSE
                CASE WHEN jel.debit_amount >= jel.credit_amount THEN 1 ELSE -1 END
            END::numeric
        ELSE
          CASE
            WHEN a.code ~~ '1100%'::text THEN jel.debit_amount - jel.credit_amount
            WHEN a.code ~~ '2100%'::text THEN jel.credit_amount - jel.debit_amount
            ELSE jel.debit_amount - jel.credit_amount
          END
      END
    )::numeric(14,2) AS balance,
    count(DISTINCT jel.journal_entry_id)::integer AS transaction_count,
    max(je.entry_date) AS last_activity_date
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL AND je.status = 'posted'::text
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE jel.deleted_at IS NULL 
    AND jel.party_id IS NOT NULL 
    AND jel.currency_code IS NOT NULL 
    AND (a.code ~~ '1100%'::text OR a.code ~~ '2100%'::text)
  GROUP BY jel.party_id, jel.company_id, jel.currency_code

  UNION ALL

  SELECT 
    ob.party_id,
    ob.company_id,
    ob.currency_code::text,
    sum(
      CASE
        WHEN p.type = 'supplier'::text THEN
          CASE WHEN ob.direction::text = 'credit'::text THEN ob.amount ELSE -ob.amount END
        ELSE
          CASE WHEN ob.direction::text = 'debit'::text THEN ob.amount ELSE -ob.amount END
      END
    )::numeric(14,2) AS balance,
    0::integer AS transaction_count,
    NULL::date AS last_activity_date
  FROM public.party_opening_balances ob
  JOIN public.parties p ON p.id = ob.party_id
  GROUP BY ob.party_id, ob.company_id, ob.currency_code
)
SELECT 
  party_id,
  company_id,
  currency_code,
  sum(balance)::numeric(14,2) AS balance,
  sum(transaction_count)::integer AS transaction_count,
  max(last_activity_date) AS last_activity_date
FROM combined
GROUP BY party_id, company_id, currency_code;

ALTER VIEW public.party_balances_by_currency SET (security_invoker = true);

-- 3) Formalize get_party_currencies_by_company RPC
CREATE OR REPLACE FUNCTION public.get_party_currencies_by_company(p_company_id uuid)
RETURNS TABLE(party_id uuid, currency_code text, balance numeric, transaction_count integer, last_activity_date date)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT 
    party_id,
    currency_code,
    balance,
    transaction_count,
    last_activity_date
  FROM public.party_balances_by_currency
  WHERE company_id = p_company_id
    AND p_company_id IN (SELECT get_auth_companies());
$function$;

GRANT EXECUTE ON FUNCTION public.get_party_currencies_by_company(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
