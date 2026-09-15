-- Migration: 20260915000003_backend_quality_improvements.sql
-- Description:
--   1. إغلاق ثغرة 9 دوال SECURITY DEFINER مكشوفة لدور anon
--   2. إضافة فهارس تغطية للمفاتيح الأجنبية المركبة (18 FK بدون فهرس)
--   3. إصلاح RLS initplan في fixed_assets و fixed_asset_depreciations

-- ============================================================================
-- 1. REVOKE EXECUTE on dangerous SECURITY DEFINER functions from anon role
-- ============================================================================
-- هذه الدوال مكشوفة للعموم عبر /rest/v1/rpc بدون مصادقة، وهو خطأ أمني.
-- الدوال المطلوب إغلاقها لا يجب أن تكون متاحة لغير المسجلين.

REVOKE EXECUTE ON FUNCTION public.api_v1_sys_claim_job(character varying, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_branches(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.import_legacy_sale_invoices(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_inventory_ledger_modification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_payment_allocation_total_amount() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_audit_session_cleanup_draft() FROM anon;

-- الدالتان التاليتان مسموح للـ anon بتنفيذهما لأن البوابة الإلكترونية تحتاجهما (Supplier Portal)
-- submit_supplier_portal_quotation  ← مقصودة (يستخدمها الموردون عبر رمز توكن)
-- get_supplier_portal_context       ← مقصودة (تحقق من صلاحية التوكن أولاً داخليًا)

-- ============================================================================
-- 2. Covering Indexes for Composite Foreign Keys (18 FK بدون فهرس)
-- ============================================================================

-- 2.1 invoice_items → invoices (composite FK)
CREATE INDEX IF NOT EXISTS idx_invoice_items_company_invoice
    ON public.invoice_items (company_id, invoice_id);

-- 2.2 invoice_items → products (composite FK)
CREATE INDEX IF NOT EXISTS idx_invoice_items_company_product
    ON public.invoice_items (company_id, product_id);

-- 2.3 invoices → branches (composite FK)
CREATE INDEX IF NOT EXISTS idx_invoices_company_branch
    ON public.invoices (company_id, branch_id);

-- 2.4 invoices → parties (composite FK)
CREATE INDEX IF NOT EXISTS idx_invoices_company_party
    ON public.invoices (company_id, party_id);

-- 2.5 journal_entry_lines → accounts (composite FK)
CREATE INDEX IF NOT EXISTS idx_jel_company_account
    ON public.journal_entry_lines (company_id, account_id);

-- 2.6 journal_entry_lines → journal_entries (composite FK)
CREATE INDEX IF NOT EXISTS idx_jel_company_journal_entry
    ON public.journal_entry_lines (company_id, journal_entry_id);

-- 2.7 payment_allocations → invoices (composite FK)
CREATE INDEX IF NOT EXISTS idx_payment_alloc_company_invoice
    ON public.payment_allocations (company_id, invoice_id);

-- 2.8 payment_allocations → payments (composite FK)
CREATE INDEX IF NOT EXISTS idx_payment_alloc_company_payment
    ON public.payment_allocations (company_id, payment_id);

-- 2.9 prc_goods_receipts → warehouses (composite FK)
CREATE INDEX IF NOT EXISTS idx_prc_grn_company_warehouse
    ON public.prc_goods_receipts (company_id, warehouse_id);

-- 2.10 prc_purchase_orders → auth.users (buyer_id)
CREATE INDEX IF NOT EXISTS idx_prc_po_buyer_id
    ON public.prc_purchase_orders (buyer_id);

-- 2.11 prc_purchase_requests → auth.users (requester_id)
CREATE INDEX IF NOT EXISTS idx_prc_pr_requester_id
    ON public.prc_purchase_requests (requester_id);

-- 2.12 prc_rfqs → auth.users (buyer_id)
CREATE INDEX IF NOT EXISTS idx_prc_rfqs_buyer_id
    ON public.prc_rfqs (buyer_id);

-- 2.13 prc_supplier_products → products (composite FK)
CREATE INDEX IF NOT EXISTS idx_prc_supplier_products_company_product
    ON public.prc_supplier_products (company_id, product_id);

-- 2.14 prc_supplier_products → prc_suppliers (supplier_id)
CREATE INDEX IF NOT EXISTS idx_prc_supplier_products_supplier_id
    ON public.prc_supplier_products (supplier_id);

-- 2.15 prc_suppliers → parties (composite FK)
CREATE INDEX IF NOT EXISTS idx_prc_suppliers_company_party
    ON public.prc_suppliers (company_id, party_id);

-- 2.16 product_stock → products (composite FK)
CREATE INDEX IF NOT EXISTS idx_product_stock_company_product
    ON public.product_stock (company_id, product_id);

-- 2.17 product_stock → warehouses (composite FK)
CREATE INDEX IF NOT EXISTS idx_product_stock_company_warehouse
    ON public.product_stock (company_id, warehouse_id);

-- 2.18 warehouses → branches (composite FK)
CREATE INDEX IF NOT EXISTS idx_warehouses_company_branch
    ON public.warehouses (company_id, branch_id);

-- ============================================================================
-- 3. Fix RLS InitPlan Performance (auth.<function>() per-row re-evaluation)
-- ============================================================================
-- يجب لف استدعاءات auth.uid() و auth.jwt() بـ (SELECT ...) لمنع
-- إعادة تنفيذها مع كل صف في الجدول مما يسبب بطءًا عند الجداول الكبيرة.

-- 3.1 fixed_assets - policy: fixed_assets_tenant_modify
DROP POLICY IF EXISTS fixed_assets_tenant_modify ON public.fixed_assets;
CREATE POLICY fixed_assets_tenant_modify ON public.fixed_assets
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (
        company_id IN (
            SELECT ucr.company_id
            FROM public.user_company_roles ucr
            WHERE ucr.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT ucr.company_id
            FROM public.user_company_roles ucr
            WHERE ucr.user_id = (SELECT auth.uid())
        )
    );

-- 3.2 fixed_asset_depreciations - policy: fixed_asset_depr_tenant
DROP POLICY IF EXISTS fixed_asset_depr_tenant ON public.fixed_asset_depreciations;
CREATE POLICY fixed_asset_depr_tenant ON public.fixed_asset_depreciations
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (
        company_id IN (
            SELECT ucr.company_id
            FROM public.user_company_roles ucr
            WHERE ucr.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT ucr.company_id
            FROM public.user_company_roles ucr
            WHERE ucr.user_id = (SELECT auth.uid())
        )
    );
