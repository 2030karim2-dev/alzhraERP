-- ============================================================
-- 20260901000006 — تدقيق R-28: تصحيح عرض النقص + توصيل adjust_stock_atomic
-- ------------------------------------------------------------
-- 1) v_rpcs_missing_audit كان يلتقط دوال بنية/triggers داخلية
--    (update_*_timestamp, *_search_vector, update_*_updated_at,
--     update_invoice_totals_from_items, update_invoice_status_on_payment,
--     resolve_vehicle_from_vin وهي قراءة) — تُستبعد صراحةً الآن،
--    فيظهر العدد الحقيقي للـRPCs الكتابية التي تنتظر التوصيل.
-- 2) توصيل audit_write فعلياً في adjust_stock_atomic (RPC التسوية الذرية)
--    كإثبات للنمط الموصى به في R-28.
-- ============================================================

create or replace view public.v_rpcs_missing_audit as
select n.nspname as schema,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prolang = (select oid from pg_language where lanname = 'plpgsql')
  and p.proname ~ '^(commit_|void_|create_|update_|delete_|insert_|post_|adjust_|transfer_|assemble_|disassemble_|break_|complete_|finalize_|record_|mark_|resolve_|ensure_|save_|submit_|add_|quick_|process_|incentive_)'
  and pg_get_functiondef(p.oid) not like '%public.audit_write(%'
  and p.proname <> all (array['fn_assert_company_access', 'fn_reverse_journal_entries', 'fn_reverse_inventory_for_reference', 'fn_post_inventory_movement', 'fn_release_payment_allocations', 'fn_auto_post_invoice_journal', 'fn_auto_post_payment_journal', 'fn_check_inventory_transaction_tenant', 'fn_check_invoice_item_product_tenant', 'fn_check_invoice_party_tenant', 'fn_check_journal_line_account_postable', 'fn_check_journal_line_account_tenant', 'fn_check_journal_line_entry_tenant', 'fn_check_journal_line_party_tenant', 'fn_check_payment_account_tenant', 'fn_check_payment_party_tenant', 'fn_validate_invoice_business_rules'])
  -- دوال بنية/triggers داخلية — لا تمثل أحداثاً تجارية تستحق التدقيق
  and not (
    p.proname like 'update_%'
    and (
      p.proname like '%_timestamp'
      or p.proname like '%_search_vector'
      or p.proname like '%_updated_at'
      or p.proname in ('update_invoice_totals_from_items', 'update_invoice_status_on_payment', 'update_updated_at_column', 'update_prc_timestamp', 'update_quotation_updated_at')
    )
  )
  and p.proname <> 'resolve_vehicle_from_vin'
order by p.proname;

-- ── توصيل التدقيق في adjust_stock_atomic ───────────────────────────
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

    -- R-28: تدقيق (failsafe — فشل التدقيق لا يكسر العملية الأصلية)
    begin
      perform public.audit_write(
        'stock_adjusted',
        'inventory_transactions',
        p_product_id,
        p_company_id,
        jsonb_build_object('warehouse_id', p_warehouse_id, 'adjustment', v_adjustment)
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'adjustment', v_adjustment);
end;
$$;

revoke execute on function public.adjust_stock_atomic(uuid, uuid, uuid, numeric, uuid) from anon, public;
grant execute on function public.adjust_stock_atomic(uuid, uuid, uuid, numeric, uuid) to authenticated;
