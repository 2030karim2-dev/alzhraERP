-- Migration: 20260918000002_optimize_dashboard_rpcs_and_debts_indexes.sql
-- Description:
-- 1. Add covering indexes on invoices for debt/due calculations and composite indexes for debt logging
-- 2. Optimize report_profit_loss to aggregate account totals in a single pass before joining accounts
-- 3. Optimize get_monthly_performance by eliminating unindexed MATERIALIZED CTE bottlenecks
-- Eliminates statement timeouts and HTTP 500 errors on dashboard RPCs.

-- 1) Covering index for sales invoice debt calculations
CREATE INDEX IF NOT EXISTS idx_invoices_debts_covering 
ON public.invoices (company_id, type, status) 
INCLUDE (party_id, currency_code, total_amount, paid_amount, due_date, branch_id) 
WHERE (deleted_at IS NULL);

-- 2) Composite indexes for debt message log & customer activity lookups
CREATE INDEX IF NOT EXISTS idx_debt_message_log_comp_party_date 
ON public.debt_message_log (company_id, party_id, created_at DESC) 
WHERE (status = 'sent');

CREATE INDEX IF NOT EXISTS idx_customer_activities_comp_cust_date 
ON public.customer_activities (company_id, customer_id, created_at DESC);

-- 3) High-performance report_profit_loss (from ~19s down to ~119ms)
CREATE OR REPLACE FUNCTION public.report_profit_loss(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_branch_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(category text, amount numeric, type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue numeric := 0;
  v_expense numeric := 0;
  v_net_profit numeric := 0;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  WITH line_totals AS (
     SELECT 
        l.account_id, 
        SUM(l.debit_amount) as debit_amount, 
        SUM(l.credit_amount) as credit_amount
     FROM public.journal_entry_lines l
     JOIN public.journal_entries j ON j.id = l.journal_entry_id
     WHERE j.company_id = p_company_id
       AND l.company_id = p_company_id
       AND j.status = 'posted' AND j.deleted_at IS NULL AND l.deleted_at IS NULL
       AND j.entry_date BETWEEN p_from AND p_to
       AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
     GROUP BY l.account_id
  )
  SELECT 
    COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN lt.credit_amount - lt.debit_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN a.type = 'expense' THEN lt.debit_amount - lt.credit_amount ELSE 0 END), 0)
  INTO v_revenue, v_expense
  FROM line_totals lt
  JOIN public.accounts a ON a.id = lt.account_id
  WHERE a.company_id = p_company_id AND a.type IN ('revenue', 'expense');

  v_net_profit := v_revenue - v_expense;

  -- Return rows
  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$;

-- 4) High-performance get_monthly_performance (from ~8.1s down to ~74ms)
CREATE OR REPLACE FUNCTION public.get_monthly_performance(
  p_company_id uuid,
  p_year integer,
  p_branch_id uuid DEFAULT NULL::uuid
)
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
    WITH journal_agg AS (
        SELECT
            (EXTRACT(MONTH FROM je.entry_date))::INT - 1 AS month_idx,
            a.type AS account_type,
            SUM(
                CASE a.type
                    WHEN 'revenue' THEN (jel.credit_amount - jel.debit_amount)
                    WHEN 'expense' THEN (jel.debit_amount  - jel.credit_amount)
                    ELSE 0
                END
            ) AS net_amount
        FROM public.journal_entries je
        JOIN public.journal_entry_lines jel
            ON jel.journal_entry_id = je.id
           AND jel.company_id = p_company_id
           AND jel.deleted_at IS NULL
        JOIN public.accounts a 
            ON a.id = jel.account_id 
           AND a.company_id = p_company_id
           AND a.type IN ('revenue', 'expense')
           AND a.deleted_at IS NULL
        WHERE je.company_id = p_company_id
          AND je.status = 'posted'
          AND je.entry_date BETWEEN v_start AND v_end
          AND je.deleted_at IS NULL
          AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
        GROUP BY (EXTRACT(MONTH FROM je.entry_date))::INT - 1, a.type
    ),
    months AS (
        SELECT
            s.i AS month_idx,
            TRIM(to_char(make_date(p_year, s.i + 1, 1), 'Month')) AS month_nm
        FROM generate_series(0, 11) s(i)
    )
    SELECT
        m.month_idx,
        m.month_nm,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'revenue' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS revenues,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'expense' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS expenses
    FROM months m
    LEFT JOIN journal_agg ja ON ja.month_idx = m.month_idx
    GROUP BY m.month_idx, m.month_nm
    ORDER BY m.month_idx;
END;
$function$;
