-- ============================================================
-- Accounting Security Hardening (Phase 1 of the accounting audit)
-- ------------------------------------------------------------
-- 2026-08-19
--
-- CLOSES THE TWO CRITICAL FINDINGS from the deep accounting audit:
--
--   C1 — Cross-tenant financial data exposure:
--        report_trial_balance / report_profit_loss / report_balance_sheet
--        / report_cash_flow / report_debt_aging / get_monthly_performance
--        were SECURITY DEFINER + GRANTed to authenticated but had NO
--        company-membership check. Any authenticated user could read ANY
--        company's financial data by passing an arbitrary p_company_id.
--        Fix: add `PERFORM public.fn_assert_company_access(p_company_id)`
--        to every function (same pattern as get_account_ledger /
--        report_debts / get_bonds_stats).
--
--   C2 — void_bond was both insecure and broken:
--        (a) no access check → any user could void any payment;
--        (b) it tried `UPDATE journal_entries SET status='void'` on posted
--            journals, which is forbidden by trg_journal_entries_immutability
--            (prevent_posted_journal_modification, errcode 23514) → every
--            bond delete failed in production;
--        (c) it searched reference_type='payment' but bond journals are
--            stored as 'receipt_bond'/'payment_bond' → matched nothing.
--        Fix: add company-access + open-fiscal-year checks and replace the
--        illegal status flip with a proper reversal journal via
--        fn_reverse_journal_entries (posted journal stays immutable).
--
--   Root-cause (fixes fn_reverse_journal_entries, which ALSO blocks
--   void_expense/void_invoice):
--        fn_reverse_journal_entries inserted the reversal header as
--        'posted' BEFORE its lines, which violates
--        trg_journal_entry_lines_immutability (23514) — the same
--        posted-first bug class fixed for post_manual_journal in ADR-005.
--        Fix: insert header as 'draft' → insert lines → set 'posted',
--        plus add an access check and a company_id filter on the source.
-- ============================================================

-- ============================================================
-- 1) report_balance_sheet — tenant access check
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_balance_sheet(p_company_id uuid, p_as_of_date date DEFAULT NULL::date)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date := COALESCE(p_as_of_date, CURRENT_DATE);
  v_assets numeric;
  v_liabilities numeric;
  v_equity numeric;
  v_cash numeric;
  v_receivables numeric;
  v_inventory_value numeric;
  v_payables numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Assets (accounts starting with 1)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_assets
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '1%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Liabilities (accounts starting with 2)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_liabilities
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '2%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Equity (accounts starting with 3)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_equity
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '3%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Return rows in proper order
  category := 'الأصول'; amount := v_assets; type := 'asset'; RETURN NEXT;
  category := 'الالتزامات'; amount := v_liabilities; type := 'liability'; RETURN NEXT;
  category := 'حقوق الملكية'; amount := v_equity; type := 'equity'; RETURN NEXT;
END;
$function$;


-- ============================================================
-- 2) report_cash_flow — tenant access check
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_cash_flow(p_company_id uuid, p_from date, p_to date)
 RETURNS TABLE(category text, inflow numeric, outflow numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operating_in numeric;
  v_operating_out numeric;
  v_investing_in numeric;
  v_investing_out numeric;
  v_financing_in numeric;
  v_financing_out numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Operating inflow (sales cash receipts)
  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_operating_in
  FROM public.invoices i
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('paid', 'partially_paid')
    AND i.payment_method = 'cash'
    AND i.issue_date BETWEEN p_from AND p_to
    AND i.deleted_at IS NULL;

  -- Operating outflow (expenses paid)
  SELECT COALESCE(SUM(e.amount), 0) INTO v_operating_out
  FROM public.expenses e
  WHERE e.company_id = p_company_id
    AND e.status = 'posted'
    AND e.payment_method IN ('cash', 'bank')
    AND e.expense_date BETWEEN p_from AND p_to
    AND e.deleted_at IS NULL;

  -- Receipt bonds
  SELECT COALESCE(SUM(p.amount), 0) INTO v_financing_in
  FROM public.payments p
  WHERE p.company_id = p_company_id
    AND p.type = 'receipt'
    AND p.status = 'posted'
    AND p.payment_date BETWEEN p_from AND p_to
    AND p.deleted_at IS NULL;

  -- Payment bonds
  SELECT COALESCE(SUM(p.amount), 0) INTO v_financing_out
  FROM public.payments p
  WHERE p.company_id = p_company_id
    AND p.type = 'disbursement'
    AND p.status = 'posted'
    AND p.payment_date BETWEEN p_from AND p_to
    AND p.deleted_at IS NULL;

  category := 'التشغيل'; inflow := v_operating_in; outflow := v_operating_out; RETURN NEXT;
  category := 'الاستثمار'; inflow := 0; outflow := 0; RETURN NEXT;
  category := 'التمويل'; inflow := v_financing_in; outflow := v_financing_out; RETURN NEXT;
END;
$function$;

-- ============================================================
-- 3) report_debt_aging — tenant access check
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_debt_aging(p_company_id uuid)
 RETURNS TABLE(customer_name text, total numeric, days_0_30 numeric, days_31_60 numeric, days_61_90 numeric, days_90_plus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT
    COALESCE(pr.name, 'نقدي') as customer_name,
    SUM(i.total_amount - COALESCE(i.paid_amount, 0)) as total,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_0_30,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_31_60,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_90_plus
  FROM public.invoices i
  LEFT JOIN public.parties pr ON pr.id = i.party_id
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('posted', 'partially_paid')
    AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    AND i.deleted_at IS NULL
  GROUP BY pr.id, pr.name
  ORDER BY total DESC;
END;
$function$;

-- ============================================================
-- 4) report_profit_loss — tenant access check
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_profit_loss(p_company_id uuid, p_from date, p_to date)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue numeric;
  v_expense numeric;
  v_gross_profit numeric;
  v_net_profit numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Revenue (accounts starting with 4)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '4%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to;

  -- Expenses (accounts starting with 5)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '5%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to;

  v_net_profit := v_revenue - v_expense;
  v_gross_profit := v_revenue;

  -- Return rows
  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$;

-- ============================================================
-- 5) report_trial_balance — tenant access check
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_trial_balance(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
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


-- ============================================================
-- 6) get_monthly_performance — tenant access check
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_monthly_performance(p_company_id uuid, p_year integer, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(month_index integer, month_name text, revenues numeric, expenses numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_start DATE := make_date(p_year, 1, 1);
    v_end   DATE := make_date(p_year, 12, 31);
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    WITH month_series AS (
        SELECT
            generate_series(0, 11)         AS month_idx,
            to_char(
                make_date(p_year, generate_series(0,11)+1, 1),
                'Month'
            )                              AS month_nm
    ),
    journal_agg AS (
        SELECT
            EXTRACT(MONTH FROM je.entry_date)::INT - 1 AS month_idx,
            a.type                                      AS account_type,
            SUM(
                CASE a.type
                    WHEN 'revenue' THEN (jel.credit_amount - jel.debit_amount)
                    WHEN 'expense' THEN (jel.debit_amount - jel.credit_amount)
                    ELSE 0
                END
            ) AS net_amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        JOIN accounts a ON a.id = jel.account_id
        WHERE je.company_id = p_company_id
          AND je.entry_date BETWEEN v_start AND v_end
          AND je.status = 'posted'
          AND a.type IN ('revenue', 'expense')
          AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
        GROUP BY EXTRACT(MONTH FROM je.entry_date), a.type
    )
    SELECT
        ms.month_idx,
        TRIM(ms.month_nm),
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'revenue' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS revenues,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'expense' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS expenses
    FROM month_series ms
    LEFT JOIN journal_agg ja ON ja.month_idx = ms.month_idx
    GROUP BY ms.month_idx, ms.month_nm
    ORDER BY ms.month_idx;
END;
$function$;

-- ============================================================
-- 7) fn_reverse_journal_entries — root-cause fix
--    (a) tenant access check + company filter on the source journals;
--    (b) draft → lines → posted (the previous 'posted'-first order
--        violated trg_journal_entry_lines_immutability → 23514,
--        which blocked void_expense / void_invoice / any reversal).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_reverse_journal_entries(p_source_reference_id uuid, p_source_reference_types text[], p_new_reference_type text, p_description_prefix text, p_created_by uuid, p_company_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_je RECORD;
  v_new_je_id uuid;
  v_line RECORD;
  v_result uuid[] := '{}';
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  FOR v_je IN
    SELECT id, description FROM journal_entries
    WHERE reference_id = p_source_reference_id
      AND reference_type = ANY(p_source_reference_types)
      AND status = 'posted' AND deleted_at IS NULL
      AND company_id = p_company_id
    ORDER BY created_at ASC
  LOOP
    INSERT INTO journal_entries(company_id, entry_date, description, reference_type, reference_id, status, created_by)
    VALUES (p_company_id, CURRENT_DATE, p_description_prefix || COALESCE(v_je.description,''),
            p_new_reference_type, p_source_reference_id, 'draft', p_created_by)
    RETURNING id INTO v_new_je_id;

    FOR v_line IN SELECT * FROM journal_entry_lines WHERE journal_entry_id = v_je.id AND deleted_at IS NULL LOOP
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount,
                                       description, currency_code, exchange_rate, foreign_amount, company_id)
      VALUES (v_new_je_id, v_line.account_id, v_line.party_id, v_line.credit_amount, v_line.debit_amount,
              'عكس: ' || COALESCE(v_line.description,''), v_line.currency_code, v_line.exchange_rate,
              v_line.foreign_amount, p_company_id);
    END LOOP;

    UPDATE journal_entries SET status = 'posted' WHERE id = v_new_je_id;

    v_result := v_result || v_new_je_id;
  END LOOP;

  RETURN v_result;
END;
$function$;


-- ============================================================
-- 8) void_bond — secure + working version
--    (a) company access check;
--    (b) open-fiscal-year check;
--    (c) creates a REVERSAL journal instead of illegally flipping
--        the immutable posted journal's status to 'void'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.void_bond(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  v_new_jes uuid[];
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;

  IF v_payment IS NULL OR v_payment.status = 'void' THEN
    RAISE EXCEPTION 'Payment not found or already voided';
  END IF;

  -- [SECURITY] caller must belong to the payment's company
  IF NOT public.is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_payment.company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية إلغاء هذا السند';
  END IF;

  -- [SECURITY] cannot void a bond inside a closed fiscal year
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = v_payment.company_id
      AND v_payment.payment_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'لا يمكن إلغاء سند في سنة مالية مغلقة';
  END IF;

  -- [FIX] the posted journal is immutable (trg_journal_entries_immutability);
  -- create a balanced reversal journal instead of updating status='void'.
  v_new_jes := public.fn_reverse_journal_entries(
    p_payment_id,
    ARRAY['receipt_bond', 'payment_bond', 'payment'],
    'bond_void',
    'عكس سند: ' || COALESCE(v_payment.payment_number,'') || ' - ',
    auth.uid(),
    v_payment.company_id
  );

  -- Void the payment (single transaction: any failure above rolls back)
  UPDATE public.payments SET status = 'void', updated_at = now() WHERE id = p_payment_id;
END;
$function$;

-- ============================================================
-- 9) Defensive privileges (idempotent; CREATE OR REPLACE keeps
--    existing grants, but re-asserting them protects fresh builds).
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_cash_flow(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_cash_flow(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_cash_flow(uuid, date, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_debt_aging(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_debt_aging(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_debt_aging(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_monthly_performance(uuid, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_performance(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_performance(uuid, integer, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_reverse_journal_entries(uuid, text[], text, text, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_reverse_journal_entries(uuid, text[], text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_reverse_journal_entries(uuid, text[], text, text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_bond(uuid) TO authenticated;

