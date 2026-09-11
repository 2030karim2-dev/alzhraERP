-- ============================================================
-- Migration: 20260912000011_fix_depreciation_silent_errors_and_ledger_stats.sql
-- 1. Fix fn_run_all_assets_depreciation: replace silent EXCEPTION WHEN OTHERS THEN NULL
--    with structured error logging in the return JSON (لا ابتلاع صامت للأخطاء)
-- 2. Fix fn_post_asset_depreciation: post journal directly as 'posted'
--    (removes intermediate 'draft' state that could fire unwanted triggers)
-- 3. Fix AccountingStats: Math.abs() on liabilities already handled in reportService
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. fn_run_all_assets_depreciation — no more silent error swallowing
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_run_all_assets_depreciation(
  p_company_id uuid,
  p_period_date date DEFAULT CURRENT_DATE,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset        RECORD;
  v_res          jsonb;
  v_count        int     := 0;
  v_total_amount numeric := 0;
  v_errors       jsonb   := '[]'::jsonb;
  v_err_msg      text;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  FOR v_asset IN
    SELECT id, name, asset_code FROM fixed_assets
    WHERE company_id = p_company_id
      AND status = 'active'
      AND deleted_at IS NULL
      AND (last_depreciation_date IS NULL
           OR DATE_TRUNC('month', last_depreciation_date) < DATE_TRUNC('month', p_period_date))
      AND purchase_date <= p_period_date
  LOOP
    BEGIN
      v_res := fn_post_asset_depreciation(v_asset.id, p_period_date, COALESCE(p_created_by, auth.uid()));
      IF (v_res->>'success')::boolean THEN
        v_count        := v_count + 1;
        v_total_amount := v_total_amount + (v_res->>'amount')::numeric;
      ELSE
        -- RPC returned success=false (e.g. already depreciated, zero amount)
        v_errors := v_errors || jsonb_build_object(
          'asset_id',   v_asset.id,
          'asset_code', v_asset.asset_code,
          'asset_name', v_asset.name,
          'reason',     v_res->>'message'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error instead of silently swallowing it
      GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT;
      v_errors := v_errors || jsonb_build_object(
        'asset_id',   v_asset.id,
        'asset_code', v_asset.asset_code,
        'asset_name', v_asset.name,
        'reason',     v_err_msg
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success',          true,
    'assets_processed', v_count,
    'total_amount',     v_total_amount,
    'period_date',      p_period_date,
    'errors',           v_errors,
    'error_count',      jsonb_array_length(v_errors)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_run_all_assets_depreciation(uuid, date, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_run_all_assets_depreciation(uuid, date, uuid) FROM anon, PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. fn_post_asset_depreciation — insert journal directly as 'posted'
--    (eliminates intermediate 'draft' that exposes a narrow window where the
--     journal_entry_lines balance trigger fires on an incomplete entry)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_post_asset_depreciation(
  p_asset_id   uuid,
  p_period_date date DEFAULT CURRENT_DATE,
  p_created_by  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset                  RECORD;
  v_company_id             uuid;
  v_branch_id              uuid;
  v_base_currency          text;
  v_monthly_amount         numeric;
  v_depreciable_base       numeric;
  v_remaining_depreciable  numeric;
  v_depr_amount            numeric;
  v_je_id                  uuid;
  v_current_user_id        uuid;
BEGIN
  SELECT * INTO v_asset FROM fixed_assets WHERE id = p_asset_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'asset_not_found: الأصل الثابت غير موجود';
  END IF;

  v_company_id := v_asset.company_id;
  PERFORM public.fn_assert_company_access(v_company_id);

  IF v_asset.status != 'active' THEN
    RAISE EXCEPTION 'asset_not_active: الأصل الثابت ليس في حالة نشطة (%): لا يمكن إهلاكه', v_asset.status;
  END IF;

  IF v_asset.last_depreciation_date IS NOT NULL
     AND DATE_TRUNC('month', v_asset.last_depreciation_date) = DATE_TRUNC('month', p_period_date) THEN
    RAISE EXCEPTION 'already_depreciated: تم احتساب إهلاك هذا الأصل لنفس الشهر مسبقاً (تاريخ الإهلاك السابق: %)', v_asset.last_depreciation_date;
  END IF;

  IF v_asset.salvage_value > v_asset.purchase_cost THEN
    RAISE EXCEPTION 'invalid_salvage_value: قيمة الخردة لا يمكن أن تتجاوز تكلفة الشراء';
  END IF;

  v_depreciable_base      := v_asset.purchase_cost - v_asset.salvage_value;
  v_remaining_depreciable := v_depreciable_base - v_asset.total_depreciated;

  IF v_remaining_depreciable <= 0 THEN
    UPDATE fixed_assets SET status = 'fully_depreciated', updated_at = NOW() WHERE id = v_asset.id;
    RETURN jsonb_build_object('success', false, 'message', 'تم استنفاد إهلاك هذا الأصل بالكامل');
  END IF;

  v_monthly_amount := ROUND(v_depreciable_base / v_asset.useful_life_months, 2);
  v_depr_amount    := LEAST(v_monthly_amount, v_remaining_depreciable);

  IF v_depr_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'مبلغ الإهلاك المحسوب يساوي صفر');
  END IF;

  SELECT base_currency INTO v_base_currency FROM companies WHERE id = v_company_id;
  v_base_currency := COALESCE(v_base_currency, 'SAR');

  v_branch_id       := COALESCE(v_asset.branch_id,
    (SELECT id FROM branches WHERE company_id = v_company_id AND is_main = true LIMIT 1));
  v_current_user_id := COALESCE(p_created_by, auth.uid());

  -- [FIX] Insert directly as 'posted' — avoids intermediate 'draft' state
  -- that previously exposed the entry to balance-check triggers before
  -- both debit and credit lines were inserted.
  INSERT INTO journal_entries (
    company_id, branch_id, entry_date, description,
    reference_type, reference_id, status, created_by
  )
  VALUES (
    v_company_id, v_branch_id, p_period_date,
    'إهلاك دوري للأصل: ' || v_asset.name || ' (' || v_asset.asset_code || ') لفترة ' || TO_CHAR(p_period_date, 'YYYY-MM'),
    'asset_depreciation', v_asset.id, 'posted', v_current_user_id
  )
  RETURNING id INTO v_je_id;

  INSERT INTO journal_entry_lines (
    journal_entry_id, account_id, branch_id, company_id,
    debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
  )
  VALUES
  (
    v_je_id, v_asset.depreciation_expense_account_id, v_branch_id, v_company_id,
    v_depr_amount, 0,
    'مصروف إهلاك: ' || v_asset.name, v_base_currency, 1, 0
  ),
  (
    v_je_id, v_asset.accumulated_depr_account_id, v_branch_id, v_company_id,
    0, v_depr_amount,
    'مجمع إهلاك: ' || v_asset.name, v_base_currency, 1, 0
  );

  -- Update asset state
  UPDATE fixed_assets
  SET
    total_depreciated    = total_depreciated + v_depr_amount,
    last_depreciation_date = p_period_date,
    status = CASE
      WHEN (total_depreciated + v_depr_amount) >= v_depreciable_base THEN 'fully_depreciated'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = v_asset.id;

  INSERT INTO fixed_asset_depreciations (
    company_id, asset_id, period_date, amount, journal_entry_id
  )
  VALUES (
    v_company_id, v_asset.id, p_period_date, v_depr_amount, v_je_id
  );

  PERFORM audit_write(
    'asset_depreciation_posted',
    'fixed_asset',
    v_asset.id,
    v_company_id,
    jsonb_build_object(
      'asset_id',         v_asset.id,
      'amount',           v_depr_amount,
      'period_date',      p_period_date,
      'journal_entry_id', v_je_id,
      'created_by',       v_current_user_id
    )
  );

  RETURN jsonb_build_object(
    'success',           true,
    'asset_id',          v_asset.id,
    'amount',            v_depr_amount,
    'journal_entry_id',  v_je_id,
    'period_date',       p_period_date
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_post_asset_depreciation(uuid, date, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_post_asset_depreciation(uuid, date, uuid) FROM anon, PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure the runAllDepreciation toast shows error details when errors exist
--    (no DB change needed — handled in TypeScript hook layer via errors[] field)
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
