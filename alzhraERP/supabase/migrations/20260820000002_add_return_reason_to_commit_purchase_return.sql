-- ============================================================
-- FIX: commit_purchase_return never set invoices.return_reason,
--      so the live check constraint `chk_return_needs_reason`
--      (type IN ('sale_return','purchase_return') → return_reason
--      NOT NULL) rejected the invoice INSERT with SQLSTATE 23514
--      → every purchase return failed with HTTP 400 (this is the
--      SECOND 23514 in that function; the journal posted-first bug
--      was fixed in 20260820000001).
--
-- Upgrade for already-applied 20260820000001:
--   * Add trailing `p_return_reason text DEFAULT NULL` (existing
--     named-arg callers keep working; PostgREST picks this overload).
--   * Persist it to invoices.return_reason (default Arabic reason
--     when absent, so chk_return_needs_reason is always satisfied).
--   * Drop the old 8-arg overload (CREATE OR REPLACE with changed
--     args creates a NEW overload — same pattern as the p_due_date
--     migration) and grant EXECUTE on the new overload.
-- Date: 2026-08-20
-- ============================================================

CREATE OR REPLACE FUNCTION public.commit_purchase_return(p_company_id uuid, p_user_id uuid, p_supplier_id uuid, p_items jsonb, p_notes text, p_currency text, p_exchange_rate numeric, p_branch_id uuid DEFAULT NULL::uuid, p_return_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id           uuid;
  v_invoice_number       text;
  v_subtotal             numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              RECORD;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_payable_account_id   uuid;
  v_inventory_account_id uuid;
  v_base_total           numeric(14,4);
  v_base_subtotal        numeric(14,4);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND CURRENT_DATE BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  SELECT id INTO v_primary_wh_id FROM warehouses
    WHERE company_id=p_company_id AND (p_branch_id is null or branch_id=p_branch_id) AND is_primary=true LIMIT 1;
  IF v_primary_wh_id IS NULL THEN
    SELECT id INTO v_primary_wh_id FROM warehouses WHERE company_id=p_company_id AND (p_branch_id is null or branch_id=p_branch_id) LIMIT 1;
  END IF;
  IF v_primary_wh_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستودع للفرع';
  END IF;

  SELECT id INTO v_payable_account_id
    FROM accounts WHERE company_id=p_company_id AND code='2100' LIMIT 1;
  IF v_payable_account_id IS NULL THEN RAISE EXCEPTION 'حساب الدائنين (2100) مفقود'; END IF;

  SELECT id INTO v_inventory_account_id
    FROM accounts WHERE company_id=p_company_id AND code='1200' LIMIT 1;
  IF v_inventory_account_id IS NULL THEN RAISE EXCEPTION 'حساب المخزون (1200) مفقود'; END IF;

  v_invoice_number := get_next_invoice_number(p_company_id, 'RPR');

  -- تُدرج الفاتورة كمسودة ثم تُرحَّل بعد اكتمال القيد المحاسبي (أسفل الدالة)
  -- حتى لا ينشئ trigger fn_auto_post_invoice_journal قيداً صفرياً مكرراً.
  INSERT INTO invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    notes, created_by, currency_code, exchange_rate, tax_amount, subtotal, total_amount,
    return_reason
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_invoice_number,
    'purchase_return', 'draft',
    p_notes, p_user_id, p_currency, p_exchange_rate, 0, 0, 0,
    COALESCE(NULLIF(trim(p_return_reason), ''), 'مرتجع مشتريات')
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products
      WHERE id=(v_item->>'product_id')::uuid
        AND company_id=p_company_id AND deleted_at IS NULL;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_item->>'product_id';
    END IF;

    DECLARE
      v_qty       numeric := (v_item->>'quantity')::numeric;
      v_unit_cost numeric := COALESCE((v_item->>'unit_cost')::numeric, v_product.purchase_price);
      v_discount  numeric := COALESCE((v_item->>'discount_amount')::numeric, 0);
      v_line_sub  numeric := (v_qty * v_unit_cost) - v_discount;
    BEGIN
      IF v_qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;

      INSERT INTO invoice_items(
        invoice_id, product_id, description, quantity,
        unit_price, cost_price, discount_amount, tax_amount, total, company_id
      ) VALUES (
        v_invoice_id, v_product.id, v_product.name_ar, v_qty,
        v_unit_cost, v_unit_cost, v_discount, 0, v_line_sub, p_company_id
      );

      INSERT INTO inventory_transactions(
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by,
        unit_cost, total_cost
      ) VALUES (
        p_company_id, v_product.id, v_primary_wh_id, v_qty,
        'purchase_return', 'invoice', v_invoice_id, p_user_id,
        v_unit_cost, round(v_qty * v_unit_cost, 4)
      );

      v_subtotal := v_subtotal + v_line_sub;
    END;
  END LOOP;

  v_total := v_subtotal;
  UPDATE invoices SET subtotal=v_subtotal, tax_amount=0, total_amount=v_total WHERE id=v_invoice_id;

  v_base_subtotal := ROUND(v_subtotal * p_exchange_rate, 4);
  v_base_total    := ROUND(v_total    * p_exchange_rate, 4);

  -- [FIX] رأس القيد كمسودة أولاً ثم البنود ثم الترحيل:
  -- trg_journal_entry_lines_immutability يمنع إضافة بنود لقيد مرحَّل (SQLSTATE 23514).
  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, CURRENT_DATE, 'مرتجع مشتريات ' || v_invoice_number,
    'purchase_return', v_invoice_id, 'draft', p_user_id
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_entry_lines(
    journal_entry_id, account_id, party_id, debit_amount, credit_amount,
    description, currency_code, exchange_rate, foreign_amount, company_id, branch_id
  ) VALUES
    (v_journal_id, v_payable_account_id, p_supplier_id, v_base_total, 0,
     'تخفيض ذمم المورد - ' || v_invoice_number, p_currency, p_exchange_rate, v_total, p_company_id, p_branch_id),
    (v_journal_id, v_inventory_account_id, NULL, 0, v_base_subtotal,
     'خصم مخزون مرتجع - ' || v_invoice_number, p_currency, p_exchange_rate, v_subtotal, p_company_id, p_branch_id);

  UPDATE journal_entries SET status='posted' WHERE id=v_journal_id;

  -- ترحيل الفاتورة بعد اكتمال القيد — trigger fn_auto_post_invoice_journal
  -- سيتحقق من v_already_posted فيتخطى (لا قيد تلقائي ثانٍ).
  UPDATE invoices SET status='posted' WHERE id=v_invoice_id;

  RETURN jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', v_base_total, 'currency', p_currency, 'status', 'posted'
  );
END;
$function$;

-- Drop the old 8-arg overload (no ambiguity for PostgREST) + harden the new one:
-- a CREATE OR REPLACE with changed args creates a NEW function object that
-- inherits the default PUBLIC/anon EXECUTE — restore the anon block.
DROP FUNCTION IF EXISTS public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid);
REVOKE EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text) TO authenticated;

