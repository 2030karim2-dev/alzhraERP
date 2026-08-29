-- ============================================================
-- Migration: 20260830000003_branch_isolation_and_main_branch.sql
-- Description: Configure Main Branch (Wael Al-Nazari), add branch_id
-- to parties and debt tables, implement branch-level debt isolation
-- with full access for the main branch and shared products/stock.
-- ============================================================

-- 1. Add is_main column to branches if not exists
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_main boolean DEFAULT false;

-- 2. Set 'فرع وائل النظاري' as the Main Branch
UPDATE public.branches 
SET is_main = CASE 
    WHEN id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' THEN true 
    ELSE false 
END
WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480';

-- 3. Add branch_id to parties and debt subsystem tables
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.party_opening_balances ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.debt_payment_promises ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.debt_message_log ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.debt_followup_config ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create indexes on branch_id
CREATE INDEX IF NOT EXISTS idx_parties_branch_id ON public.parties(branch_id);
CREATE INDEX IF NOT EXISTS idx_party_opening_balances_branch_id ON public.party_opening_balances(branch_id);
CREATE INDEX IF NOT EXISTS idx_debt_payment_promises_branch_id ON public.debt_payment_promises(branch_id);
CREATE INDEX IF NOT EXISTS idx_debt_message_log_branch_id ON public.debt_message_log(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id ON public.invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON public.payments(branch_id);

-- 4. Backfill existing records of Al-Nazari to Main Branch
UPDATE public.parties 
SET branch_id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' 
WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480' AND branch_id IS NULL;

UPDATE public.party_opening_balances 
SET branch_id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' 
WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480' AND branch_id IS NULL;

UPDATE public.invoices 
SET branch_id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' 
WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480' AND branch_id IS NULL;

UPDATE public.payments 
SET branch_id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' 
WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480' AND branch_id IS NULL;

-- 5. Helper function: check if active user has main branch / company admin access
CREATE OR REPLACE FUNCTION public.is_main_branch_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role text;
    v_branch_id uuid;
    v_is_main boolean := false;
BEGIN
    SELECT ucr.role, ucr.branch_id INTO v_role, v_branch_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
    LIMIT 1;

    IF v_role IN ('owner', 'admin') OR v_branch_id IS NULL THEN
        RETURN true;
    END IF;

    SELECT b.is_main INTO v_is_main
    FROM public.branches b
    WHERE b.id = v_branch_id;

    RETURN COALESCE(v_is_main, false);
END;
$$;

-- 6. Helper function: get user's active branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_branch_id uuid;
BEGIN
    SELECT ucr.branch_id INTO v_branch_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
    LIMIT 1;

    RETURN v_branch_id;
END;
$$;

-- 7. Update get_dashboard_summary to strictly filter by branch when requested or for branch users
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
    v_effective_branch uuid;
    v_is_admin boolean;
    v_opening_cust_debts NUMERIC;
    v_opening_supp_debts NUMERIC;
BEGIN
    vc := public.verify_company_access(p_company_id);
    v_is_admin := public.is_main_branch_or_admin(vc);

    IF v_is_admin THEN
        v_effective_branch := p_branch_id;
    ELSE
        v_effective_branch := public.get_user_branch_id(vc);
    END IF;

    -- Opening customer debts (filtered by branch if specified)
    SELECT COALESCE(SUM(
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
        * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
            WHERE er.company_id = vc AND er.currency_code = ob.currency_code
            ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
    ), 0) INTO v_opening_cust_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'customer' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    -- Opening supplier debts
    SELECT COALESCE(SUM(
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE -ob.amount END
        * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
            WHERE er.company_id = vc AND er.currency_code = ob.currency_code
            ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
    ), 0) INTO v_opening_supp_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'supplier' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    RETURN (SELECT jsonb_build_object(
        'total_sales', COALESCE((SELECT SUM(total_amount) FROM public.invoices
            WHERE company_id = vc AND type = 'sale'
              AND status IN ('posted','paid','partial','partially_paid')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch)), 0),
        'total_purchases', COALESCE((SELECT SUM(total_amount) FROM public.invoices
            WHERE company_id = vc AND type = 'purchase'
              AND status IN ('posted','paid','partial','partially_paid')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch)), 0),
        'total_expenses', COALESCE((SELECT SUM(amount) FROM public.expenses
            WHERE company_id = vc AND status IN ('posted','paid') AND deleted_at IS NULL
              AND (p_date_from IS NULL OR expense_date >= p_date_from)
              AND (p_date_to IS NULL OR expense_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch)), 0),
        'receipt_bonds', COALESCE((SELECT SUM(amount) FROM public.payments
            WHERE company_id = vc AND type = 'receipt' AND status = 'posted' AND deleted_at IS NULL
              AND (p_date_from IS NULL OR payment_date >= p_date_from)
              AND (p_date_to IS NULL OR payment_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch)), 0),
        'payment_bonds', COALESCE((SELECT SUM(amount) FROM public.payments
            WHERE company_id = vc AND type = 'disbursement' AND status = 'posted' AND deleted_at IS NULL
              AND (p_date_from IS NULL OR payment_date >= p_date_from)
              AND (p_date_to IS NULL OR payment_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch)), 0),
        'total_debts', (COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
            FROM public.invoices i
            WHERE i.company_id = vc AND i.type = 'sale'
              AND i.status IN ('posted','partial','partially_paid')
              AND i.deleted_at IS NULL
              AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
              AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_cust_debts),
        'total_supplier_debts', (COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
            FROM public.invoices i
            WHERE i.company_id = vc AND i.type = 'purchase'
              AND i.status IN ('posted','partial','partially_paid')
              AND i.deleted_at IS NULL
              AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
              AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_supp_debts),
        'invoice_count', (SELECT COUNT(*) FROM public.invoices
            WHERE company_id = vc AND type = 'sale'
              AND status NOT IN ('draft','void')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch))
    ));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.is_main_branch_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_branch_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated, service_role;
