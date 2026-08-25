-- ============================================================
-- Migration: 20260826000005_wire_audit_write_into_write_rpcs.sql
-- Date: 2026-08-26
-- Severity: MEDIUM (R-28 completion)
--
-- PURPOSE:
-- Completes the R-28 work started in 20260826000003 by wiring
-- public.audit_write() into the write RPCs that were marked
-- TODO(audit_write) in that migration. After this migration,
-- the v_rpcs_missing_audit view should drop significantly.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) void_invoice
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'void_invoice'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN
    RETURN;
  END IF;

  v_new := replace(
    v_body,
    'RETURN jsonb_build_object(',
    E'-- R-28: audit the void for forensic traceability.\n  PERFORM public.audit_write(\n    ''invoice_voided'', ''invoices'', p_invoice_id, v_invoice.company_id,\n    jsonb_build_object(''invoice_number'', v_invoice.invoice_number, ''reversal_journal_count'', coalesce(array_length(v_new_jes, 1), 0))\n  );\n  RETURN jsonb_build_object('
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'void_invoice: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 2) void_bond
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'void_bond'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'\nEND;\n$function$',
    E'\n  -- R-28: audit the bond void.\n  PERFORM public.audit_write(\n    ''bond_voided'', ''payments'', p_payment_id, v_payment.company_id,\n    jsonb_build_object(''payment_number'', v_payment.payment_number)\n  );\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'void_bond: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 3) void_expense
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'void_expense'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'\nEND;\n$function$',
    E'\n  -- R-28: audit the expense void.\n  PERFORM public.audit_write(\n    ''expense_voided'', ''expenses'', p_expense_id, v_company_id\n  );\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'void_expense: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 4) commit_sales_invoice_v2
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'commit_sales_invoice_v2'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'RETURN v_result;\nEND;\n$function$',
    E'-- R-28: audit the sales invoice commit.\n  PERFORM public.audit_write(\n    ''sales_invoice_committed'', ''invoices'',\n    (v_result->>''invoice_id'')::uuid,\n    (SELECT company_id FROM public.parties WHERE id = p_party_id),\n    jsonb_build_object(''party_id'', p_party_id, ''idempotency_key'', p_idempotency_key,\n                      ''total_amount'', (v_result->>''total_amount'')::numeric,\n                      ''payment_type'', p_payment_type)\n  );\n  RETURN v_result;\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'commit_sales_invoice_v2: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 5) commit_purchase_invoice
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'commit_purchase_invoice'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'RETURN v_result;\nEND;\n$function$',
    E'-- R-28: audit the purchase invoice commit.\n  PERFORM public.audit_write(\n    ''purchase_invoice_committed'', ''invoices'',\n    (v_result->>''invoice_id'')::uuid,\n    p_company_id,\n    jsonb_build_object(''supplier_id'', p_supplier_id, ''idempotency_key'', p_invoice_number,\n                      ''total_amount'', (v_result->>''total_amount'')::numeric)\n  );\n  RETURN v_result;\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'commit_purchase_invoice: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 6) commit_purchase_return, commit_sale_return, process_sales_return
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_rpc record;
  v_new text;
BEGIN
  FOR v_rpc IN
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('commit_purchase_return', 'commit_sale_return', 'process_sales_return')
  LOOP
    IF v_rpc.def LIKE '%public.audit_write(%' THEN
      CONTINUE;
    END IF;

    v_new := replace(
      v_rpc.def,
      E'RETURN v_result;\nEND;\n$function$',
      E'-- R-28: audit the return commit.\n  PERFORM public.audit_write(\n    ''return_committed'', ''invoices'',\n    (v_result->>''invoice_id'')::uuid,\n    p_company_id,\n    jsonb_build_object(''original_invoice_id'', p_original_invoice_id, ''reason'', p_reason)\n  );\n  RETURN v_result;\nEND;\n$function$'
    );

    IF v_new <> v_rpc.def THEN
      EXECUTE v_new;
      RAISE NOTICE '%: audit_write wired (best-effort)', v_rpc.proname;
    END IF;
  END LOOP;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 7) commit_expense_v2
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'commit_expense_v2'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'RETURN v_result;\nEND;\n$function$',
    E'-- R-28: audit the expense commit.\n  PERFORM public.audit_write(\n    ''expense_committed'', ''expenses'',\n    (v_result->>''expense_id'')::uuid,\n    p_company_id,\n    jsonb_build_object(''amount'', (v_result->>''amount'')::numeric)\n  );\n  RETURN v_result;\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'commit_expense_v2: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 8) commit_payment
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'commit_payment'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'RETURN v_result;\nEND;\n$function$',
    E'-- R-28: audit the payment commit.\n  PERFORM public.audit_write(\n    ''payment_committed'', ''payments'',\n    (v_result->>''payment_id'')::uuid,\n    p_company_id,\n    jsonb_build_object(''amount'', p_amount, ''type'', p_type)\n  );\n  RETURN v_result;\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'commit_payment: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 9) post_manual_journal
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_body text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'post_manual_journal'
  LIMIT 1;

  IF v_body IS NULL OR v_body LIKE '%public.audit_write(%' THEN RETURN; END IF;

  v_new := replace(
    v_body,
    E'RETURN v_journal_id;\nEND;\n$function$',
    E'-- R-28: audit the manual journal.\n  PERFORM public.audit_write(\n    ''manual_journal_posted'', ''journal_entries'',\n    v_journal_id, p_company_id,\n    jsonb_build_object(''description'', p_description, ''reference_type'', p_reference_type)\n  );\n  RETURN v_journal_id;\nEND;\n$function$'
  );

  IF v_new <> v_body THEN
    EXECUTE v_new;
    RAISE NOTICE 'post_manual_journal: audit_write wired';
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 10) create_stock_transfer + quick_adjust_stock_batch
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_rpc record;
  v_new text;
BEGIN
  FOR v_rpc IN
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('create_stock_transfer', 'quick_adjust_stock_batch')
  LOOP
    IF v_rpc.def LIKE '%public.audit_write(%' THEN
      CONTINUE;
    END IF;

    IF v_rpc.proname = 'create_stock_transfer' THEN
      v_new := replace(
        v_rpc.def,
        'RETURN jsonb_build_object(',
        E'-- R-28: audit the stock transfer.\n  PERFORM public.audit_write(\n    ''stock_transfer_created'', ''stock_transfers'',\n    (v_transfer->>''transfer_id'')::uuid,\n    p_company_id,\n    jsonb_build_object(''source_warehouse_id'', p_source_warehouse_id, ''destination_warehouse_id'', p_destination_warehouse_id)\n  );\n  RETURN jsonb_build_object('
      );
    ELSE
      v_new := replace(
        v_rpc.def,
        'RETURN jsonb_build_object(',
        E'-- R-28: audit the stock batch adjustment.\n  PERFORM public.audit_write(\n    ''stock_batch_adjusted'', ''product_stock'',\n    NULL,\n    p_company_id,\n    jsonb_build_object(''reason'', p_reason, ''item_count'', jsonb_array_length(p_items))\n  );\n  RETURN jsonb_build_object('
      );
    END IF;

    IF v_new <> v_rpc.def THEN
      EXECUTE v_new;
      RAISE NOTICE '%: audit_write wired', v_rpc.proname;
    END IF;
  END LOOP;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- Final summary notice
-- ─────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_remaining int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_rpcs_missing_audit') THEN
    SELECT count(*) INTO v_remaining FROM public.v_rpcs_missing_audit;
    RAISE NOTICE 'R-28 completion: v_rpcs_missing_audit now lists % RPCs', v_remaining;
  END IF;
END $do$;

NOTIFY pgrst, 'reload schema';

COMMIT;
