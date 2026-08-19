-- ============================================================
-- Fix purchase payment accounting: cash purchases booked as credit
-- ------------------------------------------------------------
-- BUG (confirmed on live data): fn_auto_post_invoice_journal
-- credited the supplier payable account (2100) for EVERY purchase
-- invoice regardless of payment_method, so cash purchases were
-- recorded as supplier debt in the ledger, inflated supplier
-- balances and skewed purchase statistics.
--
-- Fixes:
--   1. invoices.payment_account_id column — the account chosen in
--      the purchase UI was previously dropped by the RPC.
--   2. commit_purchase_invoice stores payment_account_id and marks
--      non-credit purchases as fully paid.
--   3. fn_auto_post_invoice_journal credits AP (2100) ONLY for
--      'credit' purchases; cash/bank/transfer/check purchases
--      credit the payment account (or the default cash 1010).
--   4. get_purchase_stats debt metrics now exclude non-credit
--      methods and honor the branch filter + paid amounts.
--   5. Backfill: existing non-credit purchase invoices are marked
--      paid and receive a balanced compensating journal
--      (Dr AP 2100 / Cr cash 1010) that reverses the wrong AP
--      credit without touching the immutable posted entries.
-- ============================================================

-- 1) Schema: remember the payment account selected at save time ---
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES public.accounts(id);

-- Helper: a POSTABLE cash account (child, allow_posting=true) for the company,
-- preferring one matching the invoice currency, else any postable account.
CREATE OR REPLACE FUNCTION public.fn_get_default_cash_account(p_company_id uuid, p_currency text DEFAULT 'SAR'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path = 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.accounts
  WHERE company_id = p_company_id AND code LIKE '101%'
    AND allow_posting = true AND is_active = true AND deleted_at IS NULL
  ORDER BY CASE WHEN currency_code = p_currency THEN 0 ELSE 1 END, code
  LIMIT 1;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.accounts
    WHERE company_id = p_company_id
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY code
    LIMIT 1;
  END IF;
  RETURN v_id;
END;
$function$;


-- ============================================================
-- 2) commit_purchase_invoice: keep payment_account_id + mark
--    non-credit purchases as fully paid (cash/bank/transfer/check).
-- ============================================================
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
    payment_method, payment_account_id, subtotal, tax_amount, total_amount, paid_amount
  ) values (
    p_company_id, p_branch_id, p_supplier_id, v_gen_number, 'purchase', 'draft',
    p_issue_date, p_due_date, p_notes, v_uid, p_currency, p_exchange_rate,
    p_payment_method, p_payment_account_id, 0, 0, 0, 0
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

  -- ⚡ FIX: non-credit purchases (cash/bank/transfer/check) are paid on the
  -- spot, so mark them fully paid; check_invoice_paid_status() will flip the
  -- status to 'paid'. Credit purchases keep paid_amount = 0 (supplier debt).
  update invoices
  set subtotal=v_subtotal, tax_amount=v_tax_total, total_amount=v_total,
      paid_amount = case when coalesce(p_payment_method,'credit') <> 'credit' then v_total else paid_amount end
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
$function$;

REVOKE EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) TO authenticated;

-- ============================================================
-- 3) fn_auto_post_invoice_journal: credit the FUNDING account
--    (AP 2100 only for 'credit'; cash/bank/transfer/check → the
--    payment account chosen at save time, else default cash 1010).
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
  -- Amount actually receivable/payable - NET of discount (keeps the journal balanced)
  v_net_receivable := new.total_amount - coalesce(new.discount_amount,0);

  if new.type = 'sale' then
    if v_acc_ar is null or v_acc_revenue is null then
      raise exception 'auto_post_failed: حسابات AR(1100)/Revenue(4100) غير موجودة لشركة % - يجب إنشاؤها قبل ترحيل الفاتورة %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_invoice', new.id,
            'ترحيل تلقائي - فاتورة مبيعات ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ar, new.company_id, new.branch_id, v_net_receivable, 0, new.currency_code, coalesce(new.exchange_rate,1), 'مدينون - ' || coalesce(new.invoice_number,''), new.party_id);

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

    -- ⚡ FIX: the CREDIT side depends on how the invoice was paid:
    --   'credit' (أجل) → supplier payable AP (2100).
    --   cash/bank/transfer/check (نقداً/بنكي/تحويل/شيك) → the payment account
    --   chosen at save time, falling back to a postable cash account.
    if coalesce(new.payment_method,'credit') = 'credit' then
      v_acc_funding := v_acc_ap;
    else
      v_acc_funding := coalesce(new.payment_account_id, public.fn_get_default_cash_account(new.company_id, new.currency_code));
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
            case when coalesce(new.payment_method,'credit') = 'credit' then 'دائنون - ' else 'صرف نقدي - ' end || coalesce(new.invoice_number,''),
            case when coalesce(new.payment_method,'credit') = 'credit' then new.party_id else null end);

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


-- ============================================================
-- 4) get_purchase_stats: debt = credit-only, honor branch + paid
-- ============================================================
DROP FUNCTION IF EXISTS public.get_purchase_stats(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_purchase_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    'invoiceCount',
      (SELECT COUNT(*) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase' AND status != 'void' AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)),
    'totalPurchases',
      COALESCE((SELECT SUM(total_amount) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'pendingPaymentCount',
      (SELECT COUNT(*) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase'
         AND (total_amount - COALESCE(paid_amount,0)) > 0
         AND status NOT IN ('void','draft')
         AND COALESCE(payment_method,'credit') = 'credit'
         AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)),
    'totalDebt',
      COALESCE((SELECT SUM(total_amount - COALESCE(paid_amount,0)) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase'
         AND (total_amount - COALESCE(paid_amount,0)) > 0
         AND status NOT IN ('void','draft')
         AND COALESCE(payment_method,'credit') = 'credit'
         AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'topSuppliers',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', COALESCE(p.name, 'غير محدد'), 'value', s.total))
        FROM (
          SELECT i.party_id, SUM(i.total_amount - COALESCE(i.paid_amount,0)) AS total
          FROM public.invoices i
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND (i.total_amount - COALESCE(i.paid_amount,0)) > 0
            AND i.status NOT IN ('void','draft')
            AND COALESCE(i.payment_method,'credit') = 'credit'
            AND i.deleted_at IS NULL
            AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
          GROUP BY i.party_id
          ORDER BY total DESC
          LIMIT 5
        ) s
        LEFT JOIN public.parties p ON p.id = s.party_id AND p.deleted_at IS NULL
      ), '[]'::jsonb),
    'chartData',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('date', d.day, 'amount', d.total) ORDER BY d.day)
        FROM (
          SELECT to_char(issue_date, 'YYYY-MM-DD') AS day, SUM(total_amount) AS total
          FROM public.invoices
          WHERE company_id = vc AND type = 'purchase'
            AND status IN ('posted','paid','partially_paid')
            AND deleted_at IS NULL
            AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          GROUP BY 1
        ) d
      ), '[]'::jsonb)
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) TO authenticated;


-- ============================================================
-- 5) Backfill EXISTING data (idempotent):
--    a. Mark existing non-credit purchase invoices as fully paid.
--    b. Post a balanced compensating journal per affected invoice
--       (Dr AP 2100 / Cr cash 1010) reversing the wrong AP credit.
--       Posted entries are immutable, so we append, not edit.
-- ============================================================
UPDATE public.invoices
SET paid_amount = total_amount
WHERE type = 'purchase' AND deleted_at IS NULL
  AND COALESCE(payment_method,'credit') <> 'credit'
  AND total_amount > COALESCE(paid_amount,0);

DO $$
DECLARE
  r record;
  v_je uuid;
  v_ap uuid;
  v_cash uuid;
BEGIN
  FOR r IN
    SELECT i.id, i.company_id, i.branch_id, i.issue_date, i.party_id,
           i.invoice_number, i.total_amount, i.currency_code, i.exchange_rate,
           i.created_by
    FROM public.invoices i
    WHERE i.type = 'purchase' AND i.deleted_at IS NULL
      AND COALESCE(i.payment_method,'credit') <> 'credit'
      AND EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.reference_id = i.id AND je.reference_type = 'purchase_invoice' AND je.deleted_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je2
        WHERE je2.reference_id = i.id AND je2.reference_type = 'purchase_payment_correction' AND je2.deleted_at IS NULL
      )
  LOOP
    SELECT id INTO v_ap   FROM public.accounts WHERE company_id = r.company_id AND code = '2100' AND deleted_at IS NULL LIMIT 1;
    SELECT public.fn_get_default_cash_account(r.company_id, r.currency_code) INTO v_cash;

    IF v_ap IS NOT NULL AND v_cash IS NOT NULL THEN
      INSERT INTO public.journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
      VALUES (r.company_id, r.branch_id, r.issue_date, 'purchase_payment_correction', r.id,
              'تصحيح - تحويل فاتورة شراء نقدية من دائنون إلى الصندوق ' || COALESCE(r.invoice_number,''), 'draft', r.created_by)
      RETURNING id INTO v_je;

      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je, v_ap, r.company_id, r.branch_id, r.total_amount, 0, r.currency_code, COALESCE(r.exchange_rate,1), 'تصحيح دائنون - ' || COALESCE(r.invoice_number,''), r.party_id);

      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      VALUES (v_je, v_cash, r.company_id, r.branch_id, 0, r.total_amount, r.currency_code, COALESCE(r.exchange_rate,1), 'صرف نقدي - ' || COALESCE(r.invoice_number,''));

      UPDATE public.journal_entries SET status = 'posted' WHERE id = v_je;
    END IF;
  END LOOP;
END $$;

