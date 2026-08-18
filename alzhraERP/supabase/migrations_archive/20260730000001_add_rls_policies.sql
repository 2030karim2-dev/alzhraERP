-- ============================================================
-- Migration: Add RLS Policies for Multi-Tenant Security
-- Date: 2026-07-30
-- ============================================================
-- This migration adds Row Level Security policies to all
-- business tables, ensuring proper tenant isolation via
-- company_id and role-based access control.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Helper function to get current user's company_id
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM public.user_profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Helper function to get current user's role
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.user_profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Helper: Check if user has admin or manager role
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN public.get_user_role() IN ('admin', 'manager');
END;
$$;

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read products in their company
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

-- Only admin/manager can insert products
DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- Only admin/manager can update products
DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- Only admin can delete products
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND public.get_user_role() = 'admin'
    );

-- ============================================================
-- PRODUCT_STOCK TABLE
-- ============================================================
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_stock_select" ON public.product_stock;
CREATE POLICY "product_stock_select" ON public.product_stock
    FOR SELECT
    TO authenticated
    USING (true); -- Filtered via products table join

DROP POLICY IF EXISTS "product_stock_insert" ON public.product_stock;
CREATE POLICY "product_stock_insert" ON public.product_stock
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_is_admin_or_manager());

DROP POLICY IF EXISTS "product_stock_update" ON public.product_stock;
CREATE POLICY "product_stock_update" ON public.product_stock
    FOR UPDATE
    TO authenticated
    USING (public.user_is_admin_or_manager())
    WITH CHECK (public.user_is_admin_or_manager());

-- ============================================================
-- SALES / INVOICES TABLE
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert" ON public.invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;
CREATE POLICY "invoices_delete" ON public.invoices
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND public.get_user_role() = 'admin'
    );

-- ============================================================
-- JOURNAL ENTRIES TABLE
-- ============================================================
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries_select" ON public.journal_entries;
CREATE POLICY "journal_entries_select" ON public.journal_entries
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "journal_entries_insert" ON public.journal_entries;
CREATE POLICY "journal_entries_insert" ON public.journal_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('admin', 'manager', 'accountant')
    );

DROP POLICY IF EXISTS "journal_entries_update" ON public.journal_entries;
CREATE POLICY "journal_entries_update" ON public.journal_entries
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('admin', 'manager', 'accountant')
    );

-- ============================================================
-- ACCOUNTS TABLE
-- ============================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
CREATE POLICY "accounts_select" ON public.accounts
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "accounts_insert" ON public.accounts;
CREATE POLICY "accounts_insert" ON public.accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('admin', 'accountant')
    );

DROP POLICY IF EXISTS "accounts_update" ON public.accounts;
CREATE POLICY "accounts_update" ON public.accounts
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('admin', 'accountant')
    );

-- ============================================================
-- CUSTOMERS / PARTIES TABLE
-- ============================================================
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties_select" ON public.parties;
CREATE POLICY "parties_select" ON public.parties
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "parties_insert" ON public.parties;
CREATE POLICY "parties_insert" ON public.parties
    FOR INSERT
    TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "parties_update" ON public.parties;
CREATE POLICY "parties_update" ON public.parties
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

-- ============================================================
-- WAREHOUSES TABLE
-- ============================================================
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouses_select" ON public.warehouses;
CREATE POLICY "warehouses_select" ON public.warehouses
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "warehouses_insert" ON public.warehouses;
CREATE POLICY "warehouses_insert" ON public.warehouses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

DROP POLICY IF EXISTS "warehouses_update" ON public.warehouses;
CREATE POLICY "warehouses_update" ON public.warehouses
    FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ============================================================
-- PRODUCT_CROSS_REFERENCES TABLE
-- ============================================================
ALTER TABLE public.product_cross_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cross_refs_select" ON public.product_cross_references;
CREATE POLICY "cross_refs_select" ON public.product_cross_references
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "cross_refs_insert" ON public.product_cross_references;
CREATE POLICY "cross_refs_insert" ON public.product_cross_references
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ============================================================
-- PRODUCT_FITMENTS TABLE
-- ============================================================
ALTER TABLE public.product_fitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitments_select" ON public.product_fitments;
CREATE POLICY "fitments_select" ON public.product_fitments
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "fitments_insert" ON public.product_fitments;
CREATE POLICY "fitments_insert" ON public.product_fitments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ============================================================
-- SUPPLIER PRICES TABLE
-- ============================================================
ALTER TABLE public.supplier_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_prices_select" ON public.supplier_prices;
CREATE POLICY "supplier_prices_select" ON public.supplier_prices
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "supplier_prices_insert" ON public.supplier_prices;
CREATE POLICY "supplier_prices_insert" ON public.supplier_prices
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ============================================================
-- USER_PROFILES TABLE (Self-service)
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Admins can read all profiles in their company
DROP POLICY IF EXISTS "user_profiles_select_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_select_admin" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        public.get_user_role() = 'admin'
        AND company_id = public.get_user_company_id()
    );

-- Users can update their own profile (but not role)
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

COMMENT ON FUNCTION public.get_user_company_id() IS 'Returns the company_id for the currently authenticated user. Used by RLS policies for tenant isolation.';
COMMENT ON FUNCTION public.get_user_role() IS 'Returns the role for the currently authenticated user. Used by RLS policies for role-based access control.';
COMMENT ON FUNCTION public.user_is_admin_or_manager() IS 'Returns true if the current user has admin or manager role. Used by RLS policies for write operations.';