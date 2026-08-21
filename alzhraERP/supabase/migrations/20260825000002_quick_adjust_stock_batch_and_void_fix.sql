-- ============================================================
-- Migration: 20260825000002_quick_adjust_stock_batch_and_void_fix.sql
-- 1) Atomic batch inventory adjustment RPC with deterministic row locks
-- 2) Update void_invoice to reverse inventory across all invoice reference types
-- 3) Enforce security_invoker = true on party_balances_by_currency
-- 4) Revoke EXECUTE from anon and PUBLIC on sensitive administrative functions
-- ============================================================

-- 1) quick_adjust_stock_batch
-- ============================================================
CREATE OR REPLACE FUNCTION public.quick_adjust_stock_batch(
    p_company_id uuid,
    p_items jsonb,
    p_notes text DEFAULT 'manual_batch_adjustment'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_user_id       uuid;
    v_company_id    uuid;
    v_item          record;
    v_product       record;
    v_warehouse     record;
    v_current_stock numeric;
    v_target_qty    numeric;
    v_diff          numeric;
    v_adjusted_count integer := 0;
    v_txn_type      text;
BEGIN
    -- === AUTHENTICATION & TENANT VERIFICATION ===
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_company_id := public.verify_company_access(p_company_id);

    -- === ROLE / PERMISSION AUTHORIZATION ===
    IF NOT (public.user_is_admin_or_manager(v_company_id) OR public.has_permission('inventory:adjust', v_company_id)) THEN
        RAISE EXCEPTION 'ليس لديك صلاحية تسوية المخزون' USING ERRCODE = '42501';
    END IF;

    -- === VALIDATION: Items array must not be empty ===
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'قائمة أصناف التسوية فارغة' USING ERRCODE = '22023';
    END IF;

    -- === PHASE 1: ROW LOCKING & ATOMIC ADJUSTMENTS ===
    -- Process items ordered by product_id, warehouse_id to prevent deadlocks
    FOR v_item IN
        SELECT 
            (x.val->>'product_id')::uuid AS product_id,
            (x.val->>'warehouse_id')::uuid AS warehouse_id,
            (x.val->>'quantity')::numeric AS quantity
        FROM jsonb_array_elements(p_items) AS x(val)
        ORDER BY 1, 2
    LOOP
        IF v_item.product_id IS NULL OR v_item.warehouse_id IS NULL THEN
            RAISE EXCEPTION 'معرف المنتج أو المستودع غير صالح' USING ERRCODE = '22023';
        END IF;

        IF v_item.quantity IS NULL OR v_item.quantity < 0 THEN
            RAISE EXCEPTION 'الكمية المستهدفة يجب أن تكون صفراً أو قيمة موجبة' USING ERRCODE = '22023';
        END IF;

        -- Verify product belongs to company
        SELECT id, purchase_price, cost_price INTO v_product
        FROM public.products
        WHERE id = v_item.product_id AND company_id = v_company_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج غير موجود أو لا ينتمي للمنشأة: %', v_item.product_id USING ERRCODE = '22023';
        END IF;

        -- Verify warehouse belongs to company
        SELECT id INTO v_warehouse
        FROM public.warehouses
        WHERE id = v_item.warehouse_id AND company_id = v_company_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المستودع غير موجود أو لا ينتمي للمنشأة: %', v_item.warehouse_id USING ERRCODE = '22023';
        END IF;

        -- Lock the stock row (or create if not existing)
        SELECT quantity INTO v_current_stock
        FROM public.product_stock
        WHERE product_id = v_item.product_id AND warehouse_id = v_item.warehouse_id AND company_id = v_company_id
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_stock := 0;
        END IF;

        v_target_qty := v_item.quantity;
        v_diff := v_target_qty - v_current_stock;

        -- If quantity changed, record transaction
        IF v_diff <> 0 THEN
            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_company_id,
                v_item.product_id,
                v_item.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'manual_adjustment',
                NULL,
                v_user_id
            );

            v_adjusted_count := v_adjusted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'adjusted_count', v_adjusted_count
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.quick_adjust_stock_batch(uuid, jsonb, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.quick_adjust_stock_batch(uuid, jsonb, text) TO authenticated;


-- 2) Update void_invoice to handle all invoice reference types
-- ============================================================
CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_invoice   RECORD;
  v_new_jes   uuid[];
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found: %', p_invoice_id;
  END IF;
  IF v_invoice.status = 'void' THEN
    RAISE EXCEPTION 'already_void: الفاتورة ملغية مسبقاً';
  END IF;
  IF v_invoice.status = 'draft' THEN
    UPDATE invoices SET status='void', updated_at=now() WHERE id=p_invoice_id;
    RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'note','draft_cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_invoice.company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = v_invoice.company_id
      AND CURRENT_DATE BETWEEN start_date AND end_date AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'fiscal_year_closed: لا يمكن إلغاء فاتورة في سنة مالية مغلقة';
  END IF;

  -- Reverse inventory across all supported invoice reference types:
  -- 'sales_invoice' (for sales invoices), 'invoice' / 'purchase_invoice' (for purchases), 'purchase_return', 'sale_return'
  PERFORM public.fn_reverse_inventory_for_reference(
    p_invoice_id,
    ARRAY['invoice', 'sales_invoice', 'purchase_invoice', 'sale_return', 'purchase_return'],
    'void_invoice'
  );

  -- Reverse all linked journal entries atomically
  v_new_jes := public.fn_reverse_journal_entries(
    p_invoice_id,
    ARRAY['sales_invoice','purchase_invoice','sale_return','purchase_return','receipt_bond','payment_bond'],
    'invoice_void',
    'عكس: ' || v_invoice.invoice_number || ' - ',
    auth.uid(), v_invoice.company_id
  );

  UPDATE invoices SET status = 'void', paid_amount = 0, updated_at = now() WHERE id = p_invoice_id;

  -- Soft delete payment allocations and payments
  UPDATE payment_allocations SET deleted_at = now() WHERE invoice_id = p_invoice_id AND deleted_at IS NULL;

  UPDATE payments
  SET status = 'void', updated_at = now()
  WHERE company_id = v_invoice.company_id AND deleted_at IS NULL AND status != 'void'
    AND id IN (SELECT pa.payment_id FROM payment_allocations pa WHERE pa.invoice_id = p_invoice_id);

  RETURN jsonb_build_object(
    'success', true, 'invoice_id', p_invoice_id, 'invoice_number', v_invoice.invoice_number,
    'reversal_journal_ids', v_new_jes
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.void_invoice(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_invoice(uuid) TO authenticated;


-- 3) Enforce security_invoker on party_balances_by_currency
-- ============================================================
ALTER VIEW public.party_balances_by_currency SET (security_invoker = true);


-- 4) Harden privileges on administrative & permission functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.set_member_permissions(uuid, uuid, text[], text[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_member_permissions(uuid, uuid, text[], text[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_member_effective_permissions(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_effective_permissions(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_can_access_branch(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_branch(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_can_manage_debts(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_manage_debts(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_is_admin_or_manager(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_admin_or_manager(uuid) TO authenticated;
