-- =========================================================================
-- Migration: 20260912000003_harden_returns_and_purchase_link.sql
-- Description:
--   1. Harden process_sales_return:
--      - Validate return quantity is positive.
--      - Enforce return quantity ceiling when returning against a reference invoice:
--        cannot exceed original quantity minus already returned quantities.
--   2. Harden commit_purchase_return:
--      - Add p_reference_invoice_id parameter to link return to original purchase invoice.
--      - Enforce return ceiling against original purchase invoice items.
--      - Provide 9-param backward compatibility wrapper.
-- =========================================================================

-- 1. process_sales_return (with return quantity ceiling check)
CREATE OR REPLACE FUNCTION public.process_sales_return(
  p_invoice_id uuid,
  p_party_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_return_reason text,
  p_status text,
  p_notes text,
  p_issue_date date,
  p_currency_code text,
  p_exchange_rate numeric,
  p_company_id uuid,
  p_user_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_return_invoice_id UUID;
  v_invoice_number    TEXT;
  v_total_amount      NUMERIC := 0;
  v_subtotal          NUMERIC := 0;
  v_cost_total        NUMERIC := 0;
  v_warehouse_id      UUID;
  v_journal_id        UUID;
  v_item              RECORD;
  v_account_revenue   UUID;
  v_account_receivable UUID;
  v_account_cash      UUID;
  v_account_inventory UUID;
  v_account_cogs      UUID;
  v_credit_account    UUID;
BEGIN
  -- التحقق من صلاحية المستخدم
  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = p_user_id AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- التحقق من السنة المالية المفتوحة
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- توليد رقم الفاتورة
  v_invoice_number := public.get_next_invoice_number(p_company_id, 'RET');

  -- حساب الإجماليات والتحقق من سقف الكميات
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
  LOOP
    IF COALESCE(v_item.quantity, 0) <= 0 THEN
      RAISE EXCEPTION 'كمية الإرجاع يجب أن تكون أكبر من صفر';
    END IF;

    -- إذا كان المرتجع مرتبطاً بفاتورة أصلية، تحقق من عدم تجاوز الكمية المتبقية القابلة للإرجاع
    IF p_invoice_id IS NOT NULL AND v_item.product_id IS NOT NULL THEN
      DECLARE
        v_orig_qty NUMERIC := 0;
        v_prev_returned NUMERIC := 0;
      BEGIN
        SELECT COALESCE(SUM(ii.quantity), 0) INTO v_orig_qty
        FROM public.invoice_items ii
        WHERE ii.invoice_id = p_invoice_id AND ii.product_id = v_item.product_id;

        IF v_orig_qty > 0 THEN
          SELECT COALESCE(SUM(ret_ii.quantity), 0) INTO v_prev_returned
          FROM public.invoices ret_inv
          JOIN public.invoice_items ret_ii ON ret_ii.invoice_id = ret_inv.id
          WHERE ret_inv.reference_invoice_id = p_invoice_id
            AND ret_inv.type = 'sale_return'
            AND ret_inv.status <> 'void'
            AND ret_inv.deleted_at IS NULL
            AND ret_ii.product_id = v_item.product_id;

          IF (v_item.quantity + v_prev_returned) > v_orig_qty THEN
            RAISE EXCEPTION 'كمية الإرجاع المطلوبة (%) تتجاوز الكمية المتبقية القابلة للإرجاع (%) للفاتورة',
              v_item.quantity, GREATEST(0, v_orig_qty - v_prev_returned);
          END IF;
        END IF;
      END;
    END IF;

    v_subtotal   := v_subtotal   + COALESCE(v_item.quantity * v_item.unit_price, 0);
    v_cost_total := v_cost_total + COALESCE(v_item.quantity * v_item.cost_price, 0);
  END LOOP;

  v_total_amount := v_subtotal;

  -- إنشاء فاتورة المرتجع
  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', 'draft', p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    p_currency_code, p_exchange_rate, p_invoice_id,
    p_return_reason, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

  -- إضافة أصناف الفاتورة
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, total, cost_price, tax_amount, company_id
  )
  SELECT
    v_return_invoice_id,
    CASE 
      WHEN (item->>'product_id') IS NOT NULL AND (item->>'product_id') ~ '^[0-9a-fA-F-]{36}$'
      THEN (item->>'product_id')::UUID 
      ELSE NULL 
    END,
    COALESCE((item->>'name'), ''),
    COALESCE((item->>'quantity')::NUMERIC, 0),
    COALESCE((item->>'unit_price')::NUMERIC, 0),
    COALESCE((item->>'quantity')::NUMERIC, 0) * COALESCE((item->>'unit_price')::NUMERIC, 0),
    COALESCE((item->>'cost_price')::NUMERIC, 0),
    0,
    p_company_id
  FROM jsonb_array_elements(p_items) AS item;

  -- تحريك المخزون وإنشاء القيود المحاسبية عند الترحيل
  IF p_status = 'posted' THEN
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND is_primary = true AND deleted_at IS NULL
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id
      FROM public.warehouses
      WHERE company_id = p_company_id AND deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF v_warehouse_id IS NOT NULL THEN
      FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items)
          AS x(product_id uuid, quantity numeric, cost_price numeric)
      LOOP
        IF v_item.product_id IS NOT NULL THEN
          INSERT INTO public.inventory_transactions (
            company_id, product_id, warehouse_id, quantity, unit_cost,
            transaction_type, reference_type, reference_id, created_by
          ) VALUES (
            p_company_id, v_item.product_id, v_warehouse_id, v_item.quantity,
            COALESCE(v_item.cost_price, 0),
            'sales_return', 'invoice', v_return_invoice_id, p_user_id
          );
        END IF;
      END LOOP;
    END IF;

    -- حساب الإيرادات (4100)
    SELECT id INTO v_account_revenue FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '4100' OR code LIKE '41%' OR (type = 'revenue' AND name_ar LIKE '%مبيعات%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '4100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- حساب المدينون (1100)
    SELECT id INTO v_account_receivable FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '1100' OR code LIKE '110%' OR (type = 'asset' AND name_ar LIKE '%عملاء%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '1100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- حساب الكاش
    v_account_cash := public.fn_get_default_cash_account(p_company_id, p_currency_code);
    IF v_account_cash IS NULL THEN
      SELECT id INTO v_account_cash FROM public.accounts
      WHERE company_id = p_company_id
        AND (code LIKE '101%' OR code LIKE '1101%' OR (type = 'asset' AND (name_ar LIKE '%صندوق%' OR name_ar LIKE '%نقد%' OR name_ar LIKE '%كاش%')))
        AND allow_posting = true AND is_active = true AND deleted_at IS NULL
      ORDER BY CASE WHEN currency_code = p_currency_code THEN 0 ELSE 1 END, code LIMIT 1;
    END IF;
    IF v_account_cash IS NULL THEN
      SELECT id INTO v_account_cash FROM public.accounts
      WHERE company_id = p_company_id
        AND type = 'asset' AND allow_posting = true AND is_active = true AND deleted_at IS NULL
      ORDER BY code LIMIT 1;
    END IF;

    -- حساب المخزون (1200)
    SELECT id INTO v_account_inventory FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '1200' OR code LIKE '120%' OR (type = 'asset' AND name_ar LIKE '%مخزون%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '1200' THEN 0 ELSE 1 END, code LIMIT 1;

    -- حساب تكلفة المبيعات (5100)
    SELECT id INTO v_account_cogs FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '5100' OR code LIKE '510%' OR (type = 'expense' AND (name_ar LIKE '%تكلفة المبيعات%' OR name_ar LIKE '%تكلفة بضاعة%')))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '5100' THEN 0 ELSE 1 END, code LIMIT 1;

    IF v_account_revenue IS NULL THEN RAISE EXCEPTION 'حساب الإيرادات (4100) مفقود'; END IF;
    IF p_payment_method = 'credit' AND v_account_receivable IS NULL THEN RAISE EXCEPTION 'حساب المدينون (1100) مفقود'; END IF;
    IF p_payment_method <> 'credit' AND v_account_cash IS NULL THEN RAISE EXCEPTION 'حساب الصندوق/البنك مفقود'; END IF;

    v_credit_account := CASE WHEN p_payment_method = 'credit' THEN v_account_receivable ELSE v_account_cash END;

    INSERT INTO public.journal_entries (
      company_id, entry_date, description, reference_type,
      reference_id, status, created_by
    ) VALUES (
      p_company_id, p_issue_date, 'مرتجع مبيعات ' || v_invoice_number,
      'sales_return', v_return_invoice_id, 'draft', p_user_id
    ) RETURNING id INTO v_journal_id;

    -- 1. طرف المدين: إيرادات المبيعات (تخفيض الإيراد)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, debit_amount,
      credit_amount, description, currency_code, exchange_rate, company_id
    ) VALUES (
      v_journal_id, v_account_revenue, NULL, v_total_amount * COALESCE(p_exchange_rate, 1),
      0, 'تخفيض إيراد مبيعات - ' || v_invoice_number,
      p_currency_code, p_exchange_rate, p_company_id
    );

    -- 2. طرف الدائن: العميل أو الصندوق
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, debit_amount,
      credit_amount, description, currency_code, exchange_rate, company_id
    ) VALUES (
      v_journal_id, v_credit_account,
      CASE WHEN p_payment_method = 'credit' THEN p_party_id ELSE NULL END,
      0, v_total_amount * COALESCE(p_exchange_rate, 1),
      CASE WHEN p_payment_method = 'credit' THEN 'تخفيض ذمة عميل - ' ELSE 'رد نقدية للعميل - ' END || v_invoice_number,
      p_currency_code, p_exchange_rate, p_company_id
    );

    -- 3. قيد تكلفة البضاعة المباعة (إرجاع المخزون)
    IF v_cost_total > 0 AND v_account_inventory IS NOT NULL AND v_account_cogs IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount,
        credit_amount, description, currency_code, exchange_rate, company_id
      ) VALUES (
        v_journal_id, v_account_inventory, NULL, v_cost_total * COALESCE(p_exchange_rate, 1),
        0, 'إرجاع بضاعة للمخزون - ' || v_invoice_number,
        p_currency_code, p_exchange_rate, p_company_id
      );

      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount,
        credit_amount, description, currency_code, exchange_rate, company_id
      ) VALUES (
        v_journal_id, v_account_cogs, NULL, 0,
        v_cost_total * COALESCE(p_exchange_rate, 1), 'تخفيض تكلفة المبيعات - ' || v_invoice_number,
        p_currency_code, p_exchange_rate, p_company_id
      );
    END IF;

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_journal_id;
  END IF;

  UPDATE public.invoices SET status = p_status WHERE id = v_return_invoice_id;

  RETURN jsonb_build_object(
    'id', v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'total_amount', v_total_amount,
    'status', p_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) TO authenticated;


-- 2. commit_purchase_return (with reference_invoice_id and quantity ceiling)
CREATE OR REPLACE FUNCTION public.commit_purchase_return(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_notes text,
  p_currency text,
  p_exchange_rate numeric,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_return_reason text DEFAULT NULL::text,
  p_reference_invoice_id uuid DEFAULT NULL::uuid
)
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

  INSERT INTO invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    notes, created_by, currency_code, exchange_rate, tax_amount, subtotal, total_amount,
    return_reason, reference_invoice_id
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_invoice_number,
    'purchase_return', 'draft',
    p_notes, p_user_id, p_currency, p_exchange_rate, 0, 0, 0,
    COALESCE(NULLIF(trim(p_return_reason), ''), 'مرتجع مشتريات'),
    p_reference_invoice_id
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

      -- إذا كان المرتجع مرتبطاً بفاتورة شراء أصلية، تحقق من عدم تجاوز الكمية
      IF p_reference_invoice_id IS NOT NULL THEN
        DECLARE
          v_orig_qty numeric := 0;
          v_prev_returned numeric := 0;
        BEGIN
          SELECT COALESCE(SUM(ii.quantity), 0) INTO v_orig_qty
          FROM public.invoice_items ii
          WHERE ii.invoice_id = p_reference_invoice_id AND ii.product_id = v_product.id;

          IF v_orig_qty > 0 THEN
            SELECT COALESCE(SUM(ret_ii.quantity), 0) INTO v_prev_returned
            FROM public.invoices ret_inv
            JOIN public.invoice_items ret_ii ON ret_ii.invoice_id = ret_inv.id
            WHERE ret_inv.reference_invoice_id = p_reference_invoice_id
              AND ret_inv.type = 'purchase_return'
              AND ret_inv.status <> 'void'
              AND ret_inv.deleted_at IS NULL
              AND ret_ii.product_id = v_product.id;

            IF (v_qty + v_prev_returned) > v_orig_qty THEN
              RAISE EXCEPTION 'كمية الإرجاع المطلوبة (%) تتجاوز الكمية المتبقية القابلة للإرجاع (%) للمنتج "%"',
                v_qty, GREATEST(0, v_orig_qty - v_prev_returned), v_product.name_ar;
            END IF;
          END IF;
        END;
      END IF;

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
  UPDATE invoices SET status='posted' WHERE id=v_invoice_id;

  RETURN jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', v_base_total, 'currency', p_currency, 'status', 'posted'
  );
END;
$function$;

-- غلاف التوافق للخلف (9 وسائط)
CREATE OR REPLACE FUNCTION public.commit_purchase_return(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_notes text,
  p_currency text,
  p_exchange_rate numeric,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_return_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.commit_purchase_return(
    p_company_id, p_user_id, p_supplier_id, p_items, p_notes,
    p_currency, p_exchange_rate, p_branch_id, p_return_reason, NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid, text) TO authenticated;

-- =========================================================================
-- 3. Fix commit_purchase_invoice status to 'paid' when paid in full or cash
-- =========================================================================
CREATE OR REPLACE FUNCTION public.commit_purchase_invoice(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_exchange_rate numeric DEFAULT 1.0,
  p_currency text DEFAULT 'SAR'::text,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_payment_method text DEFAULT 'credit'::text,
  p_payment_account_id uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text,
  p_invoice_number text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_due_date date DEFAULT NULL::date,
  p_paid_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid                  uuid := auth.uid();
  v_invoice_id           uuid;
  v_gen_number           text;
  v_subtotal             numeric(14,4) := 0;
  v_tax_total            numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              record;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_qty                  numeric;
  v_unit_cost            numeric;
  v_item_tax             numeric;
  v_item_discount        numeric;
  v_line_total           numeric;
  v_actual_paid          numeric;
  v_status               text;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = v_uid AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'تاريخ الفاتورة يقع خارج سنة مالية مفتوحة';
  END IF;

  IF COALESCE(p_exchange_rate, 0) <= 0 THEN
    RAISE EXCEPTION 'سعر الصرف يجب أن يكون أكبر من صفر';
  END IF;

  SELECT id INTO v_primary_wh_id FROM warehouses
  WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id = p_branch_id) AND is_primary=true AND deleted_at IS NULL LIMIT 1;
  IF v_primary_wh_id IS NULL THEN
    SELECT id INTO v_primary_wh_id FROM warehouses
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id = p_branch_id) AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF v_primary_wh_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستودع مُعرَّف للشركة/الفرع';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id=p_company_id AND code='2100') THEN
    RAISE EXCEPTION 'حساب الدائنين (2100) غير موجود';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id=p_company_id AND code='1200') THEN
    RAISE EXCEPTION 'حساب المخزون (1200) غير موجود';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_company_id::text || ':purchase'));

  v_gen_number := CASE
    WHEN p_invoice_number IS NOT NULL AND TRIM(p_invoice_number) != ''
    THEN p_invoice_number
    ELSE get_next_invoice_number(p_company_id, 'purchase')
  END;

  INSERT INTO invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    issue_date, due_date, notes, created_by, currency_code, exchange_rate,
    payment_method, payment_account_id, subtotal, tax_amount, total_amount, paid_amount
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_gen_number, 'purchase', 'draft',
    p_issue_date, p_due_date, p_notes, v_uid, p_currency, p_exchange_rate,
    p_payment_method, p_payment_account_id, 0, 0, 0, 0
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products
    WHERE id=(v_item->>'product_id')::uuid AND company_id=p_company_id AND deleted_at IS NULL;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_item->>'product_id';
    END IF;

    v_qty          := COALESCE((v_item->>'quantity')::numeric, 0);
    v_unit_cost    := COALESCE((v_item->>'unit_cost')::numeric, (v_item->>'unit_price')::numeric, v_product.purchase_price);
    v_item_tax     := COALESCE((v_item->>'tax_amount')::numeric, 0);
    v_item_discount:= COALESCE((v_item->>'discount_amount')::numeric, 0);
    v_line_total   := ROUND((v_qty * v_unit_cost) - v_item_discount + v_item_tax, 4);

    IF v_qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;

    INSERT INTO invoice_items(
      invoice_id, product_id, description, quantity,
      unit_price, cost_price, discount_amount, tax_amount,
      tax_rate_id, total, company_id
    ) VALUES (
      v_invoice_id, v_product.id, v_product.name_ar, v_qty,
      v_unit_cost, v_unit_cost, v_item_discount, v_item_tax,
      NULLIF(v_item->>'tax_rate_id','')::uuid,
      v_line_total, p_company_id
    );

    INSERT INTO inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, reference_id, created_by,
      unit_cost, total_cost
    ) VALUES (
      p_company_id, v_product.id, v_primary_wh_id, v_qty,
      'purchase', 'invoice', v_invoice_id, v_uid,
      v_unit_cost, ROUND(v_qty * v_unit_cost, 4)
    );

    v_subtotal  := v_subtotal  + ROUND(v_qty * v_unit_cost - v_item_discount, 4);
    v_tax_total := v_tax_total + v_item_tax;
  END LOOP;

  v_total := v_subtotal + v_tax_total;

  IF COALESCE(p_payment_method,'credit') <> 'credit' THEN
    v_actual_paid := v_total;
    v_status := 'paid';
  ELSE
    v_actual_paid := LEAST(v_total, GREATEST(0, COALESCE(p_paid_amount, 0)));
    IF v_actual_paid >= v_total THEN
      v_status := 'paid';
    ELSIF v_actual_paid > 0 THEN
      v_status := 'partially_paid';
    ELSE
      v_status := 'posted';
    END IF;
  END IF;

  UPDATE invoices
  SET subtotal = v_subtotal,
      tax_amount = v_tax_total,
      total_amount = v_total,
      paid_amount = v_actual_paid,
      status = v_status
  WHERE id = v_invoice_id;

  SELECT je.id INTO v_journal_id
  FROM journal_entries je
  WHERE je.reference_id = v_invoice_id
    AND je.reference_type = 'purchase_invoice'
    AND je.deleted_at IS NULL
  LIMIT 1;

  IF v_journal_id IS NULL THEN
    RAISE EXCEPTION 'فشل الترحيل المحاسبي التلقائي لفاتورة الشراء % - لم يُنشأ أي قيد', v_gen_number;
  END IF;

  RETURN jsonb_build_object(
    'id',             v_invoice_id,
    'invoice_number', v_gen_number,
    'total_amount',   v_total,
    'tax_amount',     v_tax_total,
    'currency',       p_currency,
    'exchange_rate',  p_exchange_rate,
    'status',         v_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date, numeric) TO authenticated;

