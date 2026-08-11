-- ============================================================
-- Migration: Debt Module - RPC Functions (Part 2)
-- Date: 2026-08-10
-- ============================================================

-- 4. Get Today's Tasks
CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(
    p_company_id UUID
)
RETURNS TABLE(
    task_type VARCHAR, party_id UUID, party_name TEXT, party_phone TEXT,
    currency_code TEXT, amount DECIMAL, reference_info TEXT, urgency VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT * FROM (
    -- Debts due today
    SELECT 'due_today'::VARCHAR, i.party_id, p.name, p.phone, i.currency_code,
        (i.total_amount - COALESCE(i.paid_amount, 0)), i.invoice_number::TEXT, 'high'::VARCHAR
    FROM public.invoices i
    JOIN public.parties p ON p.id = i.party_id AND p.deleted_at IS NULL
    WHERE i.company_id = p_company_id AND i.status IN ('posted', 'partial')
      AND i.due_date = v_today AND i.deleted_at IS NULL
      AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0

    UNION ALL
    -- Promises due today
    SELECT 'promise_due'::VARCHAR, pp.party_id, p.name, p.phone, pp.currency_code,
        pp.amount, 'Promise #' || pp.id::TEXT, 'high'::VARCHAR
    FROM public.debt_payment_promises pp
    JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
    WHERE pp.company_id = p_company_id AND pp.status = 'pending' AND pp.promise_date = v_today

    UNION ALL
    -- Broken promises
    SELECT 'broken_promise'::VARCHAR, pp.party_id, p.name, p.phone, pp.currency_code,
        pp.amount, 'Promise #' || pp.id::TEXT, 'critical'::VARCHAR
    FROM public.debt_payment_promises pp
    JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
    WHERE pp.company_id = p_company_id AND pp.status = 'pending' AND pp.promise_date < v_today

    UNION ALL
    -- Failed messages
    SELECT 'failed_message'::VARCHAR, dm.party_id, p.name, p.phone,
        NULL::VARCHAR, NULL::DECIMAL, 'Message #' || dm.id::TEXT, 'medium'::VARCHAR
    FROM public.debt_message_log dm
    JOIN public.parties p ON p.id = dm.party_id AND p.deleted_at IS NULL
    WHERE dm.company_id = p_company_id AND dm.status = 'failed' AND dm.created_at::DATE = v_today
    ) sub
    ORDER BY urgency DESC, amount DESC NULLS LAST;
END;
$$;

-- 5. Get Debt Analytics Summary
CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(
    p_company_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_receivables', COALESCE((SELECT SUM(balance) FROM public.party_balances_by_currency WHERE company_id = p_company_id AND balance > 0), 0),
        'total_payables', COALESCE((SELECT ABS(SUM(balance)) FROM public.party_balances_by_currency WHERE company_id = p_company_id AND balance < 0), 0),
        'overdue_receivables', COALESCE((
            SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
            FROM public.invoices i WHERE i.company_id = p_company_id
            AND i.status IN ('posted', 'partial') AND i.due_date < CURRENT_DATE AND i.deleted_at IS NULL
        ), 0),
        'due_today', COALESCE((
            SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
            FROM public.invoices i WHERE i.company_id = p_company_id
            AND i.status IN ('posted', 'partial') AND i.due_date = CURRENT_DATE AND i.deleted_at IS NULL
        ), 0),
        'pending_promises', COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises WHERE company_id = p_company_id AND status = 'pending'), 0),
        'broken_promises', COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises WHERE company_id = p_company_id AND status = 'broken'), 0),
        'by_currency', (
            SELECT json_agg(json_build_object('currency', currency_code, 'balance', balance, 'count', transaction_count))
            FROM public.party_balances_by_currency WHERE company_id = p_company_id AND balance > 0
        )
    ) INTO v_result;
    RETURN v_result;
END;
$$;

-- 6. Update party credit limit (if changed during debt management)
CREATE OR REPLACE FUNCTION public.update_party_credit_limit(
    p_party_id UUID, p_credit_limit DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.parties SET credit_limit = p_credit_limit, updated_at = NOW()
    WHERE id = p_party_id
      AND company_id = public.get_user_company_id();
END;
$$;
