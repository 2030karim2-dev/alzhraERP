-- ============================================================
-- REVOKE EXECUTE FROM anon/PUBLIC ON SENSITIVE FINANCIAL FUNCTIONS
-- Date: 2026-08-18
--
-- The application only ever invokes these functions from authenticated
-- sessions (all call sites are behind AuthGuard). Each function already
-- validates auth.uid() + company membership internally. This migration
-- removes the default PUBLIC EXECUTE privilege (which `anon` inherited) and
-- re-grants EXECUTE exclusively to `authenticated`, so unauthenticated
-- requests cannot even attempt the functions (defense in depth).
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.commit_expense_v2(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_payment(uuid, uuid, text, numeric, date, uuid, text, uuid, text, text, text, text, numeric, numeric, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_sale_return(uuid, uuid, uuid, jsonb, numeric, text, uuid, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_financial_bond(uuid, text, numeric, text, numeric, numeric, date, uuid, uuid, text, text, uuid, uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_stock_transfer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_all_party_balances() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_party_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_product_stock(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_expense(uuid) FROM anon;

-- The functions above also carried the default PUBLIC EXECUTE grant, which
-- would still let `anon` call them. Remove PUBLIC and keep `authenticated`
-- only (the frontend always calls these with a user JWT → authenticated role).
REVOKE EXECUTE ON FUNCTION public.commit_expense_v2(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_payment(uuid, uuid, text, numeric, date, uuid, text, uuid, text, text, text, text, numeric, numeric, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_sale_return(uuid, uuid, uuid, jsonb, numeric, text, uuid, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_financial_bond(uuid, text, numeric, text, numeric, numeric, date, uuid, uuid, text, text, uuid, uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_stock_transfer(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_all_party_balances() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_party_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_product_stock(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.void_expense(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.commit_expense_v2(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_payment(uuid, uuid, text, numeric, date, uuid, text, uuid, text, text, text, text, numeric, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_sale_return(uuid, uuid, uuid, jsonb, numeric, text, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_financial_bond(uuid, text, numeric, text, numeric, numeric, date, uuid, uuid, text, text, uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_stock_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_party_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_party_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_product_stock(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_bond(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_expense(uuid) TO authenticated;

