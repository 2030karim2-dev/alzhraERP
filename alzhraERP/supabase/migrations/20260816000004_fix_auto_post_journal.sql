-- ============================================================
-- Migration: Fix auto-post journal ordering (invoice 400s)
-- Date: 2026-08-16
--
-- BUG: commit_purchase_invoice / commit_sales_invoice_v2 returned
-- 400 (SQLSTATE 23514): 'Cannot add lines to a posted journal entry'.
--
-- ROOT CAUSE: fn_auto_post_invoice_journal inserted the journal_entries
-- header with status='posted' FIRST, then inserted journal_entry_lines.
-- The guard prevent_posted_journal_line_modification() forbids that.
--
-- FIX 1: insert header as 'draft', add lines, then set status='posted'
--        (allowed by restrict_journal_entry_update).
-- FIX 2: v_net_amount computed from (total - tax) instead of subtotal,
--        which is 0 at trigger time for single-statement inserts and
--        made the journal unbalanced (e.g. Revenue credit = 0).
--
-- Verified: purchase + sales both post a 'posted', balanced journal.
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
  v_total_cost numeric(18,4);
  v_net_amount numeric(18,4);
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

  if new.type = 'sale' then
    if v_acc_ar is null or v_acc_revenue is null then
      raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨Ø§Øª AR(1100)/Revenue(4100) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯Ø© ÙØ´Ø±ÙØ© % - ÙØ¬Ø¨ Ø¥ÙØ´Ø§Ø¤ÙØ§ ÙØ¨Ù ØªØ±Ø­ÙÙ Ø§ÙÙØ§ØªÙØ±Ø© %', new.company_id, new.invoice_number;
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_invoice', new.id,
            'ØªØ±Ø­ÙÙ ØªÙÙØ§Ø¦Ù - ÙØ§ØªÙØ±Ø© ï¿½ï¿½ÂØ¨ÙØ¹Ø§Øª ' || new.invoice_number, 'draft', new.created_by)
    returning id into v_je_id;

    v_net_amount := (new.total_amount - coalesce(new.tax_amount,0)) - coalesce(new.discount_amount,0);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ar, new.company_id, new.branch_id, new.total_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'ï¿½ï¿½ÂØ¯ÙÙÙÙ - ' || new.invoice_number, new.party_id);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_net_amount, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¥ÙØ±Ø§Ø¯Ø§Øª ï¿½ï¿½ÂØ¨ÙØ¹Ø§Øª - ' || new.invoice_number, new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨ Ø§ÙØ¶Ø±ÙØ¨Ø© (2200) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯ ÙØ´Ø±ÙØ© % - Ø§ÙÙØ§ØªÙØ±Ø© % ØªØ­ØªÙÙ Ø¶Ø±ÙØ¨Ø© %', new.company_id, new.invoice_number, new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, new.tax_amount, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¶Ø±ÙØ¨Ø© ï¿½ï¿½ÂØ¨ÙØ¹Ø§Øª - ' || new.invoice_number, new.party_id);
    end if;

    select coalesce(sum(ii.quantity * ii.cost_price), 0) into v_total_cost
    from invoice_items ii where ii.invoice_id = new.id;

    if v_total_cost > 0 then
      if v_acc_inventory is null or v_acc_cogs is null then
        raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ùï¿½ï¿½ÂØ®Ø²ÙÙ(1200)/ØªÙÙÙØ© Ø§ÙØ¨Ø¶Ø§Ø¹Ø©(5100) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯Ø© ÙØ´Ø±ÙØ© % - Ø§ÙÙØ§ØªÙØ±Ø© % ÙÙØ§ ØªÙÙÙØ© %', new.company_id, new.invoice_number, v_total_cost;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cost, 0, 'SAR', 1, 'ØªÙÙÙØ© Ø¨Ø¶Ø§Ø¹Ø© ï¿½ï¿½ÂØ¨Ø§Ø¹Ø© - ' || new.invoice_number);

      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_total_cost, 'SAR', 1, 'ØªØ®ÙÙØ¶ ï¿½ï¿½ÂØ®Ø²ÙÙ - ' || new.invoice_number);
    end if;

  elsif new.type = 'sale_return' then
    if v_acc_ar is null or v_acc_revenue is null then
      raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨Ø§Øª AR(1100)/Revenue(4100) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯Ø© ÙØ´Ø±ÙØ© % - ÙØ¬Ø¨ Ø¥ÙØ´Ø§Ø¤ÙØ§ ÙØ¨Ù ØªØ±Ø­ÙÙ Ø§Ùï¿½ï¿½ÂØ±ØªØ¬Ø¹ %', new.company_id, new.invoice_number;
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_return', new.id,
            'ØªØ±Ø­ÙÙ ØªÙÙØ§Ø¦Ù - ï¿½ï¿½ÂØ±ØªØ¬Ø¹ ï¿½ï¿½ÂØ¨ÙØ¹Ø§Øª ' || new.invoice_number, 'draft', new.created_by)
    returning id into v_je_id;

    v_net_amount := (new.total_amount - coalesce(new.tax_amount,0)) - coalesce(new.discount_amount,0);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_net_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¹ÙØ³ Ø¥ÙØ±Ø§Ø¯ - ï¿½ï¿½ÂØ±ØªØ¬Ø¹ ' || new.invoice_number, new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨ Ø§ÙØ¶Ø±ÙØ¨Ø© (2200) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯ ÙØ´Ø±ÙØ© % - Ø§Ùï¿½ï¿½ÂØ±ØªØ¬Ø¹ % ÙØ­ØªÙÙ Ø¶Ø±ÙØ¨Ø© %', new.company_id, new.invoice_number, new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, new.tax_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¹ÙØ³ Ø¶Ø±ÙØ¨Ø© - ï¿½ï¿½ÂØ±ØªØ¬Ø¹ ' || new.invoice_number, new.party_id);
    end if;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ar, new.company_id, new.branch_id, 0, new.total_amount, new.currency_code, coalesce(new.exchange_rate,1), 'ØªØ®ÙÙØ¶ ï¿½ï¿½ÂØ¯ÙÙÙÙ - ï¿½ï¿½ÂØ±ØªØ¬Ø¹ ' || new.invoice_number, new.party_id);

    select coalesce(sum(ii.quantity * ii.cost_price), 0) into v_total_cost
    from invoice_items ii where ii.invoice_id = new.id;

    if v_total_cost > 0 then
      if v_acc_inventory is null or v_acc_cogs is null then
        raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ùï¿½ï¿½ÂØ®Ø²ÙÙ(1200)/ØªÙÙÙØ© Ø§ÙØ¨Ø¶Ø§Ø¹Ø©(5100) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯Ø© ÙØ´Ø±ÙØ© % - Ø§Ùï¿½ï¿½ÂØ±ØªØ¬Ø¹ % ÙÙ ØªÙÙÙØ© %', new.company_id, new.invoice_number, v_total_cost;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cost, 0, 'SAR', 1, 'Ø¥Ø¹Ø§Ø¯Ø© ÙÙï¿½ï¿½ÂØ®Ø²ÙÙ - ï¿½ï¿½ÂØ±ØªØ¬Ø¹ ' || new.invoice_number);

      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cost, 'SAR', 1, 'Ø¹ÙØ³ ØªÙÙÙØ© - ï¿½ï¿½ÂØ±ØªØ¬Ø¹ ' || new.invoice_number);
    end if;

  elsif new.type = 'purchase' then
    if v_acc_ap is null or v_acc_inventory is null then
      raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨Ø§Øª AP(2100)/Inventory(1200) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯Ø© ÙØ´Ø±ÙØ© % - ÙØ¬Ø¨ Ø¥ÙØ´Ø§Ø¤ÙØ§ ÙØ¨Ù ØªØ±Ø­ÙÙ ÙØ§ØªÙØ±Ø© Ø§ÙØ´Ø±Ø§Ø¡ %', new.company_id, new.invoice_number;
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'purchase_invoice', new.id,
            'ØªØ±Ø­ÙÙ ØªÙÙØ§Ø¦Ù - ÙØ§ØªÙØ±Ø© Ø´Ø±Ø§Ø¡ ' || new.invoice_number, 'draft', new.created_by)
    returning id into v_je_id;

    v_net_amount := (new.total_amount - coalesce(new.tax_amount,0)) - coalesce(new.discount_amount,0);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_net_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¥Ø¶Ø§ÙØ© ï¿½ï¿½ÂØ®Ø²ÙÙ - ' || new.invoice_number, new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: Ø­Ø³Ø§Ø¨ Ø§ÙØ¶Ø±ÙØ¨Ø© (2200) ØºÙØ± ï¿½ï¿½ÂÙØ¬ÙØ¯ ÙØ´Ø±ÙØ© % - ÙØ§ØªÙØ±Ø© Ø§ÙØ´Ø±Ø§Ø¡ % ØªØ­ØªÙÙ Ø¶Ø±ÙØ¨Ø© %', new.company_id, new.invoice_number, new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, new.tax_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¶Ø±ÙØ¨Ø© ï¿½ï¿½ÂØ´ØªØ±ÙØ§Øª - ' || new.invoice_number, new.party_id);
    end if;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, new.total_amount, new.currency_code, coalesce(new.exchange_rate,1), 'Ø¯Ø§Ø¦ÙÙÙ - ' || new.invoice_number, new.party_id);
  end if;

  update journal_entries set status = 'posted' where id = v_je_id;
  return new;
end;
$function$
