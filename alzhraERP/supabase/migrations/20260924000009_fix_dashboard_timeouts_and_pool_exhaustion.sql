-- ==============================================================================
-- Migration: 20260924000009_fix_dashboard_timeouts_and_pool_exhaustion.sql
-- Description:
--   1. Protect connection pool from exhaustion by enforcing idle_in_transaction_session_timeout
--   2. Optimize get_low_stock_products() with pushdown limit and isolated warehouses
--   3. Bound incentive_detect_pending_invoices_system() to 30-day window and reschedule to off-peak
--   4. Ensure explicit EXECUTE grants on core dashboard RPCs
-- ==============================================================================

-- 1. Protect connection pool from stale transactions
ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE authenticated SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE anon SET idle_in_transaction_session_timeout = '10s';

-- 2. Optimize get_low_stock_products
CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, quantity numeric, min_quantity numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH low_stocks AS (
        SELECT 
            ps.product_id, 
            SUM(ps.quantity) AS total_qty
        FROM public.product_stock ps
        WHERE ps.company_id = p_company_id
          AND (
            p_branch_id IS NULL 
            OR ps.warehouse_id IN (
              SELECT w.id FROM public.warehouses w 
              WHERE w.company_id = p_company_id 
                AND w.branch_id = p_branch_id 
                AND w.deleted_at IS NULL
            )
          )
        GROUP BY ps.product_id
        HAVING SUM(ps.quantity) <= 5
        ORDER BY total_qty ASC
        LIMIT 100
    )
    SELECT
        p.id,
        p.name_ar,
        ls.total_qty AS quantity,
        COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5) AS min_quantity
    FROM low_stocks ls
    JOIN public.products p ON p.id = ls.product_id AND p.company_id = p_company_id
    WHERE p.status = 'active'
      AND p.deleted_at IS NULL
      AND ls.total_qty <= COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)
    ORDER BY ls.total_qty ASC
    LIMIT 50;
END;
$function$;

-- 3. Reschedule and optimize incentive detection to off-peak daily
CREATE OR REPLACE FUNCTION public.incentive_detect_pending_invoices_system()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer := 0;
  v_count integer;
  v_company_id uuid;
BEGIN
  FOR v_company_id IN SELECT id FROM public.companies WHERE is_active = true ORDER BY id LOOP
    INSERT INTO public.incentive_pending_invoices (company_id, invoice_id, branch_id, status, detected_at, created_by)
    SELECT i.company_id, i.id, i.branch_id, 'pending', now(), public.incentive_actor(v_company_id)
    FROM public.invoices i
    WHERE i.company_id = v_company_id
      AND i.type = 'sale'
      AND i.status NOT IN ('cancelled', 'void')
      AND i.created_at >= now() - interval '30 days'
      AND NOT EXISTS (SELECT 1 FROM public.incentive_engineer_links l WHERE l.invoice_id = i.id AND l.status = 'assigned')
      AND NOT EXISTS (SELECT 1 FROM public.incentive_pending_invoices p WHERE p.invoice_id = i.id AND p.status IN ('pending', 'assigned'));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    IF v_count > 0 THEN
      PERFORM public.incentive_log_audit(v_company_id, 'CREATE', 'incentive_pending_invoices_batch', NULL, jsonb_build_object('detected', v_count, 'source', 'system_scheduler'));
    END IF;
  END LOOP;
  RETURN v_total;
END;
$function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobid = 8) THEN
    PERFORM cron.alter_job(job_id := 8::bigint, schedule := '30 2 * * *'::text);
  END IF;
END $$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) TO authenticated, anon;
