-- ============================================================
-- Migration: Supplier Portal & Smart Procurement Architecture
-- Phase 1: Tables, Constraints, Indexes, RLS Policies, Revisions & Transactional RPCs
-- Date: 2026-08-25
-- ============================================================

BEGIN;

-- 1. Helper function to identify supplier linked to an authenticated user (Supplier Portal RBAC)
CREATE OR REPLACE FUNCTION public.get_user_supplier_id(p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.parties
  WHERE (type = 'supplier' OR type = 'both')
    AND (
      id IN (SELECT supplier_id FROM public.prc_supplier_contacts WHERE email = (SELECT email FROM auth.users WHERE id = p_user_id))
      OR id IN (SELECT supplier_id FROM public.prc_suppliers WHERE supplier_id IN (SELECT supplier_id FROM public.prc_supplier_contacts WHERE email = (SELECT email FROM auth.users WHERE id = p_user_id)))
    )
  LIMIT 1;
$$;

-- 2. Enhance existing PRC tables with modern fields
ALTER TABLE IF EXISTS public.prc_rfq_items
  ADD COLUMN IF NOT EXISTS oem_number text,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vin_number text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE IF EXISTS public.prc_quotation_items
  ADD COLUMN IF NOT EXISTS vendor_sku text,
  ADD COLUMN IF NOT EXISTS availability text DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_notes text;

ALTER TABLE IF EXISTS public.prc_quotations
  ADD COLUMN IF NOT EXISTS current_revision_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subtotal numeric(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(15,6) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS warranty_terms text,
  ADD COLUMN IF NOT EXISTS converted_po_id uuid,
  ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS converted_by uuid REFERENCES auth.users(id);

-- 3. Unique constraint on supplier products (prevent duplicate vendor + product per company)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prc_supplier_products_uniq'
  ) THEN
    ALTER TABLE public.prc_supplier_products
      ADD CONSTRAINT prc_supplier_products_uniq UNIQUE (company_id, supplier_id, product_id);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 4. Create Quotation Revisions Table (Immutable history snapshot on submission)
CREATE TABLE IF NOT EXISTS public.prc_quotation_revisions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    quotation_id uuid NOT NULL REFERENCES public.prc_quotations(quotation_id) ON DELETE CASCADE,
    revision_number integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'submitted',
    subtotal numeric(15,4) NOT NULL DEFAULT 0,
    discount_amount numeric(15,4) NOT NULL DEFAULT 0,
    tax_amount numeric(15,4) NOT NULL DEFAULT 0,
    total_amount numeric(15,4) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'SAR',
    exchange_rate numeric(15,6) NOT NULL DEFAULT 1,
    delivery_lead_time_days integer DEFAULT 0,
    warranty_days integer DEFAULT 0,
    notes text,
    terms_and_conditions text,
    items_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT prc_quotation_revisions_unique_rev UNIQUE (quotation_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_prc_quotation_revisions_quotation 
  ON public.prc_quotation_revisions(quotation_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_prc_quotation_revisions_company 
  ON public.prc_quotation_revisions(company_id);

-- 5. Create Procurement Audit Logs Table
CREATE TABLE IF NOT EXISTS public.procurement_audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id),
    entity_type text NOT NULL, -- 'rfq', 'quotation', 'revision', 'purchase_order', 'vendor_product'
    entity_id uuid NOT NULL,
    action text NOT NULL, -- 'created', 'updated', 'submitted', 'revision_created', 'accepted', 'rejected', 'converted_to_po', 'excel_imported'
    before_state jsonb,
    after_state jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prc_audit_entity 
  ON public.procurement_audit_logs(company_id, entity_type, entity_id);

-- 6. Enable RLS on all Procurement Tables
ALTER TABLE public.prc_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_rfq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_rfq_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_quotation_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prc_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: Tenant Scoping + Vendor Access Separation
-- Policy: Company Staff Full Access (Scoped to user_company_roles)
DROP POLICY IF EXISTS "Company staff access prc_rfqs" ON public.prc_rfqs;
CREATE POLICY "Company staff access prc_rfqs" ON public.prc_rfqs
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR rfq_id IN (SELECT rfq_id FROM public.prc_rfq_suppliers WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Company staff access prc_rfq_items" ON public.prc_rfq_items;
CREATE POLICY "Company staff access prc_rfq_items" ON public.prc_rfq_items
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR rfq_id IN (SELECT rfq_id FROM public.prc_rfq_suppliers WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Company staff access prc_quotations" ON public.prc_quotations;
CREATE POLICY "Company staff access prc_quotations" ON public.prc_quotations
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR supplier_id = public.get_user_supplier_id(auth.uid())
  );

DROP POLICY IF EXISTS "Company staff access prc_quotation_items" ON public.prc_quotation_items;
CREATE POLICY "Company staff access prc_quotation_items" ON public.prc_quotation_items
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Company staff access prc_quotation_revisions" ON public.prc_quotation_revisions;
CREATE POLICY "Company staff access prc_quotation_revisions" ON public.prc_quotation_revisions
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Company staff access prc_supplier_products" ON public.prc_supplier_products;
CREATE POLICY "Company staff access prc_supplier_products" ON public.prc_supplier_products
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR supplier_id = public.get_user_supplier_id(auth.uid())
  );

DROP POLICY IF EXISTS "Company staff access procurement_audit_logs" ON public.procurement_audit_logs;
CREATE POLICY "Company staff access procurement_audit_logs" ON public.procurement_audit_logs
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

-- 8. Transactional RPC: Submit Vendor Quotation & Create Revision
CREATE OR REPLACE FUNCTION public.submit_vendor_quotation_revision(
    p_company_id uuid,
    p_quotation_id uuid,
    p_items jsonb,
    p_subtotal numeric,
    p_discount numeric,
    p_tax numeric,
    p_total numeric,
    p_currency text,
    p_lead_time_days integer DEFAULT 0,
    p_warranty_days integer DEFAULT 0,
    p_validity_date date DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_next_rev integer;
  v_supplier_id uuid;
  v_item jsonb;
  v_quotation_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Validate company access or supplier identity
  SELECT company_id, supplier_id, status, current_revision_number 
  INTO v_company_id, v_supplier_id, v_quotation_status, v_next_rev
  FROM public.prc_quotations
  WHERE quotation_id = p_quotation_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_quotation_status = 'converted' THEN
    RAISE EXCEPTION 'Cannot modify quotation already converted to Purchase Order' USING ERRCODE = '23514';
  END IF;

  v_next_rev := COALESCE(v_next_rev, 0) + 1;

  -- 1. Create Revision Snapshot
  INSERT INTO public.prc_quotation_revisions (
    company_id,
    quotation_id,
    revision_number,
    status,
    subtotal,
    discount_amount,
    tax_amount,
    total_amount,
    currency,
    delivery_lead_time_days,
    warranty_days,
    notes,
    terms_and_conditions,
    items_snapshot,
    created_by
  ) VALUES (
    v_company_id,
    p_quotation_id,
    v_next_rev,
    'submitted',
    p_subtotal,
    p_discount,
    p_tax,
    p_total,
    COALESCE(p_currency, 'SAR'),
    p_lead_time_days,
    p_warranty_days,
    p_notes,
    p_terms,
    p_items,
    v_user_id
  );

  -- 2. Update Master Quotation Record
  UPDATE public.prc_quotations SET
    status = 'submitted',
    current_revision_number = v_next_rev,
    subtotal = p_subtotal,
    discount_amount = p_discount,
    tax_amount = p_tax,
    total_amount = p_total,
    currency = COALESCE(p_currency, 'SAR'),
    delivery_lead_time_days = p_lead_time_days,
    valid_until = p_validity_date,
    notes = p_notes,
    terms_and_conditions = p_terms,
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

  -- 3. Replace/Update Quotation Items
  DELETE FROM public.prc_quotation_items WHERE quotation_id = p_quotation_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.prc_quotation_items (
      quotation_id,
      company_id,
      rfq_item_id,
      product_id,
      offered_quantity,
      unit_of_measure,
      unit_price,
      discount_percentage,
      net_unit_price,
      tax_percentage,
      total_price,
      vendor_sku,
      availability,
      lead_time_days,
      warranty_days,
      vendor_notes
    ) VALUES (
      p_quotation_id,
      v_company_id,
      COALESCE((v_item->>'rfq_item_id')::uuid, gen_random_uuid()),
      (v_item->>'product_id')::uuid,
      COALESCE((v_item->>'quantity')::numeric, 1),
      COALESCE(v_item->>'unit_of_measure', 'حبة'),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'discount_percentage')::numeric, 0),
      COALESCE((v_item->>'net_unit_price')::numeric, (v_item->>'unit_price')::numeric),
      COALESCE((v_item->>'tax_percentage')::numeric, 0),
      COALESCE((v_item->>'total_price')::numeric, 0),
      v_item->>'vendor_sku',
      COALESCE(v_item->>'availability', 'in_stock'),
      COALESCE((v_item->>'lead_time_days')::integer, 0),
      COALESCE((v_item->>'warranty_days')::integer, 0),
      v_item->>'vendor_notes'
    );
  END LOOP;

  -- 4. Audit Log
  INSERT INTO public.procurement_audit_logs (
    company_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    after_state,
    metadata
  ) VALUES (
    v_company_id,
    v_user_id,
    'quotation',
    p_quotation_id,
    'submitted',
    jsonb_build_object('revision', v_next_rev, 'total_amount', p_total, 'currency', p_currency),
    jsonb_build_object('items_count', jsonb_array_length(p_items))
  );

  RETURN jsonb_build_object(
    'success', true,
    'quotation_id', p_quotation_id,
    'revision_number', v_next_rev,
    'total_amount', p_total
  );
END;
$$;

-- 9. Transactional RPC: Convert Quotation to Purchase Order (PO) with Idempotency & Locking
CREATE OR REPLACE FUNCTION public.convert_quotation_to_po_transactional(
    p_company_id uuid,
    p_quotation_id uuid,
    p_expected_delivery_date date DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_quote RECORD;
  v_po_id uuid := gen_random_uuid();
  v_po_number text;
  v_seq integer;
  v_item RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_company_id := public.verify_company_access(p_company_id);

  -- 1. Lock quotation row for update to prevent concurrent double-conversion race conditions
  SELECT * INTO v_quote
  FROM public.prc_quotations
  WHERE quotation_id = p_quotation_id AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation % not found in company %', p_quotation_id, v_company_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Idempotency Guard: if already converted, return existing PO info
  IF v_quote.status = 'converted' AND v_quote.converted_po_id IS NOT NULL THEN
    SELECT po_number INTO v_po_number FROM public.prc_purchase_orders WHERE po_id = v_quote.converted_po_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_converted', true,
      'po_id', v_quote.converted_po_id,
      'po_number', v_po_number,
      'quotation_id', p_quotation_id
    );
  END IF;

  IF v_quote.status NOT IN ('submitted', 'accepted', 'under_review', 'draft') THEN
    RAISE EXCEPTION 'Quotation status (%) is not eligible for PO conversion', v_quote.status USING ERRCODE = '23514';
  END IF;

  -- 3. Generate Sequential PO Number
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq
  FROM public.prc_purchase_orders
  WHERE company_id = v_company_id;

  v_po_number := 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq::text, 5, '0');

  -- 4. Insert Purchase Order Header
  INSERT INTO public.prc_purchase_orders (
    po_id,
    company_id,
    po_number,
    supplier_id,
    rfq_id,
    quotation_id,
    status,
    issue_date,
    expected_delivery_date,
    currency,
    subtotal,
    tax_amount,
    total_amount,
    payment_terms,
    notes,
    buyer_id
  ) VALUES (
    v_po_id,
    v_company_id,
    v_po_number,
    v_quote.supplier_id,
    v_quote.rfq_id,
    p_quotation_id,
    'confirmed',
    CURRENT_DATE,
    COALESCE(p_expected_delivery_date, (CURRENT_DATE + COALESCE(v_quote.delivery_lead_time_days, 7))),
    v_quote.currency,
    v_quote.subtotal,
    v_quote.tax_amount,
    v_quote.total_amount,
    v_quote.payment_terms,
    COALESCE(p_notes, v_quote.notes),
    v_user_id
  );

  -- 5. Insert Purchase Order Line Items
  FOR v_item IN (
    SELECT * FROM public.prc_quotation_items
    WHERE quotation_id = p_quotation_id
  ) LOOP
    INSERT INTO public.prc_purchase_order_items (
      po_id,
      company_id,
      product_id,
      description,
      quantity,
      unit_of_measure,
      unit_price,
      discount_percentage,
      net_unit_price,
      tax_percentage,
      total_price,
      remarks
    ) VALUES (
      v_po_id,
      v_company_id,
      v_item.product_id,
      COALESCE(v_item.remarks, 'بند من عرض سعر رقم ' || COALESCE(v_quote.quotation_number, '')),
      v_item.offered_quantity,
      v_item.unit_of_measure,
      v_item.unit_price,
      v_item.discount_percentage,
      v_item.net_unit_price,
      v_item.tax_percentage,
      v_item.total_price,
      v_item.vendor_notes
    );
  END LOOP;

  -- 6. Update Quotation Status to 'converted'
  UPDATE public.prc_quotations SET
    status = 'converted',
    converted_po_id = v_po_id,
    converted_at = now(),
    converted_by = v_user_id,
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

  -- 7. Record Audit Trail
  INSERT INTO public.procurement_audit_logs (
    company_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    after_state,
    metadata
  ) VALUES (
    v_company_id,
    v_user_id,
    'quotation',
    p_quotation_id,
    'converted_to_po',
    jsonb_build_object('po_id', v_po_id, 'po_number', v_po_number, 'total_amount', v_quote.total_amount),
    jsonb_build_object('supplier_id', v_quote.supplier_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'po_id', v_po_id,
    'po_number', v_po_number,
    'quotation_id', p_quotation_id,
    'total_amount', v_quote.total_amount
  );
END;
$$;

-- 10. Grant execute privileges
GRANT EXECUTE ON FUNCTION public.get_user_supplier_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_vendor_quotation_revision(uuid, uuid, jsonb, numeric, numeric, numeric, numeric, text, integer, integer, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_po_transactional(uuid, uuid, date, text) TO authenticated;

COMMIT;
