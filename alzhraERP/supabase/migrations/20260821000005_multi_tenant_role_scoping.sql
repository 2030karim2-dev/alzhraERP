-- ============================================================
-- FIX (C2): multi-tenant authorization — company-scoped roles
-- ------------------------------------------------------------
-- Root cause: `get_user_role()` / `has_permission()` /
-- `user_is_admin_or_manager()` / `user_can_manage_debts()`
-- evaluate the user's role/permissions WITHOUT a company
-- context, and `get_user_role()` picks an ARBITRARY row
-- (`LIMIT 1`) across all memberships. An admin in Company A
-- therefore satisfied these checks while operating on
-- Company B (cross-tenant writes via the SECURITY DEFINER
-- `incentive_*` functions) or with an unrelated company's
-- role (privilege escalation in policies).
--
-- Fixes in this migration:
--   A) Company-scoped OVERLOADS (original signatures untouched
--      for backward compatibility):
--        get_user_role(p_company_id uuid)
--        has_permission(p_permission text, p_company_id uuid)
--        user_is_admin_or_manager(p_company_id uuid)
--        user_can_manage_debts(p_company_id uuid)
--   B) A generic tenant-write guard trigger attached to every
--      incentive_* table (and audit_logs) that asserts
--      fn_assert_company_access(row.company_id) for any
--      AUTHENTICATED session — closes the cross-tenant write
--      path of all 23 SECURITY DEFINER incentive functions
--      without rewriting their bodies. System contexts
--      (pg_cron / service_role / edge functions: auth.uid() IS
--      NULL) are unaffected.
--   C) RLS policies that used the ambiguous no-arg helpers are
--      rewritten to the company-scoped variants, and
--      `company_id = get_user_company_id()` (first company only)
--      becomes `company_id IN (SELECT get_auth_companies())`
--      (all of the user's companies).
--
-- Date: 2026-08-21
-- ============================================================

-- ============================================================
-- A) Company-scoped helper overloads
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role
    FROM public.user_company_roles
    WHERE user_id = auth.uid() AND company_id = p_company_id
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text, p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.user_company_roles ucr ON ucr.role = rp.role
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = p_company_id
      AND rp.permission = p_permission
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_is_admin_or_manager(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.get_user_role(p_company_id) IN ('admin', 'manager', 'owner');
$function$;

CREATE OR REPLACE FUNCTION public.user_can_manage_debts(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.get_user_role(p_company_id) IN ('admin', 'manager', 'accountant');
$function$;

-- ============================================================
-- B) Generic tenant-write guard (incentive_* + audit_logs)
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_guard_tenant_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
BEGIN
  -- System contexts (pg_cron / service_role / edge functions) carry no
  -- auth.uid() and are trusted; only AUTHENTICATED sessions are checked.
  IF auth.uid() IS NOT NULL THEN
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    IF v_company_id IS NOT NULL THEN
      PERFORM public.fn_assert_company_access(v_company_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'incentive_periods', 'incentive_plans', 'incentive_rules',
    'incentive_targets', 'incentive_assignments', 'incentive_tiers',
    'incentive_engineer_links', 'incentive_calculations',
    'incentive_calculation_lines', 'incentive_payments',
    'incentive_pending_invoices', 'incentive_adjustments', 'audit_logs'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_tenant_write ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_guard_tenant_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_guard_tenant_write()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- C) Policy rewrites — company-scoped role checks
-- ============================================================

-- ---- companies_update (was: get_user_role() global) ----------
DROP POLICY IF EXISTS "companies_update" ON public.companies;
CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO public
  USING (
    is_super_admin()
    OR (
      id IN (SELECT get_auth_companies())
      AND get_user_role(id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      id IN (SELECT get_auth_companies())
      AND get_user_role(id) IN ('owner', 'admin')
    )
  );

-- ---- cashboxes ------------------------------------------------
DROP POLICY IF EXISTS "cashboxes_select" ON public.cashboxes;
CREATE POLICY "cashboxes_select" ON public.cashboxes
  FOR SELECT TO public
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "cashboxes_insert" ON public.cashboxes;
CREATE POLICY "cashboxes_insert" ON public.cashboxes
  FOR INSERT TO public
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) IN ('owner', 'admin', 'accountant')
  );

DROP POLICY IF EXISTS "cashboxes_update" ON public.cashboxes;
CREATE POLICY "cashboxes_update" ON public.cashboxes
  FOR UPDATE TO public
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) IN ('owner', 'admin', 'accountant')
  );

-- ---- exchange_companies ---------------------------------------
DROP POLICY IF EXISTS "exchange_companies_select" ON public.exchange_companies;
CREATE POLICY "exchange_companies_select" ON public.exchange_companies
  FOR SELECT TO public
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "exchange_companies_insert" ON public.exchange_companies;
CREATE POLICY "exchange_companies_insert" ON public.exchange_companies
  FOR INSERT TO public
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) IN ('owner', 'admin', 'accountant')
  );

DROP POLICY IF EXISTS "exchange_companies_update" ON public.exchange_companies;
CREATE POLICY "exchange_companies_update" ON public.exchange_companies
  FOR UPDATE TO public
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) IN ('owner', 'admin', 'accountant')
  );

-- ---- audit_items ----------------------------------------------
DROP POLICY IF EXISTS "audit_items_select" ON public.audit_items;
CREATE POLICY "audit_items_select" ON public.audit_items
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "audit_items_insert" ON public.audit_items;
CREATE POLICY "audit_items_insert" ON public.audit_items
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

DROP POLICY IF EXISTS "audit_items_update" ON public.audit_items;
CREATE POLICY "audit_items_update" ON public.audit_items
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

DROP POLICY IF EXISTS "audit_items_delete" ON public.audit_items;
CREATE POLICY "audit_items_delete" ON public.audit_items
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) = 'admin'
  );

-- ---- audit_sessions -------------------------------------------
DROP POLICY IF EXISTS "audit_sessions_select" ON public.audit_sessions;
CREATE POLICY "audit_sessions_select" ON public.audit_sessions
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "audit_sessions_insert" ON public.audit_sessions;
CREATE POLICY "audit_sessions_insert" ON public.audit_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

DROP POLICY IF EXISTS "audit_sessions_update" ON public.audit_sessions;
CREATE POLICY "audit_sessions_update" ON public.audit_sessions
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

DROP POLICY IF EXISTS "audit_sessions_delete" ON public.audit_sessions;
CREATE POLICY "audit_sessions_delete" ON public.audit_sessions
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) = 'admin'
  );

-- ---- vehicle_products -----------------------------------------
DROP POLICY IF EXISTS "vehicle_products_select" ON public.vehicle_products;
CREATE POLICY "vehicle_products_select" ON public.vehicle_products
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "vehicle_products_insert" ON public.vehicle_products;
CREATE POLICY "vehicle_products_insert" ON public.vehicle_products
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = vehicle_products.product_id
        AND p.company_id = vehicle_products.company_id
    )
  );

DROP POLICY IF EXISTS "vehicle_products_update" ON public.vehicle_products;
CREATE POLICY "vehicle_products_update" ON public.vehicle_products
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "vehicle_products_delete" ON public.vehicle_products;
CREATE POLICY "vehicle_products_delete" ON public.vehicle_products
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) = 'admin'
  );

-- ---- vin_analyses ---------------------------------------------
DROP POLICY IF EXISTS "vin_analyses_select" ON public.vin_analyses;
CREATE POLICY "vin_analyses_select" ON public.vin_analyses
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "vin_analyses_insert" ON public.vin_analyses;
CREATE POLICY "vin_analyses_insert" ON public.vin_analyses
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "vin_analyses_update" ON public.vin_analyses;
CREATE POLICY "vin_analyses_update" ON public.vin_analyses
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "vin_analyses_delete" ON public.vin_analyses;
CREATE POLICY "vin_analyses_delete" ON public.vin_analyses
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) = 'admin'
  );

-- ---- part_compatibility ---------------------------------------
DROP POLICY IF EXISTS "part_compatibility_select" ON public.part_compatibility;
CREATE POLICY "part_compatibility_select" ON public.part_compatibility
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "part_compatibility_insert" ON public.part_compatibility;
CREATE POLICY "part_compatibility_insert" ON public.part_compatibility
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "part_compatibility_update" ON public.part_compatibility;
CREATE POLICY "part_compatibility_update" ON public.part_compatibility
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

DROP POLICY IF EXISTS "part_compatibility_delete" ON public.part_compatibility;
CREATE POLICY "part_compatibility_delete" ON public.part_compatibility
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND get_user_role(company_id) = 'admin'
  );

-- ---- product_uoms ----------------------------------------------
DROP POLICY IF EXISTS "uoms_select" ON public.product_uoms;
CREATE POLICY "uoms_select" ON public.product_uoms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_uoms.product_id
        AND p.company_id IN (SELECT get_auth_companies())
    )
  );

DROP POLICY IF EXISTS "uoms_insert" ON public.product_uoms;
CREATE POLICY "uoms_insert" ON public.product_uoms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_uoms.product_id
        AND p.company_id IN (SELECT get_auth_companies())
    )
    AND user_is_admin_or_manager(
      (SELECT company_id FROM products WHERE id = product_uoms.product_id)
    )
  );

DROP POLICY IF EXISTS "uoms_update" ON public.product_uoms;
CREATE POLICY "uoms_update" ON public.product_uoms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_uoms.product_id
        AND p.company_id IN (SELECT get_auth_companies())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_uoms.product_id
        AND p.company_id IN (SELECT get_auth_companies())
    )
    AND user_is_admin_or_manager(
      (SELECT company_id FROM products WHERE id = product_uoms.product_id)
    )
  );

DROP POLICY IF EXISTS "uoms_delete" ON public.product_uoms;
CREATE POLICY "uoms_delete" ON public.product_uoms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_uoms.product_id
        AND p.company_id IN (SELECT get_auth_companies())
    )
    AND user_is_admin_or_manager(
      (SELECT company_id FROM products WHERE id = product_uoms.product_id)
    )
  );

-- ---- part_catalog_cache ---------------------------------------
DROP POLICY IF EXISTS "catalog_cache_select" ON public.part_catalog_cache;
CREATE POLICY "catalog_cache_select" ON public.part_catalog_cache
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "catalog_cache_insert" ON public.part_catalog_cache;
CREATE POLICY "catalog_cache_insert" ON public.part_catalog_cache
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

-- ---- inventory_session_drafts ----------------------------------
DROP POLICY IF EXISTS "inventory_session_drafts_select" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_select" ON public.inventory_session_drafts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
    )
  );

DROP POLICY IF EXISTS "inventory_session_drafts_insert" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_insert" ON public.inventory_session_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
        AND user_is_admin_or_manager(s.company_id)
    )
  );

DROP POLICY IF EXISTS "inventory_session_drafts_update" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_update" ON public.inventory_session_drafts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
        AND user_is_admin_or_manager(s.company_id)
    )
  );

DROP POLICY IF EXISTS "inventory_session_drafts_delete" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_delete" ON public.inventory_session_drafts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
        AND get_user_role(s.company_id) = 'admin'
    )
  );

-- ---- debt_followup_config --------------------------------------
DROP POLICY IF EXISTS "debt_select_followup" ON public.debt_followup_config;
CREATE POLICY "debt_select_followup" ON public.debt_followup_config
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_manage_followup" ON public.debt_followup_config;
CREATE POLICY "debt_manage_followup" ON public.debt_followup_config
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  )
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

-- ---- debt_message_log ------------------------------------------
DROP POLICY IF EXISTS "debt_select_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_select_msg_log" ON public.debt_message_log
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_insert_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_insert_msg_log" ON public.debt_message_log
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_update_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_update_msg_log" ON public.debt_message_log
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_delete_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_delete_msg_log" ON public.debt_message_log
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

-- ---- debt_message_templates ------------------------------------
DROP POLICY IF EXISTS "debt_select_templates" ON public.debt_message_templates;
CREATE POLICY "debt_select_templates" ON public.debt_message_templates
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_manage_templates" ON public.debt_message_templates;
CREATE POLICY "debt_manage_templates" ON public.debt_message_templates
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_can_manage_debts(company_id)
  )
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_can_manage_debts(company_id)
  );

-- ---- debt_payment_promises -------------------------------------
DROP POLICY IF EXISTS "debt_select_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_select_promises" ON public.debt_payment_promises
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_insert_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_insert_promises" ON public.debt_payment_promises
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_can_manage_debts(company_id)
  );

DROP POLICY IF EXISTS "debt_update_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_update_promises" ON public.debt_payment_promises
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_can_manage_debts(company_id)
  );

DROP POLICY IF EXISTS "debt_delete_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_delete_promises" ON public.debt_payment_promises
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

-- ---- party_opening_balances ------------------------------------
DROP POLICY IF EXISTS "debt_select_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_select_opening_balances" ON public.party_opening_balances
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "debt_insert_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_insert_opening_balances" ON public.party_opening_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_can_manage_debts(company_id)
  );

DROP POLICY IF EXISTS "debt_update_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_update_opening_balances" ON public.party_opening_balances
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_auth_companies()))
  WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND user_can_manage_debts(company_id)
  );

DROP POLICY IF EXISTS "debt_delete_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_delete_opening_balances" ON public.party_opening_balances
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );
