-- ============================================================
-- Migration: VIN — Enforce product ownership on vehicle_products
-- Date: 2026-08-14
--
-- The INSERT policy only checked company_id; a user could link
-- another company's product_id to a vehicle (junk cross-tenant link).
-- Adds an EXISTS guard so the product must belong to the caller's
-- own company.
-- ============================================================

DROP POLICY IF EXISTS "vehicle_products_insert" ON public.vehicle_products;

CREATE POLICY "vehicle_products_insert" ON public.vehicle_products
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND EXISTS (
            SELECT 1
            FROM public.products p
            WHERE p.id = product_id
              AND p.company_id = public.get_user_company_id()
        )
    );
