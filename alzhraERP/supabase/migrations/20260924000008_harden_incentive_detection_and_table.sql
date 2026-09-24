-- Migration: 20260924000008_harden_incentive_detection_and_table.sql
-- Description: Restricts incentive_detect_pending_invoices_system to only scan companies
--              that have at least one active incentive plan. This prevents runaway generation
--              of tens of thousands of phantom rows for retail invoices across companies
--              that do not utilize engineer incentives.

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
  -- Only scan companies that actually have an active incentive plan
  FOR v_company_id IN 
    SELECT DISTINCT p.company_id 
    FROM public.incentive_plans p
    JOIN public.companies c ON c.id = p.company_id
    WHERE c.is_active = true 
      AND p.status = 'active' 
      AND p.deleted_at IS NULL
    ORDER BY p.company_id 
  LOOP
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
