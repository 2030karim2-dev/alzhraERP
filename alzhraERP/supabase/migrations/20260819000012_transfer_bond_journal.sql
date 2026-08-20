-- ============================================================
-- Transfer & general-account bond journaling (Phase 2.3, H1)
-- ------------------------------------------------------------
-- 2026-08-19
--
-- BUG (from the deep accounting audit): `fn_auto_post_payment_journal`
-- returned early for every bond with `party_id IS NULL`, so
--   * internal transfers (تحويل داخلي) and
--   * receipt/payment bonds against a general account (حساب عام)
-- were recorded as `payments` rows WITHOUT any journal entry — money never
-- moved in the general ledger.
--
-- Root cause: `commit_payment` dropped `p_counterparty_id` for non-party
-- counterparties, so the destination / counterparty account was never stored.
--
-- Fix:
--   1. payments.counterparty_account_id — stores the counterparty account
--      (destination for transfers) chosen in the UI.
--   2. commit_payment stores it when p_counterparty_type='account'.
--   3. fn_auto_post_payment_journal now posts a balanced journal for
--      transfer / account-counterparty bonds:
--        transfer    → Dr destination / Cr source
--        receipt     → Dr cash source / Cr counterparty account
--        disbursement→ Dr counterparty account / Cr cash source
--      with a tenant guard on the counterparty account, and cleans the
--      legacy mojibake messages.
--   4. void_bond reversal now also covers 'transfer_bond' journals.
-- ============================================================

-- ============================================================
-- 1) Schema: remember the counterparty account on a bond
-- ============================================================

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS counterparty_account_id uuid REFERENCES public.accounts(id);

-- ============================================================
-- 2) commit_payment — store the account counterparty
--    (same signature, reuses p_counterparty_id)
-- ============================================================

CREATE OR REPLACE FUNCTION public.commit_payment(p_company_id uuid, p_user_id uuid, p_type text, p_amount numeric, p_date date, p_cash_account_id uuid, p_counterparty_type text DEFAULT NULL::text, p_counterparty_id uuid DEFAULT NULL::uuid, p_description text DEFAULT ''::text, p_payment_method text DEFAULT 'cash'::text, p_reference_number text DEFAULT ''::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_foreign_amount numeric DEFAULT NULL::numeric, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
  v_payment_id uuid;
  v_payment_number text;
  v_fiscal_year_id uuid;
BEGIN
  v_company := public.verify_company_access(p_company_id);

  -- Get fiscal year
  SELECT id INTO v_fiscal_year_id FROM public.fiscal_years
  WHERE company_id = v_company AND is_closed = false
  AND p_date BETWEEN start_date AND end_date LIMIT 1;

  -- Generate payment number (advisory-locked per company → no unique-key
  -- collisions when two bonds are created concurrently — Phase 2.4)
  PERFORM pg_advisory_xact_lock(hashtext('payment_number:' || v_company::text));
  SELECT COALESCE(MAX(NULLIF(payment_number, '')::bigint), 0) + 1 INTO v_payment_number
  FROM public.payments WHERE company_id = v_company;
  v_payment_number := v_payment_number::text;

  -- Create payment - the journal is created by the AFTER INSERT trigger
  -- trg_auto_post_payment_journal (fn_auto_post_payment_journal), which now
  -- also posts transfers / general-account counterparty bonds.
  INSERT INTO public.payments (
    company_id, payment_number, type, amount,
    currency_code, exchange_rate, payment_date, payment_method,
    account_id, counterparty_account_id, reference_type, notes, status,
    created_by, branch_id, party_id
  ) VALUES (
    v_company, v_payment_number, p_type, p_amount,
    p_currency_code, p_exchange_rate, p_date, p_payment_method,
    p_cash_account_id,
    CASE WHEN p_counterparty_type = 'account' THEN p_counterparty_id ELSE NULL END,
    'bond', p_description, 'posted',
    p_user_id, p_branch_id,
    CASE WHEN p_counterparty_type = 'party' THEN p_counterparty_id ELSE NULL END
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('id', v_payment_id, 'payment_number', v_payment_number);
END;
$function$;

-- ============================================================
-- 3) fn_auto_post_payment_journal — post transfers & account
--    counterparty bonds; clean Arabic messages (was mojibake)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_auto_post_payment_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_je_id uuid; v_acc_ar uuid; v_acc_ap uuid; v_already_posted boolean; v_party_type text;
  v_reference_type text;
begin
  if new.status <> 'posted' then return new; end if;

  select exists(select 1 from public.journal_entries je where je.reference_id = new.id and je.deleted_at is null)
    into v_already_posted;
  if v_already_posted then return new; end if;

  if new.account_id is null then
    raise exception 'auto_post_failed: السند % بدون حساب (خزينة/بنك) - يجب اختيار حساب قبل إصدار السند', new.payment_number;
  end if;

  -- ── Transfer / general-account counterparty bonds ────────────────────────
  if new.party_id is null then
    if new.counterparty_account_id is null then
      return new; -- legacy transfer without a destination: nothing to post
    end if;

    -- tenant guard: the counterparty account must belong to the same company
    if not exists (
      select 1 from public.accounts where id = new.counterparty_account_id and company_id = new.company_id
    ) then
      raise exception 'tenant_violation: الحساب المقابل للسند % لا ينتمي لشركة السند', new.payment_number;
    end if;

    v_reference_type := case when new.type = 'transfer' then 'transfer_bond' else 'payment_bond' end;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.payment_date, v_reference_type, new.id,
            'ترحيل تلقائي - ' || (case when new.type='transfer' then 'تحويل داخلي ' else 'سند حساب عام ' end) || coalesce(new.payment_number,''),
            'draft', new.created_by)
    returning id into v_je_id;

    if new.type = 'transfer' then
      -- Dr الهدف / Cr المصدر
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.counterparty_account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'تحويل إلى - ' || coalesce(new.payment_number,''));
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'تحويل من - ' || coalesce(new.payment_number,''));
    elsif new.type = 'receipt' then
      -- Dr المصدر (نقدي) / Cr الحساب المقابل
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'قبض - ' || coalesce(new.payment_number,''));
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.counterparty_account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'إيراد/مقابل - ' || coalesce(new.payment_number,''));
    else -- disbursement
      -- Dr الحساب المقابل / Cr المصدر (نقدي)
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.counterparty_account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'مصروف/مقابل - ' || coalesce(new.payment_number,''));
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'صرف - ' || coalesce(new.payment_number,''));
    end if;

    update journal_entries set status = 'posted' where id = v_je_id;
    return new;
  end if;


  -- ── Party bonds (customer / supplier) ────────────────────────────────────
  select type into v_party_type from public.parties where id = new.party_id;
  if v_party_type is null then
    raise exception 'auto_post_failed: لا يوجد طرف (عميل/مورد) للسند % - party_id % غير موجود', new.payment_number, new.party_id;
  end if;

  v_acc_ar := fn_get_account_id(new.company_id, '1100');
  v_acc_ap := fn_get_account_id(new.company_id, '2100');

  if v_party_type = 'customer' then
    if v_acc_ar is null then
      raise exception 'auto_post_failed: حساب AR(1100) غير موجود للشركة % - يجب إنشاؤه قبل إصدار سند %', new.company_id, new.payment_number;
    end if;
    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.payment_date,
      case when new.type = 'receipt' then 'receipt_bond' else 'payment_bond' end, new.id,
      'ترحيل تلقائي - ' || (case when new.type='receipt' then 'سند قبض من عميل ' else 'سند صرف/تحصيل من عميل ' end) || coalesce(new.payment_number,''),
      'draft', new.created_by)
    returning id into v_je_id;

    if new.type = 'receipt' then
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'قبض - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ar, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض مدينون - ' || coalesce(new.payment_number,''), new.party_id);
    else
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ar, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'زيادة مدينون (سند صرف) - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'صرف من خزينة - ' || coalesce(new.payment_number,''), new.party_id);
    end if;

  elsif v_party_type = 'supplier' then
    if v_acc_ap is null then
      raise exception 'auto_post_failed: حساب AP(2100) غير موجود للشركة % - يجب إنشاؤه قبل إصدار سند %', new.company_id, new.payment_number;
    end if;
    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.payment_date,
      case when new.type = 'disbursement' then 'payment_bond' else 'receipt_bond' end, new.id,
      'ترحيل تلقائي - ' || (case when new.type='disbursement' then 'سند صرف لمورد ' else 'سند قبض/تحصيل من مورد ' end) || coalesce(new.payment_number,''),
      'draft', new.created_by)
    returning id into v_je_id;

    if new.type = 'disbursement' then
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ap, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض دائنون - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'صرف - ' || coalesce(new.payment_number,''), new.party_id);
    else
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'قبض من مورد - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'زيادة دائنون (سند قبض) - ' || coalesce(new.payment_number,''), new.party_id);
    end if;
  else
    raise exception 'auto_post_failed: نوع الطرف غير معروف (%) للسند % - يجب أن يكون customer أو supplier', v_party_type, new.payment_number;
  end if;

  update journal_entries set status = 'posted' where id = v_je_id;
  return new;
end;
$function$;


-- ============================================================
-- 4) void_bond — also reverse 'transfer_bond' journals
--    (re-declared here because migration 10's literal array did
--    not yet know about transfer journals)
-- ============================================================

CREATE OR REPLACE FUNCTION public.void_bond(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  v_new_jes uuid[];
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;

  IF v_payment IS NULL OR v_payment.status = 'void' THEN
    RAISE EXCEPTION 'Payment not found or already voided';
  END IF;

  -- [SECURITY] caller must belong to the payment's company
  IF NOT public.is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_payment.company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية إلغاء هذا السند';
  END IF;

  -- [SECURITY] cannot void a bond inside a closed fiscal year
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = v_payment.company_id
      AND v_payment.payment_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'لا يمكن إلغاء سند في سنة مالية مغلقة';
  END IF;

  -- [FIX] the posted journal is immutable (trg_journal_entries_immutability);
  -- create a balanced reversal journal instead of updating status='void'.
  v_new_jes := public.fn_reverse_journal_entries(
    p_payment_id,
    ARRAY['receipt_bond', 'payment_bond', 'transfer_bond', 'payment'],
    'bond_void',
    'عكس سند: ' || COALESCE(v_payment.payment_number,'') || ' - ',
    auth.uid(),
    v_payment.company_id
  );

  -- Void the payment (single transaction: any failure above rolls back)
  UPDATE public.payments SET status = 'void', updated_at = now() WHERE id = p_payment_id;
END;
$function$;

-- ============================================================
-- 5) Defensive privileges (idempotent)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.commit_payment(uuid, uuid, text, numeric, date, uuid, text, uuid, text, text, text, text, numeric, numeric, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.commit_payment(uuid, uuid, text, numeric, date, uuid, text, uuid, text, text, text, text, numeric, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_payment(uuid, uuid, text, numeric, date, uuid, text, uuid, text, text, text, text, numeric, numeric, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_auto_post_payment_journal() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_post_payment_journal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_auto_post_payment_journal() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_bond(uuid) TO authenticated;

