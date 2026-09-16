-- ==============================================================================
-- Migration: 20260916000001_comprehensive_database_hardening_and_integrity_remediation.sql
-- Description: Deep database audit remediation, runtime bugfixes, UTF-8 encoding repair,
--              composite foreign keys for tenant isolation, financial race condition fixes,
--              and security/privacy hardening.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. HOTFIXES: RUNTIME BUGS & ENCODING REPAIR (UTF-8)
-- ==============================================================================

-- 1.1 Fix quick_adjust_stock_batch runtime variable bug (p_reason -> p_notes)
CREATE OR REPLACE FUNCTION public.quick_adjust_stock_batch(
    p_company_id uuid, 
    p_items jsonb, 
    p_notes text DEFAULT 'manual_batch_adjustment'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
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

    -- Audit the stock batch adjustment (FIXED: using p_notes instead of undeclared p_reason)
    BEGIN
        PERFORM public.audit_write(
            'stock_batch_adjusted',
            'product_stock',
            NULL,
            v_company_id,
            jsonb_build_object('reason', p_notes, 'item_count', jsonb_array_length(p_items))
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'adjusted_count', v_adjusted_count
    );
END;
$function$;

-- 1.2 UTF-8 Repair: fn_assert_company_access
CREATE OR REPLACE FUNCTION public.fn_assert_company_access(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- المشرف العام يمتلك صلاحية الوصول لكافة المنشآت
  IF public.is_super_admin() THEN
    RETURN;
  END IF;

  -- التحقق من انتماء المستخدم إلى المنشأة
  IF NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لبيانات هذه المنشأة' USING ERRCODE = '42501';
  END IF;

  -- التحقق من أن المنشأة نشطة وغير موقوفة
  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'access_denied: هذه المنشأة غير نشطة أو تم إيقاف تفعيلها. يرجى التواصل مع إدارة النظام' USING ERRCODE = '42501';
  END IF;
END;
$function$;

-- 1.3 UTF-8 Repair: admin_update_system_config
CREATE OR REPLACE FUNCTION public.admin_update_system_config(p_key text, p_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_prev_value jsonb := NULL;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required' USING ERRCODE = '42501';
    END IF;

    IF p_key IS NULL OR trim(p_key) = '' THEN
        RAISE EXCEPTION 'مفتاح الإعداد لا يمكن أن يكون فارغاً' USING ERRCODE = '22023';
    END IF;

    SELECT value INTO v_prev_value
    FROM public.system_platform_configs
    WHERE key = p_key;

    INSERT INTO public.system_platform_configs (key, value, updated_at, updated_by)
    VALUES (p_key, p_value, now(), auth.uid())
    ON CONFLICT (key) DO UPDATE
    SET 
        value = EXCLUDED.value,
        updated_at = now(),
        updated_by = auth.uid();

    PERFORM public.audit_write(
        'UPDATE_SYSTEM_CONFIG',
        'system_platform_configs',
        NULL,
        NULL,
        jsonb_build_object(
            'config_key', p_key,
            'prev_value', v_prev_value,
            'new_value', p_value,
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$function$;

-- 1.4 UTF-8 Repair: fn_guard_super_admin_delete
CREATE OR REPLACE FUNCTION public.fn_guard_super_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_remaining_count bigint;
BEGIN
    -- منع قيام المشرف بحذف نفسه
    IF OLD.user_id = auth.uid() THEN
        RAISE EXCEPTION 'access_denied: لا يمكنك إلغاء صلاحية المشرف العام عن حسابك الحالي' USING ERRCODE = '42501';
    END IF;

    -- منع حذف آخر مشرف عام
    SELECT COUNT(*) INTO v_remaining_count FROM public.super_admins WHERE user_id <> OLD.user_id;
    IF v_remaining_count = 0 THEN
        RAISE EXCEPTION 'integrity_error: لا يمكن إزالة المشرف العام الأخير. يجب أن يبقى مشرف واحد على الأقل' USING ERRCODE = '23514';
    END IF;

    RETURN OLD;
END;
$function$;

-- 1.5 UTF-8 Repair: toggle_super_admin
CREATE OR REPLACE FUNCTION public.toggle_super_admin(p_target_user_id uuid, p_make_super_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required' USING ERRCODE = '42501';
    END IF;

    -- منع سحب الصلاحية عن النفس
    IF p_target_user_id = auth.uid() AND NOT p_make_super_admin THEN
        RAISE EXCEPTION 'لا يمكنك سحب صلاحية المشرف العام عن نفسك' USING ERRCODE = '42501';
    END IF;

    -- التحقق من وجود المستخدم
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
        RAISE EXCEPTION 'المستخدم بالمعرف % غير موجود في النظام', p_target_user_id USING ERRCODE = 'P0002';
    END IF;

    IF p_make_super_admin THEN
        INSERT INTO public.super_admins (user_id)
        VALUES (p_target_user_id)
        ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM public.super_admins
        WHERE user_id = p_target_user_id;
    END IF;

    PERFORM public.audit_write(
        CASE WHEN p_make_super_admin THEN 'PROMOTE_SUPER_ADMIN' ELSE 'REVOKE_SUPER_ADMIN' END,
        'super_admins',
        p_target_user_id,
        NULL,
        jsonb_build_object(
            'target_user_id', p_target_user_id, 
            'made_super_admin', p_make_super_admin, 
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$function$;

-- 1.6 Fix commit_sales_invoice_v2 line total calculation for tax consistency
CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(
    p_party_id uuid, 
    p_invoice_date date, 
    p_due_date date, 
    p_items jsonb, 
    p_payment_type text DEFAULT 'cash'::text, 
    p_notes text DEFAULT NULL::text, 
    p_currency_code text DEFAULT 'SAR'::text, 
    p_exchange_rate numeric DEFAULT 1, 
    p_idempotency_key text DEFAULT NULL::text, 
    p_branch_id uuid DEFAULT NULL::uuid, 
    p_payment_account_id uuid DEFAULT NULL::uuid, 
    p_paid_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_user_role text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_product_name text;
  v_product_sku text;
  v_db_price numeric;
  v_sale_cost numeric;
  v_unit_base numeric;
  v_min_allowed_price numeric;
  v_exchange_operator text;
  v_line_net numeric;
  v_line_tax numeric;
  v_line_total numeric;
  v_total_amount numeric := 0;
  v_total_tax numeric := 0;
  v_total_discount numeric := 0;
  v_warehouse_id uuid;
  v_party_name text;
  v_is_cash boolean;
  v_final_total numeric;
  v_actual_paid numeric;
  v_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role FROM public.user_company_roles 
  WHERE user_id = v_user_id AND company_id = v_company_id LIMIT 1;
  IF v_user_role IS NULL THEN
    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = v_user_id;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices
    WHERE company_id = v_company_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'يجب أن تحتوي الفاتورة على صنف واحد على الأقل';
  END IF;

  SELECT id INTO v_warehouse_id FROM public.warehouses
  WHERE company_id = v_company_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM public.warehouses
    WHERE company_id = v_company_id AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF p_party_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id AND company_id = v_company_id;
  END IF;

  -- === PHASE 1: VALIDATE ITEMS & PRICES ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric,
      warehouse_id uuid, cost_price numeric, discount_amount numeric)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'الكمية المدخلة غير صحيحة (%) للصنف', v_item.quantity;
    END IF;

    SELECT name_ar, sku, sale_price, cost_price 
    INTO v_product_name, v_product_sku, v_db_price, v_sale_cost 
    FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'الصنف المحدد غير مسجل في بيانات المنشأة';
    END IF;

    -- تحويل سعر الوحدة إلى العملة الأساس قبل مقارنة حد البيع الأدنى
    IF p_currency_code IS NULL OR p_currency_code = 'SAR' THEN
      v_unit_base := v_item.unit_price;
    ELSE
      SELECT exchange_operator INTO v_exchange_operator
      FROM public.supported_currencies
      WHERE code = p_currency_code
      LIMIT 1;
      v_exchange_operator := COALESCE(v_exchange_operator, 'multiply');
      IF v_exchange_operator = 'divide' AND p_exchange_rate > 0 THEN
        IF p_exchange_rate < 1 THEN
          v_unit_base := v_item.unit_price * p_exchange_rate;
        ELSE
          v_unit_base := v_item.unit_price / p_exchange_rate;
        END IF;
      ELSE
        v_unit_base := v_item.unit_price * p_exchange_rate;
      END IF;
    END IF;

    IF COALESCE(v_user_role, 'viewer') NOT IN ('owner', 'admin') AND NOT is_super_admin() THEN
      v_min_allowed_price := v_db_price * 0.7;
      IF v_unit_base < v_min_allowed_price THEN
        RAISE EXCEPTION 'سعر البيع (% ر.س) أقل من الحد الأدنى المسموح به (% ر.س) للصنف "%"',
          ROUND(v_unit_base, 2), ROUND(v_min_allowed_price, 2), COALESCE(v_product_name, v_product_sku);
      END IF;
    END IF;

    IF v_item.tax_rate IS NOT NULL AND (v_item.tax_rate < 0 OR v_item.tax_rate > 100) THEN
      RAISE EXCEPTION 'نسبة الضريبة غير صحيحة (%) للصنف "%"', v_item.tax_rate, COALESCE(v_product_name, v_product_sku);
    END IF;

    v_line_net := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_line_tax := COALESCE(round(v_line_net * COALESCE(v_item.tax_rate, 0) / 100, 4), 0);
    
    v_total_amount := v_total_amount + v_line_net;
    v_total_discount := v_total_discount + COALESCE(v_item.discount_amount, 0);
    v_total_tax := v_total_tax + v_line_tax;
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || v_company_id::text || ':sale'));
  v_invoice_number := public.generate_invoice_number(v_company_id, 'sale');

  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';
  v_final_total := v_total_amount + v_total_tax;

  -- حساب المبلغ المدفوع الفعلي وحالة الفاتورة
  IF v_is_cash THEN
    v_actual_paid := v_final_total;
    v_status := 'paid';
  ELSE
    v_actual_paid := LEAST(v_final_total, GREATEST(0, COALESCE(p_paid_amount, 0)));
    IF v_actual_paid >= v_final_total THEN
      v_status := 'paid';
    ELSIF v_actual_paid > 0 THEN
      v_status := 'partially_paid';
    ELSE
      v_status := 'posted';
    END IF;
  END IF;

  -- === PHASE 3: CREATE INVOICE AS DRAFT ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, discount_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_final_total, v_total_tax, v_total_discount, p_payment_type, p_payment_account_id,
    'draft', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    0
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + ATOMIC STOCK UPSERT ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric,
      warehouse_id uuid, cost_price numeric, discount_amount numeric)
  LOOP
    SELECT cost_price INTO v_sale_cost FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    v_line_net := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_line_tax := COALESCE(round(v_line_net * COALESCE(v_item.tax_rate, 0) / 100, 4), 0);
    -- Total includes tax to satisfy chk_item_total: CHECK (total = round((quantity * unit_price - discount) + tax, 2))
    v_line_total := round(v_line_net + v_line_tax, 2);

    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, cost_price,
      discount_amount, tax_amount, total, company_id
    ) VALUES (
      v_invoice_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      COALESCE(v_item.cost_price, v_sale_cost, 0),
      COALESCE(v_item.discount_amount, 0),
      v_line_tax,
      v_line_total, v_company_id
    );

    INSERT INTO public.product_stock (
      product_id, warehouse_id, quantity, company_id, updated_by, updated_at
    ) VALUES (
      v_item.product_id,
      COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity,
      v_company_id,
      v_user_id,
      now()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity = product_stock.quantity - v_item.quantity,
      updated_at = now(),
      updated_by = v_user_id;

    INSERT INTO public.inventory_transactions (
      company_id, product_id, warehouse_id, quantity, transaction_type,
      reference_type, reference_id, unit_cost, total_cost, created_by
    ) VALUES (
      v_company_id, v_item.product_id, COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity, 'sales', 'sales_invoice', v_invoice_id,
      COALESCE(v_item.cost_price, v_sale_cost, 0),
      round(v_item.quantity * COALESCE(v_item.cost_price, v_sale_cost, 0), 4),
      v_user_id
    );
  END LOOP;

  -- === PHASE 5: POST INVOICE ===
  UPDATE public.invoices
  SET status = v_status,
      paid_amount = v_actual_paid
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;


-- ==============================================================================
-- 2. FINANCIAL & ALLOCATION CONCURRENCY GUARDS
-- ==============================================================================

-- 2.1 Prevent Race Conditions with FOR UPDATE row-lock during allocation
CREATE OR REPLACE FUNCTION public.validate_payment_allocation_total_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment_id       uuid;
  v_total_allocated  numeric;
  v_payment_amount   numeric;
BEGIN
  v_payment_id := COALESCE(NEW.payment_id, OLD.payment_id);
  
  -- قفل صفي متزامن على السند لمنع الـ Race Condition
  SELECT amount INTO v_payment_amount
  FROM public.payments
  WHERE id = v_payment_id
  FOR UPDATE;

  IF v_payment_amount IS NULL THEN
    RAISE EXCEPTION 'السند المالي المحدد غير موجود' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_allocated
  FROM public.payment_allocations
  WHERE payment_id = v_payment_id 
    AND deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR id <> OLD.id);

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_total_allocated := v_total_allocated + NEW.amount;
  END IF;

  IF v_total_allocated > v_payment_amount + 0.001 THEN
    RAISE EXCEPTION 'إجمالي مبالغ التوزيع (%) يتجاوز قيمة السند الأصلية (%)', v_total_allocated, v_payment_amount USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2.2 Prevent Allocation to Void/Draft Invoices or from Void Payments
CREATE OR REPLACE FUNCTION public.validate_payment_allocation_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment_company uuid;
  v_invoice_company uuid;
  v_payment_party   uuid;
  v_invoice_party   uuid;
  v_payment_status  text;
  v_invoice_status  text;
BEGIN
  SELECT company_id, party_id, status 
  INTO v_payment_company, v_payment_party, v_payment_status 
  FROM public.payments WHERE id = NEW.payment_id;

  SELECT company_id, party_id, status 
  INTO v_invoice_company, v_invoice_party, v_invoice_status 
  FROM public.invoices WHERE id = NEW.invoice_id;

  IF v_payment_status IN ('void') THEN
    RAISE EXCEPTION 'لا يمكن توزيع مبالغ من سند ملغي' USING ERRCODE = '23514';
  END IF;

  IF v_invoice_status IN ('void', 'cancelled', 'draft') THEN
    RAISE EXCEPTION 'لا يمكن ربط دفعة بفاتورة بحالة: %', v_invoice_status USING ERRCODE = '23514';
  END IF;

  IF v_payment_company IS DISTINCT FROM v_invoice_company THEN
    RAISE EXCEPTION 'تعارض المنشأة: المنشأة في السند (%) لا تطابق المنشأة في الفاتورة (%)', v_payment_company, v_invoice_company USING ERRCODE = '23514';
  END IF;

  IF v_payment_party IS DISTINCT FROM v_invoice_party THEN
    RAISE EXCEPTION 'تعارض الطرف: العميل/المورد في السند لا يطابق الطرف في الفاتورة' USING ERRCODE = '23514';
  END IF;

  NEW.company_id := v_payment_company;
  RETURN NEW;
END;
$function$;

-- 2.3 Add Checks on journal_entry_lines
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jel_exchange_rate_positive') THEN
    ALTER TABLE public.journal_entry_lines 
      ADD CONSTRAINT chk_jel_exchange_rate_positive 
      CHECK (exchange_rate IS NULL OR exchange_rate > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jel_foreign_amount_non_negative') THEN
    ALTER TABLE public.journal_entry_lines 
      ADD CONSTRAINT chk_jel_foreign_amount_non_negative 
      CHECK (foreign_amount IS NULL OR foreign_amount >= 0);
  END IF;
END $$;


-- ==============================================================================
-- 3. MISSING UNIQUE CONSTRAINTS
-- ==============================================================================

-- 3.1 Chart of Accounts: Unique code per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_company_code 
  ON public.accounts (company_id, code) 
  WHERE deleted_at IS NULL;

-- 3.2 Warehouses: Unique name_ar per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_company_name_ar 
  ON public.warehouses (company_id, name_ar) 
  WHERE deleted_at IS NULL;


-- ==============================================================================
-- 4. COMPOSITE FOREIGN KEYS FOR MULTI-TENANT ISOLATION
-- ==============================================================================

-- 4.1 product_stock -> products & warehouses
ALTER TABLE public.product_stock
  DROP CONSTRAINT IF EXISTS product_stock_product_id_fkey,
  DROP CONSTRAINT IF EXISTS product_stock_warehouse_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_product_stock_company_product,
  DROP CONSTRAINT IF EXISTS fk_product_stock_company_warehouse;

ALTER TABLE public.product_stock
  ADD CONSTRAINT fk_product_stock_company_product 
    FOREIGN KEY (company_id, product_id) REFERENCES public.products(company_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_product_stock_company_warehouse 
    FOREIGN KEY (company_id, warehouse_id) REFERENCES public.warehouses(company_id, id) ON DELETE CASCADE;

-- 4.2 invoice_items -> invoices & products
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey,
  DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_invoice_items_company_invoice,
  DROP CONSTRAINT IF EXISTS fk_invoice_items_company_product;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT fk_invoice_items_company_invoice 
    FOREIGN KEY (company_id, invoice_id) REFERENCES public.invoices(company_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_invoice_items_company_product 
    FOREIGN KEY (company_id, product_id) REFERENCES public.products(company_id, id) ON DELETE RESTRICT;

-- 4.3 payments -> accounts, parties & branches
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_account_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_party_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_branch_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_payments_company_account,
  DROP CONSTRAINT IF EXISTS fk_payments_company_party,
  DROP CONSTRAINT IF EXISTS fk_payments_company_branch;

ALTER TABLE public.payments
  ADD CONSTRAINT fk_payments_company_account 
    FOREIGN KEY (company_id, account_id) REFERENCES public.accounts(company_id, id),
  ADD CONSTRAINT fk_payments_company_party 
    FOREIGN KEY (company_id, party_id) REFERENCES public.parties(company_id, id),
  ADD CONSTRAINT fk_payments_company_branch 
    FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;

-- 4.4 warehouses -> branches
ALTER TABLE public.warehouses
  DROP CONSTRAINT IF EXISTS warehouses_branch_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_warehouses_company_branch;

ALTER TABLE public.warehouses
  ADD CONSTRAINT fk_warehouses_company_branch 
    FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE SET NULL;

-- 4.5 expenses -> branches
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_branch_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_expenses_company_branch;

ALTER TABLE public.expenses
  ADD CONSTRAINT fk_expenses_company_branch 
    FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;

-- 4.6 stock_transfers -> warehouses
ALTER TABLE public.stock_transfers
  DROP CONSTRAINT IF EXISTS stock_transfers_from_warehouse_id_fkey,
  DROP CONSTRAINT IF EXISTS stock_transfers_to_warehouse_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_stock_transfers_company_from_wh,
  DROP CONSTRAINT IF EXISTS fk_stock_transfers_company_to_wh;

ALTER TABLE public.stock_transfers
  ADD CONSTRAINT fk_stock_transfers_company_from_wh 
    FOREIGN KEY (company_id, from_warehouse_id) REFERENCES public.warehouses(company_id, id),
  ADD CONSTRAINT fk_stock_transfers_company_to_wh 
    FOREIGN KEY (company_id, to_warehouse_id) REFERENCES public.warehouses(company_id, id);


-- ==============================================================================
-- 5. SECURITY, PRIVACY & PRIVILEGE HARDENING
-- ==============================================================================

-- 5.1 Shield Cost Price from Supplier Portal Context
CREATE OR REPLACE FUNCTION public.get_supplier_portal_context(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_supplier RECORD;
  v_company RECORD;
  v_reorder_products jsonb;
  v_rfqs jsonb;
  v_quotations jsonb;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'invalid_token: رمز الوصول مطلوب' USING ERRCODE = '42501';
  END IF;

  SELECT id, company_id, name, phone, email, tax_number, address, commercial_registration, payment_terms_days
  INTO v_supplier
  FROM public.parties
  WHERE portal_token = trim(p_token)
    AND type = 'supplier'
    AND deleted_at IS NULL
    AND (status IS NULL OR status = 'active');

  IF v_supplier.id IS NULL THEN
    RAISE EXCEPTION 'invalid_portal_token: رابط البوابة غير صالح أو تم إلغاؤه' USING ERRCODE = '42501';
  END IF;

  SELECT id, name_ar, logo_url, phone, address, tax_number
  INTO v_company
  FROM public.companies
  WHERE id = v_supplier.company_id;

  -- Reorder products (PROTECTED: cost_price and sale_price are excluded/nullified for supplier confidentiality)
  SELECT COALESCE(jsonb_agg(p_row), '[]'::jsonb)
  INTO v_reorder_products
  FROM (
    SELECT 
      p.id,
      p.name_ar,
      p.sku,
      p.part_number,
      p.brand,
      p.size,
      p.unit,
      p.min_stock_level::numeric as min_stock_level,
      COALESCE(SUM(ps.quantity), 0)::numeric as current_stock,
      (COALESCE(SUM(ps.quantity), 0) <= COALESCE(p.min_stock_level, 0)) as needs_reorder
    FROM public.products p
    LEFT JOIN public.product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = v_supplier.company_id
      AND p.deleted_at IS NULL
      AND p.status = 'active'
    GROUP BY p.id
    ORDER BY (COALESCE(SUM(ps.quantity), 0) <= COALESCE(p.min_stock_level, 0)) DESC, p.name_ar ASC
    LIMIT 150
  ) p_row;

  -- Active RFQs
  SELECT COALESCE(jsonb_agg(rfq_row), '[]'::jsonb)
  INTO v_rfqs
  FROM (
    SELECT 
      r.rfq_id as id,
      r.rfq_number,
      r.title,
      r.status,
      r.submission_deadline,
      r.delivery_date,
      r.terms_and_conditions,
      r.created_at,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'id', ri.rfq_item_id,
          'product_id', ri.product_id,
          'description', ri.description,
          'quantity', ri.quantity,
          'unit_of_measure', ri.unit_of_measure,
          'target_unit_price', ri.target_unit_price,
          'oem_number', ri.oem_number,
          'notes', ri.notes
        ))
        FROM public.prc_rfq_items ri
        WHERE ri.rfq_id = r.rfq_id), '[]'::jsonb
      ) as items
    FROM public.prc_rfqs r
    WHERE r.company_id = v_supplier.company_id
      AND r.status IN ('published', 'open', 'active')
    ORDER BY r.created_at DESC
    LIMIT 50
  ) rfq_row;

  -- Previous Quotations by this supplier
  SELECT COALESCE(jsonb_agg(q_row), '[]'::jsonb)
  INTO v_quotations
  FROM (
    SELECT 
      q.id,
      q.quotation_number,
      q.status,
      q.issue_date,
      q.valid_until,
      q.total_amount,
      q.currency_code,
      q.notes,
      q.delivery_terms,
      q.payment_terms,
      q.created_at,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'id', qi.id,
          'product_id', qi.product_id,
          'description', qi.description,
          'quantity', qi.quantity,
          'unit_price', qi.unit_price,
          'total', qi.total
        ))
        FROM public.quotation_items qi
        WHERE qi.quotation_id = q.id), '[]'::jsonb
      ) as items
    FROM public.quotations q
    WHERE q.party_id = v_supplier.id
      AND q.company_id = v_supplier.company_id
      AND q.deleted_at IS NULL
    ORDER BY q.created_at DESC
    LIMIT 50
  ) q_row;

  RETURN jsonb_build_object(
    'supplier', jsonb_build_object(
      'id', v_supplier.id,
      'name', v_supplier.name,
      'phone', v_supplier.phone,
      'email', v_supplier.email,
      'tax_number', v_supplier.tax_number,
      'address', v_supplier.address,
      'commercial_registration', v_supplier.commercial_registration,
      'payment_terms_days', v_supplier.payment_terms_days
    ),
    'company', jsonb_build_object(
      'id', v_company.id,
      'name_ar', v_company.name_ar,
      'logo_url', v_company.logo_url,
      'phone', v_company.phone,
      'address', v_company.address,
      'tax_number', v_company.tax_number
    ),
    'reorder_products', v_reorder_products,
    'rfqs', v_rfqs,
    'quotations', v_quotations
  );
END;
$function$;

-- 5.2 Revoke api_v1_sys_claim_job from general authenticated users (Service Role & Admin only)
REVOKE EXECUTE ON FUNCTION public.api_v1_sys_claim_job(character varying, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.api_v1_sys_claim_job(character varying, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.api_v1_sys_claim_job(character varying, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.api_v1_sys_claim_job(character varying, integer) TO service_role;

-- 5.3 Revoke catalog dump functions from unauthenticated (anon) role
REVOKE EXECUTE ON FUNCTION public.get_all_products(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_products_page(uuid, integer, integer, text, uuid, text, uuid, boolean) FROM anon;

COMMIT;
