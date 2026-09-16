-- Fix infinite recursion in get_auth_companies and is_super_admin
-- By reading from the tables but explicitly ensuring they do not trigger RLS policies
-- Since SECURITY DEFINER owner might not bypass RLS if it was changed or if Postgres settings differ.

-- 1. Fix get_auth_companies
CREATE OR REPLACE FUNCTION public.get_auth_companies()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Using plpgsql instead of plain SQL to ensure it executes in the context of the SECURITY DEFINER
  -- We can also explicitly check if we are in the recursion (though not needed if owner is postgres).
  RETURN QUERY
  SELECT company_id
  FROM public.user_company_roles
  WHERE user_id = auth.uid();
END;
$function$;

ALTER FUNCTION public.get_auth_companies() OWNER TO postgres;

-- 2. Fix is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_super boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  ) INTO v_is_super;
  RETURN COALESCE(v_is_super, false);
END;
$function$;

ALTER FUNCTION public.is_super_admin() OWNER TO postgres;
