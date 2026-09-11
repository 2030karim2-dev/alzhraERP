-- ============================================================
-- Migration: 20260912000010_harden_accounting_security_and_currencies.sql
-- Hardens Accounting Security, Fixes Inverted Returns Journal, 
-- Enforces Owner Guard on Fiscal Year Closing, and Unifies Multi-Currency Conversions
-- ============================================================

BEGIN;

-- 1) Drop ambiguous legacy overload of fn_accounting_health_check()
DROP FUNCTION IF EXISTS public.fn_accounting_health_check();

-- 2) Update fn_accounting_health_check(p_company_id uuid) to allow postgres/supabase_admin
CREATE OR REPLACE FUNCTION public.fn_accounting_health_check(
  p_company_id uuid DEFAULT NULL
)
 RETURNS TABLE(check_name text, severity text, issue_count bigint, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
BEGIN
  -- Access guard: admins, service_role, and database superusers
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'access_denied: هذه الأداة التشخيصية مقصورة على مدراء النظام';
  END IF;

  -- Resolve company context: explicit param > current user's company
  v_company_id := COALESCE(
    p_company_id,
    (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  );

  -- 1. Missing journal entries for posted invoices/payments
  RETURN QUERY
  SELECT 'missing_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(ref, ', '), 'لا توجد مشاكل')
  FROM (
    SELECT i.invoice_number AS ref FROM invoices i
    WHERE i.company_id = v_company_id
      AND i.status NOT IN ('draft','cancelled') AND i.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.reference_id = i.id AND je.deleted_at IS NULL
      )
    UNION ALL
    SELECT p.payment_number FROM payments p
    WHERE p.company_id = v_company_id
      AND p.status = 'posted' AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.reference_id = p.id AND je.deleted_at IS NULL
      )
  ) x;

  -- 2. Unbalanced journal entries (debit ≠ credit)
  RETURN QUERY
  SELECT 'unbalanced_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(entry_number::text, ', '), 'لا توجد مشاكل')
  FROM (
    SELECT je.entry_number
    FROM journal_entries je
    JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.deleted_at IS NULL
    WHERE je.company_id = v_company_id AND je.deleted_at IS NULL
    GROUP BY je.id, je.entry_number
    HAVING ROUND(SUM(jel.debit_amount) - SUM(jel.credit_amount), 2) <> 0
  ) x;

  -- 3. Posting to non-postable or inactive accounts
  RETURN QUERY
  SELECT 'posting_to_non_postable_account'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(a.code, ', '), 'لا توجد مشاكل')
  FROM journal_entry_lines jel
  JOIN accounts a ON a.id = jel.account_id
  WHERE a.company_id = v_company_id
    AND jel.deleted_at IS NULL
    AND (a.allow_posting = false OR a.is_active = false);

  -- 4. Trial balance imbalance (total debit ≠ total credit)
  RETURN QUERY
  SELECT 'trial_balance_imbalance'::text, 'critical'::text,
    CASE WHEN ABS(COALESCE(SUM(total_debit),0) - COALESCE(SUM(total_credit),0)) > 0.01
         THEN 1 ELSE 0 END::bigint,
    'الفرق: ' || ROUND(COALESCE(SUM(total_debit),0) - COALESCE(SUM(total_credit),0), 2)::text
  FROM vw_trial_balance
  WHERE company_id = v_company_id;

  -- 5. Journal entries in closed fiscal year
  RETURN QUERY
  SELECT 'journal_in_closed_fiscal_year'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(je.entry_number::text, ', '), 'لا توجد مشاكل')
  FROM journal_entries je
  JOIN fiscal_years fy ON fy.company_id = je.company_id
    AND je.entry_date BETWEEN fy.start_date AND fy.end_date
  WHERE je.company_id = v_company_id
    AND fy.is_closed = true AND je.deleted_at IS NULL;

  -- 6. Payments posted without a cash/bank account linked
  RETURN QUERY
  SELECT 'payment_missing_account'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(payment_number, ', '), 'لا توجد مشاكل')
  FROM payments
  WHERE company_id = v_company_id
    AND status = 'posted' AND account_id IS NULL AND deleted_at IS NULL;

  -- 7. Products with negative stock
  RETURN QUERY
  SELECT 'negative_stock'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(product_id::text, ', '), 'لا توجد مشاكل')
  FROM product_stock
  WHERE company_id = v_company_id AND quantity < 0;

  -- 8. AR sub-ledger (party_balances customers) vs GL account 1100
  RETURN QUERY
  SELECT 'party_balances_mismatch'::text, 'critical'::text,
    CASE WHEN ABS(
      COALESCE((
        SELECT SUM(balance) FROM party_balances
        WHERE type = 'customer' AND company_id = v_company_id
      ), 0)
      - COALESCE((
        SELECT net_balance FROM vw_trial_balance
        WHERE code = '1100' AND company_id = v_company_id
        LIMIT 1
      ), 0)
    ) > 0.01 THEN 1 ELSE 0 END::bigint,
    'AR: parties=' || COALESCE((
        SELECT SUM(balance) FROM party_balances
        WHERE type = 'customer' AND company_id = v_company_id
      ), 0)::text
    || ' vs ledger=' || COALESCE((
        SELECT net_balance FROM vw_trial_balance
        WHERE code = '1100' AND company_id = v_company_id
        LIMIT 1
      ), 0)::text;

  -- 9. Report function join pattern risk (cross-schema check, company-agnostic)
  RETURN QUERY
  SELECT 'report_function_join_pattern_risk'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(p.proname, ', '), 'لا توجد مشاكل')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'report_%'
    AND pg_get_functiondef(p.oid) ~* 'LEFT\s+JOIN\s+journal_entry_lines\s+jel\s+ON\s+a\.id\s*=\s*jel\.account_id\s+AND\s+jel\.deleted_at\s+IS\s+NULL\s*$';

END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_accounting_health_check(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_accounting_health_check(uuid) FROM anon, PUBLIC;

-- 3) Secure report_trial_balance with tenant assertion
CREATE OR REPLACE FUNCTION public.report_trial_balance(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(account_code text, account_id uuid, account_name text, account_type text, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT 
    a.code,
    a.id,
    a.name_ar,
    a.type,
    COALESCE(jel.balance, 0) as balance,
    COALESCE(jel.debit_amount, 0) as total_debit,
    COALESCE(jel.credit_amount, 0) as total_credit
  FROM public.accounts a
  LEFT JOIN (
     SELECT 
        l.account_id, 
        SUM(l.debit_amount) as debit_amount, 
        SUM(l.credit_amount) as credit_amount,
        SUM(l.debit_amount) - SUM(l.credit_amount) as balance
     FROM public.journal_entry_lines l
     JOIN public.journal_entries j ON j.id = l.journal_entry_id
     WHERE j.status = 'posted' AND j.deleted_at IS NULL AND l.deleted_at IS NULL
       AND j.entry_date BETWEEN p_from AND p_to
       AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
     GROUP BY l.account_id
  ) jel ON jel.account_id = a.id
  WHERE a.company_id = p_company_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
  ORDER BY a.code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) FROM anon, PUBLIC;

-- 4) Strict assertOwner in fn_close_fiscal_year (Rule 3)
CREATE OR REPLACE FUNCTION public.fn_close_fiscal_year(
  p_fiscal_year_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fy RECORD;
  v_company_id uuid;
  v_branch_id uuid;
  v_base_currency text;
  v_retained_earnings_account RECORD;
  v_je_id uuid;
  v_rev_cur RECORD;
  v_exp_cur RECORD;
  v_total_rev numeric := 0;
  v_total_exp numeric := 0;
  v_net_income numeric := 0;
  v_line_count int := 0;
  v_next_fy_id uuid;
  v_next_year_name text;
  v_next_start_date date;
  v_next_end_date date;
  v_current_user_id uuid;
BEGIN
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fiscal_year_not_found: السنة المالية غير موجودة';
  END IF;

  v_company_id := v_fy.company_id;
  PERFORM public.fn_assert_company_access(v_company_id);

  -- Strict Owner Guard (Rule 3)
  IF NOT (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = v_company_id
        AND ucr.role = 'owner'
    )
  ) THEN
    RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية: إغلاق السنة المالية عملية سيادية تتطلب صلاحية المالك (owner)'
      USING ERRCODE = '42501';
  END IF;

  IF v_fy.is_closed THEN
    RAISE EXCEPTION 'fiscal_year_already_closed: هذه السنة المالية مقفلة مسبقاً في تاريخ %', v_fy.closed_at;
  END IF;

  SELECT base_currency INTO v_base_currency FROM companies WHERE id = v_company_id;
  v_base_currency := COALESCE(v_base_currency, 'SAR');

  SELECT * INTO v_retained_earnings_account 
  FROM accounts 
  WHERE company_id = v_company_id AND code = '3200' AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'retained_earnings_account_missing: لم يتم العثور على حساب الأرباح المبقاة (3200)';
  END IF;

  SELECT id INTO v_branch_id FROM branches WHERE company_id = v_company_id AND is_main = true LIMIT 1;
  v_current_user_id := COALESCE(p_created_by, auth.uid());

  INSERT INTO journal_entries (
    company_id, branch_id, fiscal_year_id, entry_date, description,
    reference_type, reference_id, status, created_by
  )
  VALUES (
    v_company_id, v_branch_id, v_fy.id, v_fy.end_date,
    'قيد إقفال السنة المالية ' || v_fy.name || ' وترحيل الأرباح والخسائر',
    'fiscal_year_closing', v_fy.id, 'draft', v_current_user_id
  )
  RETURNING id INTO v_je_id;

  -- Close Revenues (excluding previous fiscal_year_closing)
  FOR v_rev_cur IN
    SELECT 
      jel.account_id,
      a.code,
      a.name_ar,
      SUM(jel.credit_amount - jel.debit_amount) AS net_credit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = v_company_id
      AND (je.fiscal_year_id = v_fy.id OR (je.entry_date BETWEEN v_fy.start_date AND v_fy.end_date))
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND a.type = 'revenue'
      AND je.id != v_je_id
      AND COALESCE(je.reference_type, '') != 'fiscal_year_closing'
    GROUP BY jel.account_id, a.code, a.name_ar
    HAVING SUM(jel.credit_amount - jel.debit_amount) != 0
  LOOP
    v_total_rev := v_total_rev + v_rev_cur.net_credit;
    v_line_count := v_line_count + 1;
    
    IF v_rev_cur.net_credit > 0 THEN
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_rev_cur.account_id, v_branch_id, v_company_id,
        v_rev_cur.net_credit, 0,
        'إقفال إيراد: ' || v_rev_cur.name_ar, v_base_currency, 1, 0
      );
    ELSE
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_rev_cur.account_id, v_branch_id, v_company_id,
        0, ABS(v_rev_cur.net_credit),
        'إقفال إيراد مدين: ' || v_rev_cur.name_ar, v_base_currency, 1, 0
      );
    END IF;
  END LOOP;

  -- Close Expenses (excluding previous fiscal_year_closing)
  FOR v_exp_cur IN
    SELECT 
      jel.account_id,
      a.code,
      a.name_ar,
      SUM(jel.debit_amount - jel.credit_amount) AS net_debit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = v_company_id
      AND (je.fiscal_year_id = v_fy.id OR (je.entry_date BETWEEN v_fy.start_date AND v_fy.end_date))
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND a.type = 'expense'
      AND je.id != v_je_id
      AND COALESCE(je.reference_type, '') != 'fiscal_year_closing'
    GROUP BY jel.account_id, a.code, a.name_ar
    HAVING SUM(jel.debit_amount - jel.credit_amount) != 0
  LOOP
    v_total_exp := v_total_exp + v_exp_cur.net_debit;
    v_line_count := v_line_count + 1;

    IF v_exp_cur.net_debit > 0 THEN
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_exp_cur.account_id, v_branch_id, v_company_id,
        0, v_exp_cur.net_debit,
        'إقفال مصروف: ' || v_exp_cur.name_ar, v_base_currency, 1, 0
      );
    ELSE
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_exp_cur.account_id, v_branch_id, v_company_id,
        ABS(v_exp_cur.net_debit), 0,
        'إقفال مصروف دائن: ' || v_exp_cur.name_ar, v_base_currency, 1, 0
      );
    END IF;
  END LOOP;

  v_net_income := v_total_rev - v_total_exp;

  IF v_net_income > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, branch_id, company_id,
      debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
    )
    VALUES (
      v_je_id, v_retained_earnings_account.id, v_branch_id, v_company_id,
      0, v_net_income,
      'ترحيل صافي أرباح السنة المالية ' || v_fy.name, v_base_currency, 1, 0
    );
    v_line_count := v_line_count + 1;
  ELSIF v_net_income < 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, branch_id, company_id,
      debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
    )
    VALUES (
      v_je_id, v_retained_earnings_account.id, v_branch_id, v_company_id,
      ABS(v_net_income), 0,
      'ترحيل صافي خسائر السنة المالية ' || v_fy.name, v_base_currency, 1, 0
    );
    v_line_count := v_line_count + 1;
  END IF;

  IF v_line_count > 0 THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  ELSE
    DELETE FROM journal_entries WHERE id = v_je_id;
    v_je_id := NULL;
  END IF;

  -- Close fiscal year
  UPDATE fiscal_years 
  SET is_closed = true, closed_at = NOW(), updated_at = NOW() 
  WHERE id = v_fy.id;

  -- Create next fiscal year
  v_next_year_name := 'سنة ' || (to_char(v_fy.end_date + INTERVAL '1 day', 'YYYY')) || ' المالية';
  v_next_start_date := v_fy.end_date + INTERVAL '1 day';
  v_next_end_date := (v_fy.end_date + INTERVAL '1 day' + INTERVAL '1 year' - INTERVAL '1 day')::date;

  SELECT id INTO v_next_fy_id FROM fiscal_years 
  WHERE company_id = v_company_id AND start_date = v_next_start_date;

  IF v_next_fy_id IS NULL THEN
    INSERT INTO fiscal_years (
      company_id, name, start_date, end_date, is_closed
    )
    VALUES (
      v_company_id, v_next_year_name, v_next_start_date, v_next_end_date, false
    )
    RETURNING id INTO v_next_fy_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'closed_fiscal_year_id', v_fy.id,
    'closing_journal_entry_id', v_je_id,
    'total_revenues', v_total_rev,
    'total_expenses', v_total_exp,
    'net_income', v_net_income,
    'next_fiscal_year_id', v_next_fy_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_close_fiscal_year(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_close_fiscal_year(uuid, uuid) FROM anon, PUBLIC;

-- 5) Multi-currency unification in post_manual_journal
CREATE OR REPLACE FUNCTION public.post_manual_journal(
  p_company_id uuid,
  p_user_id uuid,
  p_date date,
  p_description text,
  p_lines jsonb,
  p_currency_code text DEFAULT 'SAR'::text,
  p_exchange_rate numeric DEFAULT 1,
  p_reference_type text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_journal_id   uuid;
  v_line         RECORD;
  v_base_debit   numeric;
  v_base_credit  numeric;
  v_foreign_amt  numeric;
  v_total_debit  numeric := 0;
  v_total_credit numeric := 0;
  v_created_by   uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية ترحيل القيود المحاسبية لهذه الشركة';
  END IF;

  IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'سعر صرف غير صالح: يجب أن يكون أكبر من صفر';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND p_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'لا توجد سنة مالية مفتوحة تغطي تاريخ القيد المحدد';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'لا يمكن ترحيل قيد بدون أسطر';
  END IF;

  -- حساب المجاميع المحولة بدقة عبر دالة fn_to_base_amount الموحدة
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(debit numeric, credit numeric)
  LOOP
    v_total_debit  := v_total_debit  + public.fn_to_base_amount(p_currency_code, COALESCE(v_line.debit,  0), p_exchange_rate);
    v_total_credit := v_total_credit + public.fn_to_base_amount(p_currency_code, COALESCE(v_line.credit, 0), p_exchange_rate);
  END LOOP;

  IF v_total_debit <= 0 THEN
    RAISE EXCEPTION 'لا يمكن ترحيل قيد بقيمة صفرية: إجمالي المدين = %', v_total_debit;
  END IF;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'القيد غير متوازن: المدين (%) لا يساوي الدائن (%)', v_total_debit, v_total_credit;
  END IF;

  v_created_by := COALESCE(auth.uid(), p_user_id);

  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, p_date, p_description,
    COALESCE(p_reference_type, 'manual'), 'draft', v_created_by
  ) RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(account_id uuid, party_id uuid, debit numeric, credit numeric, description text)
  LOOP
    v_base_debit  := public.fn_to_base_amount(p_currency_code, COALESCE(v_line.debit,  0), p_exchange_rate);
    v_base_credit := public.fn_to_base_amount(p_currency_code, COALESCE(v_line.credit, 0), p_exchange_rate);
    v_foreign_amt := GREATEST(COALESCE(v_line.debit, 0), COALESCE(v_line.credit, 0));

    INSERT INTO journal_entry_lines(
      journal_entry_id, account_id, party_id,
      debit_amount, credit_amount, description,
      currency_code, exchange_rate, foreign_amount, company_id, branch_id
    ) VALUES (
      v_journal_id, v_line.account_id, v_line.party_id,
      v_base_debit, v_base_credit,
      COALESCE(v_line.description, p_description),
      p_currency_code, p_exchange_rate, v_foreign_amt,
      p_company_id, p_branch_id
    );
  END LOOP;

  UPDATE journal_entries SET status = 'posted' WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) FROM anon, PUBLIC;

-- 6) Fix purchase return journal inversion in fn_auto_post_invoice_journal
CREATE OR REPLACE FUNCTION public.fn_auto_post_invoice_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_je_id uuid;
  v_acc_ar uuid;
  v_acc_ap uuid;
  v_acc_revenue uuid;
  v_acc_vat uuid;
  v_acc_inventory uuid;
  v_acc_cogs uuid;
  v_acc_funding uuid;
  v_net_amount numeric(18,4);
  v_net_receivable numeric(18,4);
  v_base_net_amount numeric(18,4);
  v_base_net_receivable numeric(18,4);
  v_base_tax numeric(18,4);
  v_total_cogs numeric(18,4);
  v_already_posted boolean;
  v_postable_statuses text[] := array['posted','confirmed','paid','partially_paid'];
  v_paid_foreign numeric(18,4);
  v_unpaid_foreign numeric(18,4);
  v_base_paid numeric(18,4);
  v_base_unpaid numeric(18,4);
BEGIN
  IF NOT (new.status = ANY(v_postable_statuses)) THEN
    RETURN new;
  END IF;

  SELECT exists(
    SELECT 1 FROM public.journal_entries je
    WHERE je.reference_id = new.id AND je.deleted_at IS NULL
  ) INTO v_already_posted;
  IF v_already_posted THEN
    RETURN new;
  END IF;

  v_acc_ar        := fn_get_account_id(new.company_id, '1100');
  v_acc_ap        := fn_get_account_id(new.company_id, '2100');
  v_acc_revenue   := fn_get_account_id(new.company_id, '4100');
  v_acc_vat       := fn_get_account_id(new.company_id, '2200');
  v_acc_inventory := fn_get_account_id(new.company_id, '1200');
  v_acc_cogs      := fn_get_account_id(new.company_id, '5100');

  SELECT COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0)
  INTO v_total_cogs
  FROM public.invoice_items
  WHERE invoice_id = new.id;

  v_net_amount := (new.total_amount - COALESCE(new.tax_amount, 0)) - COALESCE(new.discount_amount, 0);
  v_net_receivable := new.total_amount - COALESCE(new.discount_amount, 0);

  v_base_net_amount     := public.fn_to_base_amount(new.currency_code, v_net_amount, new.exchange_rate);
  v_base_tax            := public.fn_to_base_amount(new.currency_code, COALESCE(new.tax_amount, 0), new.exchange_rate);
  v_base_net_receivable := v_base_net_amount + v_base_tax;

  v_paid_foreign := LEAST(COALESCE(new.paid_amount, 0), v_net_receivable);
  v_unpaid_foreign := v_net_receivable - v_paid_foreign;

  IF v_net_receivable > 0 THEN
    v_base_paid := round(v_base_net_receivable * (v_paid_foreign / v_net_receivable), 4);
    v_base_unpaid := v_base_net_receivable - v_base_paid;
  ELSE
    v_base_paid := 0;
    v_base_unpaid := 0;
  END IF;

  IF new.payment_account_id IS NOT NULL THEN
    v_acc_funding := new.payment_account_id;
  ELSIF new.payment_method = 'cash' THEN
    v_acc_funding := fn_get_account_id(new.company_id, '1110');
  ELSIF new.payment_method = 'network' THEN
    v_acc_funding := fn_get_account_id(new.company_id, '1120');
  ELSE
    v_acc_funding := NULL;
  END IF;

  -- 1. فاتورة مبيعات
  IF new.type = 'sale' THEN
    IF v_acc_revenue IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب الإيرادات (4100) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ar IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AR(1100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'sales_invoice', new.id,
            'ترحيل تلقائي - فاتورة مبيعات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    IF v_base_paid > 0 AND v_acc_funding IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_funding, new.company_id, new.branch_id, v_base_paid, 0, v_paid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_unpaid > 0 THEN 'سداد جزئي نقدي/بنكي - ' ELSE 'مبيعات نقدية/بنكية - ' END || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_base_unpaid > 0 OR (v_base_paid = 0 AND v_acc_funding IS NULL) THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_ar, new.company_id, new.branch_id, v_base_unpaid, 0, v_unpaid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_paid > 0 THEN 'متبقي ذمم عملاء - ' ELSE 'مبيعات آجل - ' END || COALESCE(new.invoice_number, ''), new.party_id);
    END IF;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إيراد مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مخرجات مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_total_cogs > 0 THEN
      IF v_acc_cogs IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب تكلفة المبيعات (5100) أو المخزون (1200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cogs, 0, NULL, NULL, NULL, 
              'تكلفة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_total_cogs, NULL, NULL, NULL, 
              'إخراج بضاعة مباعة - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- 2. فاتورة مشتريات
  ELSIF new.type = 'purchase' THEN
    IF v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب المخزون (1200) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ap IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AP(2100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_invoice', new.id,
            'ترحيل تلقائي - فاتورة مشتريات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إدخال مخزون مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مدخلات مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_base_paid > 0 AND v_acc_funding IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_funding, new.company_id, new.branch_id, 0, v_base_paid, v_paid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_unpaid > 0 THEN 'سداد جزئي نقدي/بنكي لمورد - ' ELSE 'مشتريات نقدية/بنكية - ' END || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_base_unpaid > 0 OR (v_base_paid = 0 AND v_acc_funding IS NULL) THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, v_base_unpaid, v_unpaid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_paid > 0 THEN 'متبقي ذمم موردين - ' ELSE 'مشتريات آجل - ' END || COALESCE(new.invoice_number, ''), new.party_id);
    END IF;

  -- 3. مردود مبيعات
  ELSIF new.type = 'sale_return' OR new.type = 'return_sale' THEN
    IF v_acc_revenue IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب الإيرادات (4100) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ar IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AR(1100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'sales_return', new.id,
            'ترحيل تلقائي - مردود مبيعات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'مردود مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'تخفيض ضريبة مردودات مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم عملاء - ' ELSE 'مستردات نقدية لعميل - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    IF v_total_cogs > 0 THEN
      IF v_acc_cogs IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب تكلفة المبيعات (5100) أو المخزون (1200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cogs, 0, NULL, NULL, NULL, 
              'إرجاع مخزون مردودات مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cogs, NULL, NULL, NULL, 
              'تخفيض تكلفة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- 4. مردود مشتريات (مصصح: المدين ذمم الموردين/الصندوق، والدائن المخزون والضريبة)
  ELSIF new.type = 'purchase_return' OR new.type = 'return_purchase' THEN
    IF v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب المخزون (1200) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ap IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AP(2100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_return', new.id,
            'ترحيل تلقائي - مردود مشتريات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    -- الطرف المدين: تخفيض ذمم المورد أو استرداد النقدية
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, v_base_net_receivable, 0, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم موردين - ' ELSE 'مستردات نقدية من مورد - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    -- الطرف الدائن: تخفيض رصيد المخزون
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'تخفيض مخزون مردودات - ' || COALESCE(new.invoice_number, ''), NULL);

    -- الطرف الدائن: استرداد ضريبة المدخلات
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'استرداد ضريبة مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;
  END IF;

  -- Ensure journal entry status is posted
  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() FROM anon, PUBLIC;

-- 7) Multi-currency unification in commit_purchase_return
CREATE OR REPLACE FUNCTION public.commit_purchase_return(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_notes text,
  p_currency text,
  p_exchange_rate numeric,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_return_reason text DEFAULT NULL::text,
  p_reference_invoice_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_journal_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_base_subtotal numeric := 0;
  v_base_total numeric := 0;
  v_payable_account_id uuid;
  v_inventory_account_id uuid;
  v_primary_wh_id uuid;
  v_item jsonb;
  v_product RECORD;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'لا توجد أصناف في مرتجع المشتريات';
  END IF;

  SELECT id INTO v_payable_account_id FROM accounts
    WHERE company_id=p_company_id AND code='2100' AND deleted_at IS NULL;
  IF v_payable_account_id IS NULL THEN
    RAISE EXCEPTION 'حساب ذمم الموردين (2100) غير موجود';
  END IF;

  SELECT id INTO v_inventory_account_id FROM accounts
    WHERE company_id=p_company_id AND code='1200' AND deleted_at IS NULL;
  IF v_inventory_account_id IS NULL THEN
    RAISE EXCEPTION 'حساب المخزون (1200) غير موجود';
  END IF;

  SELECT id INTO v_primary_wh_id FROM warehouses
    WHERE company_id=p_company_id AND is_primary=true AND deleted_at IS NULL;
  IF v_primary_wh_id IS NULL THEN
    SELECT id INTO v_primary_wh_id FROM warehouses
      WHERE company_id=p_company_id AND deleted_at IS NULL LIMIT 1;
  END IF;

  SELECT COALESCE(prefix, 'PRET-') || LPAD((COALESCE(current_number, 0) + 1)::text, 5, '0')
    INTO v_invoice_number
  FROM numbering_sequences
  WHERE company_id=p_company_id AND document_type='purchase_return';

  IF v_invoice_number IS NULL THEN
    v_invoice_number := 'PRET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*1000)::text, 3, '0');
  ELSE
    UPDATE numbering_sequences
      SET current_number=current_number+1, updated_at=NOW()
      WHERE company_id=p_company_id AND document_type='purchase_return';
  END IF;

  INSERT INTO invoices(
    company_id, branch_id, type, invoice_number, party_id,
    issue_date, notes, status, currency_code, exchange_rate,
    subtotal, tax_amount, total_amount, created_by, return_reason,
    reference_invoice_id
  ) VALUES (
    p_company_id, p_branch_id, 'purchase_return', v_invoice_number, p_supplier_id,
    CURRENT_DATE, p_notes, 'draft', p_currency, p_exchange_rate,
    0, 0, 0, p_user_id, p_return_reason,
    p_reference_invoice_id
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products
      WHERE id=(v_item->>'product_id')::uuid
        AND company_id=p_company_id AND deleted_at IS NULL;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_item->>'product_id';
    END IF;

    DECLARE
      v_qty       numeric := (v_item->>'quantity')::numeric;
      v_unit_cost numeric := COALESCE((v_item->>'unit_cost')::numeric, v_product.purchase_price);
      v_discount  numeric := COALESCE((v_item->>'discount_amount')::numeric, 0);
      v_line_sub  numeric := (v_qty * v_unit_cost) - v_discount;
    BEGIN
      IF v_qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;

      IF p_reference_invoice_id IS NOT NULL THEN
        DECLARE
          v_orig_qty numeric := 0;
          v_prev_returned numeric := 0;
        BEGIN
          SELECT COALESCE(SUM(ii.quantity), 0) INTO v_orig_qty
          FROM public.invoice_items ii
          WHERE ii.invoice_id = p_reference_invoice_id AND ii.product_id = v_product.id;

          IF v_orig_qty > 0 THEN
            SELECT COALESCE(SUM(ret_ii.quantity), 0) INTO v_prev_returned
            FROM public.invoices ret_inv
            JOIN public.invoice_items ret_ii ON ret_ii.invoice_id = ret_inv.id
            WHERE ret_inv.reference_invoice_id = p_reference_invoice_id
              AND ret_inv.type = 'purchase_return'
              AND ret_inv.status <> 'void'
              AND ret_inv.deleted_at IS NULL
              AND ret_ii.product_id = v_product.id;

            IF (v_qty + v_prev_returned) > v_orig_qty THEN
              RAISE EXCEPTION 'كمية الإرجاع المطلوبة (%) تتجاوز الكمية المتبقية القابلة للإرجاع (%) للمنتج "%"',
                v_qty, GREATEST(0, v_orig_qty - v_prev_returned), v_product.name_ar;
            END IF;
          END IF;
        END;
      END IF;

      INSERT INTO invoice_items(
        invoice_id, product_id, description, quantity,
        unit_price, cost_price, discount_amount, tax_amount, total, company_id
      ) VALUES (
        v_invoice_id, v_product.id, v_product.name_ar, v_qty,
        v_unit_cost, v_unit_cost, v_discount, 0, v_line_sub, p_company_id
      );

      INSERT INTO inventory_transactions(
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by,
        unit_cost, total_cost
      ) VALUES (
        p_company_id, v_product.id, v_primary_wh_id, v_qty,
        'purchase_return', 'invoice', v_invoice_id, p_user_id,
        v_unit_cost, round(v_qty * v_unit_cost, 4)
      );

      v_subtotal := v_subtotal + v_line_sub;
    END;
  END LOOP;

  v_total := v_subtotal;
  UPDATE invoices SET subtotal=v_subtotal, tax_amount=0, total_amount=v_total WHERE id=v_invoice_id;

  -- تحويل موحّد عبر fn_to_base_amount لمنع تضخم الريال اليمني
  v_base_subtotal := public.fn_to_base_amount(p_currency, v_subtotal, p_exchange_rate);
  v_base_total    := public.fn_to_base_amount(p_currency, v_total, p_exchange_rate);

  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, CURRENT_DATE, 'مرتجع مشتريات ' || v_invoice_number,
    'purchase_return', v_invoice_id, 'draft', p_user_id
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_entry_lines(
    journal_entry_id, account_id, party_id, debit_amount, credit_amount,
    description, currency_code, exchange_rate, foreign_amount, company_id, branch_id
  ) VALUES
    (v_journal_id, v_payable_account_id, p_supplier_id, v_base_total, 0,
     'تخفيض ذمم المورد - ' || v_invoice_number, p_currency, p_exchange_rate, v_total, p_company_id, p_branch_id),
    (v_journal_id, v_inventory_account_id, NULL, 0, v_base_subtotal,
     'خصم مخزون مرتجع - ' || v_invoice_number, p_currency, p_exchange_rate, v_subtotal, p_company_id, p_branch_id);

  UPDATE journal_entries SET status='posted' WHERE id=v_journal_id;
  UPDATE invoices SET status='posted' WHERE id=v_invoice_id;

  RETURN jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', v_base_total, 'currency', p_currency, 'status', 'posted'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.commit_purchase_return(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_notes text,
  p_currency text,
  p_exchange_rate numeric,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_return_reason text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.commit_purchase_return(
    p_company_id, p_user_id, p_supplier_id, p_items, p_notes,
    p_currency, p_exchange_rate, p_branch_id, p_return_reason, NULL
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text) FROM anon, PUBLIC;

-- 8) Multi-currency unification in process_sales_return
CREATE OR REPLACE FUNCTION public.process_sales_return(
  p_invoice_id uuid,
  p_party_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_return_reason text,
  p_status text,
  p_notes text,
  p_issue_date date,
  p_currency_code text,
  p_exchange_rate numeric,
  p_company_id uuid,
  p_user_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_return_invoice_id UUID;
  v_invoice_number    TEXT;
  v_total_amount      NUMERIC := 0;
  v_subtotal          NUMERIC := 0;
  v_cost_total        NUMERIC := 0;
  v_warehouse_id      UUID;
  v_journal_id        UUID;
  v_item              RECORD;
  v_account_revenue   UUID;
  v_account_receivable UUID;
  v_account_cash      UUID;
  v_account_inventory UUID;
  v_account_cogs      UUID;
  v_credit_account    UUID;
  v_base_total_amount NUMERIC;
  v_base_cost_total   NUMERIC;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- التحقق من السنة المالية المفتوحة
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- توليد رقم الفاتورة
  v_invoice_number := public.get_next_invoice_number(p_company_id, 'RET');

  -- حساب الإجماليات والتحقق من سقف الكميات
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
  LOOP
    IF COALESCE(v_item.quantity, 0) <= 0 THEN
      RAISE EXCEPTION 'كمية الإرجاع يجب أن تكون أكبر من صفر';
    END IF;

    -- إذا كان المرتجع مرتبطاً بفاتورة أصلية، تحقق من عدم تجاوز الكمية المتبقية القابلة للإرجاع
    IF p_invoice_id IS NOT NULL AND v_item.product_id IS NOT NULL THEN
      DECLARE
        v_orig_qty NUMERIC := 0;
        v_prev_returned NUMERIC := 0;
      BEGIN
        SELECT COALESCE(SUM(ii.quantity), 0) INTO v_orig_qty
        FROM public.invoice_items ii
        WHERE ii.invoice_id = p_invoice_id AND ii.product_id = v_item.product_id;

        IF v_orig_qty > 0 THEN
          SELECT COALESCE(SUM(ret_ii.quantity), 0) INTO v_prev_returned
          FROM public.invoices ret_inv
          JOIN public.invoice_items ret_ii ON ret_ii.invoice_id = ret_inv.id
          WHERE ret_inv.reference_invoice_id = p_invoice_id
            AND ret_inv.type IN ('sale_return', 'return_sale')
            AND ret_inv.status <> 'void'
            AND ret_inv.deleted_at IS NULL
            AND ret_ii.product_id = v_item.product_id;

          IF (v_item.quantity + v_prev_returned) > v_orig_qty THEN
            RAISE EXCEPTION 'كمية الإرجاع المطلوبة (%) تتجاوز الكمية المتبقية القابلة للإرجاع (%) للفاتورة',
              v_item.quantity, GREATEST(0, v_orig_qty - v_prev_returned);
          END IF;
        END IF;
      END;
    END IF;

    v_subtotal   := v_subtotal   + COALESCE(v_item.quantity * v_item.unit_price, 0);
    v_cost_total := v_cost_total + COALESCE(v_item.quantity * v_item.cost_price, 0);
  END LOOP;

  v_total_amount := v_subtotal;

  -- إنشاء فاتورة المرتجع
  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', 'draft', p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    p_currency_code, p_exchange_rate, p_invoice_id,
    p_return_reason, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

  -- إضافة أصناف الفاتورة
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, total, cost_price, tax_amount, company_id
  )
  SELECT
    v_return_invoice_id,
    CASE 
      WHEN (item->>'product_id') IS NOT NULL AND (item->>'product_id') ~ '^[0-9a-fA-F-]{36}$'
      THEN (item->>'product_id')::UUID 
      ELSE NULL 
    END,
    COALESCE((item->>'name'), ''),
    COALESCE((item->>'quantity')::NUMERIC, 0),
    COALESCE((item->>'unit_price')::NUMERIC, 0),
    COALESCE((item->>'quantity')::NUMERIC, 0) * COALESCE((item->>'unit_price')::NUMERIC, 0),
    COALESCE((item->>'cost_price')::NUMERIC, 0),
    0,
    p_company_id
  FROM jsonb_array_elements(p_items) AS item;

  -- تحريك المخزون وإنشاء القيود المحاسبية عند الترحيل
  IF p_status = 'posted' THEN
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND is_primary = true AND deleted_at IS NULL
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id
      FROM public.warehouses
      WHERE company_id = p_company_id AND deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF v_warehouse_id IS NOT NULL THEN
      FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items)
          AS x(product_id uuid, quantity numeric, cost_price numeric)
      LOOP
        IF v_item.product_id IS NOT NULL THEN
          INSERT INTO public.inventory_transactions (
            company_id, product_id, warehouse_id, quantity, unit_cost,
            transaction_type, reference_type, reference_id, created_by
          ) VALUES (
            p_company_id, v_item.product_id, v_warehouse_id, v_item.quantity,
            COALESCE(v_item.cost_price, 0),
            'sales_return', 'invoice', v_return_invoice_id, p_user_id
          );
        END IF;
      END LOOP;
    END IF;

    -- حساب الإيرادات (4100)
    SELECT id INTO v_account_revenue FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '4100' OR code LIKE '41%' OR (type = 'revenue' AND name_ar LIKE '%مبيعات%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '4100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- حساب المدينون (1100)
    SELECT id INTO v_account_receivable FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '1100' OR code LIKE '110%' OR (type = 'asset' AND name_ar LIKE '%عملاء%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '1100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- حساب الكاش
    v_account_cash := public.fn_get_default_cash_account(p_company_id, p_currency_code);
    IF v_account_cash IS NULL THEN
      SELECT id INTO v_account_cash FROM public.accounts
      WHERE company_id = p_company_id
        AND (code LIKE '101%' OR code LIKE '1101%' OR (type = 'asset' AND (name_ar LIKE '%صندوق%' OR name_ar LIKE '%نقد%' OR name_ar LIKE '%كاش%')))
        AND allow_posting = true AND is_active = true AND deleted_at IS NULL
      ORDER BY CASE WHEN currency_code = p_currency_code THEN 0 ELSE 1 END, code LIMIT 1;
    END IF;
    IF v_account_cash IS NULL THEN
      SELECT id INTO v_account_cash FROM public.accounts
      WHERE company_id = p_company_id
        AND type = 'asset' AND allow_posting = true AND is_active = true AND deleted_at IS NULL
      ORDER BY code LIMIT 1;
    END IF;

    -- حساب المخزون (1200)
    SELECT id INTO v_account_inventory FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '1200' OR code LIKE '120%' OR (type = 'asset' AND name_ar LIKE '%مخزون%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '1200' THEN 0 ELSE 1 END, code LIMIT 1;

    -- حساب تكلفة المبيعات (5100)
    SELECT id INTO v_account_cogs FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '5100' OR code LIKE '510%' OR (type = 'expense' AND (name_ar LIKE '%تكلفة المبيعات%' OR name_ar LIKE '%تكلفة بضاعة%')))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '5100' THEN 0 ELSE 1 END, code LIMIT 1;

    IF v_account_revenue IS NULL THEN RAISE EXCEPTION 'حساب الإيرادات (4100) مفقود'; END IF;
    IF p_payment_method = 'credit' AND v_account_receivable IS NULL THEN RAISE EXCEPTION 'حساب المدينون (1100) مفقود'; END IF;
    IF p_payment_method <> 'credit' AND v_account_cash IS NULL THEN RAISE EXCEPTION 'حساب الصندوق/البنك مفقود'; END IF;

    v_credit_account := CASE WHEN p_payment_method = 'credit' THEN v_account_receivable ELSE v_account_cash END;

    -- تحويل موحد للعملة الأساسية عبر fn_to_base_amount
    v_base_total_amount := public.fn_to_base_amount(p_currency_code, v_total_amount, p_exchange_rate);
    v_base_cost_total   := public.fn_to_base_amount(p_currency_code, v_cost_total, p_exchange_rate);

    INSERT INTO public.journal_entries (
      company_id, entry_date, description, reference_type,
      reference_id, status, created_by
    ) VALUES (
      p_company_id, p_issue_date, 'مرتجع مبيعات ' || v_invoice_number,
      'sales_return', v_return_invoice_id, 'draft', p_user_id
    ) RETURNING id INTO v_journal_id;

    -- 1. طرف المدين: إيرادات المبيعات (تخفيض الإيراد)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, debit_amount,
      credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id
    ) VALUES (
      v_journal_id, v_account_revenue, NULL, v_base_total_amount,
      0, 'تخفيض إيراد مبيعات - ' || v_invoice_number,
      p_currency_code, p_exchange_rate, v_total_amount, p_company_id
    );

    -- 2. طرف الدائن: العميل أو الصندوق
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, debit_amount,
      credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id
    ) VALUES (
      v_journal_id, v_credit_account,
      CASE WHEN p_payment_method = 'credit' THEN p_party_id ELSE NULL END,
      0, v_base_total_amount,
      CASE WHEN p_payment_method = 'credit' THEN 'تخفيض ذمة عميل - ' ELSE 'رد نقدية للعميل - ' END || v_invoice_number,
      p_currency_code, p_exchange_rate, v_total_amount, p_company_id
    );

    -- 3. قيد تكلفة البضاعة المباعة (إرجاع المخزون)
    IF v_cost_total > 0 AND v_account_inventory IS NOT NULL AND v_account_cogs IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount,
        credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_account_inventory, NULL, v_base_cost_total,
        0, 'إرجاع بضاعة للمخزون - ' || v_invoice_number,
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      );

      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount,
        credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_account_cogs, NULL, 0,
        v_base_cost_total, 'تخفيض تكلفة المبيعات - ' || v_invoice_number,
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      );
    END IF;

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_journal_id;
  END IF;

  UPDATE public.invoices SET status = p_status WHERE id = v_return_invoice_id;

  RETURN jsonb_build_object(
    'id', v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'total_amount', v_total_amount,
    'status', p_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) FROM anon, PUBLIC;

COMMIT;
