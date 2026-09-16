-- Migration to patch SECURITY DEFINER RPCs with verify_company_access

CREATE OR REPLACE FUNCTION public.incentive_apply_adjustment(p_company_id uuid, p_calculation_id uuid, p_adjustment_type text, p_amount numeric, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('commission:review') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_adjustments
    (calculation_id, company_id, adjustment_type, amount, reason, created_by)
  VALUES (p_calculation_id, p_company_id, p_adjustment_type, p_amount, p_reason, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'ADJUSTMENT', 'incentive_adjustment', v_id, jsonb_build_object('type', p_adjustment_type, 'amount', p_amount, 'reason', p_reason));
  RETURN v_id;
END;
$function$

-- ===== incentive_approve_invoice_allocation =====


CREATE OR REPLACE FUNCTION public.incentive_approve_invoice_allocation(p_invoice_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_complete boolean;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_pending') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM incentive_engineer_links
                 WHERE invoice_id = p_invoice_id AND company_id = p_company_id AND status = 'assigned') THEN
    RAISE EXCEPTION 'no_active_assignments';
  END IF;

  SELECT incentive_check_allocation_complete(p_invoice_id) INTO v_complete;
  IF NOT v_complete THEN
    RAISE EXCEPTION 'allocation_not_100: invoice % allocation sum is not 100%% — full rollback, no partial state', p_invoice_id;
  END IF;

  UPDATE incentive_engineer_links
     SET allocation_status = 'assigned', updated_at = now()
   WHERE invoice_id = p_invoice_id AND status = 'assigned';

  UPDATE incentive_pending_invoices
     SET status = 'assigned', resolved_at = now(), resolved_by = incentive_actor(p_company_id)
   WHERE invoice_id = p_invoice_id AND status IN ('pending','assigned') AND company_id = p_company_id;

  PERFORM incentive_log_audit(p_company_id, 'APPROVE', 'invoice_allocation', p_invoice_id, jsonb_build_object('company_id', p_company_id));
END;
$function$

-- ===== incentive_assert_period_allows =====


CREATE OR REPLACE FUNCTION public.incentive_calculate_period(p_company_id uuid, p_period_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period record;
  v_actor uuid;
  v_count integer := 0;
  v_user record;
  v_invoice record;
  v_rule record;
  v_tier record;
  v_calc_id uuid;
  v_gross_sales numeric(16,2);
  v_net_sales numeric(16,2);
  v_gross_profit numeric(16,2);
  v_collected numeric(16,2);
  v_invoice_count integer;
  v_customer_count integer;
  v_target_value numeric(14,2);
  v_target_pct numeric(7,2);
  v_base numeric(16,2);
  v_rule_amount numeric(16,2);
  v_base_commission numeric(16,2);
  v_bonus numeric(16,2);
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT (user_is_admin_or_manager() OR has_permission('commission:calculate')) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO v_period
  FROM incentive_periods
  WHERE id = p_period_id AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM incentive_assert_period_allows(p_period_id, 'calculate');
  v_actor := incentive_actor(p_company_id);

  IF EXISTS (
    SELECT 1 FROM incentive_calculations
    WHERE company_id = p_company_id
      AND period_id = p_period_id
      AND status IN ('approved','partially_paid','paid','cancelled','reversed')
  ) THEN
    RAISE EXCEPTION 'period_has_immutable_calculations';
  END IF;

  UPDATE incentive_periods
     SET state = 'calculating', updated_at = now()
   WHERE id = p_period_id AND company_id = p_company_id;

  DELETE FROM incentive_calculations
   WHERE company_id = p_company_id
     AND period_id = p_period_id
     AND status IN ('draft','calculated','eligible');

  FOR v_user IN
    SELECT DISTINCT a.user_id, a.plan_id
    FROM incentive_assignments a
    JOIN incentive_plans p ON p.id = a.plan_id
      AND p.company_id = p_company_id
      AND p.status = 'active'
      AND p.deleted_at IS NULL
    WHERE a.company_id = p_company_id
      AND a.status = 'active'
      AND a.effective_from <= v_period.period_end
      AND (a.effective_to IS NULL OR a.effective_to >= v_period.period_start)
  LOOP
    SELECT
      COALESCE(SUM(COALESCE(i.subtotal, i.total_amount, 0) * l.allocation_pct / 100), 0),
      COALESCE(SUM(COALESCE(i.total_amount, 0) * l.allocation_pct / 100), 0),
      COALESCE(SUM(COALESCE(ii_metrics.gross_profit, 0) * l.allocation_pct / 100), 0),
      COALESCE(SUM(COALESCE(i.paid_amount, 0) * l.allocation_pct / 100), 0),
      COUNT(DISTINCT i.id),
      COUNT(DISTINCT i.party_id)
    INTO v_gross_sales, v_net_sales, v_gross_profit, v_collected,
         v_invoice_count, v_customer_count
    FROM incentive_engineer_links l
    JOIN invoices i ON i.id = l.invoice_id
      AND i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.status NOT IN ('cancelled','void')
      AND i.deleted_at IS NULL
      AND i.issue_date BETWEEN v_period.period_start AND v_period.period_end
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(COALESCE(ii.total, 0) - COALESCE(ii.cost_price, 0) * COALESCE(ii.quantity, 0)), 0) AS gross_profit
      FROM invoice_items ii
      WHERE ii.invoice_id = i.id AND ii.company_id = p_company_id
    ) ii_metrics ON true
    WHERE l.company_id = p_company_id
      AND l.user_id = v_user.user_id
      AND l.status = 'assigned'
      AND l.allocation_status = 'assigned';

    IF v_invoice_count = 0 THEN
      CONTINUE;
    END IF;

    SELECT t.target_value
      INTO v_target_value
    FROM incentive_targets t
    WHERE t.company_id = p_company_id
      AND t.target_scope = 'employee'
      AND t.user_id = v_user.user_id
      AND t.status = 'active'
      AND t.period_start <= v_period.period_end
      AND t.period_end >= v_period.period_start
    ORDER BY t.period_start DESC
    LIMIT 1;

    v_target_pct := CASE
      WHEN COALESCE(v_target_value, 0) > 0 THEN ROUND((v_net_sales / v_target_value) * 100, 2)
      ELSE NULL
    END;
    v_base_commission := 0;
    v_bonus := 0;

    INSERT INTO incentive_calculations (
      company_id, period_id, plan_id, user_id,
      gross_sales, net_sales, gross_profit, collected_amount,
      invoice_count, customer_count, target_value, target_achievement_pct,
      base_commission, bonus_amount, adjustment_amount, deduction_amount,
      total_commission, currency_code, status, calculated_at, calculated_by
    )
    SELECT p_company_id, p_period_id, v_user.plan_id, v_user.user_id,
      v_gross_sales, v_net_sales, v_gross_profit, v_collected,
      v_invoice_count, v_customer_count, v_target_value, v_target_pct,
      0, 0, 0, 0, 0, p.currency_code, 'calculated', now(), v_actor
    FROM incentive_plans p
    WHERE p.id = v_user.plan_id
    RETURNING id INTO v_calc_id;

    FOR v_rule IN
      SELECT * FROM incentive_rules
      WHERE company_id = p_company_id
        AND plan_id = v_user.plan_id
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY priority, created_at, id
    LOOP
      v_base := CASE v_rule.rule_type
        WHEN 'sales' THEN v_gross_sales
        WHEN 'profit' THEN v_gross_profit
        WHEN 'collection' THEN v_collected
        WHEN 'invoice_count' THEN v_invoice_count
        WHEN 'customer_count' THEN v_customer_count
        WHEN 'target_achievement' THEN COALESCE(v_target_pct, 0)
        ELSE v_net_sales
      END;
      v_rule_amount := 0;

      IF v_rule.calculation_method = 'percentage' THEN
        v_rule_amount := ROUND(v_base * COALESCE(v_rule.rate, 0) / 100, 2);
      ELSIF v_rule.calculation_method = 'fixed_amount' THEN
        v_rule_amount := COALESCE(v_rule.fixed_amount, 0);
      ELSE
        SELECT * INTO v_tier
        FROM incentive_tiers
        WHERE company_id = p_company_id
          AND plan_id = v_user.plan_id
          AND (rule_id = v_rule.id OR rule_id IS NULL)
          AND v_base >= from_amount
          AND (to_amount IS NULL OR v_base <= to_amount)
        ORDER BY tier_order DESC
        LIMIT 1;
        IF FOUND THEN
          v_rule_amount := COALESCE(ROUND(v_base * v_tier.rate / 100, 2), v_tier.fixed_bonus, 0);
        END IF;
      END IF;

      IF v_rule_amount <> 0 THEN
        IF v_rule.rule_type = 'target_achievement' OR v_rule.calculation_method = 'tiered' THEN
          v_bonus := v_bonus + v_rule_amount;
        ELSE
          v_base_commission := v_base_commission + v_rule_amount;
        END IF;
        INSERT INTO incentive_calculation_lines (
          calculation_id, company_id, source_type, source_id, rule_id,
          tier_id, description, base_amount, rate, calculated_amount, currency_code
        )
        SELECT v_calc_id, p_company_id,
          CASE WHEN v_rule.rule_type = 'target_achievement' THEN 'target_bonus' ELSE 'invoice_sale' END,
          NULL, v_rule.id, v_tier.id, v_rule.name, v_base, v_rule.rate,
          v_rule_amount, p.currency_code
        FROM incentive_plans p
        WHERE p.id = v_user.plan_id;
      END IF;
    END LOOP;

    UPDATE incentive_calculations
       SET base_commission = v_base_commission,
           bonus_amount = v_bonus,
           total_commission = v_base_commission + v_bonus,
           updated_at = now()
     WHERE id = v_calc_id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE incentive_periods
     SET state = 'calculated', calculated_at = now(), updated_at = now()
   WHERE id = p_period_id AND company_id = p_company_id;

  PERFORM incentive_log_audit(
    p_company_id,
    'CALCULATE',
    'incentive_period',
    p_period_id,
    jsonb_build_object('calculation_count', v_count, 'period_state', 'calculated')
  );

  RETURN v_count;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE incentive_periods
       SET state = 'open', updated_at = now()
     WHERE id = p_period_id AND company_id = p_company_id AND state = 'calculating';
    RAISE;
END;
$function$

-- ===== incentive_check_allocation_complete =====


CREATE OR REPLACE FUNCTION public.incentive_create_assignment(p_company_id uuid, p_user_id uuid, p_plan_id uuid, p_effective_from date, p_branch_id uuid DEFAULT NULL::uuid, p_effective_to date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_assignments') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF EXISTS (
    SELECT 1 FROM incentive_assignments
     WHERE company_id = p_company_id AND user_id = p_user_id AND status = 'active'
       AND (effective_to IS NULL OR effective_to >= p_effective_from)
       AND p_effective_from <= COALESCE(effective_to, 'infinity'::date)
  ) THEN
    RAISE EXCEPTION 'assignment_overlap: user already has an active plan for this date range';
  END IF;
  INSERT INTO incentive_assignments
    (company_id, user_id, plan_id, branch_id, effective_from, effective_to, created_by)
  VALUES (p_company_id, p_user_id, p_plan_id, p_branch_id, p_effective_from, p_effective_to, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_assignment', v_id, jsonb_build_object('user_id', p_user_id, 'plan_id', p_plan_id));
  RETURN v_id;
END;
$function$

-- ===== incentive_create_engineer_link =====


CREATE OR REPLACE FUNCTION public.incentive_create_engineer_link(p_invoice_id uuid, p_company_id uuid, p_user_id uuid, p_allocation_pct numeric, p_assignment_type text DEFAULT 'direct'::text, p_reason text DEFAULT NULL::text, p_source text DEFAULT NULL::text)
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
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== incentive_create_plan =====


CREATE OR REPLACE FUNCTION public.incentive_create_plan(p_company_id uuid, p_name text, p_calculation_basis text, p_currency_code text, p_description text DEFAULT NULL::text, p_collection_mode text DEFAULT 'on_collected_only'::text, p_tier_method text DEFAULT 'flat'::text, p_tier_currency_code text DEFAULT NULL::text, p_effective_from date DEFAULT NULL::date, p_effective_to date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_plans') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_plans
    (company_id, name, description, calculation_basis, currency_code, collection_mode, tier_method, tier_currency_code, effective_from, effective_to, created_by)
  VALUES (p_company_id, p_name, p_description, p_calculation_basis, p_currency_code, p_collection_mode, p_tier_method, p_tier_currency_code, p_effective_from, p_effective_to, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_plan', v_id, jsonb_build_object('name', p_name, 'basis', p_calculation_basis));
  RETURN v_id;
END;
$function$

-- ===== incentive_create_rule =====


CREATE OR REPLACE FUNCTION public.incentive_create_rule(p_company_id uuid, p_plan_id uuid, p_name text, p_rule_type text, p_calculation_method text, p_threshold_min numeric DEFAULT NULL::numeric, p_threshold_max numeric DEFAULT NULL::numeric, p_rate numeric DEFAULT NULL::numeric, p_fixed_amount numeric DEFAULT NULL::numeric, p_priority integer DEFAULT 0, p_conditions jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_plans') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_rules
    (company_id, plan_id, name, rule_type, calculation_method, threshold_min, threshold_max, rate, fixed_amount, priority, conditions, created_by)
  VALUES (p_company_id, p_plan_id, p_name, p_rule_type, p_calculation_method, p_threshold_min, p_threshold_max, p_rate, p_fixed_amount, p_priority, p_conditions, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_rule', v_id, jsonb_build_object('plan_id', p_plan_id, 'type', p_rule_type, 'method', p_calculation_method));
  RETURN v_id;
END;
$function$

-- ===== incentive_create_target =====


CREATE OR REPLACE FUNCTION public.incentive_create_target(p_company_id uuid, p_target_scope text, p_target_owner_type text, p_target_owner_id uuid, p_target_type text, p_period_start date, p_period_end date, p_target_value numeric, p_currency_code text, p_user_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid, p_period_type text DEFAULT 'monthly'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_targets') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_targets
    (company_id, target_scope, target_owner_type, target_owner_id, user_id, branch_id, target_type, period_type, period_start, period_end, target_value, currency_code, created_by)
  VALUES (p_company_id, p_target_scope, p_target_owner_type, p_target_owner_id, p_user_id, p_branch_id, p_target_type, p_period_type, p_period_start, p_period_end, p_target_value, p_currency_code, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_target', v_id, jsonb_build_object('scope', p_target_scope, 'type', p_target_type, 'value', p_target_value));
  RETURN v_id;
END;
$function$

-- ===== incentive_deactivate_assignment =====


CREATE OR REPLACE FUNCTION public.incentive_deactivate_assignment(p_assignment_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_assignments') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  UPDATE incentive_assignments SET status = 'inactive', updated_by = incentive_actor(p_company_id)
   WHERE id = p_assignment_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_assignment', p_assignment_id, jsonb_build_object('status', 'inactive'));
END;
$function$

-- ===== incentive_deactivate_target =====


CREATE OR REPLACE FUNCTION public.incentive_deactivate_target(p_target_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_targets') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  UPDATE incentive_targets SET status = 'inactive', updated_by = incentive_actor(p_company_id)
   WHERE id = p_target_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_target', p_target_id, jsonb_build_object('status', 'inactive'));
END;
$function$

-- ===== incentive_detect_pending_invoices =====


CREATE OR REPLACE FUNCTION public.incentive_detect_pending_invoices(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_count integer;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_pending') AND NOT has_permission('incentive:manage_pending_branch') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_pending_invoices
     (company_id, invoice_id, branch_id, status, detected_at, created_by)
  SELECT i.company_id, i.id, i.branch_id, 'pending', now(), incentive_actor(p_company_id)
    FROM invoices i
   WHERE i.company_id = p_company_id
     AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
     AND i.type = 'sale'
     AND i.status NOT IN ('cancelled','void')
     AND NOT EXISTS (SELECT 1 FROM incentive_engineer_links l
                     WHERE l.invoice_id = i.id AND l.status = 'assigned')
     AND NOT EXISTS (SELECT 1 FROM incentive_pending_invoices p
                     WHERE p.invoice_id = i.id AND p.status IN ('pending','assigned'));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_pending_invoices_batch', NULL, jsonb_build_object('detected', v_count));
  END IF;
  RETURN v_count;
END;
$function$

-- ===== incentive_detect_pending_invoices_system =====


CREATE OR REPLACE FUNCTION public.incentive_log_audit(p_company_id uuid, p_action text, p_entity text, p_entity_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
INSERT INTO audit_logs (company_id, user_id, action, entity, entity_id, details)
  VALUES (p_company_id, incentive_actor(p_company_id), p_action, p_entity, p_entity_id, p_details);
END;
$function$

-- ===== incentive_mark_pending_resolved =====


CREATE OR REPLACE FUNCTION public.incentive_mark_pending_resolved(p_pending_id uuid, p_company_id uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_pending') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF p_status NOT IN ('resolved','ignored') THEN RAISE EXCEPTION 'invalid_resolution_status'; END IF;
  UPDATE incentive_pending_invoices
     SET status = p_status, resolved_at = now(), resolved_by = incentive_actor(p_company_id), reason = p_reason
   WHERE id = p_pending_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pending_record_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_pending_invoices', p_pending_id, jsonb_build_object('new_status', p_status, 'reason', p_reason));
END;
$function$

-- ===== incentive_open_period =====


CREATE OR REPLACE FUNCTION public.incentive_open_period(p_company_id uuid, p_period_label text, p_period_start date, p_period_end date, p_currency_code text, p_branch_id uuid DEFAULT NULL::uuid, p_is_test_period boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_periods') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_periods
    (company_id, branch_id, period_label, period_start, period_end, is_test_period, currency_code, created_by)
  VALUES (p_company_id, p_branch_id, p_period_label, p_period_start, p_period_end, p_is_test_period, p_currency_code, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_period', v_id, jsonb_build_object('label', p_period_label, 'test', p_is_test_period));
  RETURN v_id;
END;
$function$

-- ===== incentive_period_transition =====


CREATE OR REPLACE FUNCTION public.incentive_period_transition(p_period_id uuid, p_company_id uuid, p_new_state text, p_by_permission text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_required_permission text;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== incentive_record_payment =====


CREATE OR REPLACE FUNCTION public.incentive_record_payment(p_company_id uuid, p_calculation_id uuid, p_user_id uuid, p_amount numeric, p_payment_date date, p_payment_method text, p_currency_code text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid; v_period_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('commission:pay') AND NOT has_permission('commission:record_payment') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT period_id INTO v_period_id FROM incentive_calculations WHERE id = p_calculation_id;
  PERFORM incentive_assert_period_allows(v_period_id, 'pay');
  INSERT INTO incentive_payments
    (calculation_id, company_id, user_id, amount, payment_date, payment_method, reference, notes, currency_code, created_by)
  VALUES (p_calculation_id, p_company_id, p_user_id, p_amount, p_payment_date, p_payment_method, p_reference, p_notes, p_currency_code, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'PAYMENT', 'incentive_payment', v_id, jsonb_build_object('amount', p_amount, 'calculation_id', p_calculation_id));
  RETURN v_id;
END;
$function$

-- ===== incentive_revoke_engineer_link =====


CREATE OR REPLACE FUNCTION public.incentive_revoke_engineer_link(p_link_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_pending') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  UPDATE incentive_engineer_links SET status = 'revoked', allocation_status = 'revoked'
  WHERE id = p_link_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'link_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_engineer_link', p_link_id, jsonb_build_object('status', 'revoked'));
END;
$function$

-- ===== incentive_update_plan =====


CREATE OR REPLACE FUNCTION public.incentive_update_plan(p_plan_id uuid, p_company_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_calculation_basis text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_effective_to date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_old jsonb;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('incentive:manage_plans') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT jsonb_build_object('name', name, 'basis', calculation_basis, 'status', status) INTO v_old
    FROM incentive_plans WHERE id = p_plan_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  UPDATE incentive_plans SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    calculation_basis = COALESCE(p_calculation_basis, calculation_basis),
    status = COALESCE(p_status, status),
    effective_to = COALESCE(p_effective_to, effective_to),
    updated_by = incentive_actor(p_company_id)
  WHERE id = p_plan_id AND company_id = p_company_id;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_plan', p_plan_id, v_old);
END;
$function$

-- ===== incentive_void_calculation =====


CREATE OR REPLACE FUNCTION public.incentive_void_calculation(p_calculation_id uuid, p_company_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_period_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT has_permission('commission:review') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT period_id INTO v_period_id FROM incentive_calculations WHERE id = p_calculation_id AND company_id = p_company_id;
  PERFORM incentive_assert_period_allows(v_period_id, 'review');
  UPDATE incentive_calculations SET status = 'cancelled', collection_note = p_reason
   WHERE id = p_calculation_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'calculation_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'VOID', 'incentive_calculation', p_calculation_id, jsonb_build_object('reason', p_reason));
END;
$function$

-- ===== is_super_admin =====


CREATE OR REPLACE FUNCTION public.post_manual_journal(p_company_id uuid, p_user_id uuid, p_date date, p_description text, p_lines jsonb, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_reference_type text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
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
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية ترحيل القيود المحاسبية لهذه الشركة';
  END IF;

  -- R3: a non-positive exchange rate would silently zero out the whole entry.
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

  -- R2a: reject an empty payload before jsonb_to_recordset returns nothing.
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'لا يمكن ترحيل قيد بدون أسطر';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(debit numeric, credit numeric)
  LOOP
    v_total_debit  := v_total_debit  + ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_total_credit := v_total_credit + ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
  END LOOP;

  -- R2b: reject all-zero journals (the debit side must carry real value).
  IF v_total_debit <= 0 THEN
    RAISE EXCEPTION 'لا يمكن ترحيل قيد بقيمة صفرية: إجمالي المدين = %', v_total_debit;
  END IF;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'القيد غير متوازن: المدين (%) لا يساوي الدائن (%)', v_total_debit, v_total_credit;
  END IF;

  -- R3: attribution comes from the authenticated session when available
  -- (service-role / server contexts fall back to the provided user id).
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
    v_base_debit  := ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_base_credit := ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
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
$function$


-- ===== prc_publish_evaluation_status_changed_event =====


CREATE OR REPLACE FUNCTION public.process_sales_return(p_invoice_id uuid, p_party_id uuid, p_payment_method text, p_items jsonb, p_return_reason text, p_status text, p_notes text, p_issue_date date, p_currency_code text, p_exchange_rate numeric, p_company_id uuid, p_user_id uuid)
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
BEGIN
      PERFORM public.verify_company_access(p_company_id);
-- [FIX أمني حرج] لم تكن الدالة تتحقق أبداً أن p_user_id عضو في p_company_id.
  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = p_user_id AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- ① التحقق من السنة المالية المفتوحة
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- ② توليد رقم الفاتورة
  v_invoice_number := public.get_next_invoice_number(p_company_id, 'RET');

  -- ③ حساب الإجماليات من الأصناف
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x("productId" UUID, quantity NUMERIC, "unitPrice" NUMERIC, "costPrice" NUMERIC)
  LOOP
    v_subtotal   := v_subtotal   + (v_item.quantity * v_item."unitPrice");
    v_cost_total := v_cost_total + (v_item.quantity * v_item."costPrice");
  END LOOP;

  v_total_amount := v_subtotal;

  -- ④ إنشاء فاتورة المرتجع
  -- [FIX] كان type يُسجَّل كـ 'return_sale' وهي قيمة غير موجودة أبداً في invoices_type_check
  -- (التي تسمح فقط بـ 'sale_return')، مما كان يجعل الدالة تفشل بالكامل لأي استدعاء.
  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', p_status, p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    p_currency_code, p_exchange_rate, p_invoice_id,
    p_return_reason, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

  -- ⑤ إضافة أصناف الفاتورة
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, total, cost_price, tax_amount, company_id
  )
  SELECT
    v_return_invoice_id,
    (item->>'productId')::UUID,
    (item->>'name'),
    (item->>'quantity')::NUMERIC,
    (item->>'unitPrice')::NUMERIC,
    (item->>'quantity')::NUMERIC * (item->>'unitPrice')::NUMERIC,
    COALESCE((item->>'costPrice')::NUMERIC, 0),
    0,
    p_company_id
  FROM jsonb_array_elements(p_items) AS item;

  -- ⑥ تحريك المخزون وإنشاء القيود المحاسبية عند الترحيل
  IF p_status = 'posted' THEN

    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND is_primary = true
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id
      FROM public.warehouses
      WHERE company_id = p_company_id
      LIMIT 1;
    END IF;

    IF v_warehouse_id IS NOT NULL THEN
      FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items)
          AS x("productId" UUID, quantity NUMERIC, "costPrice" NUMERIC)
      LOOP
        IF v_item."productId" IS NOT NULL THEN
          -- [FIX] إضافة unit_cost (نفس مشكلة process_stock_transfer):
          -- trg_require_inventory_cost يفرض NOT NULL على كل حركة مخزون.
          INSERT INTO public.inventory_transactions (
            company_id, product_id, warehouse_id, quantity, unit_cost,
            transaction_type, reference_type, reference_id, created_by
          ) VALUES (
            p_company_id, v_item."productId", v_warehouse_id, v_item.quantity,
            COALESCE(v_item."costPrice", 0),
            'sales_return', 'invoice', v_return_invoice_id, p_user_id
          );
        END IF;
      END LOOP;
    END IF;

    SELECT id INTO v_account_revenue     FROM public.accounts WHERE company_id = p_company_id AND code = '4100' LIMIT 1;
    SELECT id INTO v_account_receivable  FROM public.accounts WHERE company_id = p_company_id AND code = '1100' LIMIT 1;
    SELECT id INTO v_account_cash        FROM public.accounts WHERE company_id = p_company_id AND code = '1010' LIMIT 1;
    SELECT id INTO v_account_inventory   FROM public.accounts WHERE company_id = p_company_id AND code = '1200' LIMIT 1;
    SELECT id INTO v_account_cogs        FROM public.accounts WHERE company_id = p_company_id AND code = '5100' LIMIT 1;

    INSERT INTO public.journal_entries (
      company_id, entry_date, description, status,
      reference_type, reference_id, created_by
    ) VALUES (
      p_company_id, p_issue_date,
      'مرتجع مبيعات - ' || v_invoice_number,
      'posted', 'invoice', v_return_invoice_id, p_user_id
    ) RETURNING id INTO v_journal_id;

    IF v_account_revenue IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_account_revenue,
        ROUND(v_subtotal * p_exchange_rate, 4), 0,
        'عكس إيراد - مرتجع مبيعات',
        p_currency_code, p_exchange_rate, v_subtotal, p_company_id
      );
    END IF;

    v_credit_account := CASE
      WHEN p_payment_method = 'cash' THEN v_account_cash
      ELSE v_account_receivable
    END;

    IF v_credit_account IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_credit_account, p_party_id,
        0, ROUND(v_total_amount * p_exchange_rate, 4),
        CASE WHEN p_payment_method = 'cash'
             THEN 'رد نقدية للعميل'
             ELSE 'عكس مديونية العميل'
        END,
        p_currency_code, p_exchange_rate, v_total_amount, p_company_id
      );
    END IF;

    IF v_cost_total > 0
       AND v_account_inventory IS NOT NULL
       AND v_account_cogs IS NOT NULL
    THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES
      (
        v_journal_id, v_account_inventory,
        ROUND(v_cost_total * p_exchange_rate, 4), 0,
        'إرجاع بضاعة للمخزن',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      ),
      (
        v_journal_id, v_account_cogs,
        0, ROUND(v_cost_total * p_exchange_rate, 4),
        'عكس تكلفة البضاعة المباعة',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      );
    END IF;

  END IF;

  RETURN jsonb_build_object(
    'id',             v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'status',         'success'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$function$

-- ===== process_stock_transfer =====


CREATE OR REPLACE FUNCTION public.record_debt_reminder(p_company_id uuid, p_party_id uuid, p_message_text text, p_channel character varying DEFAULT 'whatsapp'::character varying, p_template_id uuid DEFAULT NULL::uuid, p_recipient character varying DEFAULT NULL::character varying, p_related_entity_type character varying DEFAULT NULL::character varying, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(message_log_id uuid, activity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_msg_id UUID;
DECLARE v_act_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Tenant guard: party must belong to this company
    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    INSERT INTO public.debt_message_log (
        company_id, party_id, channel, template_id, message_text,
        status, recipient, related_entity_type, related_entity_id, created_by, sent_at
    ) VALUES (
        p_company_id, p_party_id, p_channel, p_template_id, p_message_text,
        'sent', p_recipient, p_related_entity_type, p_related_entity_id, auth.uid(), NOW()
    )
    RETURNING id INTO v_msg_id;

    INSERT INTO public.customer_activities (
        company_id, customer_id, activity_type, subject, description,
        status, priority, scheduled_at, completed_at, created_by
    ) VALUES (
        p_company_id, p_party_id, 'follow_up', 'تذكير دين', p_message_text,
        'completed', 'medium', NOW(), NOW(), auth.uid()
    )
    RETURNING id INTO v_act_id;

    RETURN QUERY SELECT v_msg_id, v_act_id;
END;
$function$

-- ===== report_balance_sheet =====


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
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== report_cash_flow =====


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
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== report_debt_aging =====


CREATE OR REPLACE FUNCTION public.report_debt_aging(p_company_id uuid)
 RETURNS TABLE(customer_name text, total numeric, days_0_30 numeric, days_31_60 numeric, days_61_90 numeric, days_90_plus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== report_debts =====


CREATE OR REPLACE FUNCTION public.report_debts(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_debts json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH party_balances AS (
    SELECT 
      p.id,
      p.name,
      p.type,
      SUM(CASE 
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount)
        ELSE 0 
      END) as remaining_amount
    FROM parties p
    JOIN invoices i ON p.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.status IN ('confirmed','posted','partially_paid')
      AND i.deleted_at IS NULL
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.type
    HAVING ABS(SUM(
      CASE 
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount)
        ELSE 0 
      END
    )) > 0.01
  )
  SELECT 
    COALESCE(SUM(remaining_amount) FILTER (WHERE type IN ('customer', 'both') AND remaining_amount > 0), 0),
    COALESCE(SUM(ABS(remaining_amount)) FILTER (WHERE type IN ('supplier', 'both') AND remaining_amount < 0), 0),
    COALESCE(json_agg(row_to_json(pb)), '[]'::json)
  INTO v_receivables, v_payables, v_debts
  FROM party_balances pb;

  RETURN json_build_object(
    'summary', json_build_object(
      'receivables', v_receivables,
      'payables', v_payables
    ),
    'debts', v_debts
  );
END;
$function$

-- ===== report_profit_loss =====


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
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== report_trial_balance =====


CREATE OR REPLACE FUNCTION public.report_trial_balance(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_code text, account_id uuid, account_name text, account_type text, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== resolve_vehicle_from_vin =====


CREATE OR REPLACE FUNCTION public.search_by_oem(p_company_id uuid, p_search_term text, p_limit integer DEFAULT 20)
 RETURNS TABLE(product_id uuid, product_name text, product_name_ar text, product_sku text, match_quality text, source_number text, target_number text, brand text, stock_quantity numeric, sale_price numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term TEXT;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
v_term := TRIM(p_search_term);

    IF v_term = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    -- 1. Direct match on part_number
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'exact'::TEXT,
        v_term,
        p.part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND (p.part_number ILIKE '%' || v_term || '%'
        OR p.sku ILIKE '%' || v_term || '%'
        OR p.barcode = v_term)
    GROUP BY p.id

    UNION ALL

    -- 2. Cross-reference matches
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        pcr.match_quality::TEXT,
        v_term,
        p.part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM product_cross_references pcr
    JOIN products p ON p.id = pcr.base_product_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE pcr.company_id = p_company_id
      AND p.status = 'active'
      AND EXISTS (
          SELECT 1 FROM products alt
          WHERE alt.id = pcr.alternative_product_id
            AND (alt.part_number ILIKE '%' || v_term || '%'
              OR alt.sku ILIKE '%' || v_term || '%'
              OR alt.barcode = v_term)
      )
    GROUP BY p.id, pcr.match_quality

    UNION ALL

    -- 3. Alternative numbers match
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'partial'::TEXT,
        v_term,
        p.alternative_numbers,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND p.alternative_numbers ILIKE '%' || v_term || '%'
    GROUP BY p.id

    -- 4. Supplier part number match
    UNION ALL
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'partial'::TEXT,
        v_term,
        sp.supplier_part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM supplier_prices sp
    JOIN products p ON p.id = sp.product_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE sp.company_id = p_company_id
      AND p.status = 'active'
      AND sp.supplier_part_number ILIKE '%' || v_term || '%'
    GROUP BY p.id, sp.supplier_part_number

    ORDER BY match_quality ASC, stock_quantity DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
END;
$function$

-- ===== search_cached_parts =====


CREATE OR REPLACE FUNCTION public.search_inventory(p_term text, p_company_id uuid)
 RETURNS TABLE(id uuid, name_ar text, sku text, part_number text, brand text, sale_price numeric, cost_price numeric, stock_quantity numeric, alternative_numbers text, size text, category_name text, image_url text, location text, barcode text, status text, search_score real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_words text[];
    v_word text;
    v_fragment_condition text := '';
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Handle exact barcode match quickly
    IF EXISTS (SELECT 1 FROM products AS pb WHERE pb.company_id = p_company_id AND pb.barcode = p_term LIMIT 1) THEN
        RETURN QUERY
        SELECT
            p.id, p.name_ar::text, p.sku::text, p.part_number::text, p.brand::text,
            p.sale_price, p.purchase_price AS cost_price, COALESCE(SUM(ps.quantity), 0) AS stock_quantity,
            p.alternative_numbers::text, p.size::text, pc.name::text AS category_name,
            p.image_url::text, p.location::text, p.barcode::text, p.status::text,
            100.0::real AS search_score
        FROM products p
        LEFT JOIN product_stock ps ON ps.product_id = p.id
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.company_id = p_company_id AND p.barcode = p_term AND p.deleted_at IS NULL
        GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.purchase_price, p.alternative_numbers, p.size, pc.name, p.image_url, p.location, p.barcode, p.status;
        RETURN;
    END IF;

    -- Standard Fuzzy & Fragmented Search
    RETURN QUERY
    SELECT
        p.id, p.name_ar::text, p.sku::text, p.part_number::text, p.brand::text,
        p.sale_price, p.purchase_price AS cost_price, COALESCE(SUM(ps.quantity), 0) AS stock_quantity,
        p.alternative_numbers::text, p.size::text, pc.name::text AS category_name,
        p.image_url::text, p.location::text, p.barcode::text, p.status::text,
        (
            -- Boost exact/prefix matches
            CASE 
                WHEN p.sku ILIKE p_term THEN 5.0
                WHEN p.part_number ILIKE p_term THEN 5.0
                WHEN p.name_ar ILIKE p_term || '%' THEN 3.0
                ELSE 0.0
            END
            +
            -- Add similarity score (0.0 to 1.0)
            similarity(p.global_search_text, p_term)
        )::real AS search_score
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      -- Word similarity allows fragmented searches
      -- (Each word in the term should be found somewhere in the global_search_text)
      AND (
          -- If the term is very short, use ILIKE instead of similarity to avoid discarding it
          (length(p_term) < 3 AND p.global_search_text ILIKE '%' || p_term || '%')
          OR
          (p_term <% p.global_search_text) -- word similarity
          OR
          (p.global_search_text % p_term)  -- standard trigram similarity
          OR
          -- Simple fallback for fragmented words
          (p.global_search_text ILIKE '%' || replace(p_term, ' ', '%') || '%')
      )
    GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.purchase_price, p.alternative_numbers, p.size, pc.name, p.image_url, p.location, p.barcode, p.status, p.global_search_text
    ORDER BY search_score DESC
    LIMIT 200;
END;
$function$

-- ===== search_inventory_paginated =====


CREATE OR REPLACE FUNCTION public.search_inventory_paginated(p_company_id uuid, p_term text, p_limit integer, p_offset integer, p_sort_key text, p_sort_dir text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, company_id uuid, name_ar text, sku text, part_number text, brand text, size text, description text, purchase_price numeric, sale_price numeric, min_stock_level numeric, unit text, image_url text, alternative_numbers text, barcode text, updated_at timestamp with time zone, created_at timestamp with time zone, status text, category_id uuid, category jsonb, stock jsonb, total_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_tokens text[]; v_total integer;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  IF p_term IS NULL OR trim(p_term)='' THEN v_tokens := ARRAY[]::text[];
  ELSE v_tokens := regexp_split_to_array(public.normalize_arabic(trim(p_term)), E'\\s+'); END IF;

  SELECT count(*)::integer INTO v_total FROM public.products p
  WHERE p.company_id=p_company_id AND p.status='active'
    AND (p_branch_id IS NULL OR EXISTS (
      SELECT 1 FROM public.product_stock ps2
      JOIN public.warehouses w2 ON w2.id = ps2.warehouse_id
      WHERE ps2.product_id = p.id AND w2.branch_id = p_branch_id
    ))
    AND (v_tokens = ARRAY[]::text[] OR NOT EXISTS (
      SELECT 1 FROM unnest(v_tokens) AS token WHERE NOT (
        public.normalize_arabic(p.name_ar) LIKE concat('%',token,'%') OR public.normalize_arabic(p.sku) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.part_number) LIKE concat('%',token,'%') OR public.normalize_arabic(p.brand) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.description) LIKE concat('%',token,'%') OR public.normalize_arabic(p.size) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.alternative_numbers) LIKE concat('%',token,'%'))));

  RETURN QUERY
  SELECT p.id, p.company_id, p.name_ar, p.sku, p.part_number, p.brand, p.size, p.description,
    p.purchase_price::numeric, p.sale_price::numeric, p.min_stock_level::numeric, p.unit, p.image_url,
    p.alternative_numbers, p.barcode, p.updated_at, p.created_at, p.status, p.category_id,
    CASE WHEN p.category_id IS NOT NULL THEN jsonb_build_object('id', p.category_id, 'name', pc.name) ELSE NULL END,
    COALESCE(jsonb_agg(jsonb_build_object('quantity', ps.quantity, 'warehouse_id', ps.warehouse_id,
        'warehouses', jsonb_build_object('name_ar', w.name_ar))) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb),
    v_total
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id=p.category_id
  LEFT JOIN public.product_stock ps ON ps.product_id=p.id
  LEFT JOIN public.warehouses w ON w.id=ps.warehouse_id
  WHERE p.company_id=p_company_id AND p.status='active'
    AND (p_branch_id IS NULL OR EXISTS (
      SELECT 1 FROM public.product_stock ps3
      JOIN public.warehouses w3 ON w3.id = ps3.warehouse_id
      WHERE ps3.product_id = p.id AND w3.branch_id = p_branch_id
    ))
    AND (v_tokens = ARRAY[]::text[] OR NOT EXISTS (
      SELECT 1 FROM unnest(v_tokens) AS token WHERE NOT (
        public.normalize_arabic(p.name_ar) LIKE concat('%',token,'%') OR public.normalize_arabic(p.sku) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.part_number) LIKE concat('%',token,'%') OR public.normalize_arabic(p.brand) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.description) LIKE concat('%',token,'%') OR public.normalize_arabic(p.size) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.alternative_numbers) LIKE concat('%',token,'%'))))
  GROUP BY p.id, pc.name
  ORDER BY
    CASE WHEN p_sort_key='name_ar' AND p_sort_dir='asc' THEN p.name_ar END ASC,
    CASE WHEN p_sort_key='name_ar' AND p_sort_dir='desc' THEN p.name_ar END DESC,
    CASE WHEN p_sort_key='sku' AND p_sort_dir='asc' THEN p.sku END ASC,
    CASE WHEN p_sort_key='sku' AND p_sort_dir='desc' THEN p.sku END DESC,
    CASE WHEN p_sort_key='updated_at' AND p_sort_dir='asc' THEN p.updated_at END ASC,
    CASE WHEN p_sort_key='updated_at' AND p_sort_dir='desc' THEN p.updated_at END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$

-- ===== search_parties =====


CREATE OR REPLACE FUNCTION public.search_parties(p_company_id uuid, p_query text, p_type text DEFAULT 'all'::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, type text, phone text, email text, tax_number text, status text, balance numeric, category_id uuid, category_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.name, p.type, p.phone, p.email, p.tax_number, p.status,
    COALESCE(pb.balance, 0)::numeric AS balance,
    p.category_id,
    pc.name AS category_name
  FROM parties p
  LEFT JOIN party_balances   pb ON pb.party_id   = p.id
  LEFT JOIN party_categories pc ON pc.id         = p.category_id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status     = 'active'
    AND (p_type = 'all' OR p.type = p_type OR p.type = 'both')
    AND (
      p.name        ILIKE '%' || p_query || '%'  OR
      p.phone       ILIKE '%' || p_query || '%'  OR
      p.email       ILIKE '%' || p_query || '%'  OR
      p.tax_number  ILIKE '%' || p_query || '%'  OR
      p.search_vector @@ plainto_tsquery('simple', p_query)
    )
  ORDER BY
    CASE WHEN p.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
    p.name
  LIMIT p_limit;
END;
$function$

-- ===== send_webhook_event =====


CREATE OR REPLACE FUNCTION public.test_active_accounts(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE res json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT json_agg(row_to_json(a)) INTO res FROM active_accounts a WHERE company_id = p_company_id;
  RETURN res;
END;
$function$

-- ===== trg_incentive_calc_guard =====


CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
RETURN EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
  );
END;
$function$

-- ===== user_is_admin_or_manager =====


CREATE OR REPLACE FUNCTION public.validate_data_integrity(p_company_id uuid)
 RETURNS TABLE(check_name text, status text, details text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id AND ucr.role IN('owner','admin')) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  SELECT 'invoice_overpayment'::text, CASE WHEN COUNT(*)>0 THEN '⚠️ مشكلة' ELSE '✅ سليم' END::text,
    (COUNT(*)||' فاتورة paid_amount > total_amount')::text
  FROM invoices WHERE company_id=p_company_id AND paid_amount>total_amount+0.01 AND deleted_at IS NULL
  UNION ALL
  SELECT 'negative_stock', CASE WHEN COUNT(*)>0 THEN '⚠️ مشكلة' ELSE '✅ سليم' END, COUNT(*)||' سجل مخزون سالب'
  FROM product_stock WHERE company_id=p_company_id AND quantity<0
  UNION ALL
  SELECT 'journal_balance',
    CASE WHEN ABS(COALESCE(SUM(jel.debit_amount),0)-COALESCE(SUM(jel.credit_amount),0))<0.01 THEN '✅ متوازن' ELSE '⚠️ غير متوازن' END,
    'الفرق: '||ROUND(ABS(COALESCE(SUM(jel.debit_amount),0)-COALESCE(SUM(jel.credit_amount),0)),4)::text
  FROM journal_entry_lines jel JOIN journal_entries je ON je.id=jel.journal_entry_id
  WHERE je.company_id=p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
  UNION ALL
  SELECT 'cross_company_allocations', CASE WHEN COUNT(*)>0 THEN '🔴 خطأ حرج' ELSE '✅ سليم' END,
    COUNT(*)||' تخصيص دفع بين شركات مختلفة'
  FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id JOIN invoices inv ON inv.id=pa.invoice_id
  WHERE py.company_id!=inv.company_id AND pa.deleted_at IS NULL;
END;$function$

-- ===== validate_journal_entry_balance =====


