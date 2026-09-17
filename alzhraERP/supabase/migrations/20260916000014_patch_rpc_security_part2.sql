-- Migration to patch SECURITY DEFINER RPCs with verify_company_access

CREATE OR REPLACE FUNCTION public.api_v1_prc_update_supplier_terms(p_company_id uuid, p_supplier_id uuid, p_payment_terms character varying, p_credit_limit numeric DEFAULT 0, p_credit_days smallint DEFAULT 0, p_incoterm character varying DEFAULT NULL::character varying, p_shipping_terms character varying DEFAULT NULL::character varying, p_delivery_method character varying DEFAULT NULL::character varying, p_return_policy text DEFAULT NULL::text, p_warranty_terms text DEFAULT NULL::text, p_penalty_rules text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM prc_suppliers WHERE supplier_id = p_supplier_id AND company_id = p_company_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier not found.');
    END IF;
    INSERT INTO prc_supplier_terms (
        company_id, supplier_id, payment_terms, credit_limit, credit_days,
        incoterm, shipping_terms, delivery_method, return_policy, warranty_terms, penalty_rules
    ) VALUES (
        p_company_id, p_supplier_id, p_payment_terms, p_credit_limit, p_credit_days,
        p_incoterm, p_shipping_terms, p_delivery_method, p_return_policy, p_warranty_terms, p_penalty_rules
    )
    ON CONFLICT (supplier_id) DO UPDATE SET
        payment_terms = EXCLUDED.payment_terms, credit_limit = EXCLUDED.credit_limit,
        credit_days = EXCLUDED.credit_days, incoterm = EXCLUDED.incoterm,
        shipping_terms = EXCLUDED.shipping_terms, delivery_method = EXCLUDED.delivery_method,
        return_policy = EXCLUDED.return_policy, warranty_terms = EXCLUDED.warranty_terms,
        penalty_rules = EXCLUDED.penalty_rules, updated_at = now();
    RETURN jsonb_build_object('success', TRUE, 'message', 'Commercial terms updated.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_upsert_supplier_price =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_upsert_supplier_price(p_company_id uuid, p_supplier_product_id uuid, p_unit_price numeric, p_currency character varying DEFAULT 'SAR'::character varying, p_minimum_quantity numeric DEFAULT 1, p_discount numeric DEFAULT 0, p_tax_percentage numeric DEFAULT 15, p_effective_from timestamp with time zone DEFAULT now(), p_effective_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_price_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM prc_supplier_products WHERE supplier_product_id = p_supplier_product_id AND company_id = p_company_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier product not found.');
    END IF;
    UPDATE prc_supplier_prices SET status = 'superseded', effective_to = p_effective_from
    WHERE supplier_product_id = p_supplier_product_id AND company_id = p_company_id
      AND minimum_quantity = p_minimum_quantity AND status = 'active';
    INSERT INTO prc_supplier_prices (
        company_id, supplier_product_id, effective_from, effective_to,
        minimum_quantity, unit_price, discount, currency, tax_percentage, status
    ) VALUES (
        p_company_id, p_supplier_product_id, p_effective_from, p_effective_to,
        p_minimum_quantity, p_unit_price, p_discount, p_currency, p_tax_percentage, 'active'
    ) RETURNING price_id INTO v_price_id;
    RETURN jsonb_build_object('success', TRUE, 'price_id', v_price_id, 'message', 'Price record created. Previous price superseded.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_sys_enqueue_job =====


CREATE OR REPLACE FUNCTION public.api_v1_sys_enqueue_job(p_company_id uuid, p_job_type character varying, p_payload jsonb, p_correlation_id uuid DEFAULT NULL::uuid, p_run_after timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_job_id UUID;
    v_priority SMALLINT;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT numeric_priority INTO v_priority 
    FROM sys_job_types WHERE job_type = p_job_type;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYS-004: Job type % is not registered in sys_job_types', p_job_type;
    END IF;
    INSERT INTO sys_job_queue (
        company_id, job_type, payload, correlation_id, run_after, numeric_priority
    ) VALUES (
        p_company_id, p_job_type, p_payload, p_correlation_id, p_run_after, v_priority
    ) RETURNING job_id INTO v_job_id;
    RETURN v_job_id;
END;
$function$

-- ===== api_v1_sys_is_feature_enabled =====


CREATE OR REPLACE FUNCTION public.api_v1_sys_is_feature_enabled(p_flag_name character varying, p_company_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_role character varying DEFAULT NULL::character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_flag RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_flag FROM sys_feature_flags 
    WHERE flag_name = p_flag_name AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY company_id NULLS LAST LIMIT 1;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF NOT v_flag.is_enabled THEN RETURN FALSE; END IF;
    IF v_flag.effective_from IS NOT NULL AND now() < v_flag.effective_from THEN RETURN FALSE; END IF;
    IF v_flag.effective_to IS NOT NULL AND now() > v_flag.effective_to THEN RETURN FALSE; END IF;
    IF v_flag.target_companies IS NOT NULL AND p_company_id != ALL(v_flag.target_companies) THEN RETURN FALSE; END IF;
    IF v_flag.target_users IS NOT NULL AND p_user_id != ALL(v_flag.target_users) THEN RETURN FALSE; END IF;
    IF v_flag.target_roles IS NOT NULL AND p_role != ALL(v_flag.target_roles) THEN RETURN FALSE; END IF;
    IF v_flag.rollout_percentage IS NOT NULL AND v_flag.rollout_percentage < 100 THEN
        IF (abs(hashtext(COALESCE(p_company_id::text, p_user_id::text, 'default'))) % 100) >= v_flag.rollout_percentage THEN
            RETURN FALSE;
        END IF;
    END IF;
    RETURN TRUE;
END;
$function$

-- ===== api_v1_sys_publish_event =====


CREATE OR REPLACE FUNCTION public.api_v1_sys_publish_event(p_company_id uuid, p_aggregate_type character varying, p_aggregate_id uuid, p_event_type character varying, p_payload jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_type character varying DEFAULT 'system'::character varying, p_correlation_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_event_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
INSERT INTO sys_domain_events (
        company_id, aggregate_type, aggregate_id, event_type, 
        payload, actor_id, actor_type, correlation_id
    ) VALUES (
        p_company_id, p_aggregate_type, p_aggregate_id, p_event_type, 
        p_payload, p_actor_id, p_actor_type, p_correlation_id
    ) RETURNING event_id INTO v_event_id;
    PERFORM pg_notify('new_domain_event', v_event_id::text);
    RETURN v_event_id;
END;
$function$

-- ===== api_v1_sys_worker_heartbeat =====


CREATE OR REPLACE FUNCTION public.assemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_available_qty NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Process each component
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
        -- Check stock
        SELECT COALESCE(quantity, 0) INTO v_available_qty
        FROM product_stock
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

        IF v_available_qty < (v_component.quantity * p_quantity) THEN
            RAISE EXCEPTION 'Insufficient stock for component %: need %, available %',
                v_component.component_product_id,
                v_component.quantity * p_quantity,
                v_available_qty;
        END IF;

        -- Reduce component stock
        UPDATE product_stock
        SET quantity = quantity - (v_component.quantity * p_quantity),
            updated_at = NOW()
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

        -- Log inventory transaction for component
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            -(v_component.quantity * p_quantity),
            'adj_out', 'kit_assembly', p_kit_product_id, p_user_id
        );
    END LOOP;

    -- Increase kit stock
    INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
    VALUES (p_kit_product_id, p_warehouse_id, p_quantity, p_company_id, NOW(), NOW())
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = product_stock.quantity + p_quantity, updated_at = NOW();

    -- Log inventory transaction for kit
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, p_quantity,
        'adj_in', 'kit_assembly', p_kit_product_id, p_user_id
    );
END;
$function$

-- ===== assert_account_belongs_to_company =====


CREATE OR REPLACE FUNCTION public.assert_account_belongs_to_company(p_account_id uuid, p_company_id uuid, p_param_name text DEFAULT 'p_cash_account_id'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_account_company uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF p_account_id IS NULL THEN RETURN; END IF;

  SELECT company_id INTO v_account_company
  FROM accounts WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الحساب % غير موجود أو محذوف',
      p_param_name, p_account_id;
  END IF;

  IF v_account_company != p_company_id THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الحساب % ينتمي للشركة % وليس للشركة %',
      p_param_name, p_account_id, v_account_company, p_company_id;
  END IF;
END;
$function$

-- ===== assert_party_belongs_to_company =====


CREATE OR REPLACE FUNCTION public.assert_party_belongs_to_company(p_party_id uuid, p_company_id uuid, p_param_name text DEFAULT 'p_party_id'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_party_company uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF p_party_id IS NULL THEN RETURN; END IF;

  SELECT company_id INTO v_party_company
  FROM parties WHERE id = p_party_id AND deleted_at IS NULL;

  IF v_party_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الطرف % غير موجود أو محذوف',
      p_param_name, p_party_id;
  END IF;

  IF v_party_company != p_company_id THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الطرف % ينتمي للشركة % وليس للشركة %',
      p_param_name, p_party_id, v_party_company, p_company_id;
  END IF;
END;
$function$

-- ===== assert_product_belongs_to_company =====


CREATE OR REPLACE FUNCTION public.assert_product_belongs_to_company(p_product_id uuid, p_company_id uuid, p_param_name text DEFAULT 'product_id'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_product_company uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF p_product_id IS NULL THEN RETURN; END IF;

  SELECT company_id INTO v_product_company
  FROM products WHERE id = p_product_id AND deleted_at IS NULL;

  IF v_product_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — المنتج % غير موجود أو محذوف',
      p_param_name, p_product_id;
  END IF;

  IF v_product_company != p_company_id THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — المنتج % ينتمي للشركة % وليس للشركة %',
      p_param_name, p_product_id, v_product_company, p_company_id;
  END IF;
END;
$function$

-- ===== audit_table_changes =====


CREATE OR REPLACE FUNCTION public.break_overdue_promises(p_company_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
    UPDATE public.debt_payment_promises
    SET status = 'broken', updated_at = NOW()
    WHERE company_id = p_company_id
      AND status = 'pending'
      AND promise_date < CURRENT_DATE
    RETURNING id;
END;
$function$

-- ===== bulk_adjust_stock =====


CREATE OR REPLACE FUNCTION public.bulk_adjust_stock(p_company_id uuid, p_warehouse_id uuid, p_adjustments jsonb, p_reason text DEFAULT 'تعديل يدوي'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item         jsonb;
  v_product_id   uuid;
  v_new_qty      numeric;
  v_current_qty  numeric;
  v_diff         numeric;
  v_tx_type      text;
  v_unit_cost    numeric;
  v_adjusted     int := 0;
  v_skipped      int := 0;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- التحقق من المستودع
  IF NOT EXISTS (
    SELECT 1 FROM warehouses
    WHERE id = p_warehouse_id AND company_id = p_company_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'warehouse_not_found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_adjustments) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_new_qty    := GREATEST(0, (v_item->>'new_quantity')::numeric);

    -- الكمية الحالية والتكلفة المرجحة الحالية
    SELECT COALESCE(quantity, 0), COALESCE(weighted_avg_cost, 0)
    INTO v_current_qty, v_unit_cost
    FROM product_stock
    WHERE product_id = v_product_id AND warehouse_id = p_warehouse_id;

    v_diff := v_new_qty - COALESCE(v_current_qty, 0);

    IF ABS(v_diff) < 0.001 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;  -- لا تغيير
    END IF;

    v_tx_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

    INSERT INTO inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, created_by, unit_cost
    ) VALUES (
      p_company_id, v_product_id, p_warehouse_id,
      ABS(v_diff),
      v_tx_type, 'bulk_adjustment', auth.uid(), COALESCE(v_unit_cost, 0)
    );

    v_adjusted := v_adjusted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'adjusted_count', v_adjusted,
    'skipped_count',  v_skipped,
    'warehouse_id',   p_warehouse_id
  );
END;
$function$

-- ===== bulk_update_product_prices =====


CREATE OR REPLACE FUNCTION public.bulk_update_product_prices(p_company_id uuid, p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item       jsonb;
  v_updated    int := 0;
  v_product_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF jsonb_array_length(p_updates) > 500 THEN
    RAISE EXCEPTION 'too_many_items: الحد الأقصى 500 منتج في الدفعة الواحدة';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
    v_product_id := (v_item->>'product_id')::uuid;

    UPDATE products SET
      sale_price     = CASE WHEN v_item ? 'sale_price'     THEN (v_item->>'sale_price')::numeric     ELSE sale_price     END,
      purchase_price = CASE WHEN v_item ? 'purchase_price' THEN (v_item->>'purchase_price')::numeric ELSE purchase_price END,
      cost_price     = CASE WHEN v_item ? 'cost_price'     THEN (v_item->>'cost_price')::numeric     ELSE cost_price     END,
      updated_at     = now(),
      updated_by     = auth.uid()
    WHERE id = v_product_id
      AND company_id = p_company_id
      AND deleted_at IS NULL;

    IF FOUND THEN v_updated := v_updated + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('updated_count', v_updated, 'requested', jsonb_array_length(p_updates));
END;
$function$

-- ===== calculate_product_cogs =====


CREATE OR REPLACE FUNCTION public.calculate_product_cogs(p_company_id uuid, p_product_id uuid)
 RETURNS TABLE(product_id uuid, product_name text, total_purchased numeric, total_cost_sar numeric, avg_cost_sar numeric, qty_sold numeric, cogs_sar numeric, current_stock numeric, stock_value_sar numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
  WITH
  -- كل مشتريات المنتج بالريال السعودي
  purchases AS (
    SELECT
      ii.product_id,
      SUM(ii.quantity)                               AS total_qty,
      SUM(ii.quantity * ii.cost_price * inv.exchange_rate) AS total_cost
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    WHERE inv.company_id = p_company_id
      AND inv.type = 'purchase'
      AND ii.product_id = p_product_id
      AND inv.deleted_at IS NULL
    GROUP BY ii.product_id
  ),
  -- كل مبيعات المنتج
  sales AS (
    SELECT
      ii.product_id,
      SUM(ii.quantity) AS qty_sold
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    WHERE inv.company_id = p_company_id
      AND inv.type = 'sale'
      AND ii.product_id = p_product_id
      AND inv.deleted_at IS NULL
    GROUP BY ii.product_id
  ),
  -- المخزون الحالي
  stock AS (
    SELECT ps.product_id, SUM(ps.quantity) AS current_qty
    FROM product_stock ps
    WHERE ps.company_id = p_company_id AND ps.product_id = p_product_id
    GROUP BY ps.product_id
  )
  SELECT
    p.id,
    p.name_ar::text,
    COALESCE(pu.total_qty, 0),
    COALESCE(pu.total_cost, 0),
    CASE WHEN COALESCE(pu.total_qty,0) > 0
         THEN ROUND(pu.total_cost / pu.total_qty, 4) ELSE 0 END,
    COALESCE(s.qty_sold, 0),
    ROUND(COALESCE(s.qty_sold, 0) *
      CASE WHEN COALESCE(pu.total_qty,0) > 0
           THEN pu.total_cost / pu.total_qty ELSE 0 END, 2),
    COALESCE(st.current_qty, 0),
    ROUND(COALESCE(st.current_qty, 0) *
      CASE WHEN COALESCE(pu.total_qty,0) > 0
           THEN pu.total_cost / pu.total_qty ELSE 0 END, 2)
  FROM products p
  LEFT JOIN purchases pu ON pu.product_id = p.id
  LEFT JOIN sales s      ON s.product_id  = p.id
  LEFT JOIN stock st     ON st.product_id = p.id
  WHERE p.id = p_product_id AND p.company_id = p_company_id;
END;
$function$

-- ===== check_account_circular_reference =====


CREATE OR REPLACE FUNCTION public.check_rate_limit(p_company_id uuid, p_endpoint text, p_max_requests integer DEFAULT 60, p_window_seconds integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_window_start TIMESTAMP WITH TIME ZONE; v_request_count INT;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  SELECT window_start, request_count INTO v_window_start, v_request_count
  FROM public.api_rate_limits WHERE company_id=p_company_id AND endpoint=p_endpoint;
  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (company_id, endpoint, request_count, window_start) VALUES (p_company_id, p_endpoint, 1, NOW());
    RETURN TRUE;
  END IF;
  IF EXTRACT(EPOCH FROM (NOW()-v_window_start)) > p_window_seconds THEN
    UPDATE public.api_rate_limits SET request_count=1, window_start=NOW() WHERE company_id=p_company_id AND endpoint=p_endpoint;
    RETURN TRUE;
  END IF;
  IF v_request_count >= p_max_requests THEN RETURN FALSE; END IF;
  UPDATE public.api_rate_limits SET request_count = request_count+1 WHERE company_id=p_company_id AND endpoint=p_endpoint;
  RETURN TRUE;
END;
$function$

-- ===== check_stock_availability =====


CREATE OR REPLACE FUNCTION public.commit_expense_v2(p_company_id uuid, p_user_id uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense_id uuid;
  v_voucher_number text;
  v_category_id uuid;
  v_amount numeric;
  v_currency_code text;
  v_exchange_rate numeric;
  v_date date;
  v_description text;
  v_payment_method text;
  v_branch_id uuid;
  v_fiscal_year_id uuid;
  v_cash_account_id uuid;
  v_expense_account_id uuid;
  v_entry_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
v_category_id := (p_data->>'category_id')::uuid;
  v_amount := COALESCE((p_data->>'amount')::numeric, 0);
  v_currency_code := COALESCE(p_data->>'currency_code', 'SAR');
  v_exchange_rate := COALESCE((p_data->>'exchange_rate')::numeric, 1);
  v_date := COALESCE((p_data->>'expense_date')::date, CURRENT_DATE);
  v_description := COALESCE(p_data->>'description', '');
  v_payment_method := COALESCE(p_data->>'payment_method', 'cash');
  v_branch_id := (p_data->>'branch_id')::uuid;

  -- Get fiscal year
  SELECT id INTO v_fiscal_year_id FROM public.fiscal_years
  WHERE company_id = p_company_id AND is_closed = false
  AND v_date BETWEEN start_date AND end_date LIMIT 1;

  -- Generate voucher number
  v_voucher_number := COALESCE(p_data->>'voucher_number', '');
  IF v_voucher_number = '' THEN
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_voucher_number
    FROM public.journal_entries WHERE company_id = p_company_id;
    v_voucher_number := 'EXP-' || v_voucher_number::text;
  END IF;

  -- Create expense record
  INSERT INTO public.expenses (
    company_id, category_id, voucher_number, description,
    amount, currency_code, exchange_rate, expense_date,
    status, payment_method, created_by, branch_id
  ) VALUES (
    p_company_id, v_category_id, v_voucher_number, v_description,
    v_amount, v_currency_code, v_exchange_rate, v_date,
    'posted', v_payment_method, p_user_id, v_branch_id
  ) RETURNING id INTO v_expense_id;

  -- Get accounts
  SELECT id INTO v_cash_account_id FROM public.accounts
  WHERE company_id = p_company_id AND code LIKE '1%' AND type = 'asset' AND is_active = true LIMIT 1;

  SELECT id INTO v_expense_account_id FROM public.accounts
  WHERE company_id = p_company_id AND code LIKE '5%' AND type = 'expense' LIMIT 1;

  -- Create journal entry
  IF v_cash_account_id IS NOT NULL AND v_expense_account_id IS NOT NULL THEN
    INSERT INTO public.journal_entries (
      company_id, entry_number, entry_date, description,
      reference_type, reference_id, status, created_by, branch_id, fiscal_year_id
    ) VALUES (
      p_company_id,
      (SELECT COALESCE(MAX(entry_number), 0) + 1 FROM public.journal_entries WHERE company_id = p_company_id),
      v_date, v_description,
      'expense', v_expense_id, 'posted', p_user_id, v_branch_id, v_fiscal_year_id
    ) RETURNING id INTO v_entry_id;

    -- Debit: Expense
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount,
      description, currency_code, company_id, branch_id
    ) VALUES (
      v_entry_id, v_expense_account_id, v_amount, 0,
      v_description, v_currency_code, p_company_id, v_branch_id
    );

    -- Credit: Cash
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount,
      description, currency_code, company_id, branch_id
    ) VALUES (
      v_entry_id, v_cash_account_id, 0, v_amount,
      v_description, v_currency_code, p_company_id, v_branch_id
    );
  END IF;

  RETURN jsonb_build_object('id', v_expense_id, 'voucher_number', v_voucher_number);
END;
$function$

-- ===== commit_payment =====


CREATE OR REPLACE FUNCTION public.commit_purchase_invoice(p_company_id uuid, p_user_id uuid, p_supplier_id uuid, p_items jsonb, p_exchange_rate numeric DEFAULT 1.0, p_currency text DEFAULT 'SAR'::text, p_issue_date date DEFAULT CURRENT_DATE, p_payment_method text DEFAULT 'credit'::text, p_payment_account_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_invoice_number text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid, p_due_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid                  uuid := auth.uid();  -- [FIX أمني] لا نثق بـ p_user_id
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
begin
      PERFORM public.verify_company_access(p_company_id);
if v_uid is null or not exists (
    select 1 from user_company_roles ucr
    where ucr.user_id = v_uid and ucr.company_id = p_company_id
  ) then
    raise exception 'access_denied';
  end if;

  if not exists (
    select 1 from fiscal_years
    where company_id = p_company_id
      and p_issue_date between start_date and end_date
      and is_closed = false
  ) then
    raise exception 'تاريخ الفاتورة يقع خارج سنة مالية مفتوحة';
  end if;

  if coalesce(p_exchange_rate, 0) <= 0 then
    raise exception 'سعر الصرف يجب أن يكون أكبر من صفر';
  end if;

  select id into v_primary_wh_id from warehouses
  where company_id=p_company_id and (p_branch_id is null or branch_id = p_branch_id) and is_primary=true and deleted_at is null limit 1;
  if v_primary_wh_id is null then
    select id into v_primary_wh_id from warehouses
    where company_id=p_company_id and (p_branch_id is null or branch_id = p_branch_id) and deleted_at is null limit 1;
  end if;
  if v_primary_wh_id is null then
    raise exception 'لا يوجد مستودع مُعرَّف للشركة/الفرع';
  end if;

  if not exists (select 1 from accounts where company_id=p_company_id and code='2100') then
    raise exception 'حساب الدائنين (2100) غير موجود';
  end if;
  if not exists (select 1 from accounts where company_id=p_company_id and code='1200') then
    raise exception 'حساب المخزون (1200) غير موجود';
  end if;

  v_gen_number := case
    when p_invoice_number is not null and trim(p_invoice_number) != ''
    then p_invoice_number
    else get_next_invoice_number(p_company_id, 'PUR')
  end;

  insert into invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    issue_date, due_date, notes, created_by, currency_code, exchange_rate,
    payment_method, subtotal, tax_amount, total_amount, paid_amount
  ) values (
    p_company_id, p_branch_id, p_supplier_id, v_gen_number, 'purchase', 'draft',
    p_issue_date, p_due_date, p_notes, v_uid, p_currency, p_exchange_rate,
    p_payment_method, 0, 0, 0, 0
  ) returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
    where id=(v_item->>'product_id')::uuid and company_id=p_company_id and deleted_at is null;
    if v_product is null then
      raise exception 'المنتج غير موجود: %', v_item->>'product_id';
    end if;

    v_qty          := coalesce((v_item->>'quantity')::numeric, 0);
    v_unit_cost    := coalesce((v_item->>'unit_cost')::numeric, (v_item->>'unit_price')::numeric, v_product.purchase_price);
    v_item_tax     := coalesce((v_item->>'tax_amount')::numeric, 0);
    v_item_discount:= coalesce((v_item->>'discount_amount')::numeric, 0);
    v_line_total   := round((v_qty * v_unit_cost) - v_item_discount + v_item_tax, 4);

    if v_qty <= 0 then raise exception 'الكمية يجب أن تكون أكبر من صفر'; end if;

    insert into invoice_items(
      invoice_id, product_id, description, quantity,
      unit_price, cost_price, discount_amount, tax_amount,
      tax_rate_id, total, company_id
    ) values (
      v_invoice_id, v_product.id, v_product.name_ar, v_qty,
      v_unit_cost, v_unit_cost, v_item_discount, v_item_tax,
      nullif(v_item->>'tax_rate_id','')::uuid,
      v_line_total, p_company_id
    );

    insert into inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, reference_id, created_by,
      unit_cost, total_cost
    ) values (
      p_company_id, v_product.id, v_primary_wh_id, v_qty,
      'purchase', 'invoice', v_invoice_id, v_uid,
      v_unit_cost, round(v_qty * v_unit_cost, 4)
    );

    v_subtotal  := v_subtotal  + round(v_qty * v_unit_cost - v_item_discount, 4);
    v_tax_total := v_tax_total + v_item_tax;
  end loop;

  v_total := v_subtotal + v_tax_total;

  update invoices
  set subtotal=v_subtotal, tax_amount=v_tax_total, total_amount=v_total
  where id=v_invoice_id;

  update invoices set status = 'posted' where id = v_invoice_id;

  select je.id into v_journal_id
  from journal_entries je
  where je.reference_id = v_invoice_id
    and je.reference_type = 'purchase_invoice'
    and je.deleted_at is null
  limit 1;

  if v_journal_id is null then
    raise exception 'فشل الترحيل المحاسبي التلقائي لفاتورة الشراء % - لم يُنشأ أي قيد', v_gen_number;
  end if;

  return jsonb_build_object(
    'id',           v_invoice_id,
    'invoice_number', v_gen_number,
    'total_amount', v_total,
    'tax_amount',   v_tax_total,
    'currency',     p_currency,
    'exchange_rate', p_exchange_rate,
    'status',       'posted'
  );
end;
$function$

-- ===== commit_purchase_return =====


CREATE OR REPLACE FUNCTION public.commit_purchase_return(p_company_id uuid, p_user_id uuid, p_supplier_id uuid, p_items jsonb, p_notes text, p_currency text, p_exchange_rate numeric, p_branch_id uuid DEFAULT NULL::uuid)
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
      PERFORM public.verify_company_access(p_company_id);
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
    notes, created_by, currency_code, exchange_rate, tax_amount, subtotal, total_amount
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_invoice_number,
    'return_purchase', 'posted',
    p_notes, p_user_id, p_currency, p_exchange_rate, 0, 0, 0
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
        'return_purchase', 'invoice', v_invoice_id, p_user_id,
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
    'return_purchase', v_invoice_id, 'posted', p_user_id
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_entry_lines(
    journal_entry_id, account_id, party_id, debit_amount, credit_amount,
    description, currency_code, exchange_rate, foreign_amount, company_id, branch_id
  ) VALUES
    (v_journal_id, v_payable_account_id, p_supplier_id, v_base_total, 0,
     'تخفيض ذمم المورد - ' || v_invoice_number, p_currency, p_exchange_rate, v_total, p_company_id, p_branch_id),
    (v_journal_id, v_inventory_account_id, NULL, 0, v_base_subtotal,
     'خصم مخزون مرتجع - ' || v_invoice_number, p_currency, p_exchange_rate, v_subtotal, p_company_id, p_branch_id);

  RETURN jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', v_base_total, 'currency', p_currency, 'status', 'posted'
  );
END;
$function$

-- ===== commit_sale_return =====


CREATE OR REPLACE FUNCTION public.commit_sale_return(p_company_id uuid, p_user_id uuid, p_party_id uuid, p_items jsonb, p_exchange_rate numeric DEFAULT 1.0, p_currency text DEFAULT 'SAR'::text, p_reference_invoice_id uuid DEFAULT NULL::uuid, p_return_reason text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid                  uuid := auth.uid();  -- [FIX أمني] لا نثق بـ p_user_id
  v_invoice_id           uuid;
  v_invoice_number       text;
  v_subtotal             numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_cost_total           numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              record;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_qty                  numeric;
  v_unit_price           numeric;
  v_line_total           numeric;
  v_line_cost            numeric;
  v_original_cost        numeric;
  v_unit_cost_for_txn    numeric;
begin
      PERFORM public.verify_company_access(p_company_id);
if v_uid is null or not exists (
    select 1 from user_company_roles ucr
    where ucr.user_id = v_uid and ucr.company_id = p_company_id
  ) then
    raise exception 'access_denied';
  end if;

  if not exists (
    select 1 from fiscal_years
    where company_id = p_company_id
      and current_date between start_date and end_date
      and is_closed = false
  ) then
    raise exception 'التاريخ يقع خارج سنة مالية مفتوحة';
  end if;

  select id into v_primary_wh_id from warehouses
  where company_id=p_company_id and is_primary=true and deleted_at is null limit 1;
  if v_primary_wh_id is null then
    select id into v_primary_wh_id from warehouses
    where company_id=p_company_id and deleted_at is null limit 1;
  end if;

  if not exists (select 1 from accounts where company_id=p_company_id and code='1100') then
    raise exception 'حساب المدينون (1100) مفقود';
  end if;
  if not exists (select 1 from accounts where company_id=p_company_id and code='4100') then
    raise exception 'حساب الإيرادات (4100) مفقود';
  end if;

  v_invoice_number := get_next_invoice_number(p_company_id, 'RSL');

  insert into invoices(
    company_id, party_id, invoice_number, type, status,
    notes, created_by, currency_code, exchange_rate,
    reference_invoice_id, return_reason,
    subtotal, tax_amount, total_amount, paid_amount, payment_method,
    branch_id
  ) values (
    p_company_id, p_party_id, v_invoice_number, 'sale_return', 'draft',
    p_notes, v_uid, p_currency, p_exchange_rate,
    p_reference_invoice_id, p_return_reason,
    0, 0, 0, 0, 'credit',
    p_branch_id
  ) returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
    where id=(v_item->>'product_id')::uuid and company_id=p_company_id and deleted_at is null;
    if v_product is null then
      raise exception 'المنتج غير موجود: %', v_item->>'product_id';
    end if;

    v_qty        := coalesce((v_item->>'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, v_product.sale_price);
    v_line_total := round(v_qty * v_unit_price, 4);

    v_original_cost := null;
    if p_reference_invoice_id is not null then
      select ii.cost_price into v_original_cost from invoice_items ii
      where ii.invoice_id = p_reference_invoice_id and ii.product_id = v_product.id limit 1;
    end if;
    v_line_cost := round(v_qty * coalesce(v_original_cost, v_product.cost_price, 0), 4);
    v_unit_cost_for_txn := coalesce(v_original_cost, v_product.cost_price, 0);

    insert into invoice_items(
      invoice_id, product_id, description, quantity,
      unit_price, cost_price, tax_amount, total, company_id
    ) values (
      v_invoice_id, v_product.id, v_product.name_ar, v_qty,
      v_unit_price, coalesce(v_original_cost, v_product.cost_price, 0),
      0, v_line_total, p_company_id
    );

    insert into inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, reference_id, created_by,
      unit_cost, total_cost
    ) values (
      p_company_id, v_product.id, v_primary_wh_id, v_qty,
      'sales_return', 'invoice', v_invoice_id, v_uid,
      v_unit_cost_for_txn, round(v_qty * v_unit_cost_for_txn, 4)
    );

    v_subtotal   := v_subtotal   + v_line_total;
    v_cost_total := v_cost_total + v_line_cost;
  end loop;

  v_total := v_subtotal;

  update invoices set subtotal=v_subtotal, tax_amount=0, total_amount=v_total where id=v_invoice_id;

  update invoices set status = 'posted' where id = v_invoice_id;

  select je.id into v_journal_id
  from journal_entries je
  where je.reference_id = v_invoice_id
    and je.reference_type = 'sales_return'
    and je.deleted_at is null
  limit 1;

  if v_journal_id is null then
    raise exception 'فشل الترحيل المحاسبي التلقائي لمرتجع المبيعات % - لم يُنشأ أي قيد', v_invoice_number;
  end if;

  return jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', round(v_total * p_exchange_rate, 4), 'currency', p_currency, 'status', 'posted'
  );
end;
$function$

-- ===== commit_sales_invoice_v2 =====


CREATE OR REPLACE FUNCTION public.complete_promise(p_company_id uuid, p_promise_id uuid, p_payment_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
UPDATE public.debt_payment_promises
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        reference_type = CASE WHEN p_payment_id IS NOT NULL THEN 'payment' ELSE reference_type END,
        reference_id = COALESCE(p_payment_id, reference_id)
    WHERE id = p_promise_id
      AND company_id = p_company_id
      AND status = 'pending';
END;
$function$

-- ===== convert_quotation_to_invoice =====


CREATE OR REPLACE FUNCTION public.create_cashbox(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_name text DEFAULT 'صندوق جديد'::text, p_currency_code text DEFAULT 'SAR'::text, p_opening_balance numeric DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_account_id uuid;
  v_next_code         text;
  v_account_id        uuid;
  v_cashbox_id        uuid;
  v_max_code          int;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_parent_account_id
  FROM accounts
  WHERE company_id = p_company_id
    AND code = '1010'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_parent_account_id IS NULL THEN
    RAISE EXCEPTION 'Main cashbox account (1010) not found';
  END IF;

  SELECT COALESCE(MAX(CASE WHEN code ~ '^[0-9]+$' THEN code::int ELSE NULL END), 101000)
  INTO v_max_code
  FROM accounts
  WHERE company_id = p_company_id
    AND parent_id = v_parent_account_id
    AND deleted_at IS NULL;

  v_next_code := (v_max_code + 1)::text;

  INSERT INTO accounts (company_id, code, name_ar, type, currency_code, parent_id, is_system, allow_posting)
  VALUES (p_company_id, v_next_code, p_name, 'asset', p_currency_code, v_parent_account_id, false, true)
  RETURNING id INTO v_account_id;

  INSERT INTO cashboxes (company_id, branch_id, name, account_id, currency_code, opening_balance, created_by)
  VALUES (p_company_id, p_branch_id, p_name, v_account_id, p_currency_code, p_opening_balance, auth.uid())
  RETURNING id INTO v_cashbox_id;

  RETURN json_build_object(
    'cashbox_id', v_cashbox_id,
    'account_id', v_account_id,
    'account_code', v_next_code
  );
END;
$function$

-- ===== create_exchange_company =====


CREATE OR REPLACE FUNCTION public.create_exchange_company(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_name text DEFAULT 'شركة صرافة جديدة'::text, p_currency_code text DEFAULT 'SAR'::text, p_opening_balance numeric DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_account_id uuid;
  v_next_code         text;
  v_account_id        uuid;
  v_entity_id         uuid;
  v_max_code          int;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_parent_account_id
  FROM accounts
  WHERE company_id = p_company_id
    AND code = '1030'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_parent_account_id IS NULL THEN
    INSERT INTO accounts (company_id, code, name_ar, type, currency_code, is_system, allow_posting)
    VALUES (p_company_id, '1030', 'شركات الصرافة', 'asset', 'SAR', true, false)
    RETURNING id INTO v_parent_account_id;
  END IF;

  SELECT COALESCE(MAX(CASE WHEN code ~ '^[0-9]+$' THEN code::int ELSE NULL END), 103000)
  INTO v_max_code
  FROM accounts
  WHERE company_id = p_company_id
    AND parent_id = v_parent_account_id
    AND deleted_at IS NULL;

  v_next_code := (v_max_code + 1)::text;

  INSERT INTO accounts (company_id, code, name_ar, type, currency_code, parent_id, is_system, allow_posting)
  VALUES (p_company_id, v_next_code, p_name, 'asset', p_currency_code, v_parent_account_id, false, true)
  RETURNING id INTO v_account_id;

  INSERT INTO exchange_companies (company_id, branch_id, name, account_id, currency_code, opening_balance, created_by)
  VALUES (p_company_id, p_branch_id, p_name, v_account_id, p_currency_code, p_opening_balance, auth.uid())
  RETURNING id INTO v_entity_id;

  RETURN json_build_object(
    'exchange_company_id', v_entity_id,
    'account_id', v_account_id,
    'account_code', v_next_code
  );
END;
$function$

-- ===== create_financial_bond =====


CREATE OR REPLACE FUNCTION public.create_financial_bond(p_company_id uuid, p_bond_type text, p_amount numeric, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1.0, p_foreign_amount numeric DEFAULT NULL::numeric, p_date date DEFAULT CURRENT_DATE, p_cash_account_id uuid DEFAULT NULL::uuid, p_counterparty_id uuid DEFAULT NULL::uuid, p_counterparty_type text DEFAULT 'party'::text, p_description text DEFAULT ''::text, p_invoice_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT 'cash'::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_journal_id uuid; v_payment_id uuid; v_counterparty_account_id uuid;
  v_party_type text; v_ref_type text; v_control_account_code text;
  v_party_id uuid := NULL; v_base_amount numeric; v_foreign_amount numeric;
  v_effective_rate numeric;
  v_uid uuid := auth.uid();  -- [FIX أمني حرج] كانت تثق بـ p_user_id عبر COALESCE عندما لا يوجد auth.uid() (حالة anon) — تم إزالة الثقة بالكامل
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF v_uid IS NULL THEN
    RAISE EXCEPTION 'access_denied: يتطلب تسجيل الدخول';
  END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = v_uid AND ucr.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id AND p_date BETWEEN start_date AND end_date AND is_closed = false
  ) THEN RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة'; END IF;

  IF p_cash_account_id IS NULL THEN RAISE EXCEPTION 'حساب الصندوق / البنك إلزامي'; END IF;
  PERFORM assert_account_belongs_to_company(p_cash_account_id, p_company_id, 'p_cash_account_id');

  v_effective_rate := COALESCE(NULLIF(p_exchange_rate, 0), 1.0);
  v_foreign_amount := COALESCE(NULLIF(p_foreign_amount, 0), p_amount);
  v_base_amount    := ROUND(v_foreign_amount * v_effective_rate, 4);
  IF p_currency_code = (SELECT base_currency FROM companies WHERE id = p_company_id LIMIT 1) THEN
    v_base_amount := v_foreign_amount; v_effective_rate := 1.0;
  END IF;

  v_ref_type := CASE p_bond_type
    WHEN 'receipt' THEN 'receipt_bond' WHEN 'payment' THEN 'payment_bond'
    WHEN 'disbursement' THEN 'payment_bond' WHEN 'transfer' THEN 'internal_transfer'
    ELSE NULL END;
  IF v_ref_type IS NULL THEN RAISE EXCEPTION 'نوع السند غير صحيح: %', p_bond_type; END IF;

  IF p_bond_type = 'transfer' THEN
    PERFORM assert_account_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (transfer target account)');
    v_counterparty_account_id := p_counterparty_id;
  ELSIF p_counterparty_type = 'account' THEN
    PERFORM assert_account_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (account)');
    v_counterparty_account_id := p_counterparty_id;
  ELSE
    PERFORM assert_party_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (party)');
    v_party_id := p_counterparty_id;
    SELECT type INTO v_party_type FROM parties WHERE id = p_counterparty_id;
    IF v_party_type IS NULL THEN RAISE EXCEPTION 'الطرف التجاري غير موجود: %', p_counterparty_id; END IF;
  END IF;

  INSERT INTO payments(
    company_id, branch_id, party_id, type, amount, currency_code, exchange_rate,
    payment_date, payment_method, account_id, reference_type, notes, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, v_party_id, CASE WHEN p_bond_type='disbursement' THEN 'disbursement' ELSE p_bond_type END,
    v_foreign_amount, p_currency_code, v_effective_rate,
    p_date, p_payment_method, p_cash_account_id, v_ref_type, p_description, 'posted', v_uid
  ) RETURNING id INTO v_payment_id;

  IF v_party_id IS NOT NULL THEN
    SELECT id INTO v_journal_id FROM journal_entries WHERE reference_id = v_payment_id AND deleted_at IS NULL LIMIT 1;
    IF v_journal_id IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: لم يتم ترحيل السند تلقائياً كما هو متوقع';
    END IF;
  ELSE
    INSERT INTO journal_entries(company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by)
    VALUES (p_company_id, p_branch_id, p_date, p_description, v_ref_type, v_payment_id, 'posted', v_uid)
    RETURNING id INTO v_journal_id;

    IF p_bond_type = 'transfer' THEN
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id, branch_id)
      VALUES
        (v_journal_id, v_counterparty_account_id, NULL, v_base_amount, 0, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id),
        (v_journal_id, p_cash_account_id, NULL, 0, v_base_amount, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id);
    ELSE
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id, branch_id)
      VALUES
        (v_journal_id, v_counterparty_account_id, NULL, v_base_amount, 0, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id),
        (v_journal_id, p_cash_account_id, NULL, 0, v_base_amount, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id);
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    INSERT INTO payment_allocations(payment_id, invoice_id, amount, company_id)
    VALUES (v_payment_id, p_invoice_id, v_foreign_amount, p_company_id) ON CONFLICT DO NOTHING;
    UPDATE invoices SET paid_amount = GREATEST(0, COALESCE(paid_amount,0) + v_foreign_amount), updated_at = now()
    WHERE id = p_invoice_id AND company_id = p_company_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_payment_id, 'payment_number', (SELECT payment_number FROM payments WHERE id = v_payment_id),
    'journal_id', v_journal_id, 'base_amount', v_base_amount, 'foreign_amount', v_foreign_amount,
    'exchange_rate', v_effective_rate, 'status', 'success'
  );
END;
$function$

-- ===== create_stock_transfer =====


CREATE OR REPLACE FUNCTION public.create_stock_transfer(p_from_warehouse uuid, p_to_warehouse uuid, p_items jsonb, p_company_id uuid, p_user_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transfer_id uuid;
    v_item jsonb;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Check basic permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لهذه الشركة';
    END IF;

    -- 1. Insert transfer record
    INSERT INTO public.stock_transfers (
        company_id, from_warehouse_id, to_warehouse_id, notes, status, created_by
    )
    VALUES (
        p_company_id, p_from_warehouse, p_to_warehouse, p_notes, 'pending', p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 2. Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.stock_transfer_items (
            transfer_id, company_id, product_id, quantity
        ) VALUES (
            v_transfer_id, p_company_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::numeric
        );
    END LOOP;

    -- 3. Execute the transfer using the existing process_stock_transfer
    PERFORM public.process_stock_transfer(v_transfer_id);

    RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);
END;
$function$

-- ===== disassemble_kit =====


CREATE OR REPLACE FUNCTION public.disassemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_kit_qty NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Check kit stock
    SELECT COALESCE(quantity, 0) INTO v_kit_qty
    FROM product_stock
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

    IF v_kit_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient kit stock: need %, available %', p_quantity, v_kit_qty;
    END IF;

    -- Reduce kit stock
    UPDATE product_stock
    SET quantity = quantity - p_quantity,
        updated_at = NOW()
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

    -- Log inventory transaction for kit removal
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, -p_quantity,
        'adj_out', 'kit_disassembly', p_kit_product_id, p_user_id
    );

    -- Increase component stock
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
        INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
        VALUES (v_component.component_product_id, p_warehouse_id, v_component.quantity * p_quantity, p_company_id, NOW(), NOW())
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = product_stock.quantity + (v_component.quantity * p_quantity), updated_at = NOW();

        -- Log inventory transaction for component return
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            v_component.quantity * p_quantity,
            'adj_in', 'kit_disassembly', p_kit_product_id, p_user_id
        );
    END LOOP;
END;
$function$

-- ===== ensure_vehicle =====


CREATE OR REPLACE FUNCTION public.fn_assert_company_access(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT public.is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لبيانات هذه الشركة';
  END IF;
END;
$function$

-- ===== fn_auto_post_invoice_journal =====


CREATE OR REPLACE FUNCTION public.fn_post_inventory_movement(p_company_id uuid, p_product_id uuid, p_warehouse_id uuid, p_quantity numeric, p_transaction_type text, p_reference_type text, p_reference_id uuid, p_created_by uuid, p_unit_cost numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cost numeric;
  v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF p_unit_cost IS NOT NULL THEN
    v_cost := p_unit_cost;
  ELSE
    SELECT weighted_avg_cost INTO v_cost
    FROM product_stock WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    IF v_cost IS NULL THEN
      SELECT cost_price INTO v_cost FROM products WHERE id = p_product_id;
    END IF;
    v_cost := COALESCE(v_cost, 0);
  END IF;

  INSERT INTO inventory_transactions(
    company_id, product_id, warehouse_id, quantity, unit_cost,
    transaction_type, reference_type, reference_id, created_by
  ) VALUES (
    p_company_id, p_product_id, p_warehouse_id, p_quantity, v_cost,
    p_transaction_type, p_reference_type, p_reference_id, p_created_by
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$

-- ===== fn_release_payment_allocations =====


CREATE OR REPLACE FUNCTION public.fn_reverse_journal_entries(p_source_reference_id uuid, p_source_reference_types text[], p_new_reference_type text, p_description_prefix text, p_created_by uuid, p_company_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_je RECORD;
  v_new_je_id uuid;
  v_line RECORD;
  v_result uuid[] := '{}';
BEGIN
      PERFORM public.verify_company_access(p_company_id);
FOR v_je IN
    SELECT id, description FROM journal_entries
    WHERE reference_id = p_source_reference_id
      AND reference_type = ANY(p_source_reference_types)
      AND status = 'posted' AND deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO journal_entries(company_id, entry_date, description, reference_type, reference_id, status, created_by)
    VALUES (p_company_id, CURRENT_DATE, p_description_prefix || COALESCE(v_je.description,''),
            p_new_reference_type, p_source_reference_id, 'posted', p_created_by)
    RETURNING id INTO v_new_je_id;

    FOR v_line IN SELECT * FROM journal_entry_lines WHERE journal_entry_id = v_je.id AND deleted_at IS NULL LOOP
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount,
                                       description, currency_code, exchange_rate, foreign_amount, company_id)
      VALUES (v_new_je_id, v_line.account_id, v_line.party_id, v_line.credit_amount, v_line.debit_amount,
              'عكس: ' || COALESCE(v_line.description,''), v_line.currency_code, v_line.exchange_rate,
              v_line.foreign_amount, p_company_id);
    END LOOP;

    v_result := v_result || v_new_je_id;
  END LOOP;

  RETURN v_result;
END;
$function$

-- ===== fn_sync_invoice_paid_amount =====


CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id uuid, p_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
v_prefix := CASE p_type
    WHEN 'sale'             THEN 'INV'
    WHEN 'purchase'         THEN 'PUR'
    WHEN 'sale_return'      THEN 'RET'   -- [FIX] كان 'return_sale'
    WHEN 'purchase_return'  THEN 'RPR'   -- [FIX] كان 'return_purchase'
    ELSE                         'DOC'
  END;

  -- استخدام advisory lock لمنع تكرار الأرقام في التزامن
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || p_type));

  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE company_id = p_company_id AND type = p_type AND deleted_at IS NULL;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE,'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$

-- ===== generate_journal_entry_number =====


CREATE OR REPLACE FUNCTION public.generate_payment_number(p_company_id uuid, p_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
v_prefix := CASE p_type
    WHEN 'receipt'      THEN 'RCP'
    WHEN 'disbursement' THEN 'DSB'
    ELSE                     'PMT'
  END;

  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || p_type || 'payment_number'));

  SELECT COUNT(*) + 1
  INTO v_count
  FROM public.payments
  WHERE company_id = p_company_id
    AND type       = p_type
    AND deleted_at IS NULL;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$

-- ===== get_account_ledger =====


CREATE OR REPLACE FUNCTION public.get_account_ledger(p_company_id uuid, p_account_id uuid, p_from text DEFAULT NULL::text, p_to text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type    text;
  v_is_debit_nature boolean;
  v_opening_balance numeric := 0;
  v_entries         json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT type INTO v_account_type FROM accounts WHERE id=p_account_id AND company_id=p_company_id;
  IF v_account_type IS NULL THEN RAISE EXCEPTION 'account_not_found'; END IF;
  v_is_debit_nature := v_account_type IN ('asset','expense');

  IF p_from IS NOT NULL THEN
    WITH RECURSIVE account_tree AS (
      SELECT id FROM accounts WHERE id = p_account_id
      UNION ALL
      SELECT a.id FROM accounts a
      INNER JOIN account_tree at ON a.parent_id = at.id
    )
    SELECT COALESCE(SUM(CASE WHEN v_is_debit_nature
      THEN (COALESCE(jel.debit_amount,0)-COALESCE(jel.credit_amount,0))
      ELSE (COALESCE(jel.credit_amount,0)-COALESCE(jel.debit_amount,0)) END),0)
    INTO v_opening_balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE jel.account_id IN (SELECT id FROM account_tree) AND je.company_id=p_company_id
      AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id=p_branch_id)
      AND je.entry_date < p_from::date;
  END IF;

  WITH RECURSIVE account_tree AS (
    SELECT id FROM accounts WHERE id = p_account_id
    UNION ALL
    SELECT a.id FROM accounts a
    INNER JOIN account_tree at ON a.parent_id = at.id
  )
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.entry_number),'[]'::json)
  INTO v_entries
  FROM (
    SELECT je.entry_date, je.entry_number,
      je.branch_id,
      COALESCE(jel.description,je.description,'') AS description,
      COALESCE(jel.debit_amount,0) AS debit_amount,
      COALESCE(jel.credit_amount,0) AS credit_amount,
      COALESCE(jel.currency_code,'SAR') AS currency_code,
      COALESCE(jel.exchange_rate,1) AS exchange_rate,
      COALESCE(jel.foreign_amount,0) AS foreign_amount,
      v_opening_balance + SUM(CASE WHEN v_is_debit_nature
        THEN (COALESCE(jel.debit_amount,0)-COALESCE(jel.credit_amount,0))
        ELSE (COALESCE(jel.credit_amount,0)-COALESCE(jel.debit_amount,0)) END)
        OVER (ORDER BY je.entry_date,je.entry_number ROWS UNBOUNDED PRECEDING) AS balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE jel.account_id IN (SELECT id FROM account_tree) AND je.company_id=p_company_id
      AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id=p_branch_id)
      AND (p_from IS NULL OR je.entry_date>=p_from::date)
      AND (p_to   IS NULL OR je.entry_date<=p_to::date)
  ) t;

  RETURN json_build_object(
    'openingBalance',v_opening_balance,'entries',v_entries,'accountType',v_account_type);
END;$function$

-- ===== get_all_parties =====


CREATE OR REPLACE FUNCTION public.get_all_parties(p_company_id uuid, p_type text DEFAULT 'all'::text, p_status text DEFAULT 'active'::text)
 RETURNS TABLE(id uuid, company_id uuid, name text, type text, phone text, email text, tax_number text, address text, status text, category_id uuid, category_name text, customer_type text, lead_source text, preferred_contact_method text, credit_limit numeric, total_invoices_count integer, total_paid_amount numeric, last_invoice_date timestamp with time zone, customer_since date, loyalty_points integer, supplier_type text, payment_terms_days integer, min_order_amount numeric, delivery_lead_days integer, is_active_supplier boolean, avg_rating numeric, total_orders_count integer, total_purchases_amount numeric, last_purchase_date timestamp with time zone, balance numeric, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.company_id,
    p.name,
    p.type,
    p.phone,
    p.email,
    p.tax_number,
    p.address,
    p.status,
    p.category_id,
    pc.name           AS category_name,
    p.customer_type,
    p.lead_source,
    p.preferred_contact_method,
    p.credit_limit,
    p.total_invoices_count,
    p.total_paid_amount,
    p.last_invoice_date,
    p.customer_since,
    p.loyalty_points,
    p.supplier_type,
    p.payment_terms_days,
    p.min_order_amount,
    p.delivery_lead_days,
    p.is_active_supplier,
    p.avg_rating,
    p.total_orders_count,
    p.total_purchases_amount,
    p.last_purchase_date,
    COALESCE(pb.balance, 0)::numeric AS balance,
    p.created_at,
    p.updated_at
  FROM parties p
  LEFT JOIN party_categories pc ON pc.id = p.category_id
  LEFT JOIN party_balances    pb ON pb.party_id = p.id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND (p_type   = 'all' OR p.type   = p_type   OR p.type = 'both')
    AND (p_status = 'all' OR p.status = p_status)
  ORDER BY p.name ASC;
END;
$function$

-- ===== get_all_products =====


CREATE OR REPLACE FUNCTION public.get_bonds_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_amount numeric:=0; v_total_count int:=0;
  v_receipt_count int:=0; v_receipt_amount numeric:=0;
  v_payment_count int:=0; v_payment_amount numeric:=0;
  v_chart_data json; v_account_data json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT
    COALESCE(SUM(amount*COALESCE(exchange_rate,1)),0), COUNT(*),
    COUNT(*) FILTER (WHERE type='receipt'),
    COALESCE(SUM(amount*COALESCE(exchange_rate,1)) FILTER (WHERE type='receipt'),0),
    COUNT(*) FILTER (WHERE type='disbursement'),
    COALESCE(SUM(amount*COALESCE(exchange_rate,1)) FILTER (WHERE type='disbursement'),0)
  INTO v_total_amount,v_total_count,v_receipt_count,v_receipt_amount,v_payment_count,v_payment_amount
  FROM payments WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND status!='void' AND deleted_at IS NULL;

  WITH dates AS (SELECT date_trunc('day',NOW()-(n||' days')::interval)::date AS d FROM generate_series(0,29) n),
  daily AS (SELECT d.d AS date,COALESCE(SUM(b.amount*COALESCE(b.exchange_rate,1)),0) AS amount,COUNT(b.id) AS count
    FROM dates d LEFT JOIN payments b ON d.d=b.payment_date AND b.company_id=p_company_id AND (p_branch_id IS NULL OR b.branch_id=p_branch_id)
      AND b.status!='void' AND b.deleted_at IS NULL GROUP BY d.d)
  SELECT json_agg(json_build_object('date',date,'amount',amount,'count',count) ORDER BY date)
  INTO v_chart_data FROM daily;

  WITH acc AS (SELECT COALESCE(a.name_ar,'غير محدد') AS name,
    COALESCE(SUM(py.amount*COALESCE(py.exchange_rate,1)),0) AS amount, COUNT(*) AS count
    FROM payments py LEFT JOIN accounts a ON py.account_id=a.id
    WHERE py.company_id=p_company_id AND (p_branch_id IS NULL OR py.branch_id=p_branch_id) AND py.status!='void' AND py.deleted_at IS NULL
    GROUP BY a.name_ar ORDER BY amount DESC LIMIT 5)
  SELECT COALESCE(json_agg(json_build_object('name',name,'amount',amount,'count',count)),'[]'::json)
  INTO v_account_data FROM acc;

  RETURN json_build_object(
    'totalAmount',v_total_amount,'count',v_total_count,
    'chartData',COALESCE(v_chart_data,'[]'::json),'accountData',v_account_data,
    'totals',json_build_object('receiptCount',v_receipt_count,'receiptAmount',v_receipt_amount,
      'paymentCount',v_payment_count,'paymentAmount',v_payment_amount,
      'netAmount',v_receipt_amount-v_payment_amount));
END;$function$

-- ===== get_cash_account =====


CREATE OR REPLACE FUNCTION public.get_cash_account(p_currency text, p_method text, p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  IF p_method IN ('bank','transfer','wire') THEN
    SELECT id INTO v_id FROM accounts WHERE company_id=p_company_id AND code='1020' LIMIT 1;
    RETURN v_id;
  END IF;
  SELECT id INTO v_id FROM accounts WHERE company_id=p_company_id
    AND code = CASE p_currency WHEN 'SAR' THEN '101001' WHEN 'YER' THEN '101002'
      WHEN 'USD' THEN '101003' WHEN 'OMR' THEN '101004' WHEN 'CNY' THEN '101005' ELSE '101001' END
  LIMIT 1;
  RETURN v_id;
END;
$function$

-- ===== get_cash_liquidity =====


CREATE OR REPLACE FUNCTION public.get_cash_liquidity(p_company_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_liquidity numeric;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT COALESCE(SUM(jel.debit_amount)-SUM(jel.credit_amount),0)
  INTO v_liquidity
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id=jel.journal_entry_id
  JOIN accounts a ON a.id=jel.account_id
  WHERE je.company_id=p_company_id AND je.status='posted'
    AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    AND a.company_id=p_company_id AND (a.code LIKE '101%' OR a.code LIKE '102%');
  RETURN COALESCE(v_liquidity,0);
END;$function$

-- ===== get_changes_since =====


CREATE OR REPLACE FUNCTION public.get_changes_since(p_company_id uuid, p_since timestamp with time zone, p_tables text[] DEFAULT ARRAY['products'::text, 'parties'::text, 'invoices'::text, 'payments'::text, 'expenses'::text])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb := '{}'::jsonb;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- منتجات محدثة
  IF 'products' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'products', COALESCE(
        (SELECT jsonb_agg(row_to_json(p))
         FROM products p
         WHERE p.company_id = p_company_id
           AND p.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- أطراف محدثة
  IF 'parties' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'parties', COALESCE(
        (SELECT jsonb_agg(row_to_json(p))
         FROM parties p
         WHERE p.company_id = p_company_id
           AND p.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- فواتير محدثة
  IF 'invoices' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'invoices', COALESCE(
        (SELECT jsonb_agg(row_to_json(i))
         FROM invoices i
         WHERE i.company_id = p_company_id
           AND i.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- مدفوعات محدثة
  IF 'payments' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'payments', COALESCE(
        (SELECT jsonb_agg(row_to_json(pmt))
         FROM payments pmt
         WHERE pmt.company_id = p_company_id
           AND pmt.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- مصروفات محدثة
  IF 'expenses' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'expenses', COALESCE(
        (SELECT jsonb_agg(row_to_json(e))
         FROM expenses e
         WHERE e.company_id = p_company_id
           AND e.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- إضافة وقت الاستجابة لاستخدامه في المزامنة التالية
  v_result := v_result || jsonb_build_object('synced_at', now());

  RETURN v_result;
END;
$function$

-- ===== get_company_settings =====


