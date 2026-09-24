-- Migration: Drop redundant text overload of get_account_ledger
-- Resolves PGRST203 ambiguity error in Supabase PostgREST
DROP FUNCTION IF EXISTS public.get_account_ledger(uuid, uuid, text, text, uuid);
