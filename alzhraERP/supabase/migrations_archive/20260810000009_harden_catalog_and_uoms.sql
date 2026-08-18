-- ============================================================
-- Migration: Harden catalog tables + product_uoms RLS
-- Date: 2026-08-10
-- Fixes: Add company_id to part_catalog_cache for tenant isolation
--        Restrict product_uoms RLS from USING(true) to company-scoped
-- ============================================================

-- 1. Add company_id to part_catalog_cache (Phase 5 tables)
ALTER TABLE public.part_catalog_cache 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT;

ALTER TABLE public.external_cross_references 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT;

ALTER TABLE public.external_fitment_evidence 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT;

-- Enable RLS on catalog tables
ALTER TABLE public.part_catalog_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_cross_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_fitment_evidence ENABLE ROW LEVEL SECURITY;

-- Add tenant isolation policies
DROP POLICY IF EXISTS "catalog_cache_select" ON public.part_catalog_cache;
CREATE POLICY "catalog_cache_select" ON public.part_catalog_cache
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "catalog_cache_insert" ON public.part_catalog_cache;
CREATE POLICY "catalog_cache_insert" ON public.part_catalog_cache
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "ext_xref_select" ON public.external_cross_references;
CREATE POLICY "ext_xref_select" ON public.external_cross_references
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "ext_xref_insert" ON public.external_cross_references;
CREATE POLICY "ext_xref_insert" ON public.external_cross_references
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "ext_fit_select" ON public.external_fitment_evidence;
CREATE POLICY "ext_fit_select" ON public.external_fitment_evidence
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "ext_fit_insert" ON public.external_fitment_evidence;
CREATE POLICY "ext_fit_insert" ON public.external_fitment_evidence
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

-- 2. Restrict product_uoms RLS from open access to company-scoped
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.product_uoms;

CREATE POLICY "uoms_select" ON public.product_uoms
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_uoms.product_id 
        AND p.company_id = public.get_user_company_id()
    ));

CREATE POLICY "uoms_insert" ON public.product_uoms
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_uoms.product_id 
        AND p.company_id = public.get_user_company_id()
    ) AND public.user_is_admin_or_manager());

CREATE POLICY "uoms_update" ON public.product_uoms
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_uoms.product_id 
        AND p.company_id = public.get_user_company_id()
    ) AND public.user_is_admin_or_manager())
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_uoms.product_id 
        AND p.company_id = public.get_user_company_id()
    ) AND public.user_is_admin_or_manager());

CREATE POLICY "uoms_delete" ON public.product_uoms
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_uoms.product_id 
        AND p.company_id = public.get_user_company_id()
    ) AND public.user_is_admin_or_manager());

-- 3. Add missing indexes
CREATE INDEX IF NOT EXISTS idx_catalog_company ON public.part_catalog_cache(company_id);
CREATE INDEX IF NOT EXISTS idx_ext_xref_company ON public.external_cross_references(company_id);
CREATE INDEX IF NOT EXISTS idx_ext_fit_company ON public.external_fitment_evidence(company_id);