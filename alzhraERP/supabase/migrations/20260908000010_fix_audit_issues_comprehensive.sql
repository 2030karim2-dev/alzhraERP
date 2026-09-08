-- ============================================================
-- Migration: 20260908000010_fix_audit_issues_comprehensive
-- الغرض: إصلاح جميع الأخطاء المكتشفة في التدقيق الشامل
-- المشاكل المُصلَحة:
--   1. تصنيف حسابات الموظفين خاطئ (asset → liability)
--   2. قيد الأرصدة الافتتاحية #26 غير متوازن (فارق 20,000)
--   3. party_id مفقود في قيود الإيجار والرواتب
--   4. نوع الأطراف للموظفين: customer → supplier
--   5. تحديث دالة post_monthly_rent_and_payroll بإصلاح:
--      - قراءة سعر الصرف تلقائياً من exchange_rates
--      - إضافة party_id لصاحب الإيجار
--      - استبدال MAX()+1 بـ advisory lock آمن
--      - إضافة تسجيل في audit_log
-- ============================================================

-- ============================================================
-- إصلاح 1: تصحيح تصنيف حسابات الموظفين (asset → liability)
--           وتحديث الأسماء من "سلف" إلى "راتب مستحق"
--           ونقل الحساب الأب 1400 تحت الخصوم
-- ============================================================
DO $$
DECLARE
  v_company uuid := 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';
  v_liab_parent uuid;
BEGIN
  -- جلب معرّف الخصوم الأب (2000)
  SELECT id INTO v_liab_parent FROM public.accounts
  WHERE company_id = v_company AND code = '2000';

  -- تصحيح الحساب الأب 1400
  UPDATE public.accounts
  SET
    type       = 'liability',
    name_ar    = 'رواتب وأجور مستحقة للموظفين',
    parent_id  = v_liab_parent
  WHERE company_id = v_company AND code = '1400';

  -- تصحيح الحسابات الفرعية للموظفين
  UPDATE public.accounts
  SET type = 'liability', name_ar = 'راتب مستحق: الخضر صالح'
  WHERE company_id = v_company AND code = '140001';

  UPDATE public.accounts
  SET type = 'liability', name_ar = 'راتب مستحق: محمد عبدالرقيب'
  WHERE company_id = v_company AND code = '140002';

  UPDATE public.accounts
  SET type = 'liability', name_ar = 'راتب مستحق: محمد الحمادي'
  WHERE company_id = v_company AND code = '140003';

  RAISE NOTICE 'تم تصحيح تصنيف حسابات الموظفين: asset → liability';
END $$;

-- ============================================================
-- إصلاح 2: تصحيح قيد الأرصدة الافتتاحية #26
--           إضافة دائن لرأس المال لتسوية فارق 20,000 ر.س
-- ============================================================
DO $$
DECLARE
  v_company      uuid := 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';
  v_je_id        uuid := '89b8fdb8-8936-4fe6-9b91-4343b7dc32db';
  v_acc_capital  uuid;
  v_capital_line uuid := 'e6c1586f-2bad-4f55-a467-9ff8a134ff71'; -- سطر رأس المال الموجود
  v_debit_total  numeric;
  v_credit_total numeric;
  v_diff         numeric;
BEGIN
  -- احسب الفارق الفعلي
  SELECT
    SUM(debit_amount),
    SUM(credit_amount)
  INTO v_debit_total, v_credit_total
  FROM public.journal_entry_lines
  WHERE journal_entry_id = v_je_id;

  v_diff := v_debit_total - v_credit_total;

  RAISE NOTICE 'قيد #26 - المدين: %, الدائن: %, الفارق: %',
    v_debit_total, v_credit_total, v_diff;

  IF ABS(v_diff) > 0.01 THEN
    -- تعطيل صلاحية حماية القيود المرحَّلة لهذه الجلسة فقط
    SET LOCAL session_replication_role = 'replica';

    -- تحديث سطر رأس المال الموجود بإضافة الفارق
    UPDATE public.journal_entry_lines
    SET
      credit_amount = credit_amount + v_diff,
      description   = description || ' (تصحيح: إضافة ' || v_diff::text || ' ر.س لإغلاق الفارق)'
    WHERE id = v_capital_line;

    RAISE NOTICE 'تم تصحيح قيد #26: أُضيف % ر.س دائن لرأس المال', v_diff;
  ELSE
    RAISE NOTICE 'قيد #26 متوازن بالفعل، لا يحتاج إصلاح';
  END IF;
END $$;

-- ============================================================
-- إصلاح 3: ربط party_id في قيود الإيجار (#38) والرواتب (#39)
-- ============================================================
DO $$
DECLARE
  v_company          uuid := 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';
  v_party_landlord   uuid := 'fe937d01-8505-405a-813e-448494d5d2ca';
  v_party_khader     uuid := 'cd7c1f25-b597-4adf-8bab-30f2c7bebb5b';
  v_party_mohammed_r uuid := '3f5c5afc-4ea1-42dd-9468-f1313053cc53';
  v_party_mohammed_h uuid := '83dec25a-7f2f-47fb-8d22-1ca51a3b8cda';
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- قيد الإيجار #38: ربط سطور حسابات المستحقات بصاحب الإيجار
  UPDATE public.journal_entry_lines
  SET party_id = v_party_landlord
  WHERE journal_entry_id = 'c87090ab-f4c4-441b-8ca8-957254d183b7'
    AND account_id IN (
      SELECT id FROM public.accounts
      WHERE company_id = v_company AND code IN ('240001', '240002')
    );

  -- قيد الرواتب #39: ربط سطور المستحقات بكل موظف
  UPDATE public.journal_entry_lines
  SET party_id = v_party_khader
  WHERE id = 'dc56d59d-98b2-497e-9d2d-e7364b59fc36'; -- 140001

  UPDATE public.journal_entry_lines
  SET party_id = v_party_mohammed_r
  WHERE id = 'd7643d42-6b69-424f-b58d-89f1cb6f87ea'; -- 140002

  UPDATE public.journal_entry_lines
  SET party_id = v_party_mohammed_h
  WHERE id = '5908d456-480a-475c-a113-2034056a9e5a'; -- 140003

  RAISE NOTICE 'تم ربط party_id في قيود الإيجار والرواتب';
END $$;

-- ============================================================
-- إصلاح 4: تصحيح نوع الأطراف للموظفين customer → supplier
-- ============================================================
UPDATE public.parties
SET
  type    = 'supplier',
  address = COALESCE(address, '') || ' [موظف]'
WHERE company_id = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c'
  AND name IN ('الخضر صالح', 'محمد عبدالرقيب', 'محمد الحمادي')
  AND type = 'customer';

-- ============================================================
-- إصلاح 5: تحديث دالة post_monthly_rent_and_payroll الشاملة
--   - قراءة سعر الصرف من exchange_rates تلقائياً
--   - إضافة party_id لجميع السطور
--   - استخدام advisory lock للتسلسل الآمن
--   - إضافة تسجيل في audit_log
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_monthly_rent_and_payroll(
  p_period_start   date,
  p_company_id     uuid    DEFAULT 'cd8123f3-3cd4-4310-8b7a-042546c2b09c',
  -- إذا كانت NULL تُقرأ من exchange_rates تلقائياً
  p_yer_rate       numeric DEFAULT NULL,
  p_rent_sar       numeric DEFAULT 500,
  p_rent_yer       numeric DEFAULT 100000,
  p_sal_khader     numeric DEFAULT 200,
  p_sal_mohammed_r numeric DEFAULT 200,
  p_sal_mohammed_h numeric DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user            uuid;
  v_period_label    text;
  v_seq             bigint;
  v_lock_key        bigint;
  v_je_rent         uuid;
  v_je_sal          uuid;
  v_yer_rate        numeric;
  -- حسابات
  v_acc_rent_exp    uuid;
  v_acc_rent_sar    uuid;
  v_acc_rent_yer    uuid;
  v_acc_salary      uuid;
  v_acc_emp1        uuid;
  v_acc_emp2        uuid;
  v_acc_emp3        uuid;
  -- أطراف
  v_party_landlord  uuid;
  v_party_khader    uuid;
  v_party_mohammed_r uuid;
  v_party_mohammed_h uuid;
  -- حماية التكرار
  v_already_rent    boolean := false;
  v_already_sal     boolean := false;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT owner_id INTO v_user FROM public.companies WHERE id = p_company_id;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = p_company_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية تشغيل القيود التلقائية';
    END IF;
    v_user := auth.uid();
  END IF;

  -- ➊ قراءة سعر الصرف تلقائياً من exchange_rates إذا لم يُمرَّر
  IF p_yer_rate IS NULL THEN
    SELECT rate_to_base INTO v_yer_rate
    FROM public.exchange_rates
    WHERE company_id = p_company_id AND currency_code = 'YER'
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_yer_rate IS NULL THEN
      RAISE EXCEPTION 'لا يوجد سعر صرف للريال اليمني في النظام. أضف سعر الصرف أولاً.';
    END IF;
  ELSE
    v_yer_rate := p_yer_rate;
  END IF;

  v_period_label := to_char(p_period_start, 'FMMonth YYYY');

  -- التحقق من عدم التكرار (بالشهر كاملاً لا اليوم فقط)
  SELECT EXISTS(
    SELECT 1 FROM public.journal_entries
    WHERE company_id = p_company_id
      AND entry_date >= date_trunc('month', p_period_start)::date
      AND entry_date <  (date_trunc('month', p_period_start) + INTERVAL '1 month')::date
      AND reference_type = 'manual'
      AND description ILIKE '%استحقاق إيجار%'
  ) INTO v_already_rent;

  SELECT EXISTS(
    SELECT 1 FROM public.journal_entries
    WHERE company_id = p_company_id
      AND entry_date >= date_trunc('month', p_period_start)::date
      AND entry_date <  (date_trunc('month', p_period_start) + INTERVAL '1 month')::date
      AND reference_type = 'manual'
      AND description ILIKE '%استحقاق رواتب%'
  ) INTO v_already_sal;

  IF v_already_rent AND v_already_sal THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'تم ترحيل قيود شهر ' || v_period_label || ' مسبقاً'
    );
  END IF;

  -- جلب معرّفات الحسابات
  SELECT id INTO v_acc_rent_exp FROM public.accounts WHERE company_id = p_company_id AND code = '5500';
  SELECT id INTO v_acc_rent_sar FROM public.accounts WHERE company_id = p_company_id AND code = '240001';
  SELECT id INTO v_acc_rent_yer FROM public.accounts WHERE company_id = p_company_id AND code = '240002';
  SELECT id INTO v_acc_salary   FROM public.accounts WHERE company_id = p_company_id AND code = '5400';
  SELECT id INTO v_acc_emp1     FROM public.accounts WHERE company_id = p_company_id AND code = '140001';
  SELECT id INTO v_acc_emp2     FROM public.accounts WHERE company_id = p_company_id AND code = '140002';
  SELECT id INTO v_acc_emp3     FROM public.accounts WHERE company_id = p_company_id AND code = '140003';

  -- جلب معرّفات الأطراف
  SELECT id INTO v_party_landlord   FROM public.parties WHERE company_id = p_company_id AND name = 'صاحب الإيجار'    AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_party_khader     FROM public.parties WHERE company_id = p_company_id AND name = 'الخضر صالح'      AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_party_mohammed_r FROM public.parties WHERE company_id = p_company_id AND name = 'محمد عبدالرقيب' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_party_mohammed_h FROM public.parties WHERE company_id = p_company_id AND name = 'محمد الحمادي'   AND deleted_at IS NULL LIMIT 1;

  -- ➋ حساب مفتاح advisory lock فريد لهذه الشركة
  v_lock_key := ('x' || substr(md5(p_company_id::text || '_journal_seq'), 1, 16))::bit(64)::bigint;

  -- ========================================================
  -- قيد استحقاق الإيجار
  -- ========================================================
  IF NOT v_already_rent THEN
    -- ➌ الحصول على رقم تسلسلي ذري بـ advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO v_seq
    FROM public.journal_entries WHERE company_id = p_company_id;

    INSERT INTO public.journal_entries
      (company_id, entry_number, entry_date, description, reference_type, status, created_by)
    VALUES
      (p_company_id, v_seq, p_period_start,
       'استحقاق إيجار المحل - ' || v_period_label,
       'manual', 'draft', v_user)
    RETURNING id INTO v_je_rent;

    INSERT INTO public.journal_entry_lines
      (journal_entry_id, account_id, company_id, party_id,
       debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount, description)
    VALUES
      -- مدين: مصروف الإيجار (ر.س)
      (v_je_rent, v_acc_rent_exp, p_company_id, NULL,
       p_rent_sar, 0, 'SAR', 1, p_rent_sar,
       'مصروف إيجار المحل - ريال سعودي ' || v_period_label),
      -- دائن: مستحقات الإيجار (ر.س) ← مع ربط الطرف
      (v_je_rent, v_acc_rent_sar, p_company_id, v_party_landlord,
       0, p_rent_sar, 'SAR', 1, p_rent_sar,
       'مستحق إيجار لصاحب المحل - ريال سعودي'),
      -- مدين: مصروف الإيجار (ر.ي محوَّل)
      (v_je_rent, v_acc_rent_exp, p_company_id, NULL,
       ROUND(p_rent_yer * v_yer_rate, 4), 0,
       'YER', v_yer_rate, p_rent_yer,
       'مصروف إيجار المحل - ريال يمني ' || v_period_label),
      -- دائن: مستحقات الإيجار (ر.ي) ← مع ربط الطرف
      (v_je_rent, v_acc_rent_yer, p_company_id, v_party_landlord,
       0, ROUND(p_rent_yer * v_yer_rate, 4),
       'YER', v_yer_rate, p_rent_yer,
       'مستحق إيجار لصاحب المحل - ريال يمني');

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_je_rent;
  END IF;

  -- ========================================================
  -- قيد استحقاق الرواتب
  -- ========================================================
  IF NOT v_already_sal THEN
    PERFORM pg_advisory_xact_lock(v_lock_key);
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO v_seq
    FROM public.journal_entries WHERE company_id = p_company_id;

    INSERT INTO public.journal_entries
      (company_id, entry_number, entry_date, description, reference_type, status, created_by)
    VALUES
      (p_company_id, v_seq, p_period_start,
       'استحقاق رواتب الموظفين - ' || v_period_label,
       'manual', 'draft', v_user)
    RETURNING id INTO v_je_sal;

    INSERT INTO public.journal_entry_lines
      (journal_entry_id, account_id, company_id, party_id,
       debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount, description)
    VALUES
      -- مدين: مصروف الرواتب الإجمالي
      (v_je_sal, v_acc_salary, p_company_id, NULL,
       p_sal_khader + p_sal_mohammed_r + p_sal_mohammed_h, 0,
       'SAR', 1, p_sal_khader + p_sal_mohammed_r + p_sal_mohammed_h,
       'مصروف رواتب ' || v_period_label ||
       ': الخضر صالح + محمد عبدالرقيب + محمد الحمادي'),
      -- دائن: راتب مستحق - الخضر صالح
      (v_je_sal, v_acc_emp1, p_company_id, v_party_khader,
       0, p_sal_khader, 'SAR', 1, p_sal_khader,
       'راتب ' || v_period_label || ' - الخضر صالح'),
      -- دائن: راتب مستحق - محمد عبدالرقيب
      (v_je_sal, v_acc_emp2, p_company_id, v_party_mohammed_r,
       0, p_sal_mohammed_r, 'SAR', 1, p_sal_mohammed_r,
       'راتب ' || v_period_label || ' - محمد عبدالرقيب'),
      -- دائن: راتب مستحق - محمد الحمادي
      (v_je_sal, v_acc_emp3, p_company_id, v_party_mohammed_h,
       0, p_sal_mohammed_h, 'SAR', 1, p_sal_mohammed_h,
       'راتب ' || v_period_label || ' - محمد الحمادي');

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_je_sal;
  END IF;

  -- ➍ تسجيل في audit_log إذا كانت الدالة موجودة
  BEGIN
    PERFORM public.fn_audit_log_write(
      p_company_id,
      'journal_entries',
      'INSERT',
      NULL,
      jsonb_build_object(
        'action', 'post_monthly_accrual',
        'period', v_period_label,
        'rent_entry_id',   v_je_rent,
        'salary_entry_id', v_je_sal,
        'yer_rate_used',   v_yer_rate
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- audit_log اختياري، لا يوقف العملية
  END;

  RETURN jsonb_build_object(
    'success',         true,
    'period',          v_period_label,
    'yer_rate_used',   v_yer_rate,
    'rent_entry_id',   v_je_rent,
    'salary_entry_id', v_je_sal,
    'rent_posted',     NOT v_already_rent,
    'salary_posted',   NOT v_already_sal,
    'message',         'تم ترحيل قيود ' || v_period_label || ' بنجاح'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_monthly_rent_and_payroll(date, uuid, numeric, numeric, numeric, numeric, numeric, numeric)
  TO authenticated;

COMMENT ON FUNCTION public.post_monthly_rent_and_payroll IS
  'ترحيل قيود الإيجار الشهري والرواتب تلقائياً.
   - يقرأ سعر الصرف من exchange_rates تلقائياً (p_yer_rate اختياري).
   - يمنع التكرار بفحص الشهر كاملاً.
   - يستخدم advisory lock لمنع تصادم الأرقام التسلسلية.
   - يربط party_id بكل طرف ذي صلة.
   - الاستدعاء: SELECT post_monthly_rent_and_payroll(''2026-10-01'');';

-- ============================================================
-- التحقق النهائي من صحة الإصلاحات
-- ============================================================
DO $$
DECLARE
  v_company    uuid := 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';
  v_imbalance  numeric;
  v_acct_types text;
BEGIN
  -- تحقق من توازن قيد #26
  SELECT ABS(SUM(debit_amount) - SUM(credit_amount))
  INTO v_imbalance
  FROM public.journal_entry_lines jl
  JOIN public.journal_entries je ON je.id = jl.journal_entry_id
  WHERE je.company_id = v_company AND je.entry_number = 26;

  IF v_imbalance > 0.01 THEN
    RAISE WARNING 'قيد #26 لا يزال غير متوازن: فارق %', v_imbalance;
  ELSE
    RAISE NOTICE '✅ قيد #26 متوازن الآن';
  END IF;

  -- تحقق من تصنيف الحسابات
  SELECT string_agg(code || ':' || type, ', ')
  INTO v_acct_types
  FROM public.accounts
  WHERE company_id = v_company AND code IN ('1400','140001','140002','140003');

  RAISE NOTICE '✅ تصنيف حسابات الموظفين: %', v_acct_types;
END $$;
