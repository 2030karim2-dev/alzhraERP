-- 1. Add 'code' to branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code character varying(20);

-- 2. Update generate_invoice_number to support branch-specific sequencing
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id uuid, p_type text, p_branch_id uuid DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_count  bigint;
  v_branch_code text := '';
  v_lock_key text;
BEGIN
  v_prefix := CASE p_type
    WHEN 'sale'             THEN 'INV'
    WHEN 'purchase'         THEN 'PUR'
    WHEN 'sale_return'      THEN 'RET'
    WHEN 'purchase_return'  THEN 'RPR'
    ELSE                         'DOC'
  END;

  IF p_branch_id IS NOT NULL THEN
    SELECT code INTO v_branch_code FROM branches WHERE id = p_branch_id AND company_id = p_company_id;
    IF v_branch_code IS NOT NULL AND v_branch_code <> '' THEN
      v_prefix := v_prefix || '-' || v_branch_code;
    END IF;
    v_lock_key := p_company_id::text || p_type || p_branch_id::text;
  ELSE
    v_lock_key := p_company_id::text || p_type;
  END IF;

  -- استخدام advisory lock لمنع تكرار الأرقام في التزامن
  PERFORM pg_advisory_xact_lock(hashtext(v_lock_key));

  IF p_branch_id IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE company_id = p_company_id AND branch_id = p_branch_id AND type = p_type AND deleted_at IS NULL;
  ELSE
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE company_id = p_company_id AND branch_id IS NULL AND type = p_type AND deleted_at IS NULL;
  END IF;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE,'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$;

-- 3. Harden warehouses RLS
DROP POLICY IF EXISTS "warehouses_select" ON public.warehouses;
CREATE POLICY "warehouses_select" ON public.warehouses FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "warehouses_insert" ON public.warehouses;
CREATE POLICY "warehouses_insert" ON public.warehouses FOR INSERT TO public 
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
  )
);

DROP POLICY IF EXISTS "warehouses_update" ON public.warehouses;
CREATE POLICY "warehouses_update" ON public.warehouses FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
  )
);

-- 4. Harden cashboxes RLS
DROP POLICY IF EXISTS "cashboxes_select" ON public.cashboxes;
CREATE POLICY "cashboxes_select" ON public.cashboxes FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "cashboxes_insert" ON public.cashboxes;
CREATE POLICY "cashboxes_insert" ON public.cashboxes FOR INSERT TO public 
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "cashboxes_update" ON public.cashboxes;
CREATE POLICY "cashboxes_update" ON public.cashboxes FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

-- 5. Harden inventory_transactions RLS (indirect branch isolation via warehouse_id)
DROP POLICY IF EXISTS "inv_tx_insert" ON public.inventory_transactions;
CREATE POLICY "inv_tx_insert" ON public.inventory_transactions FOR INSERT TO public 
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND EXISTS (
      SELECT 1 FROM public.warehouses w 
      WHERE w.id = warehouse_id 
      AND w.company_id = inventory_transactions.company_id 
      AND (w.branch_id IS NULL OR w.branch_id IN (SELECT public.get_auth_branches(w.company_id)))
    )
  )
);

DROP POLICY IF EXISTS "inv_tx_select" ON public.inventory_transactions;
CREATE POLICY "inv_tx_select" ON public.inventory_transactions FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND EXISTS (
      SELECT 1 FROM public.warehouses w 
      WHERE w.id = warehouse_id 
      AND w.company_id = inventory_transactions.company_id 
      AND (w.branch_id IS NULL OR w.branch_id IN (SELECT public.get_auth_branches(w.company_id)))
    )
  )
);

-- 6. Harden invitations RLS
DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
CREATE POLICY "invitations_insert" ON public.invitations FOR INSERT TO public 
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND public.user_is_admin_or_manager(company_id)
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);
