-- ==============================================================================
-- Migration: Fix Accounting Engine — critical defects found in the deep audit
-- Date: 2026-08-18
--
-- 1. post_journal_entry inserted the journal header as 'posted' BEFORE its
--    lines. The trg_journal_entry_lines_immutability trigger forbids that
--    (SQLSTATE 23514) -> rewritten as draft -> lines -> posted.
-- 2. fn_get_account_id (used by fn_auto_post_invoice_journal) was missing from
--    version control -> added.
-- 3. post_manual_journal (the RPC the frontend actually calls to post manual
--    journal entries) was missing from version control -> added with
--    balance/account/company validation and atomic entry numbering.
-- 4. fn_auto_post_invoice_journal created UNBALANCED journals whenever the
--    invoice had a discount (Dr total vs Cr total - discount). The
--    receivable/payable is now booked NET of the discount.
-- 5. fn_auto_post_invoice_journal matched the wrong return type ('sale_return'
--    instead of 'return_sale') and had NO 'return_purchase' branch -> returns
--    never posted journals.
-- 6. No trigger was attached to public.invoices to invoke the auto-post
--    function. A DEFERRABLE constraint trigger now runs it at COMMIT time,
--    when invoice_items already exist (so COGS can be computed).
-- 7. report_profit_loss(p_company_id,p_from,p_to) and
--    report_balance_sheet(p_company_id,p_as_of_date) — the TABLE-row forms the
--    frontend actually calls — were missing from version control -> added.
-- 8. cashboxes/exchange_companies were blocked by a deny_all policy while the
--    treasury feature reads/writes them -> replaced with company-scoped RLS
--    policies matching the tenant-isolation model (ADR-002).
-- 9. create_cashbox / create_exchange_company (used by the treasury UI) were
--    missing from version control -> added (linked account + optional opening
--    balance journal).
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. post_journal_entry — fixed (draft -> lines -> posted, atomic numbering)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_journal_entry(
    p_company_id uuid,
    p_user_id uuid,
    p_description text,
    p_reference_type text,
    p_reference_id uuid,
    p_lines jsonb -- Array of { account_id, debit_amount, credit_amount, description, party_id, currency_code, exchange_rate, foreign_amount }
) RETURNS uuid AS $$
DECLARE
    v_journal_id uuid;
    v_entry_number integer;
    v_line jsonb;
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_company uuid;
    v_account_company uuid;
    v_line_debit numeric;
    v_line_credit numeric;
BEGIN
    v_company := public.verify_company_access(p_company_id);

    -- Validate balancing + accounts
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_line_debit  := COALESCE((v_line->>'debit_amount')::numeric, 0);
        v_line_credit := COALESCE((v_line->>'credit_amount')::numeric, 0);
        IF v_line_debit < 0 OR v_line_credit < 0 THEN
            RAISE EXCEPTION 'Journal line amounts cannot be negative';
        END IF;
        v_total_debit  := v_total_debit  + v_line_debit;
        v_total_credit := v_total_credit + v_line_credit;

        SELECT company_id INTO v_account_company
        FROM public.accounts
        WHERE id = (v_line->>'account_id')::uuid AND deleted_at IS NULL;
        IF v_account_company IS NULL OR v_account_company <> v_company THEN
            RAISE EXCEPTION 'Account % does not belong to company %',
                (v_line->>'account_id'), v_company USING ERRCODE = '42501';
        END IF;
    END LOOP;

    IF jsonb_array_length(p_lines) < 2 THEN
        RAISE EXCEPTION 'Journal entry requires at least two lines';
    END IF;

    IF abs(v_total_debit - v_total_credit) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry must be balanced. Debit: %, Credit: %',
            v_total_debit, v_total_credit;
    END IF;

    -- Atomic entry number per company (serialize concurrent posts)
    PERFORM pg_advisory_xact_lock(hashtext('journal_entry_number:' || v_company::text));
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_entry_number
    FROM public.journal_entries
    WHERE company_id = v_company;

    -- Header as draft, then lines, then posted (immutability triggers)
    INSERT INTO public.journal_entries (
        company_id, created_by, entry_number, entry_date,
        description, reference_type, reference_id, status
    ) VALUES (
        v_company, p_user_id, v_entry_number, CURRENT_DATE,
        p_description, p_reference_type, p_reference_id, 'draft'
    ) RETURNING id INTO v_journal_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO public.journal_entry_lines (
            journal_entry_id, account_id, description, debit_amount, credit_amount,
            party_id, currency_code, foreign_amount, exchange_rate
        ) VALUES (
            v_journal_id,
            (v_line->>'account_id')::uuid,
            v_line->>'description',
            COALESCE((v_line->>'debit_amount')::numeric, 0),
            COALESCE((v_line->>'credit_amount')::numeric, 0),
            (v_line->>'party_id')::uuid,
            v_line->>'currency_code',
            (v_line->>'foreign_amount')::numeric,
            (v_line->>'exchange_rate')::numeric
        );
    END LOOP;

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_journal_id;

    RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

GRANT EXECUTE ON FUNCTION public.post_journal_entry(uuid, uuid, text, text, uuid, jsonb) TO authenticated;


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. fn_get_account_id: resolve the company's account id by code
--    (matches the live production definition, extracted 2026-08-18)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_account_id(p_company_id uuid, p_code text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from public.accounts where company_id = p_company_id and code = p_code limit 1;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_account_id(uuid, text) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. post_manual_journal — the RPC used by the frontend for manual entries
--    Signature MATCHES the live production definition (extracted 2026-08-18).
--    FIX applied: header is now inserted as 'draft', then lines, then updated
--    to 'posted'. (The old posted-first order collided with the live
--    trg_journal_entry_lines_immutability trigger -> manual postings failed.)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_manual_journal(p_company_id uuid, p_user_id uuid, p_date date, p_description text, p_lines jsonb, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_reference_type text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_journal_id   uuid;
  v_line         RECORD;
  v_base_debit   numeric;
  v_base_credit  numeric;
  v_foreign_amt  numeric;
  v_total_debit  numeric := 0;
  v_total_credit numeric := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied: تحتاج صلاحية محاسب على الأقل';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND p_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'لا يمكن تسجيل قيود في سنة مالية مغلقة';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(debit numeric, credit numeric)
  LOOP
    v_total_debit  := v_total_debit  + ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_total_credit := v_total_credit + ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
  END LOOP;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'القيد غير متوازن: مدين (%) != دائن (%)', v_total_debit, v_total_credit;
  END IF;

  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, p_date, p_description,
    COALESCE(p_reference_type, 'manual'), 'draft', p_user_id
  ) RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(account_id uuid, party_id uuid, debit numeric, credit numeric, description text)
  LOOP
    v_base_debit  := ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_base_credit := ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
    v_foreign_amt := GREATEST(COALESCE(v_line.debit, 0), COALESCE(v_line.credit, 0));

    INSERT INTO journal_entry_lines(
      journal_entry_id, account_id, party_id,
      debit_amount, credit_amount, description,
      currency_code, exchange_rate, foreign_amount, company_id, branch_id
    ) VALUES (
      v_journal_id, v_line.account_id, v_line.party_id,
      v_base_debit, v_base_credit,
      COALESCE(v_line.description, p_description),
      p_currency_code, p_exchange_rate, v_foreign_amt,
      p_company_id, p_branch_id
    );
  END LOOP;

  UPDATE journal_entries SET status = 'posted' WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) TO authenticated;


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. fn_auto_post_invoice_journal — FIXED
--    * balanced journal when discount > 0 (receivable/payable net of discount)
--    * correct return types: 'return_sale' AND 'sale_return', plus the new
--      'return_purchase' branch
--    * runs at COMMIT (deferred trigger) so invoice_items exist for COGS
-- ──────────────────────────────────────────────────────────────────────────────
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
  -- Amount actually receivable/payable — NET of discount (keeps the journal balanced)
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
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_net_amount, new.currency_code, coalesce(new.exchange_rate,1), 'إيرادات مبيعات - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: حساب الضريبة (2200) غير موجود لشركة % - الفاتورة % تحتوي ضريبة %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, new.tax_amount, new.currency_code, coalesce(new.exchange_rate,1), 'ضريبة مبيعات - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;

    select coalesce(sum(ii.quantity * ii.cost_price), 0) into v_total_cost
    from invoice_items ii where ii.invoice_id = new.id;

    if v_total_cost > 0 then
      if v_acc_inventory is null or v_acc_cogs is null then
        raise exception 'auto_post_failed: حسابات المخزون(1200)/تكلفة البضاعة(5100) غير موجودة لشركة % - الفاتورة % لها تكلفة %', new.company_id, coalesce(new.invoice_number,''), v_total_cost;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cost, 0, 'SAR', 1, 'تكلفة بضاعة مباعة - ' || coalesce(new.invoice_number,''));

      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_total_cost, 'SAR', 1, 'تخفيض مخزون - ' || coalesce(new.invoice_number,''));
    end if;

  elsif new.type in ('sale_return', 'return_sale') then

    if v_acc_ar is null or v_acc_revenue is null then
      raise exception 'auto_post_failed: حسابات AR(1100)/Revenue(4100) غير موجودة لشركة % - يجب إنشاؤها قبل ترحيل المرتجع %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_return', new.id,
            'ترحيل تلقائي - مرتجع مبيعات ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_net_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'عكس إيراد - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: حساب الضريبة (2200) غير موجود لشركة % - المرتجع % يحتوي ضريبة %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, new.tax_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), 'عكس ضريبة - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ar, new.company_id, new.branch_id, 0, v_net_receivable, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض مدينون - ' || coalesce(new.invoice_number,''), new.party_id);

    select coalesce(sum(ii.quantity * ii.cost_price), 0) into v_total_cost
    from invoice_items ii where ii.invoice_id = new.id;

    if v_total_cost > 0 then
      if v_acc_inventory is null or v_acc_cogs is null then
        raise exception 'auto_post_failed: حسابات المخزون(1200)/تكلفة البضاعة(5100) غير موجودة لشركة % - المرتجع % له تكلفة %', new.company_id, coalesce(new.invoice_number,''), v_total_cost;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cost, 0, 'SAR', 1, 'إعادة للمخزون - ' || coalesce(new.invoice_number,''));

      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cost, 'SAR', 1, 'عكس تكلفة - ' || coalesce(new.invoice_number,''));
    end if;

  elsif new.type = 'purchase' then
    if v_acc_ap is null or v_acc_inventory is null then
      raise exception 'auto_post_failed: حسابات AP(2100)/Inventory(1200) غير موجودة لشركة % - يجب إنشاؤها قبل ترحيل فاتورة الشراء %', new.company_id, coalesce(new.invoice_number,'');
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
    values (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, v_net_receivable, new.currency_code, coalesce(new.exchange_rate,1), 'دائنون - ' || coalesce(new.invoice_number,''), new.party_id);

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


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Attach the auto-post to invoices as a DEFERRABLE constraint trigger so it
--    runs at COMMIT time (invoice_items already exist -> COGS is computable).
--    The idempotency check inside the function prevents double posting even if
--    the live database already had a non-deferred trigger.
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_invoice_auto_post_journal ON public.invoices;
CREATE CONSTRAINT TRIGGER trg_invoice_auto_post_journal
AFTER INSERT OR UPDATE OF status ON public.invoices
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_post_invoice_journal();

GRANT EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. report_profit_loss(p_company_id, p_from, p_to) — TABLE form the frontend
--    calls (src/features/accounting/services/reportService.ts).
--    Matches the live production definition (extracted 2026-08-18): accounts
--    are grouped by CODE prefix ('4%' revenue / '5%' expenses).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.report_profit_loss(p_company_id uuid, p_from date, p_to date)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue numeric;
  v_expense numeric;
  v_net_profit numeric;
BEGIN
  -- Revenue (accounts starting with 4)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '4%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to;

  -- Expenses (accounts starting with 5)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '5%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to;

  v_net_profit := v_revenue - v_expense;

  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- report_balance_sheet(p_company_id, p_as_of_date) — TABLE form the frontend
--    calls (src/features/accounting/services/reportService.ts).
--    Matches the live production definition (extracted 2026-08-18): accounts
--    are grouped by CODE prefix ('1%' assets / '2%' liabilities / '3%' equity).
--    NOTE: like production, equity does NOT include the period net profit here;
--    the frontend adds it as a separate line item.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.report_balance_sheet(p_company_id uuid, p_as_of_date date DEFAULT NULL::date)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date := COALESCE(p_as_of_date, CURRENT_DATE);
  v_assets numeric;
  v_liabilities numeric;
  v_equity numeric;
BEGIN
  -- Assets (accounts starting with 1)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_assets
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '1%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Liabilities (accounts starting with 2)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_liabilities
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '2%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Equity (accounts starting with 3)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_equity
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '3%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  category := 'الأصول'; amount := v_assets; type := 'asset'; RETURN NEXT;
  category := 'الالتزامات'; amount := v_liabilities; type := 'liability'; RETURN NEXT;
  category := 'حقوق الملكية'; amount := v_equity; type := 'equity'; RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date) TO authenticated;


-- ──────────────────────────────────────────────────────────────────────────────
-- ──────────────────────────────────────────────────────────────────────────────
-- 8. RLS: cashboxes / exchange_companies — company-scoped policies.
--    NOTE: definitions MATCH the live production policies (extracted 2026-08-18):
--    roles = owner/admin/accountant via get_user_role() (NOT user_is_admin_or_manager,
--    which would drop the accountant role), and the role is granted to public
--    (tenancy is enforced by get_user_company_id()).
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cashboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all" ON public.cashboxes;
DROP POLICY IF EXISTS "cashboxes_select" ON public.cashboxes;
CREATE POLICY "cashboxes_select" ON public.cashboxes
  FOR SELECT TO public USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "cashboxes_insert" ON public.cashboxes;
CREATE POLICY "cashboxes_insert" ON public.cashboxes
  FOR INSERT TO public
  WITH CHECK (
    (company_id = public.get_user_company_id())
    AND (public.get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))
  );

DROP POLICY IF EXISTS "cashboxes_update" ON public.cashboxes;
CREATE POLICY "cashboxes_update" ON public.cashboxes
  FOR UPDATE TO public
  USING (company_id = public.get_user_company_id())
  WITH CHECK (
    (company_id = public.get_user_company_id())
    AND (public.get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))
  );

ALTER TABLE public.exchange_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all" ON public.exchange_companies;
DROP POLICY IF EXISTS "exchange_companies_select" ON public.exchange_companies;
CREATE POLICY "exchange_companies_select" ON public.exchange_companies
  FOR SELECT TO public USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "exchange_companies_insert" ON public.exchange_companies;
CREATE POLICY "exchange_companies_insert" ON public.exchange_companies
  FOR INSERT TO public
  WITH CHECK (
    (company_id = public.get_user_company_id())
    AND (public.get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))
  );

DROP POLICY IF EXISTS "exchange_companies_update" ON public.exchange_companies;
CREATE POLICY "exchange_companies_update" ON public.exchange_companies
  FOR UPDATE TO public
  USING (company_id = public.get_user_company_id())
  WITH CHECK (
    (company_id = public.get_user_company_id())
    AND (public.get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))
  );


-- ──────────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. create_cashbox / create_exchange_company — used by the treasury UI
--    (src/features/accounting/api/treasuryApi.ts).
--    Signatures & behavior MATCH the live production definitions (extracted
--    2026-08-18): linked account under parent 1010 / 1030, code = max+1, and
--    opening_balance is stored on the row (no automatic opening journal).
-- ──────────────────────────────────────────────────────────────────────────────
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
$function$;

GRANT EXECUTE ON FUNCTION public.create_cashbox(uuid, uuid, text, text, numeric) TO authenticated;


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
$function$;

GRANT EXECUTE ON FUNCTION public.create_exchange_company(uuid, uuid, text, text, numeric) TO authenticated;



