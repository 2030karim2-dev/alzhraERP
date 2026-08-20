-- ============================================================
-- Migration: Fix Arabic encoding corruption (functions + data)
-- Date: 2026-08-24
-- ============================================================
-- Root cause: earlier migration applies used an encoding-corrupting
-- channel that double-encoded the Arabic literals (UTF-8 read as
-- cp1256) inside 4 production functions, and some rows lost Arabic
-- entirely (stored as literal '?' runs). The repo sources are clean; the current
-- Management API channel is verified UTF-8-safe.
--
-- Fix:
--   1. Re-create 3 recoverable functions from their live definitions
--      with the mojibake decoded back to UTF-8 (logic unchanged).
--   2. Re-create guard_company_owner_transfer from the clean repo
--      source (its Arabic was lost to '?').
--   3. Repair 17 corrupted journal rows (9 decode + 8 re-derive).
-- ============================================================

BEGIN;
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


CREATE OR REPLACE FUNCTION public.get_purchase_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.guard_company_owner_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> OLD.owner_id
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'لا يمكن تغيير مالك المنشأة إلا من المالك الحالي أو مسؤول النظام';
  END IF;
  RETURN NEW;
END;
$function$;
-- ===== Data repair =====
-- Posted entries are immutable via triggers; we only fix corrupted TEXT
-- (descriptions), never amounts/dates. Temporarily disable trigger firing.
SET session_replication_role = replica;

-- A) Recoverable double-encoded Arabic (cp1256-misread UTF-8) -> decode.
UPDATE public.journal_entries
SET description = convert_from(convert_to(description,'WIN1256'),'UTF8')
WHERE id IN (
  'f245f7ca-71e1-41e2-a1f2-eee72a1287a4',
  '3b4c042a-056c-44be-86f0-11738e3e0fde',
  'f8921cb6-394d-4981-8668-a43aaee09f96'
);

UPDATE public.journal_entry_lines
SET description = convert_from(convert_to(description,'WIN1256'),'UTF8')
WHERE id IN (
  '23bafcb4-072f-4953-87ba-7f0183690820',
  'ee433155-9b6e-41f5-a791-61f3d9f84bdd',
  '2f21e5ad-4608-4794-a157-e34b6bb1f486',
  'd7b49a36-d894-45cd-8509-167b4560405a',
  'e83dd3b2-f5d6-48b5-857c-8229ee2bb4a6',
  'df97b9ac-5705-4189-bd8a-ed5b947393e1'
);

-- B) Lossy rows (question-mark runs) -> re-derive from the linked invoice.
UPDATE public.journal_entries je
SET description = 'ترحيل تلقائي - فاتورة شراء ' || i.invoice_number
FROM public.invoices i
WHERE je.id IN (
  'c8063dfd-2aaa-4758-bd12-0398c03ff3f0',
  '85c8ed68-8794-4605-a9fe-05b9cdc42202'
) AND i.id = je.reference_id AND i.deleted_at IS NULL;

UPDATE public.journal_entry_lines jel
SET description = CASE
    WHEN jel.debit_amount > 0 AND a.code = '1200' THEN 'إضافة مخزون - ' || i.invoice_number
    WHEN jel.debit_amount > 0 AND a.code = '2200' THEN 'ضريبة مشتريات - ' || i.invoice_number
    WHEN jel.credit_amount > 0 AND a.code = '2100' THEN 'دائنون - ' || i.invoice_number
    WHEN jel.credit_amount > 0 THEN 'صرف نقدي - ' || i.invoice_number
    ELSE jel.description
  END
FROM public.journal_entries je, public.invoices i, public.accounts a
WHERE jel.id IN (
  '9abafaaf-ae21-435e-9c69-24be982430d0',
  '28543aa2-31dd-49b6-873b-b4e5fc9317cb',
  '5ad2b341-a4ed-424b-8acb-4c25749ba76c',
  'c0aace6e-eefa-46bd-8302-cc876021e896',
  '75f7ada1-c0f9-4b50-a7ae-2ee4054416db',
  '0d1a6271-add8-4ec9-b7d1-0410d4205020'
)
  AND je.id = jel.journal_entry_id
  AND i.id = je.reference_id
  AND i.deleted_at IS NULL
  AND a.id = jel.account_id;

-- Re-enable trigger firing.
SET session_replication_role = origin;

COMMIT;
