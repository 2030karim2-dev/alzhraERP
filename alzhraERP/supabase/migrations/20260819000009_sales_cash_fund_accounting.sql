-- ============================================================
-- Fix sale payment accounting: cash sales booked to customer AR
-- ------------------------------------------------------------
-- BUG (same class as the purchase fix in 00008): the sales
-- journal credited the customer receivable account (AR 1100) for
-- EVERY sale regardless of payment_method, so cash sales never
-- hit the cash fund and customer balances were inflated.
--
-- Fixes:
--   1. commit_sales_invoice_v2 accepts p_payment_account_id,
--      stores it on the invoice, and marks non-credit sales as
--      fully paid (status 'paid').
--   2. fn_auto_post_invoice_journal sales branch debits the cash
--      fund (payment account, or a postable cash account matched
--      by currency) for non-credit sales; AR (1100) only for
--      'credit' sales. The receivable is booked gross (incl. tax)
--      so the journal stays balanced.
--   3. Postability guard: if the stored payment account is a
--      parent/aggregate (allow_posting=false), fall back to a
--      postable cash account (applies to purchases too).
-- ============================================================

-- ============================================================
-- 1) commit_sales_invoice_v2 (11-arg): payment account + cash paid
-- ============================================================
CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(p_party_id uuid, p_invoice_date date, p_due_date date, p_items jsonb, p_payment_type text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_idempotency_key text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid, p_payment_account_id uuid DEFAULT NULL::uuid)
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
  v_is_cash boolean;
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
    SELECT ps.quantity, ps.warehouse_id INTO v_stock_record
    FROM public.product_stock ps
    WHERE ps.product_id = v_item.product_id
      AND ps.warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND ps.company_id = v_company_id
    FOR UPDATE;

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

  -- ⚡ FIX: non-credit sales (cash/bank/transfer/check) are paid on the spot.
  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';

  -- === PHASE 3: CREATE INVOICE ===
  -- total_amount is stored GROSS (subtotal + tax), consistent with purchases
  -- and with the chk_invoices_paid_not_exceed_total constraint.
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount + v_total_tax, v_total_tax, p_payment_type, p_payment_account_id,
    CASE WHEN v_is_cash THEN 'paid' ELSE 'posted' END, p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    CASE WHEN v_is_cash THEN v_total_amount + v_total_tax ELSE 0 END
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
$function$;

-- The changed argument list made CREATE OR REPLACE create a NEW overload;
-- drop the old 10-arg version so there is no ambiguity.
DROP FUNCTION IF EXISTS public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid);

-- Privilege hardening for the NEW overload.
REVOKE EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid) TO authenticated;


-- ============================================================
-- 2) fn_auto_post_invoice_journal: sales debit the cash fund for
--    non-credit sales (AR only for 'credit'); postability guard.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_auto_post_invoice_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_je_id uuid;
  v_acc_ar uuid;
  v_acc_ap uuid;
  v_acc_revenue uuid;
  v_acc_vat uuid;
  v_acc_inventory uuid;
  v_acc_cogs uuid;
  v_acc_funding uuid;
  v_total_cost numeric(18,4);
  v_net_amount numeric(18,4);
  v_net_receivable numeric(18,4);
  v_already_posted boolean;
  v_postable_statuses text[] := array['posted','confirmed','paid','partially_paid'];
begin
  if not (new.status = any(v_postable_statuses)) then
    return new;
  end if;

  select exists(
    select 1 from public.journal_entries je
    where je.reference_id = new.id and je.deleted_at is null
  ) into v_already_posted;
  if v_already_posted then
    return new;
  end if;

  v_acc_ar        := fn_get_account_id(new.company_id, '1100');
  v_acc_ap        := fn_get_account_id(new.company_id, '2100');
  v_acc_revenue   := fn_get_account_id(new.company_id, '4100');
  v_acc_vat       := fn_get_account_id(new.company_id, '2200');
  v_acc_inventory := fn_get_account_id(new.company_id, '1200');
  v_acc_cogs      := fn_get_account_id(new.company_id, '5100');

  -- Net value after tax & discount
  v_net_amount := (new.total_amount - coalesce(new.tax_amount,0)) - coalesce(new.discount_amount,0);
  -- Amount actually receivable/payable - GROSS (total_amount already includes tax)
  v_net_receivable := new.total_amount - coalesce(new.discount_amount,0);

  -- ⚡ Resolve the funding account for a non-credit invoice:
  --   the payment account chosen at save time, else a postable cash
  --   account matched by currency. If the stored account is a parent
  --   (allow_posting=false), fall back to a postable one.
  if new.payment_method is null or coalesce(new.payment_method,'credit') = 'credit' then
    v_acc_funding := null;
  else
    v_acc_funding := coalesce(new.payment_account_id, public.fn_get_default_cash_account(new.company_id, new.currency_code));
    if v_acc_funding is not null and not exists (
      select 1 from public.accounts
      where id = v_acc_funding and allow_posting = true and is_active = true and deleted_at is null
    ) then
      v_acc_funding := public.fn_get_default_cash_account(new.company_id, new.currency_code);
    end if;
  end if;

  if new.type = 'sale' then
    if v_acc_revenue is null then
      raise exception 'auto_post_failed: حساب الإيرادات (4100) غير موجود لشركة % - يجب إنشاؤه قبل ترحيل الفاتورة %', new.company_id, coalesce(new.invoice_number,'');
    end if;
    if v_acc_funding is null and v_acc_ar is null then
      raise exception 'auto_post_failed: حسابات AR(1100)/الصندوق غير موجودة لشركة % - يجب إنشاؤها قبل ترحيل الفاتورة %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_invoice', new.id,
            'ترحيل تلقائي - فاتورة مبيعات ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    -- ⚡ FIX: credit (أجل) → Dr AR (1100); cash/bank/transfer/check → Dr cash fund.
    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, coalesce(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, v_net_receivable, 0, new.currency_code, coalesce(new.exchange_rate,1),
            case when v_acc_funding is null then 'مدينون - ' else 'مقبوضات نقدية - ' end || coalesce(new.invoice_number,''),
            case when v_acc_funding is null then new.party_id else null end);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_net_amount, new.currency_code, coalesce(new.exchange_rate,1), 'إيراد مبيعات - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: حساب الضريبة (2200) غير موجود لشركة % - الفاتورة % تحتوي ضريبة %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, new.tax_amount, new.currency_code, coalesce(new.exchange_rate,1), 'ضريبة مبيعات - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;


  elsif new.type = 'purchase' then
    if v_acc_ap is null or v_acc_inventory is null then
      raise exception 'auto_post_failed: حسابات AP(2100)/Inventory(1200) غير موجودة لشركة % - يجب إنشاؤها قبل ترحيل فاتورة الشراء %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    -- ⚡ FIX: credit (أجل) → Cr AP (2100); cash/bank/transfer/check → Cr cash fund.
    if v_acc_funding is null then
      v_acc_funding := v_acc_ap;
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'purchase_invoice', new.id,
            'ترحيل تلقائي - فاتورة شراء ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_net_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'إضافة مخزون - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: حساب الضريبة (2200) غير موجود لشركة % - فاتورة الشراء % تحتوي ضريبة %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, new.tax_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'ضريبة مشتريات - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_funding, new.company_id, new.branch_id, 0, v_net_receivable, new.currency_code, coalesce(new.exchange_rate,1),
            case when v_acc_funding = v_acc_ap then 'دائنون - ' else 'صرف نقدي - ' end || coalesce(new.invoice_number,''),
            case when v_acc_funding = v_acc_ap then new.party_id else null end);

  elsif new.type in ('purchase_return', 'return_purchase') then
    if v_acc_ap is null or v_acc_inventory is null then
      raise exception 'auto_post_failed: حسابات AP(2100)/Inventory(1200) غير موجودة لشركة % - يجب إنشاؤها قبل ترحيل مرتجع الشراء %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'purchase_return', new.id,
            'ترحيل تلقائي - مرتجع شراء ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ap, new.company_id, new.branch_id, v_net_receivable, 0, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض دائنون - ' || coalesce(new.invoice_number,''), new.party_id);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_net_amount, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض مخزون - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: حساب الضريبة (2200) غير موجود لشركة % - مرتجع الشراء % يحتوي ضريبة %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, new.tax_amount, new.currency_code, coalesce(new.exchange_rate,1), 'عكس ضريبة - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;
  end if;

  update journal_entries set status = 'posted' where id = v_je_id;
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() TO authenticated;

