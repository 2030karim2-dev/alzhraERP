-- ============================================================
-- ADD p_due_date SUPPORT TO commit_purchase_invoice
-- Date: 2026-08-18
--
-- The `invoices` table has a due_date column, but commit_purchase_invoice
-- never populated it and the RPC signature had no p_due_date parameter —
-- so the frontend's CreatePurchaseDTO.dueDate was silently dropped.
--
-- This migration:
--   1. Re-creates the function with an extra optional p_due_date parameter
--      (positioned last, so existing named-arg callers keep working).
--   2. Drops the old 12-arg overload (a changed arg list makes CREATE OR
--      REPLACE create a NEW overload rather than replace the old one).
--   3. Re-applies the privilege hardening (the new overload would otherwise
--      inherit the default PUBLIC/anon EXECUTE grant).
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
$function$;

-- The changed argument list made CREATE OR REPLACE create a NEW overload;
-- drop the old 12-arg version so there is no ambiguity (idempotent guard).
DROP FUNCTION IF EXISTS public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid);

-- Privilege hardening for the NEW overload (the default PUBLIC/anon EXECUTE
-- would otherwise reopen the hole closed by 20260818000005_revoke_anon_execute).
REVOKE EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) TO authenticated;
