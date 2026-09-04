-- ==============================================================================
-- Migration: 20260904000006_super_admin_refinements.sql
-- Description:
--   1. Align company list & count filters with get_platform_system_metrics
--      definitions so metrics counters match the filtered list exactly.
--   2. Automatic audit logging trigger on subscription_plans (INSERT/UPDATE/DELETE).
--   3. Anti-duplication unique index on subscription_plans(name_ar).
--   4. Ensure get_admin_users_list returns empty array instead of NULL for company_names.
--   5. Security posture: REVOKE execute from PUBLIC/anon on trigger functions and RPCs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) Anti-duplication unique index on subscription_plans (name_ar)
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_plans_name_ar 
    ON public.subscription_plans (lower(trim(name_ar)));

-- ------------------------------------------------------------------------------
-- 2) Automatic Audit Logging Trigger on subscription_plans
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_subscription_plans()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.audit_write(
            'CREATE_SUBSCRIPTION_PLAN',
            'subscription_plans',
            NEW.id,
            NULL,
            jsonb_build_object(
                'name_ar', NEW.name_ar,
                'name_en', NEW.name_en,
                'price_monthly', NEW.price_monthly,
                'price_yearly', NEW.price_yearly,
                'max_users', NEW.max_users,
                'max_products', NEW.max_products,
                'max_invoices_monthly', NEW.max_invoices_monthly,
                'ai_tokens_monthly', NEW.ai_tokens_monthly,
                'sort_order', NEW.sort_order,
                'actor', auth.uid()
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.audit_write(
            'UPDATE_SUBSCRIPTION_PLAN',
            'subscription_plans',
            NEW.id,
            NULL,
            jsonb_build_object(
                'name_ar', NEW.name_ar,
                'price_monthly', NEW.price_monthly,
                'price_yearly', NEW.price_yearly,
                'is_active', NEW.is_active,
                'sort_order', NEW.sort_order,
                'changes', jsonb_strip_nulls(jsonb_build_object(
                    'old_price_monthly', CASE WHEN OLD.price_monthly IS DISTINCT FROM NEW.price_monthly THEN OLD.price_monthly END,
                    'new_price_monthly', CASE WHEN OLD.price_monthly IS DISTINCT FROM NEW.price_monthly THEN NEW.price_monthly END,
                    'old_max_users', CASE WHEN OLD.max_users IS DISTINCT FROM NEW.max_users THEN OLD.max_users END,
                    'new_max_users', CASE WHEN OLD.max_users IS DISTINCT FROM NEW.max_users THEN NEW.max_users END,
                    'old_is_active', CASE WHEN OLD.is_active IS DISTINCT FROM NEW.is_active THEN OLD.is_active END,
                    'new_is_active', CASE WHEN OLD.is_active IS DISTINCT FROM NEW.is_active THEN NEW.is_active END
                )),
                'actor', auth.uid()
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.audit_write(
            'DELETE_SUBSCRIPTION_PLAN',
            'subscription_plans',
            OLD.id,
            NULL,
            jsonb_build_object(
                'deleted_plan_name', OLD.name_ar,
                'deleted_plan_id', OLD.id,
                'actor', auth.uid()
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_audit_subscription_plans() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_audit_subscription_plans ON public.subscription_plans;
CREATE TRIGGER trg_audit_subscription_plans
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_subscription_plans();

-- ------------------------------------------------------------------------------
-- 3) Align get_admin_companies_list with metrics definitions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_companies_list(
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name_ar text,
    name_en text,
    tax_number text,
    base_currency text,
    owner_id uuid,
    owner_email text,
    phone text,
    is_active boolean,
    subscription_status text,
    trial_ends_at timestamptz,
    plan_id uuid,
    plan_name text,
    user_count bigint,
    branch_count bigint,
    invoice_count bigint,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    RETURN QUERY
    WITH filtered_companies AS (
        SELECT 
            c.id,
            c.name_ar,
            c.name_en,
            c.tax_number,
            c.base_currency,
            c.owner_id,
            c.phone,
            c.is_active,
            c.subscription_status,
            c.trial_ends_at,
            c.plan_id,
            c.created_at
        FROM public.companies c
        LEFT JOIN auth.users u ON c.owner_id = u.id
        WHERE 
            (p_search IS NULL 
             OR c.name_ar ILIKE '%' || p_search || '%' 
             OR c.name_en ILIKE '%' || p_search || '%'
             OR c.tax_number ILIKE '%' || p_search || '%' 
             OR c.phone ILIKE '%' || p_search || '%'
             OR u.email ILIKE '%' || p_search || '%')
            AND (
                p_status IS NULL
                OR (p_status = 'suspended' AND (c.is_active = false OR c.subscription_status = 'suspended'))
                OR (p_status = 'active' AND c.subscription_status = 'active' AND c.is_active = true)
                OR (p_status = 'trial' AND c.subscription_status = 'trial' AND c.is_active = true)
                OR (p_status = 'past_due' AND c.subscription_status = 'past_due' AND c.is_active = true)
                OR (p_status = 'cancelled' AND c.subscription_status = 'cancelled' AND c.is_active = true)
                OR (p_status NOT IN ('suspended', 'active', 'trial', 'past_due', 'cancelled') AND c.subscription_status = p_status)
            )
        ORDER BY c.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        fc.id,
        fc.name_ar,
        fc.name_en,
        fc.tax_number,
        fc.base_currency,
        fc.owner_id,
        u.email::text AS owner_email,
        fc.phone,
        fc.is_active,
        fc.subscription_status,
        fc.trial_ends_at,
        fc.plan_id,
        sp.name_ar AS plan_name,
        (SELECT COUNT(DISTINCT ucr.user_id) FROM public.user_company_roles ucr WHERE ucr.company_id = fc.id) AS user_count,
        (SELECT COUNT(b.id) FROM public.branches b WHERE b.company_id = fc.id) AS branch_count,
        (SELECT COUNT(inv.id) FROM public.invoices inv WHERE inv.company_id = fc.id) AS invoice_count,
        fc.created_at
    FROM filtered_companies fc
    LEFT JOIN auth.users u ON fc.owner_id = u.id
    LEFT JOIN public.subscription_plans sp ON fc.plan_id = sp.id
    ORDER BY fc.created_at DESC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4) Align get_admin_companies_count with metrics definitions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_companies_count(
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count bigint;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT COUNT(*)
      INTO v_count
      FROM public.companies c
      LEFT JOIN auth.users u ON c.owner_id = u.id
     WHERE (p_search IS NULL
            OR c.name_ar ILIKE '%' || p_search || '%'
            OR c.name_en ILIKE '%' || p_search || '%'
            OR c.tax_number ILIKE '%' || p_search || '%'
            OR c.phone ILIKE '%' || p_search || '%'
            OR u.email ILIKE '%' || p_search || '%')
       AND (
            p_status IS NULL
            OR (p_status = 'suspended' AND (c.is_active = false OR c.subscription_status = 'suspended'))
            OR (p_status = 'active' AND c.subscription_status = 'active' AND c.is_active = true)
            OR (p_status = 'trial' AND c.subscription_status = 'trial' AND c.is_active = true)
            OR (p_status = 'past_due' AND c.subscription_status = 'past_due' AND c.is_active = true)
            OR (p_status = 'cancelled' AND c.subscription_status = 'cancelled' AND c.is_active = true)
            OR (p_status NOT IN ('suspended', 'active', 'trial', 'past_due', 'cancelled') AND c.subscription_status = p_status)
       );

    RETURN v_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5) Enhance get_admin_users_list to return empty array instead of NULL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_users_list(
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    user_id uuid,
    email text,
    created_at timestamptz,
    is_super_admin boolean,
    companies_count bigint,
    company_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    RETURN QUERY
    WITH paginated_users AS (
        SELECT u.id, u.email::text, u.created_at
        FROM auth.users u
        WHERE (p_search IS NULL OR u.email ILIKE '%' || p_search || '%')
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        pu.id AS user_id,
        pu.email,
        pu.created_at,
        EXISTS(SELECT 1 FROM public.super_admins sa WHERE sa.user_id = pu.id) AS is_super_admin,
        COUNT(DISTINCT ucr.company_id) AS companies_count,
        COALESCE(ARRAY_AGG(DISTINCT c.name_ar) FILTER (WHERE c.name_ar IS NOT NULL), ARRAY[]::text[]) AS company_names
    FROM paginated_users pu
    LEFT JOIN public.user_company_roles ucr ON pu.id = ucr.user_id
    LEFT JOIN public.companies c ON ucr.company_id = c.id
    GROUP BY pu.id, pu.email, pu.created_at
    ORDER BY pu.created_at DESC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6) Revoke EXECUTE on trigger guard functions from PUBLIC/anon
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.fn_guard_super_admin_delete() FROM PUBLIC, anon;

-- Privileges on RPCs
REVOKE EXECUTE ON FUNCTION public.get_admin_companies_list(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_companies_count(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_list(text, integer, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_admin_companies_list(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_companies_count(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list(text, integer, integer) TO authenticated, service_role;
