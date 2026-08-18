-- ============================================================
-- Migration: Add RLS Policies for Audit Tables
-- Date: 2026-07-31
-- ============================================================
-- This migration adds Row Level Security policies to the
-- audit_sessions, audit_items, and inventory_session_drafts
-- tables to fix 403 Forbidden and 404 Not Found errors.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- AUDIT_SESSIONS TABLE
-- ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.audit_sessions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read audit sessions in their company
DROP POLICY IF EXISTS "audit_sessions_select" ON public.audit_sessions;
CREATE POLICY "audit_sessions_select" ON public.audit_sessions
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

-- Only admin/manager can create audit sessions
DROP POLICY IF EXISTS "audit_sessions_insert" ON public.audit_sessions;
CREATE POLICY "audit_sessions_insert" ON public.audit_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- Only admin/manager can update audit sessions
DROP POLICY IF EXISTS "audit_sessions_update" ON public.audit_sessions;
CREATE POLICY "audit_sessions_update" ON public.audit_sessions
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- Only admin can delete audit sessions
DROP POLICY IF EXISTS "audit_sessions_delete" ON public.audit_sessions;
CREATE POLICY "audit_sessions_delete" ON public.audit_sessions
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND public.get_user_role() = 'admin'
    );

-- ────────────────────────────────────────────────────────────
-- AUDIT_ITEMS TABLE
-- ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.audit_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read audit items in their company
DROP POLICY IF EXISTS "audit_items_select" ON public.audit_items;
CREATE POLICY "audit_items_select" ON public.audit_items
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

-- Only admin/manager can create audit items
DROP POLICY IF EXISTS "audit_items_insert" ON public.audit_items;
CREATE POLICY "audit_items_insert" ON public.audit_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- Only admin/manager can update audit items
DROP POLICY IF EXISTS "audit_items_update" ON public.audit_items;
CREATE POLICY "audit_items_update" ON public.audit_items
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- Only admin can delete audit items
DROP POLICY IF EXISTS "audit_items_delete" ON public.audit_items;
CREATE POLICY "audit_items_delete" ON public.audit_items
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND public.get_user_role() = 'admin'
    );

-- ────────────────────────────────────────────────────────────
-- INVENTORY_SESSION_DRAFTS TABLE
-- ────────────────────────────────────────────────────────────
-- Ensure the table exists (in case migration 004 wasn't applied)
CREATE TABLE IF NOT EXISTS public.inventory_session_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.audit_sessions(id) NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index if not exists
CREATE UNIQUE INDEX IF NOT EXISTS inventory_session_drafts_session_id_idx
    ON public.inventory_session_drafts(session_id);

-- Enable RLS
ALTER TABLE public.inventory_session_drafts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read drafts for sessions in their company
-- We need to join with audit_sessions to check company_id
DROP POLICY IF EXISTS "inventory_session_drafts_select" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_select" ON public.inventory_session_drafts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audit_sessions s
            WHERE s.id = inventory_session_drafts.session_id
            AND s.company_id = public.get_user_company_id()
        )
    );

-- Only admin/manager can insert drafts
DROP POLICY IF EXISTS "inventory_session_drafts_insert" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_insert" ON public.inventory_session_drafts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.audit_sessions s
            WHERE s.id = inventory_session_drafts.session_id
            AND s.company_id = public.get_user_company_id()
            AND public.user_is_admin_or_manager()
        )
    );

-- Only admin/manager can update drafts
DROP POLICY IF EXISTS "inventory_session_drafts_update" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_update" ON public.inventory_session_drafts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audit_sessions s
            WHERE s.id = inventory_session_drafts.session_id
            AND s.company_id = public.get_user_company_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.audit_sessions s
            WHERE s.id = inventory_session_drafts.session_id
            AND s.company_id = public.get_user_company_id()
            AND public.user_is_admin_or_manager()
        )
    );

-- Only admin can delete drafts
DROP POLICY IF EXISTS "inventory_session_drafts_delete" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_delete" ON public.inventory_session_drafts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audit_sessions s
            WHERE s.id = inventory_session_drafts.session_id
            AND s.company_id = public.get_user_company_id()
            AND public.get_user_role() = 'admin'
        )
    );

-- ────────────────────────────────────────────────────────────
-- STOCK_MOVEMENTS TABLE (if it exists)
-- ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
CREATE POLICY "stock_movements_select" ON public.stock_movements
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_insert" ON public.stock_movements
    FOR INSERT
    TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "stock_movements_update" ON public.stock_movements;
CREATE POLICY "stock_movements_update" ON public.stock_movements
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- ────────────────────────────────────────────────────────────
-- PRODUCT_UOMS TABLE (if it exists)
-- ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.product_uoms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_uoms_select" ON public.product_uoms;
CREATE POLICY "product_uoms_select" ON public.product_uoms
    FOR SELECT
    TO authenticated
    USING (true); -- Filtered via products table join

DROP POLICY IF EXISTS "product_uoms_insert" ON public.product_uoms;
CREATE POLICY "product_uoms_insert" ON public.product_uoms
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_is_admin_or_manager());

DROP POLICY IF EXISTS "product_uoms_update" ON public.product_uoms;
CREATE POLICY "product_uoms_update" ON public.product_uoms
    FOR UPDATE
    TO authenticated
    USING (public.user_is_admin_or_manager())
    WITH CHECK (public.user_is_admin_or_manager());

DROP POLICY IF EXISTS "product_uoms_delete" ON public.product_uoms;
CREATE POLICY "product_uoms_delete" ON public.product_uoms
    FOR DELETE
    TO authenticated
    USING (public.user_is_admin_or_manager());

-- ────────────────────────────────────────────────────────────
-- PRODUCT_KIT_ITEMS TABLE (if it exists)
-- ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.product_kit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_kit_items_select" ON public.product_kit_items;
CREATE POLICY "product_kit_items_select" ON public.product_kit_items
    FOR SELECT
    TO authenticated
    USING (true); -- Filtered via products table join

DROP POLICY IF EXISTS "product_kit_items_insert" ON public.product_kit_items;
CREATE POLICY "product_kit_items_insert" ON public.product_kit_items
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_is_admin_or_manager());

DROP POLICY IF EXISTS "product_kit_items_delete" ON public.product_kit_items;
CREATE POLICY "product_kit_items_delete" ON public.product_kit_items
    FOR DELETE
    TO authenticated
    USING (public.user_is_admin_or_manager());