-- Migration: 20260915000002_fix_rpc_ambiguity_overloads.sql
-- Description: Drop redundant stub RPC function overloads that caused PostgREST HTTP 400 Bad Request disambiguation errors.

DO $$
BEGIN
  -- Drop redundant 11-param commit_sales_invoice_v2 stub overload (12-param version with DEFAULT 0 exists)
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'commit_sales_invoice_v2' 
      AND pronamespace = 'public'::regnamespace 
      AND pronargs = 11
  ) THEN
    DROP FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid);
  END IF;

  -- Drop redundant 13-param commit_purchase_invoice stub overload (14-param version with DEFAULT 0 exists)
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'commit_purchase_invoice' 
      AND pronamespace = 'public'::regnamespace 
      AND pronargs = 13
  ) THEN
    DROP FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date);
  END IF;

  -- Drop redundant 9-param commit_purchase_return stub overload (10-param version with DEFAULT NULL exists)
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'commit_purchase_return' 
      AND pronamespace = 'public'::regnamespace 
      AND pronargs = 9
  ) THEN
    DROP FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
