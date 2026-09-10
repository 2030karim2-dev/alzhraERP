-- ============================================================
-- Migration: 20260911000001_debt_collection_units_unification.sql
-- ============================================================
-- الغرض: توحيد وحدات القيود المحاسبية (debit_amount / credit_amount = العملة
-- الأساس حصراً، وقيمة المعاملة الأجنبية في foreign_amount) عبر كل المسارات.
--
-- المشكلة (من تدقيق قسم الديون والتحصيل):
--   * قيود الفواتير والمصروفات والقيود اليدوية تخزّن العملة الأساس، بينما
--     قيود السندات (fn_auto_post_payment_journal) تخزّن المبلغ بعملة السند.
--   * النتيجة: أي تجميع يجمع الاثنين معاً (1100/2100) ينتج أرقاماً هرائية،
--     و party_balances تتعامل مع القيد المختلط بضرب إضافي (Double Conversion)
--     فيتضخم رصيد YER ~410 أضعاف.
--   * تخصيص سند لفاتورة (create_financial_bond) كان يضيف مبلغ السند الأجنبي
--     مباشرة إلى invoices.paid_amount بعملة الفاتورة دون تحويل أو حدّ أقصى.
--
-- الحل:
--   1) دالة التحويل الموحّدة fn_to_base_amount (تدعم multiply/divide
--      والمعدلات المعكوسة المخزنة < 1).
--   2) Backfill آمن: تحويل أسطر قيود السندات الأجنبية (التي foreign_amount=0)
--      إلى العملة الأساس وتخزين القيمة الأجنبية في foreign_amount.
--   3) fn_auto_post_payment_journal: تخزين العملة الأساس + foreign_amount،
--      ودعم نوع الطرف 'both' (قبض → ذمم مدينة، صرف → ذمم دائنة).
--   4) create_financial_bond: منع التخصيص عبر عملات مختلفة وحدّ المبلغ
--      بالمتبقي الفعلي من الفاتورة.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) دالة تحويل موحّدة foreign → base
-- ─────────────────────────────────────────────────────────────
-- القاعدة المنطقية:
--   * SAR / NULL        → المبلغ كما هو.
--   * معدل معكوس (< 1)  → الضرب (مكافئ للقسمة على المقلوب).
--   * عملة divide       → القسمة على المعدل (وحدات لكل وحدة أساس).
--   * خلاف ذلك (multiply) → الضرب بالمعدل.
-- هكذا يتطابق السلوك مع 20260908000008 (dual-rate) و 20260908000012
-- (supported_currencies.exchange_operator) رياضياً في جميع الأشكال المخزنة.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_to_base_amount(
  p_currency_code text,
  p_amount numeric,
  p_exchange_rate numeric
)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_operator text;
  v_rate numeric;
BEGIN
  IF p_currency_code IS NULL OR UPPER(TRIM(p_currency_code)) = 'SAR' THEN
    RETURN ROUND(COALESCE(p_amount, 0), 4);
  END IF;

  v_rate := COALESCE(p_exchange_rate, 1);
  IF v_rate <= 0 THEN
    RETURN ROUND(COALESCE(p_amount, 0), 4);
  END IF;

  -- معدل معكوس مخزّن (مثل 0.002439 = 1/410) → الضرب يعادل القسمة على المقلوب.
  IF v_rate < 1 THEN
    RETURN ROUND(COALESCE(p_amount, 0) * v_rate, 4);
  END IF;

  SELECT exchange_operator INTO v_operator
  FROM public.supported_currencies
  WHERE code = p_currency_code
  LIMIT 1;
  v_operator := COALESCE(v_operator, 'multiply');

  IF v_operator = 'divide' THEN
    RETURN ROUND(COALESCE(p_amount, 0) / v_rate, 4);
  END IF;

  RETURN ROUND(COALESCE(p_amount, 0) * v_rate, 4);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_to_base_amount(text, numeric, numeric) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_to_base_amount(text, numeric, numeric) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 2) Backfill قيود السندات: foreign → base
-- ─────────────────────────────────────────────────────────────
-- المعيار الآمن: الفواتير / المصروفات / القيود اليدوية تخزّن foreign_amount
-- دائماً، بينما أسطر السندات (fn_auto_post_payment_journal) لا تخزّنه أبداً
-- (يظل 0). لذا foreign_amount=0 + عملة غير SAR = قيد سند بعملة أجنبية يحتاج
-- التحويل. القيود العكسية fn_reverse_journal_entries تنسخ foreign_amount من
-- مصدرها، فلا تُلتقط هنا بشكل خاطئ.
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_row RECORD;
  v_debit_base numeric;
  v_credit_base numeric;
  v_foreign_val numeric;
  v_has_rows boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.deleted_at IS NULL
      AND jel.deleted_at IS NULL
      AND (jel.foreign_amount IS NULL OR jel.foreign_amount = 0)
      AND jel.currency_code IS NOT NULL
      AND UPPER(TRIM(jel.currency_code)) <> 'SAR'
      AND je.reference_type IN ('receipt_bond', 'payment_bond', 'disbursement', 'transfer_bond', 'internal_transfer')
  ) INTO v_has_rows;

  IF NOT v_has_rows THEN
    RETURN;
  END IF;

  ALTER TABLE public.journal_entry_lines DISABLE TRIGGER trg_journal_entry_lines_immutability;

  FOR v_row IN
    SELECT
      jel.id,
      jel.currency_code,
      jel.exchange_rate,
      jel.debit_amount,
      jel.credit_amount
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.deleted_at IS NULL
      AND jel.deleted_at IS NULL
      AND (jel.foreign_amount IS NULL OR jel.foreign_amount = 0)
      AND jel.currency_code IS NOT NULL
      AND UPPER(TRIM(jel.currency_code)) <> 'SAR'
      AND je.reference_type IN ('receipt_bond', 'payment_bond', 'disbursement', 'transfer_bond', 'internal_transfer')
  LOOP
    v_foreign_val  := GREATEST(COALESCE(v_row.debit_amount, 0), COALESCE(v_row.credit_amount, 0));
    v_debit_base   := public.fn_to_base_amount(v_row.currency_code, v_row.debit_amount, v_row.exchange_rate);
    v_credit_base  := public.fn_to_base_amount(v_row.currency_code, v_row.credit_amount, v_row.exchange_rate);

    UPDATE public.journal_entry_lines
    SET debit_amount  = v_debit_base,
        credit_amount = v_credit_base,
        foreign_amount = v_foreign_val,
        updated_at = NOW()
    WHERE id = v_row.id;
  END LOOP;

  ALTER TABLE public.journal_entry_lines ENABLE TRIGGER trg_journal_entry_lines_immutability;
END $$;
-- ─────────────────────────────────────────────────────────────
-- 3) fn_auto_post_payment_journal — توحيد الوحدات + دعم 'both'
--    (يحافظ على فرع التحويل/الحساب العام من 20260819000012)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_auto_post_payment_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_je_id uuid; v_acc_ar uuid; v_acc_ap uuid; v_already_posted boolean; v_party_type text;
  v_reference_type text;
  v_base_amount numeric;
begin
  if new.status <> 'posted' then return new; end if;

  select exists(select 1 from public.journal_entries je where je.reference_id = new.id and je.deleted_at is null)
    into v_already_posted;
  if v_already_posted then return new; end if;

  if new.account_id is null then
    raise exception 'auto_post_failed: السند % بدون حساب (خزينة/بنك) - يجب اختيار حساب قبل إصدار السند', new.payment_number;
  end if;

  -- وحدة موحّدة: debit/credit دائماً بالعملة الأساس، وقيمة المعاملة الأجنبية في foreign_amount
  v_base_amount := public.fn_to_base_amount(new.currency_code, new.amount, new.exchange_rate);

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
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.counterparty_account_id, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'تحويل إلى - ' || coalesce(new.payment_number,''));
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'تحويل من - ' || coalesce(new.payment_number,''));
    elsif new.type = 'receipt' then
      -- Dr المصدر (نقدي) / Cr الحساب المقابل
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'قبض - ' || coalesce(new.payment_number,''));
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.counterparty_account_id, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'إيراد/مقابل - ' || coalesce(new.payment_number,''));
    else -- disbursement
      -- Dr الحساب المقابل / Cr المصدر (نقدي)
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.counterparty_account_id, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'مقابل/صرف - ' || coalesce(new.payment_number,''));
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'صرف - ' || coalesce(new.payment_number,''));
    end if;

    update journal_entries set status = 'posted' where id = v_je_id;
    return new;
end if;
-- ── Party bonds (customer / supplier / both) ────────────────────────────
  select type into v_party_type from public.parties where id = new.party_id;
  if v_party_type is null then
    raise exception 'auto_post_failed: لا يوجد طرف (عميل/مورد) للسند % - party_id % غير موجود', new.payment_number, new.party_id;
  end if;

  v_acc_ar := fn_get_account_id(new.company_id, '1100');
  v_acc_ap := fn_get_account_id(new.company_id, '2100');

  -- 'both': سند قبض يخفض الذمم المدينة (سلوك عميل)، وسند صرف يخفض الذمم الدائنة (سلوك مورد)
  if v_party_type = 'customer' or (v_party_type = 'both' and new.type = 'receipt') then
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
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'قبض - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ar, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض مدينون - ' || coalesce(new.payment_number,''), new.party_id);
    else
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ar, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'زيادة مدينون (سند صرف) - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'صرف من خزينة - ' || coalesce(new.payment_number,''), new.party_id);
    end if;

  elsif v_party_type = 'supplier' or (v_party_type = 'both' and new.type in ('disbursement', 'payment')) then
    if v_acc_ap is null then
      raise exception 'auto_post_failed: حساب AP(2100) غير موجود للشركة % - يجب إنشاؤه قبل إصدار سند %', new.company_id, new.payment_number;
    end if;
    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.payment_date,
      case when new.type in ('disbursement', 'payment') then 'payment_bond' else 'receipt_bond' end, new.id,
      'ترحيل تلقائي - ' || (case when new.type in ('disbursement', 'payment') then 'سند صرف لمورد ' else 'سند قبض/تحصيل من مورد ' end) || coalesce(new.payment_number,''),
      'draft', new.created_by)
    returning id into v_je_id;

    if new.type in ('disbursement', 'payment') then
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ap, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'تخفيض دائنون - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'صرف - ' || coalesce(new.payment_number,''), new.party_id);
    else
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, v_base_amount, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'قبض من مورد - ' || coalesce(new.payment_number,''), new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, v_base_amount, new.amount, new.currency_code, coalesce(new.exchange_rate,1), 'زيادة دائنون (سند قبض) - ' || coalesce(new.payment_number,''), new.party_id);
    end if;

  else
    raise exception 'auto_post_failed: نوع الطرف غير معروف (%) للسند % - يجب أن يكون customer أو supplier', v_party_type, new.payment_number;
  end if;

  update journal_entries set status = 'posted' where id = v_je_id;
  return new;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_auto_post_payment_journal() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_auto_post_payment_journal() TO authenticated;
-- ─────────────────────────────────────────────────────────────
-- 4) create_financial_bond — تخصيص سند لفاتورة بوحدات صحيحة
-- ─────────────────────────────────────────────────────────────
--   * منع التخصيص عبر عملات مختلفة (منع خلط وحدات paid_amount).
--   * الحدّ بأقصى مبلغ = المتبقي الفعلي من الفاتورة.
--   * payment_allocations.amount بعملة الفاتورة (مطابقة لحساب
--     update_invoice_status_on_payment / fn_sync_invoice_paid_amount).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_financial_bond(p_company_id uuid, p_bond_type text, p_amount numeric, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1.0, p_foreign_amount numeric DEFAULT NULL::numeric, p_date date DEFAULT CURRENT_DATE, p_cash_account_id uuid DEFAULT NULL::uuid, p_counterparty_id uuid DEFAULT NULL::uuid, p_counterparty_type text DEFAULT 'party'::text, p_description text DEFAULT ''::text, p_invoice_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT 'cash'::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_journal_id uuid; v_payment_id uuid; v_counterparty_account_id uuid;
  v_party_type text; v_ref_type text;
  v_party_id uuid := NULL; v_base_amount numeric; v_foreign_amount numeric;
  v_effective_rate numeric;
  v_inv_currency text;
  v_remaining numeric;
  v_alloc_amount numeric;
  v_uid uuid := auth.uid();  -- [FIX أمني حرج] لا نثق بـ p_user_id على الإطلاق
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'access_denied: يتطلب تسجيل الدخول';
  END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = v_uid AND ucr.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id AND p_date BETWEEN start_date AND end_date AND is_closed = false
  ) THEN RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة'; END IF;

  IF p_cash_account_id IS NULL THEN RAISE EXCEPTION 'حساب الصندوق / البنك إلزامي'; END IF;
  PERFORM assert_account_belongs_to_company(p_cash_account_id, p_company_id, 'p_cash_account_id');

  v_effective_rate := COALESCE(NULLIF(p_exchange_rate, 0), 1.0);
  v_foreign_amount := COALESCE(NULLIF(p_foreign_amount, 0), p_amount);
  v_base_amount    := public.fn_to_base_amount(p_currency_code, v_foreign_amount, v_effective_rate);
  IF p_currency_code = (SELECT base_currency FROM companies WHERE id = p_company_id LIMIT 1) THEN
    v_base_amount := v_foreign_amount; v_effective_rate := 1.0;
  END IF;

  v_ref_type := CASE p_bond_type
    WHEN 'receipt' THEN 'receipt_bond' WHEN 'payment' THEN 'payment_bond'
    WHEN 'disbursement' THEN 'payment_bond' WHEN 'transfer' THEN 'internal_transfer'
    ELSE NULL END;
  IF v_ref_type IS NULL THEN RAISE EXCEPTION 'نوع السند غير صحيح: %', p_bond_type; END IF;

  IF p_bond_type = 'transfer' THEN
    PERFORM assert_account_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (transfer target account)');
    v_counterparty_account_id := p_counterparty_id;
  ELSIF p_counterparty_type = 'account' THEN
    PERFORM assert_account_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (account)');
    v_counterparty_account_id := p_counterparty_id;
  ELSE
    PERFORM assert_party_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (party)');
    v_party_id := p_counterparty_id;
    SELECT type INTO v_party_type FROM parties WHERE id = p_counterparty_id;
    IF v_party_type IS NULL THEN RAISE EXCEPTION 'الطرف التجاري غير موجود: %', p_counterparty_id; END IF;
  END IF;

  INSERT INTO payments(
    company_id, branch_id, party_id, type, amount, currency_code, exchange_rate,
    payment_date, payment_method, account_id, reference_type, notes, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, v_party_id, CASE WHEN p_bond_type='disbursement' THEN 'disbursement' ELSE p_bond_type END,
    v_foreign_amount, p_currency_code, v_effective_rate,
    p_date, p_payment_method, p_cash_account_id, v_ref_type, p_description, 'posted', v_uid
  ) RETURNING id INTO v_payment_id;

  IF v_party_id IS NOT NULL THEN
    SELECT id INTO v_journal_id FROM journal_entries WHERE reference_id = v_payment_id AND deleted_at IS NULL LIMIT 1;
    IF v_journal_id IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: لم يتم ترحيل السند تلقائياً كما هو متوقع';
    END IF;
  ELSE
    INSERT INTO journal_entries(company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by)
    VALUES (p_company_id, p_branch_id, p_date, p_description, v_ref_type, v_payment_id, 'posted', v_uid)
    RETURNING id INTO v_journal_id;

    IF p_bond_type = 'transfer' THEN
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id, branch_id)
      VALUES
        (v_journal_id, v_counterparty_account_id, NULL, v_base_amount, 0, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id),
        (v_journal_id, p_cash_account_id, NULL, 0, v_base_amount, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id);
    ELSE
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id, branch_id)
      VALUES
        (v_journal_id, v_counterparty_account_id, NULL, v_base_amount, 0, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id),
        (v_journal_id, p_cash_account_id, NULL, 0, v_base_amount, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id);
    END IF;
  END IF;
IF p_invoice_id IS NOT NULL THEN
    -- [FIX] التخصيص بوحدات عملة الفاتورة فقط، وبحدّ أقصى = المتبقي الفعلي
    SELECT currency_code INTO v_inv_currency
    FROM public.invoices
    WHERE id = p_invoice_id AND company_id = p_company_id;

    IF v_inv_currency IS NULL THEN
      RAISE EXCEPTION 'الفاتورة المحددة غير موجودة ضمن شركة السند';
    END IF;

    IF COALESCE(v_inv_currency, 'SAR') <> COALESCE(p_currency_code, 'SAR') THEN
      RAISE EXCEPTION 'تعذر تخصيص السند: عملة السند (%) تختلف عن عملة الفاتورة (%). سجّل السند بنفس عملة الفاتورة أو اتركه بدون تخصيص',
        COALESCE(p_currency_code, 'SAR'), v_inv_currency;
    END IF;

    SELECT total_amount - COALESCE(paid_amount, 0)
    INTO v_remaining
    FROM public.invoices
    WHERE id = p_invoice_id AND company_id = p_company_id;

    IF COALESCE(v_remaining, 0) <= 0 THEN
      RAISE EXCEPTION 'الفاتورة المحددة مسددة بالكامل - لا يمكن تخصيص سند إضافي لها';
    END IF;

    v_alloc_amount := LEAST(v_foreign_amount, v_remaining);

    IF v_alloc_amount > 0 THEN
      INSERT INTO payment_allocations(payment_id, invoice_id, amount, company_id)
      VALUES (v_payment_id, p_invoice_id, v_alloc_amount, p_company_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_payment_id, 'payment_number', (SELECT payment_number FROM payments WHERE id = v_payment_id),
    'journal_id', v_journal_id, 'base_amount', v_base_amount, 'foreign_amount', v_foreign_amount,
    'exchange_rate', v_effective_rate, 'status', 'success'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_financial_bond(uuid, text, numeric, text, numeric, numeric, date, uuid, uuid, text, text, uuid, uuid, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_financial_bond(uuid, text, numeric, text, numeric, numeric, date, uuid, uuid, text, text, uuid, uuid, text, uuid) TO authenticated;

COMMIT;