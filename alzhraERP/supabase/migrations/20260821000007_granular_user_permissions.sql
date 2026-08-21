-- ============================================================
-- MIGRATION: Granular User Permissions & Branch Access
-- ============================================================

-- 1. Create user_permissions table for custom per-user permission grants/revocations
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    permission text NOT NULL,
    is_granted boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT user_permissions_unique UNIQUE (user_id, company_id, permission)
);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for user_permissions:
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
CREATE POLICY "user_permissions_select" ON public.user_permissions
FOR SELECT TO public
USING (
    user_id = auth.uid()
    OR (company_id IN (SELECT get_auth_companies()))
);

DROP POLICY IF EXISTS "user_permissions_write" ON public.user_permissions;
CREATE POLICY "user_permissions_write" ON public.user_permissions
FOR ALL TO public
USING (
    is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
          AND ucr.company_id = user_permissions.company_id
          AND ucr.role IN ('owner', 'admin', 'manager')
    )
)
WITH CHECK (
    is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
          AND ucr.company_id = user_permissions.company_id
          AND ucr.role IN ('owner', 'admin', 'manager')
    )
);

-- 2. Enhanced has_permission function with Owner Bypass + User Permissions Overrides
CREATE OR REPLACE FUNCTION public.has_permission(p_permission text, p_company_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_override boolean;
BEGIN
  IF is_super_admin() THEN
    RETURN true;
  END IF;

  SELECT role INTO v_role
  FROM public.user_company_roles
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;

  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  SELECT is_granted INTO v_override
  FROM public.user_permissions
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND permission = p_permission
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = v_role
      AND rp.permission = p_permission
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_override boolean;
BEGIN
  IF is_super_admin() THEN
    RETURN true;
  END IF;

  SELECT role INTO v_role
  FROM public.user_company_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE id = auth.uid();
  END IF;

  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  SELECT is_granted INTO v_override
  FROM public.user_permissions
  WHERE user_id = auth.uid()
    AND permission = p_permission
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = v_role
      AND rp.permission = p_permission
  );
END;
$function$;

-- 3. Enhanced get_user_permissions function
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_company_id uuid)
 RETURNS TABLE(permission text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.user_company_roles
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;

  IF is_super_admin() OR v_role = 'owner' THEN
    RETURN QUERY
      SELECT DISTINCT rp.permission
      FROM public.role_permissions rp
      ORDER BY rp.permission;
    RETURN;
  END IF;

  RETURN QUERY
    WITH role_perms AS (
      SELECT rp.permission
      FROM public.role_permissions rp
      WHERE rp.role = v_role
    ),
    user_grants AS (
      SELECT up.permission
      FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.company_id = p_company_id
        AND up.is_granted = true
    ),
    user_revokes AS (
      SELECT up.permission
      FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.company_id = p_company_id
        AND up.is_granted = false
    )
    SELECT p.permission
    FROM (
      SELECT rp.permission FROM role_perms rp
      UNION
      SELECT ug.permission FROM user_grants ug
    ) p
    WHERE p.permission NOT IN (SELECT ur.permission FROM user_revokes ur)
    ORDER BY p.permission;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions()
 RETURNS TABLE(permission text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.user_company_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE id = auth.uid();
  END IF;

  IF is_super_admin() OR v_role = 'owner' THEN
    RETURN QUERY
      SELECT DISTINCT rp.permission
      FROM public.role_permissions rp
      ORDER BY rp.permission;
    RETURN;
  END IF;

  RETURN QUERY
    WITH role_perms AS (
      SELECT rp.permission
      FROM public.role_permissions rp
      WHERE rp.role = v_role
    ),
    user_grants AS (
      SELECT up.permission
      FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.is_granted = true
    ),
    user_revokes AS (
      SELECT up.permission
      FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.is_granted = false
    )
    SELECT p.permission
    FROM (
      SELECT rp.permission FROM role_perms rp
      UNION
      SELECT ug.permission FROM user_grants ug
    ) p
    WHERE p.permission NOT IN (SELECT ur.permission FROM user_revokes ur)
    ORDER BY p.permission;
END;
$function$;

-- 4. RPC to update a member's custom permissions (with auto-revoke of unselected base permissions)
CREATE OR REPLACE FUNCTION public.set_member_permissions(
    p_target_user_id uuid,
    p_company_id uuid,
    p_granted_permissions text[],
    p_revoked_permissions text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role text;
  v_target_role text;
  v_perm text;
  v_auto_revoked text[];
BEGIN
  SELECT role INTO v_caller_role
  FROM public.user_company_roles
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;

  IF NOT (is_super_admin() OR v_caller_role IN ('owner', 'admin', 'manager')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية إدارة صلاحيات المستخدمين';
  END IF;

  SELECT role INTO v_target_role
  FROM public.user_company_roles
  WHERE user_id = p_target_user_id AND company_id = p_company_id
  LIMIT 1;

  IF v_target_role = 'owner' AND v_caller_role != 'owner' AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'لا يمكن تعديل صلاحيات مالك المنشأة';
  END IF;

  DELETE FROM public.user_permissions
  WHERE user_id = p_target_user_id AND company_id = p_company_id;

  IF array_length(p_granted_permissions, 1) > 0 THEN
    FOREACH v_perm IN ARRAY p_granted_permissions LOOP
      INSERT INTO public.user_permissions(user_id, company_id, permission, is_granted)
      VALUES (p_target_user_id, p_company_id, v_perm, true)
      ON CONFLICT (user_id, company_id, permission)
      DO UPDATE SET is_granted = true, updated_at = now();
    END LOOP;
  END IF;

  -- Auto-compute revoked: any permission in base role not in granted permissions
  SELECT coalesce(array_agg(rp.permission), '{}'::text[]) INTO v_auto_revoked
  FROM public.role_permissions rp
  WHERE rp.role = v_target_role
    AND rp.permission != ALL(coalesce(p_granted_permissions, '{}'::text[]));

  IF array_length(v_auto_revoked, 1) > 0 THEN
    FOREACH v_perm IN ARRAY v_auto_revoked LOOP
      INSERT INTO public.user_permissions(user_id, company_id, permission, is_granted)
      VALUES (p_target_user_id, p_company_id, v_perm, false)
      ON CONFLICT (user_id, company_id, permission)
      DO UPDATE SET is_granted = false, updated_at = now();
    END LOOP;
  END IF;

  IF array_length(p_revoked_permissions, 1) > 0 THEN
    FOREACH v_perm IN ARRAY p_revoked_permissions LOOP
      INSERT INTO public.user_permissions(user_id, company_id, permission, is_granted)
      VALUES (p_target_user_id, p_company_id, v_perm, false)
      ON CONFLICT (user_id, company_id, permission)
      DO UPDATE SET is_granted = false, updated_at = now();
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'count_granted', coalesce(array_length(p_granted_permissions, 1), 0),
    'count_revoked', coalesce(array_length(v_auto_revoked, 1), 0)
  );
END;
$function$;

-- 5. RPC to get effective permissions for a target user in a company
CREATE OR REPLACE FUNCTION public.get_member_effective_permissions(
    p_target_user_id uuid,
    p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_branch_id uuid;
  v_role_perms text[];
  v_granted_perms text[];
  v_revoked_perms text[];
BEGIN
  SELECT role, branch_id INTO v_role, v_branch_id
  FROM public.user_company_roles
  WHERE user_id = p_target_user_id AND company_id = p_company_id
  LIMIT 1;

  IF v_role = 'owner' THEN
    SELECT coalesce(array_agg(DISTINCT permission), '{}'::text[]) INTO v_role_perms
    FROM public.role_permissions;
  ELSE
    SELECT coalesce(array_agg(permission), '{}'::text[]) INTO v_role_perms
    FROM public.role_permissions
    WHERE role = v_role;
  END IF;

  SELECT coalesce(array_agg(permission), '{}'::text[]) INTO v_granted_perms
  FROM public.user_permissions
  WHERE user_id = p_target_user_id AND company_id = p_company_id AND is_granted = true;

  SELECT coalesce(array_agg(permission), '{}'::text[]) INTO v_revoked_perms
  FROM public.user_permissions
  WHERE user_id = p_target_user_id AND company_id = p_company_id AND is_granted = false;

  RETURN jsonb_build_object(
    'user_id', p_target_user_id,
    'company_id', p_company_id,
    'role', v_role,
    'branch_id', v_branch_id,
    'role_permissions', v_role_perms,
    'granted_permissions', v_granted_perms,
    'revoked_permissions', v_revoked_perms
  );
END;
$function$;

-- 6. Helper for Branch Access Check
CREATE OR REPLACE FUNCTION public.user_can_access_branch(p_company_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    is_super_admin()
    OR p_branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = p_company_id
        AND (
          ucr.role IN ('owner', 'admin', 'manager')
          OR ucr.branch_id IS NULL
          OR ucr.branch_id = p_branch_id
        )
    )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_permissions(uuid, uuid, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_effective_permissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_branch(uuid, uuid) TO authenticated;
