-- ============================================================
-- Migration: 20260826000002_storage_per_bucket_tenant_policies.sql
-- Date: 2026-08-26
-- Severity: HIGH (R-27)
--
-- ROOT CAUSE:
-- The `invoices` and `company-assets` storage buckets were created
-- with `public: true` and policies that only check
-- `bucket_id = 'invoices'`, NOT the caller's company. Any
-- authenticated user who knows (or guesses) the object path can
-- SELECT another tenant's file.
--
-- Additionally, the `file_attachments` table policies use
-- `TO public` (should be `TO authenticated`).
--
-- The storage_guard_dangerous_mime trigger added in
-- 20260826000000 already blocks image/svg+xml and executable
-- MIMEs at insert time, so this migration is the second layer.
--
-- FIX:
--   1) Replace the `invoices` bucket policies with tenant-scoped
--      versions (using storage.objects metadata.company_id or the
--      folder convention `<company_id>/<path>`).
--   2) Replace the `company-assets` policies likewise.
--   3) Tighten the `file_attachments` RLS policies to
--      `TO authenticated`.
--   4) Add a helper view listing current storage policies per
--      bucket for review.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Drop and re-create the storage.objects policies for
--    the `invoices` bucket. The convention used by the app is
--    `<company_id>/<filename>` for the object name. We extract
--    the company_id from the first path segment and require the
--    caller to be a member of that company.
-- ─────────────────────────────────────────────────────────────

DO $do$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users insert invoices" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users select invoices" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users update invoices" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users delete invoices" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "invoices_select_tenant" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "invoices_insert_tenant" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "invoices_update_tenant" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "invoices_delete_tenant" ON storage.objects';
END $do$;

-- Helper SQL function: extract company_id from a storage path
-- of the form "<company_id>/...". Returns NULL for malformed paths.
CREATE OR REPLACE FUNCTION public.storage_path_company_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT CASE
    WHEN p_name IS NULL OR p_name = '' THEN NULL
    WHEN position('/' in p_name) > 0 THEN
      CASE WHEN substring(p_name from 1 for position('/' in p_name) - 1) ~ '^[0-9a-fA-F-]{36}$'
           THEN (substring(p_name from 1 for position('/' in p_name) - 1))::uuid
           ELSE NULL
      END
    ELSE NULL
  END;
$func$;

-- SELECT — caller must be a member of the company encoded in the path.
CREATE POLICY "invoices_select_tenant" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (
      is_super_admin()
      OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
    )
  );

-- INSERT — caller must be a member of the company encoded in the path.
CREATE POLICY "invoices_insert_tenant" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invoices'
    AND (
      is_super_admin()
      OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
    )
  );

-- UPDATE — same as SELECT (must own the company).
CREATE POLICY "invoices_update_tenant" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (
      is_super_admin()
      OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
    )
  )
  WITH CHECK (
    bucket_id = 'invoices'
    AND (
      is_super_admin()
      OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
    )
  );

-- DELETE — owner only.
CREATE POLICY "invoices_delete_tenant" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (
      is_super_admin()
      OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 2) Same hardening for `company-assets` bucket.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "company_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_delete" ON storage.objects;

-- (Re-apply with tenant scoping)
DO $do$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_select" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_insert" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_update" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_delete" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_select_tenant" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_insert_tenant" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_update_tenant" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "company_assets_delete_tenant" ON storage.objects';

  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'company-assets') THEN
    EXECUTE $policy$
      CREATE POLICY "company_assets_select_tenant" ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = 'company-assets'
          AND (
            is_super_admin()
            OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
          )
        );
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "company_assets_insert_tenant" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'company-assets'
          AND (
            is_super_admin()
            OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
          )
        );
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "company_assets_update_tenant" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = 'company-assets'
          AND (
            is_super_admin()
            OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
          )
        );
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "company_assets_delete_tenant" ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = 'company-assets'
          AND (
            is_super_admin()
            OR public.storage_path_company_id(name) IN (SELECT public.get_auth_companies())
          )
        );
    $policy$;
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 3) Tighten `file_attachments` RLS — replace `TO public`
--    with `TO authenticated`. Wrap in existence check.
-- ─────────────────────────────────────────────────────────────

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'file_attachments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "file_attachments_select" ON public.file_attachments';
    EXECUTE 'DROP POLICY IF EXISTS "file_attachments_insert" ON public.file_attachments';
    EXECUTE 'DROP POLICY IF EXISTS "file_attachments_update" ON public.file_attachments';
    EXECUTE 'DROP POLICY IF EXISTS "file_attachments_delete" ON public.file_attachments';

    EXECUTE $p$
      CREATE POLICY "file_attachments_select" ON public.file_attachments
        FOR SELECT TO authenticated
        USING (is_super_admin() OR (company_id IN (SELECT public.get_auth_companies())))
    $p$;
    EXECUTE $p$
      CREATE POLICY "file_attachments_insert" ON public.file_attachments
        FOR INSERT TO authenticated
        WITH CHECK (is_super_admin() OR (company_id IN (SELECT public.get_auth_companies())))
    $p$;
    EXECUTE $p$
      CREATE POLICY "file_attachments_update" ON public.file_attachments
        FOR UPDATE TO authenticated
        USING (is_super_admin() OR (company_id IN (SELECT public.get_auth_companies())))
        WITH CHECK (is_super_admin() OR (company_id IN (SELECT public.get_auth_companies())))
    $p$;
    EXECUTE $p$
      CREATE POLICY "file_attachments_delete" ON public.file_attachments
        FOR DELETE TO authenticated
        USING (is_super_admin() OR (company_id IN (SELECT public.get_auth_companies())))
    $p$;
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 4) Audit view: list every storage.objects policy per bucket,
--    so reviewers can see which buckets still lack tenant scoping.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_storage_policies_by_bucket AS
SELECT
  b.id AS bucket_id,
  b.name AS bucket_name,
  b.public AS bucket_public,
  p.polname AS policy_name,
  p.polcmd AS policy_cmd,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS policy_action,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_clause
FROM storage.buckets b
LEFT JOIN pg_policy p ON p.polrelid = (
  SELECT oid FROM pg_class WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage')
)
WHERE b.id IS NOT NULL
ORDER BY b.id, p.polname;

GRANT SELECT ON public.v_storage_policies_by_bucket TO authenticated;
REVOKE ALL ON public.v_storage_policies_by_bucket FROM anon;
REVOKE ALL ON public.v_storage_policies_by_bucket FROM PUBLIC;


NOTIFY pgrst, 'reload schema';

COMMIT;
