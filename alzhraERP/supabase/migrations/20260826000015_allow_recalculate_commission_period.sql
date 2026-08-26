-- Migration: 20260826000015_allow_recalculate_commission_period.sql
-- Description: Allow recalculation of commission periods when state is 'open' or 'calculated', and ensure test periods allow recalculation.

CREATE OR REPLACE FUNCTION public.incentive_assert_period_allows(p_period_id uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_period RECORD;
BEGIN
  SELECT state, is_test_period INTO v_period FROM incentive_periods WHERE id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'period_not_found: period % does not exist', p_period_id; END IF;

  IF v_period.is_test_period = true AND p_action IN ('lock','pay','post','void') THEN
    RAISE EXCEPTION 'test_period_action_denied: action "%" is forbidden on test periods', p_action;
  END IF;

  IF p_action = 'calculate' AND v_period.state NOT IN ('open', 'calculated', 'calculating') THEN
    RAISE EXCEPTION 'period_not_open: current state is %', v_period.state;
  END IF;
  IF p_action = 'review' AND v_period.state != 'calculating' AND v_period.state != 'calculated' THEN
    RAISE EXCEPTION 'period_not_calculated: current state is %', v_period.state;
  END IF;
  IF p_action = 'approve' AND v_period.state != 'under_review' AND v_period.state != 'calculated' THEN
    RAISE EXCEPTION 'period_not_under_review: current state is %', v_period.state;
  END IF;
  IF p_action = 'lock' AND v_period.state != 'approved' THEN
    RAISE EXCEPTION 'period_not_approved: current state is %', v_period.state;
  END IF;
  IF p_action = 'pay' AND v_period.state != 'approved' AND v_period.state != 'locked' THEN
    RAISE EXCEPTION 'period_not_payable: current state is %', v_period.state;
  END IF;
  IF p_action = 'post' AND v_period.state != 'approved' AND v_period.state != 'locked' THEN
    RAISE EXCEPTION 'period_not_postable: current state is %', v_period.state;
  END IF;
END;
$function$;
