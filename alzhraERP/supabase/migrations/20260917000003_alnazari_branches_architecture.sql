-- ==============================================================================
-- Migration: 20260917000003_alnazari_branches_architecture.sql
-- Description:
-- 1. Initialize branch codes for Al-Nazari branches (WN: Wael, GN: Ghamdan, MN: Mohammed)
-- 2. Upgrade get_auth_branches(company_id) to enforce mutual full access between
--    Wael and Ghamdan branches (full_integration), while strictly isolating
--    Mohammed branch (inventory_only) to its own branch for all operational data.
-- 3. Preserve shared product stock quantity visibility across all company branches.
-- 4. Unify and harden RLS policies on invoices, parties, party_opening_balances, invitations.
-- 5. Upgrade get_dashboard_summary to respect get_auth_branches.
-- 6. Grant all operational and administrative permissions to branch managers in their branches.
-- 7. Restrict invitations so branch managers can only invite employees to their own branch.
-- ==============================================================================

-- 1. Initialize branch codes for Al-Nazari branches
UPDATE public.branches 
SET code = 'WN' 
WHERE id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' AND (code IS NULL OR code = '');

UPDATE public.branches 
SET code = 'GN' 
WHERE id = 'f3cd882d-0a2f-40a2-99da-4535992dc3fb' AND (code IS NULL OR code = '');

UPDATE public.branches 
SET code = 'MN' 
WHERE id = '8dc294fb-fdb7-4571-a6b2-8389cb04b10e' AND (code IS NULL OR code = '');

-- Fallback codes for any other branch without a code
UPDATE public.branches 
SET code = CASE WHEN is_main THEN 'MAIN' ELSE 'B' || UPPER(SUBSTRING(id::text, 1, 4)) END 
WHERE code IS NULL OR code = '';

-- 2. Upgrade get_auth_branches(p_company_id uuid)
CREATE OR REPLACE FUNCTION public.get_auth_branches(p_company_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_user_branch_id uuid;
  v_mode text;
BEGIN
  -- Super admin has access to all branches of the company
  IF public.is_super_admin() THEN
    RETURN QUERY SELECT id FROM public.branches WHERE company_id = p_company_id;
    RETURN;
  END IF;

  -- Look up user role and branch in the specified company
  SELECT ucr.role, ucr.branch_id INTO v_role, v_user_branch_id
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  -- If user is owner or general admin without a branch assigned, they access all branches
  IF v_role IN ('owner', 'admin') AND v_user_branch_id IS NULL THEN
    RETURN QUERY SELECT id FROM public.branches WHERE company_id = p_company_id;
    RETURN;
  END IF;

  -- If user has an assigned branch:
  IF v_user_branch_id IS NOT NULL THEN
    SELECT integration_mode INTO v_mode 
    FROM public.branches 
    WHERE id = v_user_branch_id;

    -- Full Integration (فرع وائل النظاري وفرع غمدان النظاري):
    -- يستطيع كل منهم رؤية كل شيء وإنشاء أي معاملات في الفرعين المتكاملين
    IF v_mode = 'full_integration' THEN
      RETURN QUERY 
        SELECT b.id FROM public.branches b
        WHERE b.company_id = p_company_id 
          AND b.integration_mode = 'full_integration';
      RETURN;
    ELSE
      -- Inventory Only / Independent (فرع محمد النظاري):
      -- منفصل مالياً وتشغيلياً بالكامل ولا يرى سوى فرعه الخاص
      RETURN QUERY 
        SELECT b.id FROM public.branches b
        WHERE b.id = v_user_branch_id 
          AND b.company_id = p_company_id;
      RETURN;
    END IF;
  END IF;

  -- Fallback: return user's company branches
  RETURN QUERY SELECT id FROM public.branches WHERE company_id = p_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_branches(uuid) TO authenticated, service_role;

-- 3. Upgrade is_valid_branch(p_company_id, p_branch_id)
CREATE OR REPLACE FUNCTION public.is_valid_branch(p_company_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    p_branch_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = p_branch_id
        AND b.company_id = p_company_id
        AND b.id IN (SELECT public.get_auth_branches(p_company_id))
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_valid_branch(uuid, uuid) TO authenticated, service_role;

-- 4. Upgrade is_main_branch_or_admin(p_company_id) to avoid bypassing branch isolation
CREATE OR REPLACE FUNCTION public.is_main_branch_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role text;
    v_branch_id uuid;
BEGIN
    SELECT ucr.role, ucr.branch_id INTO v_role, v_branch_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
    LIMIT 1;

    -- Only general owner/admin without a branch assignment has company-wide bypass
    IF v_role IN ('owner', 'admin') AND v_branch_id IS NULL THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_main_branch_or_admin(uuid) TO authenticated, service_role;

-- 5. Drop outdated policies on invoices, parties, party_opening_balances
DROP POLICY IF EXISTS "invoices_branch_isolation_policy" ON public.invoices;
DROP POLICY IF EXISTS "parties_branch_isolation_policy" ON public.parties;
DROP POLICY IF EXISTS "party_opening_balances_branch_isolation" ON public.party_opening_balances;

-- Ensure invoices policies strictly use get_auth_branches
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(invoices.company_id)))
  )
);

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO public
WITH CHECK (
  (company_id IN (SELECT get_auth_companies()))
  AND is_valid_branch(company_id, branch_id)
);

DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO public
USING (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(invoices.company_id)))
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(invoices.company_id)))
  )
);

-- Ensure parties policies respect branch isolation
DROP POLICY IF EXISTS "parties_select" ON public.parties;
CREATE POLICY "parties_select" ON public.parties FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(parties.company_id)))
  )
);

DROP POLICY IF EXISTS "parties_insert" ON public.parties;
CREATE POLICY "parties_insert" ON public.parties FOR INSERT TO public
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND is_valid_branch(company_id, branch_id)
  )
);

DROP POLICY IF EXISTS "parties_update" ON public.parties;
CREATE POLICY "parties_update" ON public.parties FOR UPDATE TO public
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(parties.company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(parties.company_id)))
  )
);

-- Ensure party_opening_balances respects branch isolation
CREATE POLICY "party_opening_balances_select" ON public.party_opening_balances FOR SELECT TO public
USING (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(party_opening_balances.company_id)))
  )
);

CREATE POLICY "party_opening_balances_insert" ON public.party_opening_balances FOR INSERT TO public
WITH CHECK (
  (company_id IN (SELECT get_auth_companies()))
  AND is_valid_branch(company_id, branch_id)
);

CREATE POLICY "party_opening_balances_update" ON public.party_opening_balances FOR UPDATE TO public
USING (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(party_opening_balances.company_id)))
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(party_opening_balances.company_id)))
  )
);

-- 6. Upgrade invitations policies so branch managers can invite staff to their own branch
DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
CREATE POLICY "invitations_select" ON public.invitations FOR SELECT TO public
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(invitations.company_id)))
  )
);

DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
CREATE POLICY "invitations_insert" ON public.invitations FOR INSERT TO public
WITH CHECK (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (
      -- Company owners / unassigned admins can invite to any branch and any role
      (
        EXISTS (
          SELECT 1 FROM public.user_company_roles ucr
          WHERE ucr.user_id = auth.uid() 
            AND ucr.company_id = invitations.company_id
            AND ucr.role IN ('owner', 'admin')
            AND ucr.branch_id IS NULL
        )
      )
      OR
      -- Branch managers can ONLY invite to their own authorized branch, and only for non-owner roles
      (
        invitations.branch_id IS NOT NULL
        AND invitations.branch_id IN (SELECT public.get_auth_branches(invitations.company_id))
        AND invitations.role IN ('manager', 'accountant', 'sales', 'viewer', 'cashier')
        AND EXISTS (
          SELECT 1 FROM public.user_company_roles ucr
          WHERE ucr.user_id = auth.uid() 
            AND ucr.company_id = invitations.company_id
            AND ucr.role IN ('owner', 'admin', 'manager')
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "invitations_delete" ON public.invitations;
CREATE POLICY "invitations_delete" ON public.invitations FOR DELETE TO public
USING (
  is_super_admin()
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(invitations.company_id)))
    AND EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
        AND ucr.company_id = invitations.company_id
        AND ucr.role IN ('owner', 'admin', 'manager')
    )
  )
);

-- 7. Upgrade get_dashboard_summary to strictly isolate by get_auth_branches
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
    vc uuid;
    v_user_branch uuid;
    v_auth_branches uuid[];
    v_target_branch uuid;
    v_opening_cust_debts NUMERIC;
    v_opening_supp_debts NUMERIC;
BEGIN
    vc := public.verify_company_access(p_company_id);
    
    -- Array of all branches this user is authorized to access
    SELECT array_agg(b) INTO v_auth_branches
    FROM public.get_auth_branches(vc) b;

    IF v_auth_branches IS NULL OR array_length(v_auth_branches, 1) = 0 THEN
        RETURN jsonb_build_object(
            'total_sales', 0, 'total_purchases', 0, 'total_expenses', 0,
            'receipt_bonds', 0, 'payment_bonds', 0, 'total_debts', 0,
            'total_supplier_debts', 0, 'invoice_count', 0
        );
    END IF;

    -- Validate requested branch filter
    IF p_branch_id IS NOT NULL THEN
        IF NOT (p_branch_id = ANY(v_auth_branches)) THEN
            RAISE EXCEPTION 'غير مصرح بالوصول إلى بيانات هذا الفرع' USING ERRCODE = '42501';
        END IF;
        v_target_branch := p_branch_id;
    END IF;

    -- Opening customer debts
    SELECT COALESCE(SUM(
        public.fn_to_base_amount(
            ob.currency_code,
            ob.amount,
            (SELECT er.rate_to_base FROM public.exchange_rates er
             WHERE er.company_id = vc AND er.currency_code = ob.currency_code
             ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))
        * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END
    ), 0) INTO v_opening_cust_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'customer' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (ob.branch_id IS NULL OR ob.branch_id = ANY(v_auth_branches))
      AND (v_target_branch IS NULL OR ob.branch_id = v_target_branch OR p.branch_id = v_target_branch);

    -- Opening supplier debts
    SELECT COALESCE(SUM(
        public.fn_to_base_amount(
            ob.currency_code,
            ob.amount,
            (SELECT er.rate_to_base FROM public.exchange_rates er
             WHERE er.company_id = vc AND er.currency_code = ob.currency_code
             ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))
        * CASE WHEN ob.direction = 'credit' THEN 1 ELSE -1 END
    ), 0) INTO v_opening_supp_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'supplier' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (ob.branch_id IS NULL OR ob.branch_id = ANY(v_auth_branches))
      AND (v_target_branch IS NULL OR ob.branch_id = v_target_branch OR p.branch_id = v_target_branch);

    RETURN (SELECT jsonb_build_object(
        'total_sales', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted','paid','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (i.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR i.branch_id = v_target_branch)), 0),
        'total_purchases', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted','paid','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (i.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR i.branch_id = v_target_branch)), 0),
        'total_expenses', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL OR sc.is_base THEN e.amount
              WHEN sc.exchange_operator = 'divide' AND e.exchange_rate > 0 THEN e.amount / e.exchange_rate
              ELSE e.amount * COALESCE(e.exchange_rate, 1)
            END
          ), 2) FROM public.expenses e
          LEFT JOIN public.supported_currencies sc ON sc.code = e.currency_code
          WHERE e.company_id = vc AND e.status IN ('posted','paid') AND e.deleted_at IS NULL
            AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
            AND (p_date_to IS NULL OR e.expense_date <= p_date_to)
            AND (e.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR e.branch_id = v_target_branch)), 0),
        'receipt_bonds', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'receipt' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (p.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR p.branch_id = v_target_branch)), 0),
        'payment_bonds', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'disbursement' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (p.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR p.branch_id = v_target_branch)), 0),
        'total_debts', (COALESCE((SELECT ROUND(SUM(
            public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)
          ), 2)
          FROM public.invoices i
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (i.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR i.branch_id = v_target_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_cust_debts),
        'total_supplier_debts', (COALESCE((SELECT ROUND(SUM(
            public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)
          ), 2)
          FROM public.invoices i
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (i.branch_id = ANY(v_auth_branches))
            AND (v_target_branch IS NULL OR i.branch_id = v_target_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_supp_debts),
        'invoice_count', (SELECT COUNT(*) FROM public.invoices
            WHERE company_id = vc AND type = 'sale'
              AND status NOT IN ('draft','void')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (branch_id = ANY(v_auth_branches))
              AND (v_target_branch IS NULL OR branch_id = v_target_branch))
    ));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated, service_role;

-- 8. Grant complete permissions to Mohammed Al-Nazari (Branch Manager of فرع محمد)
-- Ensure user_company_roles has role='manager' and branch_id='8dc294fb-fdb7-4571-a6b2-8389cb04b10e'
UPDATE public.user_company_roles
SET role = 'manager',
    branch_id = '8dc294fb-fdb7-4571-a6b2-8389cb04b10e'
WHERE user_id = 'ada6cf85-a05b-4fd8-9bc6-e11331eca15b'
  AND company_id = '00c55672-ca4d-4616-a845-3c38fddec480';

-- Grant every single system permission to Mohammed Al-Nazari
INSERT INTO public.user_permissions (user_id, company_id, permission, is_granted)
SELECT 
  'ada6cf85-a05b-4fd8-9bc6-e11331eca15b'::uuid,
  '00c55672-ca4d-4616-a845-3c38fddec480'::uuid,
  rp.permission,
  true
FROM (SELECT DISTINCT permission FROM public.role_permissions) rp
ON CONFLICT (user_id, company_id, permission) 
DO UPDATE SET is_granted = true;

-- Ensure setup_new_company and sync trigger auto-grants all permissions to Ghamdan when connected
CREATE OR REPLACE FUNCTION public.sync_branch_user_on_branch_email_change()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND TRIM(NEW.email) != '' AND (OLD.email IS NULL OR LOWER(TRIM(OLD.email)) != LOWER(TRIM(NEW.email))) THEN
    -- Look for user in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(NEW.email))
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Link user to this company and branch as manager
      INSERT INTO public.user_company_roles (user_id, company_id, role, branch_id)
      VALUES (v_user_id, NEW.company_id, 'manager', NEW.id)
      ON CONFLICT (user_id, company_id) DO UPDATE
        SET branch_id = EXCLUDED.branch_id, role = 'manager';

      -- Grant all permissions for this branch manager
      INSERT INTO public.user_permissions (user_id, company_id, permission, is_granted)
      SELECT 
        v_user_id,
        NEW.company_id,
        rp.permission,
        true
      FROM (SELECT DISTINCT permission FROM public.role_permissions) rp
      ON CONFLICT (user_id, company_id, permission) 
      DO UPDATE SET is_granted = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
