-- ============================================================
-- Migration: Supplier Portal & Smart Procurement Security Hardening
-- Critical P0 Remediation: SEC-01, SEC-02, SEC-03
-- Date: 2026-08-25
-- ============================================================

BEGIN;

-- 1. Database-level Revision Immutability Enforcement (SEC-03)
CREATE OR REPLACE FUNCTION public.enforce_quotation_revision_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Quotation revisions are permanent historical audit records and cannot be modified or deleted (Operation: %)', TG_OP 
  USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS trg_prc_quotation_revisions_immutable ON public.prc_quotation_revisions;
CREATE TRIGGER trg_prc_quotation_revisions_immutable
  BEFORE UPDATE OR DELETE ON public.prc_quotation_revisions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quotation_revision_immutability();

-- 2. Granular RLS Policy Separation (SEC-02)
-- Drop overly-permissive legacy policies
DROP POLICY IF EXISTS "Company staff access prc_rfqs" ON public.prc_rfqs;
DROP POLICY IF EXISTS "Company staff access prc_rfq_items" ON public.prc_rfq_items;
DROP POLICY IF EXISTS "Company staff access prc_quotations" ON public.prc_quotations;
DROP POLICY IF EXISTS "Company staff access prc_quotation_items" ON public.prc_quotation_items;
DROP POLICY IF EXISTS "Company staff access prc_quotation_revisions" ON public.prc_quotation_revisions;
DROP POLICY IF EXISTS "Company staff access prc_supplier_products" ON public.prc_supplier_products;

-- Table: prc_rfqs (Suppliers can ONLY read RFQs they are invited to; Company staff can manage)
DROP POLICY IF EXISTS "prc_rfqs_select_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_select_policy" ON public.prc_rfqs
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR rfq_id IN (SELECT rfq_id FROM public.prc_rfq_suppliers WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "prc_rfqs_insert_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_insert_policy" ON public.prc_rfqs
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prc_rfqs_update_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_update_policy" ON public.prc_rfqs
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prc_rfqs_delete_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_delete_policy" ON public.prc_rfqs
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

-- Table: prc_rfq_items (Suppliers can ONLY read items of invited RFQs; Company staff can manage)
DROP POLICY IF EXISTS "prc_rfq_items_select_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_select_policy" ON public.prc_rfq_items
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR rfq_id IN (SELECT rfq_id FROM public.prc_rfq_suppliers WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "prc_rfq_items_insert_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_insert_policy" ON public.prc_rfq_items
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prc_rfq_items_update_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_update_policy" ON public.prc_rfq_items
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prc_rfq_items_delete_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_delete_policy" ON public.prc_rfq_items
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

-- Table: prc_quotations (Isolation between suppliers; Staff can view all within tenant)
DROP POLICY IF EXISTS "prc_quotations_select_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_select_policy" ON public.prc_quotations
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR supplier_id = public.get_user_supplier_id(auth.uid())
  );

DROP POLICY IF EXISTS "prc_quotations_insert_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_insert_policy" ON public.prc_quotations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR supplier_id = public.get_user_supplier_id(auth.uid())
  );

DROP POLICY IF EXISTS "prc_quotations_update_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_update_policy" ON public.prc_quotations
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR (supplier_id = public.get_user_supplier_id(auth.uid()) AND status IN ('draft', 'submitted'))
  );

DROP POLICY IF EXISTS "prc_quotations_delete_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_delete_policy" ON public.prc_quotations
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR (supplier_id = public.get_user_supplier_id(auth.uid()) AND status = 'draft')
  );

-- Table: prc_quotation_items
DROP POLICY IF EXISTS "prc_quotation_items_select_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_select_policy" ON public.prc_quotation_items
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "prc_quotation_items_insert_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_insert_policy" ON public.prc_quotation_items
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "prc_quotation_items_update_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_update_policy" ON public.prc_quotation_items
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()) AND status IN ('draft', 'submitted'))
  );

DROP POLICY IF EXISTS "prc_quotation_items_delete_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_delete_policy" ON public.prc_quotation_items
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()) AND status IN ('draft', 'submitted'))
  );

-- Table: prc_quotation_revisions
DROP POLICY IF EXISTS "prc_quotation_revisions_select_policy" ON public.prc_quotation_revisions;
CREATE POLICY "prc_quotation_revisions_select_policy" ON public.prc_quotation_revisions
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

DROP POLICY IF EXISTS "prc_quotation_revisions_insert_policy" ON public.prc_quotation_revisions;
CREATE POLICY "prc_quotation_revisions_insert_policy" ON public.prc_quotation_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
    OR quotation_id IN (SELECT quotation_id FROM public.prc_quotations WHERE supplier_id = public.get_user_supplier_id(auth.uid()))
  );

-- 3. Hardened RPC: submit_vendor_quotation_revision (SEC-01)
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
  v_is_company_member boolean;
  v_caller_supplier_id uuid;
  v_is_supplier_owner boolean;
  -- Server-side verified totals
  v_calc_subtotal numeric(15,4) := 0;
  v_calc_discount numeric(15,4) := 0;
  v_calc_tax numeric(15,4) := 0;
  v_calc_total numeric(15,4) := 0;
  v_item_qty numeric(15,4);
  v_item_price numeric(15,4);
  v_item_disc_pct numeric(5,2);
  v_item_tax_pct numeric(5,2);
  v_item_line_subtotal numeric(15,4);
  v_item_line_disc numeric(15,4);
  v_item_line_taxable numeric(15,4);
  v_item_line_tax numeric(15,4);
  v_item_line_total numeric(15,4);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 1. Fetch quotation record
  SELECT company_id, supplier_id, status, current_revision_number 
  INTO v_company_id, v_supplier_id, v_quotation_status, v_next_rev
  FROM public.prc_quotations
  WHERE quotation_id = p_quotation_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Quotation % not found', p_quotation_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Strict IDOR & Authorization Verification (SEC-01)
  v_is_company_member := EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = v_user_id AND ucr.company_id = v_company_id
  );
  v_caller_supplier_id := public.get_user_supplier_id(v_user_id);
  v_is_supplier_owner := (v_caller_supplier_id IS NOT NULL AND v_caller_supplier_id = v_supplier_id);

  IF NOT (v_is_company_member OR v_is_supplier_owner) THEN
    RAISE EXCEPTION 'Access denied: user % is not authorized to submit revisions for quotation %', v_user_id, p_quotation_id 
    USING ERRCODE = '42501';
  END IF;

  -- 3. Lifecycle Status Guard
  IF v_quotation_status IN ('converted', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Cannot modify quotation in status %', v_quotation_status USING ERRCODE = '23514';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Quotation must contain at least one item' USING ERRCODE = '23514';
  END IF;

  -- 4. Server-Side Calculations & Financial Validation (FIN-01)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_item_price := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_item_disc_pct := COALESCE((v_item->>'discount_percentage')::numeric, 0);
    v_item_tax_pct := COALESCE((v_item->>'tax_percentage')::numeric, 0);

    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero (received %)', v_item_qty USING ERRCODE = '23514';
    END IF;

    IF v_item_price < 0 THEN
      RAISE EXCEPTION 'Unit price cannot be negative (received %)', v_item_price USING ERRCODE = '23514';
    END IF;

    IF v_item_disc_pct < 0 OR v_item_disc_pct > 100 THEN
      RAISE EXCEPTION 'Discount percentage must be between 0 and 100 (received %)', v_item_disc_pct USING ERRCODE = '23514';
    END IF;

    IF v_item_tax_pct < 0 THEN
      RAISE EXCEPTION 'Tax percentage cannot be negative (received %)', v_item_tax_pct USING ERRCODE = '23514';
    END IF;

    v_item_line_subtotal := round(v_item_qty * v_item_price, 4);
    v_item_line_disc := round(v_item_line_subtotal * (v_item_disc_pct / 100.0), 4);
    v_item_line_taxable := greatest(0, v_item_line_subtotal - v_item_line_disc);
    v_item_line_tax := round(v_item_line_taxable * (v_item_tax_pct / 100.0), 4);
    v_item_line_total := round(v_item_line_taxable + v_item_line_tax, 4);

    v_calc_subtotal := v_calc_subtotal + v_item_line_subtotal;
    v_calc_discount := v_calc_discount + v_item_line_disc;
    v_calc_tax := v_calc_tax + v_item_line_tax;
    v_calc_total := v_calc_total + v_item_line_total;
  END LOOP;

  v_next_rev := COALESCE(v_next_rev, 0) + 1;

  -- 5. Insert Immutable Revision Snapshot
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
    v_calc_subtotal,
    v_calc_discount,
    v_calc_tax,
    v_calc_total,
    COALESCE(p_currency, 'SAR'),
    greatest(0, COALESCE(p_lead_time_days, 0)),
    greatest(0, COALESCE(p_warranty_days, 0)),
    p_notes,
    p_terms,
    p_items,
    v_user_id
  );

  -- 6. Update Master Quotation Record
  UPDATE public.prc_quotations SET
    status = 'submitted',
    current_revision_number = v_next_rev,
    subtotal = v_calc_subtotal,
    discount_amount = v_calc_discount,
    tax_amount = v_calc_tax,
    total_amount = v_calc_total,
    currency = COALESCE(p_currency, 'SAR'),
    delivery_lead_time_days = greatest(0, COALESCE(p_lead_time_days, 0)),
    valid_until = p_validity_date,
    notes = p_notes,
    terms_and_conditions = p_terms,
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

  -- 7. Replace Line Items with Server-Verified Calculations
  DELETE FROM public.prc_quotation_items WHERE quotation_id = p_quotation_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_item_price := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_item_disc_pct := COALESCE((v_item->>'discount_percentage')::numeric, 0);
    v_item_tax_pct := COALESCE((v_item->>'tax_percentage')::numeric, 0);

    v_item_line_subtotal := round(v_item_qty * v_item_price, 4);
    v_item_line_disc := round(v_item_line_subtotal * (v_item_disc_pct / 100.0), 4);
    v_item_line_taxable := greatest(0, v_item_line_subtotal - v_item_line_disc);
    v_item_line_tax := round(v_item_line_taxable * (v_item_tax_pct / 100.0), 4);
    v_item_line_total := round(v_item_line_taxable + v_item_line_tax, 4);

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
      v_item_qty,
      COALESCE(v_item->>'unit_of_measure', 'حبة'),
      v_item_price,
      v_item_disc_pct,
      v_item_line_taxable / v_item_qty,
      v_item_tax_pct,
      v_item_line_total,
      v_item->>'vendor_sku',
      COALESCE(v_item->>'availability', 'in_stock'),
      greatest(0, COALESCE((v_item->>'lead_time_days')::integer, 0)),
      greatest(0, COALESCE((v_item->>'warranty_days')::integer, 0)),
      v_item->>'vendor_notes'
    );
  END LOOP;

  -- 8. Record Immutable Audit Event
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
    'revision_created',
    jsonb_build_object('revision', v_next_rev, 'total_amount', v_calc_total, 'currency', p_currency),
    jsonb_build_object('items_count', jsonb_array_length(p_items), 'subtotal', v_calc_subtotal, 'tax', v_calc_tax)
  );

  RETURN jsonb_build_object(
    'success', true,
    'quotation_id', p_quotation_id,
    'revision_number', v_next_rev,
    'total_amount', v_calc_total
  );
END;
$$;

-- 4. Hardened RPC: convert_quotation_to_po_transactional
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

  -- Only company employees can approve and convert quotations into internal POs
  v_company_id := public.verify_company_access(p_company_id);

  -- 1. Row-Level Lock with FOR UPDATE to prevent race-condition duplicates
  SELECT * INTO v_quote
  FROM public.prc_quotations
  WHERE quotation_id = p_quotation_id AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation % not found in company %', p_quotation_id, v_company_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Idempotency Check
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

  -- 3. Generate Sequential Purchase Order Number
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq
  FROM public.prc_purchase_orders
  WHERE company_id = v_company_id;

  v_po_number := 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq::text, 5, '0');

  -- 4. Create Purchase Order Header
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

  -- 5. Create Purchase Order Items
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

  -- 6. Lock quotation status to 'converted'
  UPDATE public.prc_quotations SET
    status = 'converted',
    converted_po_id = v_po_id,
    converted_at = now(),
    converted_by = v_user_id,
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

  -- 7. Audit Log
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

-- 5. Revoke anon execution & ensure proper grants
REVOKE ALL ON FUNCTION public.submit_vendor_quotation_revision(uuid, uuid, jsonb, numeric, numeric, numeric, numeric, text, integer, integer, date, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_vendor_quotation_revision(uuid, uuid, jsonb, numeric, numeric, numeric, numeric, text, integer, integer, date, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.convert_quotation_to_po_transactional(uuid, uuid, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_po_transactional(uuid, uuid, date, text) TO authenticated;

COMMIT;
