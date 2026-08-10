-- ============================================================
-- Migration: Debt Module - RPC Functions (Part 1)
-- Date: 2026-08-10
-- ============================================================

-- 1. Get Party Balance By Currency
CREATE OR REPLACE FUNCTION public.get_party_balance_by_currency(
    p_company_id UUID,
    p_party_id UUID,
    p_currency_code VARCHAR
)
RETURNS TABLE(
    party_id UUID, currency_code VARCHAR, balance DECIMAL,
    transaction_count BIGINT, last_activity_date DATE
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id AND pb.currency_code = p_currency_code;
END;
$$;

-- 2. Get All Party Balances (Multi-Currency)
CREATE OR REPLACE FUNCTION public.get_party_all_balances(
    p_company_id UUID, p_party_id UUID
)
RETURNS TABLE(
    party_id UUID, currency_code VARCHAR, balance DECIMAL,
    transaction_count BIGINT, last_activity_date DATE
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id
    ORDER BY pb.currency_code;
END;
$$;

-- 3. Get Follow-up Dashboard
CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(
    p_company_id UUID,
    p_due_soon_days INT DEFAULT 7,
    p_critical_days INT DEFAULT 30
)
RETURNS TABLE(
    party_id UUID, party_name VARCHAR, party_phone VARCHAR,
    currency_code VARCHAR, outstanding_balance DECIMAL, overdue_balance DECIMAL,
    oldest_due_date DATE, days_overdue INT, last_contact_date DATE,
    has_broken_promise BOOLEAN, promise_status VARCHAR, classification VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    WITH currency_balances AS (
        SELECT pb.party_id, pb.currency_code, pb.balance, pb.last_activity_date
        FROM public.party_balances_by_currency pb WHERE pb.company_id = p_company_id AND pb.balance > 0
    ),
    overdue_invoices AS (
        SELECT i.party_id, i.currency_code,
            SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS overdue_amount,
            MIN(i.due_date) AS oldest_due
        FROM public.invoices i
        WHERE i.company_id = p_company_id AND i.status IN ('posted', 'partial')
          AND i.due_date IS NOT NULL AND i.due_date < v_today AND i.deleted_at IS NULL
        GROUP BY i.party_id, i.currency_code
    ),
    latest_promise AS (
        SELECT DISTINCT ON (pp.party_id, pp.currency_code)
            pp.party_id, pp.currency_code, pp.status AS promise_status,
            pp.status = 'broken' AS has_broken
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = p_company_id
        ORDER BY pp.party_id, pp.currency_code, pp.created_at DESC
    ),
    last_contacts AS (
        SELECT DISTINCT ON (ca.customer_id) ca.customer_id, ca.created_at AS last_contact
        FROM public.customer_activities ca
        WHERE ca.company_id = p_company_id AND ca.activity_type IN ('call', 'follow_up', 'meeting', 'visit')
        ORDER BY ca.customer_id, ca.created_at DESC
    )
    SELECT cb.party_id, p.name, p.phone, cb.currency_code,
        cb.balance, COALESCE(oi.overdue_amount, 0),
        oi.oldest_due, CASE WHEN oi.oldest_due IS NOT NULL THEN v_today - oi.oldest_due ELSE 0 END,
        lc.last_contact, COALESCE(lp.has_broken, false), lp.promise_status,
        CASE
            WHEN oi.oldest_due IS NOT NULL AND (v_today - oi.oldest_due) >= p_critical_days THEN 'critical'
            WHEN oi.oldest_due IS NOT NULL AND oi.oldest_due < v_today THEN 'overdue'
            WHEN oi.oldest_due = v_today THEN 'due_today'
            WHEN oi.oldest_due IS NOT NULL AND oi.oldest_due <= v_today + p_due_soon_days THEN 'due_soon'
            ELSE 'current'
        END
    FROM currency_balances cb
    JOIN public.parties p ON p.id = cb.party_id AND p.deleted_at IS NULL
    LEFT JOIN overdue_invoices oi ON oi.party_id = cb.party_id AND oi.currency_code = cb.currency_code
    LEFT JOIN latest_promise lp ON lp.party_id = cb.party_id AND lp.currency_code = cb.currency_code
    LEFT JOIN last_contacts lc ON lc.customer_id = cb.party_id
    WHERE cb.balance > 0
    ORDER BY overdue_balance DESC NULLS LAST, days_overdue DESC NULLS LAST;
END;
$$;
