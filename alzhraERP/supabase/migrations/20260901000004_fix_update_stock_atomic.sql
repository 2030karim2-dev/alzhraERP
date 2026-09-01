-- ============================================================
-- 20260901000004 — إصلاح TOCTOU في تسوية المخزون اليدوية
-- ------------------------------------------------------------
-- updateStock في inventory/api/warehouseApi.ts كان يقرأ الكمية
-- ثم يُدرج التسوية في خطوتين منفصلتين (غير ذري) → تزامنان
-- على نفس المنتج/المستودع = تسوية خاطئة (adjustment محسوب على
-- كمية قديمة). هذا RPC ذري ينفذ القراءة + الإدراج داخل معاملة واحدة.
-- يتبع نمط R-26: auth.uid() + fn_assert_company_access + search_path.
-- ============================================================

create or replace function public.adjust_stock_atomic(
  p_company_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_target_quantity numeric,
  p_user_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current numeric;
  v_adjustment numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- بوابة المستأجر (R-26 pattern)
  perform public.fn_assert_company_access(p_company_id);

  select coalesce(quantity, 0)
    into v_current
    from public.product_stock
   where product_id = p_product_id
     and warehouse_id = p_warehouse_id;

  v_adjustment := p_target_quantity - v_current;

  if v_adjustment <> 0 then
    insert into public.inventory_transactions (
      company_id, created_by, product_id, warehouse_id, quantity,
      total_cost, unit_cost, transaction_type, reference_type
    ) values (
      p_company_id, p_user_id, p_product_id, p_warehouse_id, v_adjustment,
      0, 0, 'adjustment', 'manual_update'
    );
  end if;

  return jsonb_build_object('ok', true, 'adjustment', v_adjustment);
end;
$$;

revoke execute on function public.adjust_stock_atomic(uuid, uuid, uuid, numeric, uuid) from anon, public;
grant execute on function public.adjust_stock_atomic(uuid, uuid, uuid, numeric, uuid) to authenticated;
