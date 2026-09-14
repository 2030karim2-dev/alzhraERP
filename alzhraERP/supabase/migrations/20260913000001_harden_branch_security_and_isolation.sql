-- 1. Create get_auth_branches function
CREATE OR REPLACE FUNCTION public.get_auth_branches(p_company_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id FROM public.branches
  WHERE company_id = p_company_id
  AND (
    public.user_is_admin_or_manager(p_company_id)
    OR
    id IN (
      SELECT branch_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND company_id = p_company_id AND branch_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND company_id = p_company_id AND branch_id IS NULL
    )
  );
$function$;

-- 2. Update is_valid_branch function
CREATE OR REPLACE FUNCTION public.is_valid_branch(p_company_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    p_branch_id IS NULL OR
    EXISTS (
      SELECT 1 FROM branches
      WHERE id = p_branch_id
        AND company_id = p_company_id
        AND p_branch_id IN (SELECT public.get_auth_branches(p_company_id))
    )
  );
$function$;

-- 3. Update branches_delete policy
DROP POLICY IF EXISTS "branches_delete" ON public.branches;
CREATE POLICY "branches_delete" ON public.branches FOR DELETE TO public USING (
  is_super_admin() OR public.get_user_role(company_id) = 'owner'
);

-- 4. Update core financial policies (invoices, expenses, journal_entries, payments, quotations)
-- INVOICES
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

-- EXPENSES
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

-- JOURNAL_ENTRIES
DROP POLICY IF EXISTS "journal_entries_select" ON public.journal_entries;
CREATE POLICY "journal_entries_select" ON public.journal_entries FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "journal_entries_update" ON public.journal_entries;
CREATE POLICY "journal_entries_update" ON public.journal_entries FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

-- PAYMENTS
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

-- QUOTATIONS
DROP POLICY IF EXISTS "quotations_select" ON public.quotations;
CREATE POLICY "quotations_select" ON public.quotations FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

DROP POLICY IF EXISTS "quotations_update" ON public.quotations;
CREATE POLICY "quotations_update" ON public.quotations FOR UPDATE TO public 
USING (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
)
WITH CHECK (
  is_super_admin() 
  OR (
    company_id IN (SELECT get_auth_companies())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.get_auth_branches(company_id)))
  )
);

-- 5. Fix Foreign Keys to RESTRICT
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_branch_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_branch_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_branch_id_fkey;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_branch_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_branch_id_fkey;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;
