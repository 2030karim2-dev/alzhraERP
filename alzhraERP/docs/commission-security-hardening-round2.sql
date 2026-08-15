CREATE OR REPLACE FUNCTION public.incentive_create_engineer_link(
  p_invoice_id uuid,
  p_company_id uuid,
  p_user_id uuid,
  p_allocation_pct numeric,
  p_assignment_type text DEFAULT 'direct',
  p_reason text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
  v_total numeric;
  v_period_id uuid;
BEGIN
  IF NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_invoice_id::text, 0));

  IF p_allocation_pct IS NULL OR p_allocation_pct <= 0 OR p_allocation_pct > 100 THEN
    RAISE EXCEPTION 'invalid_allocation_pct';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = p_invoice_id
      AND i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.company_id = p_company_id
      AND ucr.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'engineer_not_in_company';
  END IF;

  SELECT p2.id INTO v_period_id
  FROM incentive_periods p2
  WHERE p2.company_id = p_company_id
    AND p2.period_start <= (SELECT issue_date FROM invoices WHERE id = p_invoice_id)
    AND p2.period_end >= (SELECT issue_date FROM invoices WHERE id = p_invoice_id)
    AND p2.state IN ('open','locked')
  ORDER BY p2.period_start DESC
  LIMIT 1;

  IF v_period_id IS NULL THEN
    SELECT p3.id INTO v_period_id
    FROM incentive_periods p3
    WHERE p3.company_id = p_company_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM incentive_assert_period_allows(v_period_id, 'assign');

  SELECT COALESCE(SUM(allocation_pct), 0) INTO v_total
  FROM incentive_engineer_links
  WHERE invoice_id = p_invoice_id
    AND company_id = p_company_id
    AND status IN ('assigned','approved');

  IF v_total + p_allocation_pct > 100 THEN
    RAISE EXCEPTION 'allocation_overflow: adding % would exceed 100 percent, current sum %', p_allocation_pct, v_total
      USING DETAIL = format('current=%s adding=%s', v_total, p_allocation_pct);
  END IF;

  INSERT INTO incentive_engineer_links
    (invoice_id, company_id, user_id, allocation_pct, assignment_type, reason, source, assigned_by)
  VALUES
    (p_invoice_id, p_company_id, p_user_id, p_allocation_pct, p_assignment_type, p_reason, p_source, incentive_actor(p_company_id))
  RETURNING id INTO v_id;

  IF p_source = 'historical' OR COALESCE(p_reason, '') ILIKE '%historical%' THEN
    PERFORM incentive_log_audit(
      p_company_id,
      'HISTORICAL_ASSIGNMENT',
      'incentive_engineer_links',
      v_id,
      jsonb_build_object(
        'invoice_id', p_invoice_id,
        'user_id', p_user_id,
        'allocation_pct', p_allocation_pct,
        'reason', p_reason
      )
    );
  END IF;

  PERFORM incentive_check_allocation_complete(p_invoice_id);
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.incentive_period_transition(
  p_period_id uuid,
  p_company_id uuid,
  p_new_state text,
  p_by_permission text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_required_permission text;
BEGIN
  v_required_permission := CASE p_new_state
    WHEN 'calculating' THEN 'incentive:period_calculating'
    WHEN 'calculated' THEN 'incentive:period_calculated'
    WHEN 'under_review' THEN 'incentive:period_under_review'
    WHEN 'approved' THEN 'incentive:period_approved'
    WHEN 'locked' THEN 'incentive:period_locked'
    WHEN 'paid' THEN 'incentive:period_paid'
    ELSE NULL
  END;

  IF v_required_permission IS NULL THEN
    RAISE EXCEPTION 'invalid_period_state';
  END IF;

  IF NOT user_is_admin_or_manager() AND NOT has_permission(v_required_permission) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  PERFORM incentive_assert_period_allows(p_period_id, p_new_state);

  UPDATE incentive_periods
  SET state = p_new_state,
      updated_at = now(),
      calculated_at = CASE WHEN p_new_state = 'calculated' THEN now() ELSE calculated_at END,
      approved_at = CASE WHEN p_new_state = 'approved' THEN now() ELSE approved_at END,
      locked_at = CASE WHEN p_new_state = 'locked' THEN now() ELSE locked_at END,
      paid_at = CASE WHEN p_new_state = 'paid' THEN now() ELSE paid_at END
  WHERE id = p_period_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM incentive_log_audit(
    p_company_id,
    'UPDATE',
    'incentive_period',
    p_period_id,
    jsonb_build_object('new_state', p_new_state, 'required_permission', v_required_permission)
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.incentive_check_allocation_complete(p_invoice_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sum numeric;
  v_company_id uuid;
BEGIN
  SELECT i.company_id INTO v_company_id
  FROM invoices i
  WHERE i.id = p_invoice_id;

  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(SUM(l.allocation_pct), 0) INTO v_sum
  FROM incentive_engineer_links l
  WHERE l.invoice_id = p_invoice_id
    AND l.company_id = v_company_id
    AND l.status IN ('assigned', 'approved');

  RETURN v_sum = 100.0;
END;
$function$;


-- Restrictive tenant guards: existing permissive role policies remain, but every row must belong to the active company.
DO $policy$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incentive_adjustments' AND policyname = 'adjustments_tenant_restrictive') THEN
    CREATE POLICY adjustments_tenant_restrictive ON public.incentive_adjustments AS RESTRICTIVE FOR ALL TO public
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incentive_calculation_lines' AND policyname = 'lines_tenant_restrictive') THEN
    CREATE POLICY lines_tenant_restrictive ON public.incentive_calculation_lines AS RESTRICTIVE FOR ALL TO public
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incentive_calculations' AND policyname = 'calculations_tenant_restrictive') THEN
    CREATE POLICY calculations_tenant_restrictive ON public.incentive_calculations AS RESTRICTIVE FOR ALL TO public
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incentive_payments' AND policyname = 'payments_tenant_restrictive') THEN
    CREATE POLICY payments_tenant_restrictive ON public.incentive_payments AS RESTRICTIVE FOR ALL TO public
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incentive_targets' AND policyname = 'targets_tenant_restrictive') THEN
    CREATE POLICY targets_tenant_restrictive ON public.incentive_targets AS RESTRICTIVE FOR ALL TO public
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END;
$policy$;
