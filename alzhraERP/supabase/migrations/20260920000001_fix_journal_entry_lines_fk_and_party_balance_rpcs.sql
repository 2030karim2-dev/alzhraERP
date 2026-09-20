-- =============================================================
-- Migration: 20260920000001_fix_journal_entry_lines_fk_and_party_balance_rpcs.sql
-- Date: 2026-09-20
-- Description:
--   1. Restore and harden multi-tenant foreign key on journal_entry_lines:
--      Adds constraint `journal_entry_lines_account_id_fkey` referencing `accounts(company_id, id)`.
--      Resolves PostgREST HTTP 400 Bad Request error: "Could not find a relationship
--      between 'journal_entry_lines' and 'accounts' in the schema cache".
--   2. Make `get_party_currencies_by_company` SECURITY DEFINER:
--      Resolves HTTP 403 Forbidden error: "permission denied for view party_balances_by_currency"
--      caused when SEC-01 revoked SELECT on the underlying view from `authenticated`.
--   3. Ensure `get_party_balances_by_company` is SECURITY DEFINER with fixed search_path.
-- =============================================================

BEGIN;

-- 1. Restore & harden multi-tenant foreign key on journal_entry_lines(company_id, account_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entry_lines_account_id_fkey'
      AND conrelid = 'public.journal_entry_lines'::regclass
  ) THEN
    ALTER TABLE public.journal_entry_lines
      ADD CONSTRAINT journal_entry_lines_account_id_fkey
      FOREIGN KEY (company_id, account_id)
      REFERENCES public.accounts(company_id, id)
      ON DELETE RESTRICT;
    RAISE NOTICE 'Added journal_entry_lines_account_id_fkey constraint';
  ELSE
    RAISE NOTICE 'journal_entry_lines_account_id_fkey already exists';
  END IF;
END $$;

-- 2. Make get_party_currencies_by_company SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_party_currencies_by_company(p_company_id uuid)
RETURNS TABLE(party_id uuid, currency_code text, balance numeric, transaction_count integer, last_activity_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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

-- 3. Make get_party_balances_by_company SECURITY DEFINER with fixed search_path
CREATE OR REPLACE FUNCTION public.get_party_balances_by_company(p_company_id uuid)
RETURNS TABLE(party_id uuid, balance numeric, type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT 
    pb.party_id,
    pb.balance,
    pb.type
  FROM public.party_balances pb
  WHERE pb.company_id = p_company_id
    AND p_company_id IN (SELECT get_auth_companies());
$function$;

GRANT EXECUTE ON FUNCTION public.get_party_balances_by_company(uuid) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
