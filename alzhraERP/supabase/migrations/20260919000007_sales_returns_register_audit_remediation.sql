-- ==============================================================================
-- Migration: 20260919000007_sales_returns_register_audit_remediation.sql
-- Description: Remediation of sales & returns register currency contradictions,
--              header-to-GL synchronization, and hardening of return RPCs and party stats.
-- ==============================================================================

DO $$
BEGIN
  -- Disable posted invoice immutability trigger temporarily for administrative sync
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guard_posted_invoice_immutability'
  ) THEN
    ALTER TABLE public.invoices DISABLE TRIGGER trg_guard_posted_invoice_immutability;
  END IF;

  -- 1. إصلاح ترويسة فاتورة شراء:18948 لتطابق قيدها المحاسبي الذي تم ترحيله بالريال اليمني
  UPDATE public.invoices
  SET currency_code = 'YER',
      exchange_rate = 410.000000
  WHERE id = '6d9d0820-fa37-4bc7-b0b0-7640bc2451da'
    AND currency_code = 'SAR';

  -- 2. إصلاح ترويسة مبيع:48573 ومبيع:11832 لتطابق قيودها المحاسبية
  UPDATE public.invoices
  SET currency_code = 'YER',
      exchange_rate = 410.000000
  WHERE id = 'afd831d1-e0fa-409b-a259-ea9a331cee91'
    AND currency_code = 'SAR';

  UPDATE public.invoices
  SET currency_code = 'YER',
      exchange_rate = 410.000000
  WHERE id = '08da3f29-7543-4fea-86d7-c05f088bfd33'
    AND currency_code = 'SAR';

  -- Re-enable immutability trigger
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guard_posted_invoice_immutability'
  ) THEN
    ALTER TABLE public.invoices ENABLE TRIGGER trg_guard_posted_invoice_immutability;
  END IF;
END $$;

-- 3. تحصين دالة إحصائيات الأطراف (العملاء والموردين) بتحويل المبالغ للعملة الأساسية وطرح المردودات
CREATE OR REPLACE FUNCTION public.sync_party_stats_on_invoice_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_party_id uuid;
  v_sales_paid numeric := 0;
  v_sales_returns numeric := 0;
  v_purchases_total numeric := 0;
  v_purchases_returns numeric := 0;
BEGIN
  v_party_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.party_id ELSE NEW.party_id END;
  IF v_party_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- حساب إجمالي مدفوعات العميل بالعملة الأساسية (مع طرح المردودات)
  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, paid_amount, exchange_rate)), 0)
  INTO v_sales_paid
  FROM public.invoices
  WHERE party_id = v_party_id AND type = 'sale'
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)), 0)
  INTO v_sales_returns
  FROM public.invoices
  WHERE party_id = v_party_id AND type IN ('sale_return', 'return_sale')
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  -- حساب إجمالي مشتريات المورد بالعملة الأساسية (مع طرح المردودات)
  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)), 0)
  INTO v_purchases_total
  FROM public.invoices
  WHERE party_id = v_party_id AND type = 'purchase'
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)), 0)
  INTO v_purchases_returns
  FROM public.invoices
  WHERE party_id = v_party_id AND type IN ('purchase_return', 'return_purchase')
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  UPDATE public.parties SET
    total_invoices_count = (
      SELECT COUNT(*) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'sale'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    total_paid_amount = GREATEST(0, ROUND(v_sales_paid - v_sales_returns, 4)),
    last_invoice_date = (
      SELECT MAX(issue_date) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'sale'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    total_orders_count = (
      SELECT COUNT(*) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'purchase'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    total_purchases_amount = GREATEST(0, ROUND(v_purchases_total - v_purchases_returns, 4)),
    last_purchase_date = (
      SELECT MAX(issue_date) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'purchase'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    updated_at = now()
  WHERE id = v_party_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. تحصين دالة إنشاء مرتجع المبيعات (process_sales_return)
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
  v_branch_id         UUID;
  v_orig_currency     TEXT;
  v_orig_rate         NUMERIC;
  v_effective_currency TEXT;
  v_effective_rate     NUMERIC;
  v_total_amount      NUMERIC := 0;
  v_subtotal          NUMERIC := 0;
  v_cost_total        NUMERIC := 0;
  v_warehouse_id      UUID;
  v_item              RECORD;
  v_catalog_sale      NUMERIC;
  v_catalog_cost      NUMERIC;
  v_price_ratio       NUMERIC;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- 1. التحقق والوراثة من الفاتورة الأصلية (إن وجدت)
  IF p_invoice_id IS NOT NULL THEN
    SELECT branch_id, currency_code, exchange_rate 
    INTO v_branch_id, v_orig_currency, v_orig_rate 
    FROM public.invoices 
    WHERE id = p_invoice_id AND company_id = p_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'الفاتورة الأصلية المرجعية غير موجودة أو لا تنتمي لهذه المنشأة';
    END IF;

    v_effective_currency := COALESCE(v_orig_currency, p_currency_code, 'SAR');
    v_effective_rate := COALESCE(v_orig_rate, p_exchange_rate, 1);
  ELSE
    v_effective_currency := COALESCE(p_currency_code, 'SAR');
    v_effective_rate := COALESCE(p_exchange_rate, 1);
  END IF;

  -- 2. التحقق من سلامة العملة وسعر الصرف للمرتجع
  IF v_effective_currency = 'SAR' AND v_effective_rate != 1 THEN
    v_effective_rate := 1;
  ELSIF v_effective_currency = 'YER' AND (v_effective_rate IS NULL OR v_effective_rate <= 1) THEN
    RAISE EXCEPTION 'سعر صرف الريال اليمني للمرتجع غير صالح (يجب أن يكون أكبر من 1)';
  END IF;

  -- 3. توليد رقم المرتجع التسلسلي
  v_invoice_number := public.generate_invoice_number(p_company_id, 'sale_return', v_branch_id);

  -- 4. فحص بنود المرتجع ومنع التناقضات السعرية أو الحسابية
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
  LOOP
    IF COALESCE(v_item.quantity, 0) <= 0 THEN
      RAISE EXCEPTION 'كمية الإرجاع يجب أن تكون أكبر من صفر';
    END IF;

    IF COALESCE(v_item.unit_price, 0) < 0 THEN
      RAISE EXCEPTION 'سعر بند الإرجاع لا يمكن أن يكون سالباً';
    END IF;

    IF v_item.product_id IS NOT NULL THEN
      SELECT sale_price, cost_price INTO v_catalog_sale, v_catalog_cost
      FROM public.products
      WHERE id = v_item.product_id AND company_id = p_company_id;

      IF FOUND AND v_catalog_sale > 0 THEN
        v_price_ratio := v_item.unit_price / v_catalog_sale;
        IF v_effective_currency = 'SAR' AND v_price_ratio > 40 THEN
          RAISE EXCEPTION 'السعر المدخل (%) مرتفع جداً مقارنة بكتالوج الصنف (%). تأكد من اختيار العملة المناسبة (YER vs SAR).',
            v_item.unit_price, v_catalog_sale;
        END IF;
        IF v_effective_currency = 'YER' AND v_item.unit_price < (v_catalog_sale * 2) THEN
          RAISE EXCEPTION 'السعر المدخل بالريال اليمني (%) منخفض جداً مقارنة بسعر الصنف الأساسي (%). تأكد من إدخال السعر بالريال اليمني.',
            v_item.unit_price, v_catalog_sale;
        END IF;
      END IF;
    END IF;

    v_subtotal := v_subtotal + (v_item.quantity * v_item.unit_price);
    v_cost_total := v_cost_total + (v_item.quantity * COALESCE(v_item.cost_price, v_catalog_cost, 0));
  END LOOP;

  v_total_amount := v_subtotal;

  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, branch_id, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', 'draft', p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    v_effective_currency, v_effective_rate, p_invoice_id,
    p_return_reason, v_branch_id, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

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

  IF p_status = 'posted' THEN
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND (v_branch_id IS NULL OR branch_id = v_branch_id)
    ORDER BY is_primary DESC, created_at ASC
    LIMIT 1;

    FOR v_item IN
      SELECT * FROM jsonb_to_recordset(p_items)
        AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
    LOOP
      IF v_item.product_id IS NOT NULL AND v_warehouse_id IS NOT NULL THEN
        PERFORM public.update_stock_atomic(
          p_company_id,
          v_item.product_id,
          v_warehouse_id,
          v_item.quantity
        );

        INSERT INTO public.inventory_transactions (
          company_id, product_id, warehouse_id,
          transaction_type, quantity, unit_cost, total_cost,
          reference_id, reference_type, created_by
        ) VALUES (
          p_company_id, v_item.product_id, v_warehouse_id,
          'in', v_item.quantity, COALESCE(v_item.cost_price, 0),
          v_item.quantity * COALESCE(v_item.cost_price, 0),
          v_return_invoice_id, 'sale_return', p_user_id
        );
      END IF;
    END LOOP;

    UPDATE public.invoices
    SET status = 'posted'
    WHERE id = v_return_invoice_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'return_invoice_id', v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'total_amount', v_total_amount,
    'currency_code', v_effective_currency,
    'exchange_rate', v_effective_rate,
    'branch_id', v_branch_id
  );
END;
$function$;

-- 5. إعادة احتساب إحصائيات العملاء والموردين الحالية
WITH party_sales AS (
  SELECT 
    party_id,
    COUNT(*) FILTER (WHERE type = 'sale') as invoices_count,
    COALESCE(SUM(public.fn_to_base_amount(currency_code, paid_amount, exchange_rate)) FILTER (WHERE type = 'sale'), 0) as sales_paid,
    COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)) FILTER (WHERE type IN ('sale_return', 'return_sale')), 0) as sales_returns,
    MAX(issue_date) FILTER (WHERE type = 'sale') as max_sale_date,
    COUNT(*) FILTER (WHERE type = 'purchase') as purchases_count,
    COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)) FILTER (WHERE type = 'purchase'), 0) as purchases_total,
    COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)) FILTER (WHERE type IN ('purchase_return', 'return_purchase')), 0) as purchases_returns,
    MAX(issue_date) FILTER (WHERE type = 'purchase') as max_purchase_date
  FROM public.invoices
  WHERE party_id IS NOT NULL 
    AND status NOT IN ('cancelled', 'void') 
    AND deleted_at IS NULL
  GROUP BY party_id
)
UPDATE public.parties p
SET 
  total_invoices_count = COALESCE(ps.invoices_count, 0),
  total_paid_amount = GREATEST(0, ROUND(COALESCE(ps.sales_paid, 0) - COALESCE(ps.sales_returns, 0), 4)),
  last_invoice_date = ps.max_sale_date,
  total_orders_count = COALESCE(ps.purchases_count, 0),
  total_purchases_amount = GREATEST(0, ROUND(COALESCE(ps.purchases_total, 0) - COALESCE(ps.purchases_returns, 0), 4)),
  last_purchase_date = ps.max_purchase_date,
  updated_at = now()
FROM party_sales ps
WHERE p.id = ps.party_id;
