-- ============================================================
-- Migration: Fix commit_sales_invoice_v2 (sales invoice 400s)
-- Date: 2026-08-16
--
-- 12 schema/runtime bugs fixed (verified end-to-end):
--   1. invoices.idempotency_key column was missing (migration 20260816000005)
--   2. warehouses.is_default -> is_primary
--   3. invoices.invoice_date -> issue_date (x2)
--   4. invoices.total_tax -> tax_amount, payment_type -> payment_method
--   5. invoice_items.tax_rate -> tax_amount (computed)
--   6. inventory_transactions notes/performed_by -> unit_cost/total_cost/created_by
--   7. removed UPDATE parties SET balance (no such column; balances are computed)
--   8. FOR-loop var v_item jsonb -> record (uuid::json parse error)
--   9. tax total now COALESCE(... , 0) (NULL tax made tax_amount NOT NULL fail)
--  10. transaction_type 'sale' -> 'sales' (check constraint)
--  11. fn_auto_post_invoice_journal: draft->lines->posted ordering (migration 00004)
--  12. fn_auto_post_invoice_journal: v_net from total-tax (balanced journal)
-- ============================================================

CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(p_party_id uuid, p_invoice_date date, p_due_date date, p_items jsonb, p_payment_type text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_idempotency_key text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_available numeric;
  v_db_price numeric;
  v_min_allowed_price numeric;
  v_line_total numeric;
  v_total_amount numeric := 0;
  v_total_tax numeric := 0;
  v_warehouse_id uuid;
  v_stock_record record;
  v_party_name text;
BEGIN
  -- === AUTHENTICATION ===
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  -- === IDEMPOTENCY CHECK ===
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices
    WHERE company_id = v_company_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  -- === VALIDATION: Items must exist ===
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invoice must have at least one item';
  END IF;

  -- === GET DEFAULT WAREHOUSE ===
  SELECT id INTO v_warehouse_id FROM public.warehouses
  WHERE company_id = v_company_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  -- === GET PARTY NAME ===
  IF p_party_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id AND company_id = v_company_id;
  END IF;

  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric, warehouse_id uuid)
  LOOP
    -- Validate quantity
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity (%) for product %', v_item.quantity, v_item.product_id;
    END IF;

    -- Get DB price for validation
    SELECT sale_price INTO v_db_price FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in company', v_item.product_id;
    END IF;

    -- === PRICE VALIDATION (C4) ===
    -- Cannot sell below 70% of sale_price (configurable per business rules)
    v_min_allowed_price := v_db_price * 0.7;
    IF v_item.unit_price < v_min_allowed_price THEN
      RAISE EXCEPTION 'Price (%) below minimum allowed (%) for product %',
        v_item.unit_price, v_min_allowed_price, v_item.product_id;
    END IF;

    -- Validate tax rate
    IF v_item.tax_rate < 0 OR v_item.tax_rate > 100 THEN
      RAISE EXCEPTION 'Invalid tax rate (%) for product %', v_item.tax_rate, v_item.product_id;
    END IF;

    -- === STOCK CHECK WITH ROW LOCK (C3 + C9) ===
    -- SELECT ... FOR UPDATE locks the stock row, preventing concurrent modifications
    SELECT ps.quantity, ps.warehouse_id INTO v_stock_record
    FROM public.product_stock ps
    WHERE ps.product_id = v_item.product_id
      AND ps.warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND ps.company_id = v_company_id
    FOR UPDATE;  -- Row-level exclusive lock

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No stock record found for product % in warehouse', v_item.product_id;
    END IF;

    v_available := v_stock_record.quantity;

    IF v_available < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_item.product_id, v_available, v_item.quantity;
    END IF;

    -- Calculate totals (within the locked context)
    v_line_total := v_item.quantity * v_item.unit_price;
    v_total_amount := v_total_amount + v_line_total;
    v_total_tax := v_total_tax + COALESCE(v_line_total * v_item.tax_rate / 100, 0);
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  SELECT COALESCE('INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad((COUNT(*) + 1)::text, 4, '0'), 'INV-0001') INTO v_invoice_number
  FROM public.invoices
  WHERE company_id = v_company_id
    AND issue_date BETWEEN date_trunc('year', CURRENT_DATE) AND CURRENT_DATE + INTERVAL '1 day';

  -- === PHASE 3: CREATE INVOICE ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, payment_method, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount, v_total_tax, p_payment_type, 'posted', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + DEDUCT STOCK ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric, warehouse_id uuid)
  LOOP
    v_line_total := v_item.quantity * v_item.unit_price;

    -- Insert invoice item
    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, total, tax_amount, company_id
    ) VALUES (
      v_invoice_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      v_line_total, round(v_line_total * v_item.tax_rate / 100, 4), v_company_id
    );

    -- Deduct stock (row already locked from Phase 1)
    UPDATE public.product_stock
    SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE product_id = v_item.product_id
      AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND company_id = v_company_id;

    -- Record inventory movement
    INSERT INTO public.inventory_transactions (
      company_id, product_id, warehouse_id, quantity, transaction_type,
      reference_type, reference_id, unit_cost, total_cost, created_by
    ) VALUES (
      v_company_id, v_item.product_id, COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity, 'sales', 'sales_invoice', v_invoice_id,
      v_item.unit_price, v_line_total, v_user_id
    );
  END LOOP;

  -- === PHASE 5: UPDATE PARTY BALANCE ===
  -- Party balances are computed (see party_balances_by_currency); no stored column.

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  -- Automatic ROLLBACK of all changes (PostgreSQL transaction)
  RAISE;
END;
$function$
