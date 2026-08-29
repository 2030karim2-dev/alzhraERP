-- ============================================================
-- Migration: 20260829000001_fix_debt_analytics_summary_unified.sql
-- Description: Ensure get_debt_analytics_summary includes all debtor
-- balances (invoices + opening balances) converted to base currency.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
    -- Check company access
    IF auth.uid() IS NOT NULL THEN
        PERFORM public.fn_assert_company_access(p_company_id);
    END IF;

    WITH dashboard_data AS (
        SELECT * FROM public.get_debt_followup_dashboard(p_company_id)
    ),
    rates AS (
        SELECT DISTINCT ON (currency_code)
            currency_code,
            rate_to_base
        FROM public.exchange_rates
        WHERE company_id = p_company_id
        ORDER BY currency_code, effective_date DESC, created_at DESC
    ),
    converted_debtors AS (
        SELECT
            d.*,
            d.outstanding_balance * COALESCE(
                CASE WHEN d.currency_code = 'SAR' THEN 1 ELSE r.rate_to_base END, 1
            ) AS converted_balance,
            d.overdue_amount * COALESCE(
                CASE WHEN d.currency_code = 'SAR' THEN 1 ELSE r.rate_to_base END, 1
            ) AS converted_overdue
        FROM dashboard_data d
        LEFT JOIN rates r ON r.currency_code = d.currency_code
    ),
    currency_agg AS (
        SELECT
            currency_code,
            SUM(outstanding_balance) AS balance,
            COUNT(*) AS cnt
        FROM dashboard_data
        WHERE outstanding_balance > 0
        GROUP BY currency_code
    )
    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(converted_balance) FROM converted_debtors WHERE outstanding_balance > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(converted_overdue) FROM converted_debtors WHERE overdue_amount > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(converted_balance) FROM converted_debtors WHERE classification = 'due_today'), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(
                    CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
                    * COALESCE(CASE WHEN ob.currency_code = 'SAR' THEN 1 ELSE r.rate_to_base END, 1)
                )
                FROM public.party_opening_balances ob
                LEFT JOIN rates r ON r.currency_code = ob.currency_code
                WHERE ob.company_id = p_company_id), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(pp.amount
                    * COALESCE(CASE WHEN pp.currency_code = 'SAR' THEN 1 ELSE r.rate_to_base END, 1))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(pp.amount
                    * COALESCE(CASE WHEN pp.currency_code = 'SAR' THEN 1 ELSE r.rate_to_base END, 1))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'sent'), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'
                  AND created_at >= NOW() - INTERVAL '24 hours'), 0),
        'total_debtors',
            COALESCE((SELECT COUNT(*)::INT FROM dashboard_data WHERE outstanding_balance > 0), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(*)::INT FROM dashboard_data WHERE reminder_status = 'needs_reminder'), 0),
        'by_currency',
            (SELECT json_agg(json_build_object(
                'currency', ca.currency_code,
                'balance', ca.balance,
                'count', ca.cnt))
             FROM currency_agg ca)
    ) INTO v_result;
    RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) TO authenticated, service_role;
