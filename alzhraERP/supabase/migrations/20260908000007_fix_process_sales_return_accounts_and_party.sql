-- =========================================================================
-- Migration: 20260908000007_fix_process_sales_return_accounts_and_party.sql
-- Description:
--   Fix process_sales_return RPC:
--   1. Resolve postable cash account dynamically via fn_get_default_cash_account
--      instead of hardcoding non-postable parent account code '1010'
--      (which causes account_not_postable / 400 error).
--   2. Scope party_id on journal lines: set party_id strictly for credit/AR accounts,
--      leaving it NULL on cash credit lines.
--   3. Handle empty/invalid product_id gracefully during return item insertion.
-- =========================================================================

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
  -- [FIX أمني] التحقق من عضوية المستخدم في المنشأة
  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = p_user_id AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- ① التحقق من السنة المالية المفتوحة
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- ② توليد رقم الفاتورة
  v_invoice_number := public.get_next_invoice_number(p_company_id, 'RET');

  -- ③ حساب الإجماليات من الأصناف
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
  LOOP
    v_subtotal   := v_subtotal   + COALESCE(v_item.quantity * v_item.unit_price, 0);
    v_cost_total := v_cost_total + COALESCE(v_item.quantity * v_item.cost_price, 0);
  END LOOP;

  v_total_amount := v_subtotal;

  -- ④ إنشاء فاتورة المرتجع
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

  -- ⑤ إضافة أصناف الفاتورة
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

  -- ⑥ تحريك المخزون وإنشاء القيود المحاسبية عند الترحيل
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

    -- حل الحسابات المحاسبية مع التأكد التام من allow_posting = true
    -- 1) حساب الإيرادات (4100)
    SELECT id INTO v_account_revenue FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '4100' OR code LIKE '41%' OR (type = 'revenue' AND name_ar LIKE '%مبيعات%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '4100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- 2) حساب المدينون (1100)
    SELECT id INTO v_account_receivable FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '1100' OR code LIKE '110%' OR (type = 'asset' AND name_ar LIKE '%عملاء%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '1100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- 3) حساب الكاش (مطابق للعملة وقابل للترحيل)
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

    -- 4) حساب المخزون (1200)
    SELECT id INTO v_account_inventory FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '1200' OR code LIKE '12%' OR (type = 'asset' AND name_ar LIKE '%مخزون%'))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '1200' THEN 0 ELSE 1 END, code LIMIT 1;

    -- 5) حساب تكلفة البضاعة المباعة (5100)
    SELECT id INTO v_account_cogs FROM public.accounts
    WHERE company_id = p_company_id
      AND (code = '5100' OR code LIKE '51%' OR (type = 'expense' AND (name_ar LIKE '%تكلفة%' OR name_ar LIKE '%بضاعة مباعة%')))
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code = '5100' THEN 0 ELSE 1 END, code LIMIT 1;

    -- إنشاء رأس القيد كمسودة
    INSERT INTO public.journal_entries (
      company_id, entry_date, description, status,
      reference_type, reference_id, created_by
    ) VALUES (
      p_company_id, p_issue_date,
      'مرتجع مبيعات - ' || v_invoice_number,
      'draft', 'invoice', v_return_invoice_id, p_user_id
    ) RETURNING id INTO v_journal_id;

    -- سطر عكس الإيراد (مدين)
    IF v_account_revenue IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_account_revenue,
        ROUND(v_subtotal * p_exchange_rate, 4), 0,
        'عكس إيراد - مرتجع مبيعات',
        p_currency_code, p_exchange_rate, v_subtotal, p_company_id
      );
    END IF;

    -- سطر رد الكاش أو عكس المديونية (دائن)
    v_credit_account := CASE
      WHEN p_payment_method = 'cash' THEN v_account_cash
      ELSE v_account_receivable
    END;

    IF v_credit_account IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_credit_account, 
        CASE WHEN p_payment_method = 'cash' THEN NULL ELSE p_party_id END,
        0, ROUND(v_total_amount * p_exchange_rate, 4),
        CASE WHEN p_payment_method = 'cash'
             THEN 'رد نقدية للعميل'
             ELSE 'عكس مديونية العميل'
        END,
        p_currency_code, p_exchange_rate, v_total_amount, p_company_id
      );
    END IF;

    -- قيود تكلفة البضاعة والمخزون
    IF v_cost_total > 0
       AND v_account_inventory IS NOT NULL
       AND v_account_cogs IS NOT NULL
    THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES
      (
        v_journal_id, v_account_inventory,
        ROUND(v_cost_total * p_exchange_rate, 4), 0,
        'إرجاع بضاعة للمخزن',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      ),
      (
        v_journal_id, v_account_cogs,
        0, ROUND(v_cost_total * p_exchange_rate, 4),
        'عكس تكلفة البضاعة المباعة',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      );
    END IF;

    -- ترحيل القيد والفاتورة
    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_journal_id;
    UPDATE public.invoices SET status = 'posted' WHERE id = v_return_invoice_id;

  END IF;

  RETURN jsonb_build_object(
    'id',             v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'status',         'success'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) TO authenticated;
