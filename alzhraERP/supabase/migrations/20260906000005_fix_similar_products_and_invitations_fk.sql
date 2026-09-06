-- Migration: 20260906000005_fix_similar_products_and_invitations_fk.sql
-- Description: Deploy get_similar_products RPC function and add foreign key on invitations(branch_id)

-- 1. Ensure pg_trgm is available
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- 2. Deploy get_similar_products function
CREATE OR REPLACE FUNCTION public.get_similar_products(p_name text, p_company_id uuid)
 RETURNS TABLE(id uuid, name_ar text, similarity_score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name_ar::text, similarity(p.name_ar, p_name)
  FROM products p
  WHERE p.company_id = p_company_id 
    AND p.status != 'archived' 
    AND p.deleted_at IS NULL
    AND similarity(p.name_ar, p_name) > 0.3
  ORDER BY similarity(p.name_ar, p_name) DESC 
  LIMIT 5;
END;$function$;

GRANT EXECUTE ON FUNCTION public.get_similar_products(text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_similar_products(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_similar_products(text, uuid) FROM public;

-- 3. Add foreign key constraint on invitations(branch_id) to branches(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invitations_branch' AND table_name = 'invitations'
  ) THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT fk_invitations_branch
      FOREIGN KEY (branch_id)
      REFERENCES public.branches(id)
      ON DELETE SET NULL;
  END IF;
END $$;
