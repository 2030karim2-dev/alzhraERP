-- Migration: 20260924000010_fix_low_stock_tenant_isolation.sql
-- Description: Closes a cross-tenant data leak in public.get_low_stock_products()
--              that was introduced by 20260924000009 (same day) and restores the
--              project's documented anon-exposure posture.
--
-- REGRESSION 1 — the tenant-isolation guard was dropped.
--   Migration 20260916000015_patch_rpc_security_part3.sql defined the function as:
--
--       BEGIN
--           PERFORM public.verify_company_access(p_company_id);
--           RETURN QUERY ...
--
--   The rewrite in 20260924000009 (for query optimisation) omitted that line.
--   The function is SECURITY DEFINER, so with the guard gone any caller can pass
--   an arbitrary p_company_id and read that company's low-stock product names
--   and quantities. This affected authenticated users of ANY tenant, not only
--   anonymous ones.
--
-- REGRESSION 2 — EXECUTE was granted to `anon`.
--   20260819000004_privileges.sql explicitly did:
--       REVOKE EXECUTE ON FUNCTION get_low_stock_products(uuid,uuid) FROM anon;
--       REVOKE EXECUTE ON FUNCTION get_low_stock_products(uuid,uuid) FROM PUBLIC;
--   20260924000009 then granted it back to `anon` (together with three other
--   dashboard RPCs) while describing the change as "ensure explicit EXECUTE
--   grants". Combined with regression 1 that made the leak reachable without
--   any authentication at all.
--
-- This migration:
--   a) restores PERFORM public.verify_company_access(p_company_id) while keeping
--      the optimised query plan from 20260924000009;
--   b) revokes EXECUTE from `anon` and PUBLIC on the four RPCs touched by that
--      migration, re-granting to authenticated + service_role (the posture the
--      application actually needs — every one of these RPCs is called from an
--      authenticated feature service, and the only deliberately anonymous
--      surface in this project is the token-based supplier portal).
--
-- verify_company_access() raises 42501 with 'Authentication required' when
-- auth.uid() is NULL and 'Access denied: ...' when the caller is not a member of
-- the requested company, so it guards against both anonymous and cross-tenant
-- authenticated callers.

-- ============================================================================
-- a) Restore the tenant-isolation guard (keeping the 20260924000009 query shape)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, quantity numeric, min_quantity numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- عزل المنشأة: أُعيد هذا السطر بعد أن أُسقط سهواً في 20260924000009.
    PERFORM public.verify_company_access(p_company_id);

    RETURN QUERY
    WITH low_stocks AS (
        SELECT
            ps.product_id,
            SUM(ps.quantity) AS total_qty
        FROM public.product_stock ps
        WHERE ps.company_id = p_company_id
          AND (
            p_branch_id IS NULL
            OR ps.warehouse_id IN (
              SELECT w.id FROM public.warehouses w
              WHERE w.company_id = p_company_id
                AND w.branch_id = p_branch_id
                AND w.deleted_at IS NULL
            )
          )
        GROUP BY ps.product_id
        HAVING SUM(ps.quantity) <= 5
        ORDER BY total_qty ASC
        LIMIT 100
    )
    SELECT
        p.id,
        p.name_ar,
        ls.total_qty AS quantity,
        COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5) AS min_quantity
    FROM low_stocks ls
    JOIN public.products p ON p.id = ls.product_id AND p.company_id = p_company_id
    WHERE p.status = 'active'
      AND p.deleted_at IS NULL
      AND ls.total_qty <= COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)
    ORDER BY ls.total_qty ASC
    LIMIT 50;
END;
$function$;

-- ============================================================================
-- b) Restore the anon-exposure posture on the RPCs touched by 20260924000009
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) TO authenticated, service_role;
