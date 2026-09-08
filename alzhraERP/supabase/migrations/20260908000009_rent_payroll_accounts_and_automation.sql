-- ============================================================
-- Migration: 20260908000009_rent_payroll_accounts_and_automation
-- Purpose  : إضافة حسابات الإيجار وسلف الموظفين + دالة القيود
--            التلقائية الشهرية للرواتب والإيجار
-- ============================================================

-- -----------------------------------------------------------
-- 1. إصلاح دالة توليد رمز بوابة المورد (gen_random_bytes غير متاح)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_set_supplier_portal_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.portal_token IS NULL THEN
    -- نستخدم gen_random_uuid بدلاً من gen_random_bytes
    NEW.portal_token := replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- 2. حسابات سلف الموظفين (1400 - أصول متداولة)
-- -----------------------------------------------------------
DO $$
DECLARE
  v_company uuid := 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';
  v_assets_parent uuid;
  v_liab_parent   uuid;
  v_emp_parent    uuid;
  v_rent_parent   uuid;
BEGIN
  SELECT id INTO v_assets_parent FROM public.accounts
  WHERE company_id = v_company AND code = '1000';

  SELECT id INTO v_liab_parent FROM public.accounts
  WHERE company_id = v_company AND code = '2000';

  -- 1400: حساب أب - سلف الموظفين والمستحقات
  INSERT INTO public.accounts
    (company_id, code, name_ar, type, parent_id, currency_code, is_active, allow_posting, is_system)
  VALUES
    (v_company, '1400', 'سلف الموظفين والمستحقات', 'asset', v_assets_parent, 'SAR', true, false, false)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_emp_parent;

  IF v_emp_parent IS NULL THEN
    SELECT id INTO v_emp_parent FROM public.accounts
    WHERE company_id = v_company AND code = '1400';
  END IF;

  -- حسابات فردية لكل موظف
  INSERT INTO public.accounts
    (company_id, code, name_ar, type, parent_id, currency_code, is_active, allow_posting, is_system)
  VALUES
    (v_company, '140001', 'سلف الموظف: الخضر صالح',      'asset', v_emp_parent, 'SAR', true, true, false),
    (v_company, '140002', 'سلف الموظف: محمد عبدالرقيب',  'asset', v_emp_parent, 'SAR', true, true, false),
    (v_company, '140003', 'سلف الموظف: محمد الحمادي',    'asset', v_emp_parent, 'SAR', true, true, false)
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------
  -- 3. حسابات مستحقات الإيجار (2400 - خصوم)
  -- -----------------------------------------------------------
  INSERT INTO public.accounts
    (company_id, code, name_ar, type, parent_id, currency_code, is_active, allow_posting, is_system)
  VALUES
    (v_company, '2400', 'مستحقات الإيجار الشهرية', 'liability', v_liab_parent, 'SAR', true, false, false)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_rent_parent;

  IF v_rent_parent IS NULL THEN
    SELECT id INTO v_rent_parent FROM public.accounts
    WHERE company_id = v_company AND code = '2400';
  END IF;

  -- حساب فرعي لكل عملة إيجار
  INSERT INTO public.accounts
    (company_id, code, name_ar, type, parent_id, currency_code, is_active, allow_posting, is_system)
  VALUES
    (v_company, '240001', 'إيجار المحل - ريال سعودي', 'liability', v_rent_parent, 'SAR', true, true, false),
    (v_company, '240002', 'إيجار المحل - ريال يمني',  'liability', v_rent_parent, 'YER', true, true, false)
  ON CONFLICT DO NOTHING;

END $$;

-- -----------------------------------------------------------
-- 4. دالة القيود التلقائية الشهرية: إيجار + رواتب
--    الاستدعاء: SELECT post_monthly_rent_and_payroll('2026-10-01');
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_monthly_rent_and_payroll(
  p_period_start date,                       -- أول يوم من الشهر
  p_company_id   uuid DEFAULT 'cd8123f3-3cd4-4310-8b7a-042546c2b09c',
  p_yer_rate     numeric DEFAULT 0.002439,   -- سعر صرف الريال اليمني (1 YER = ? SAR)
  p_rent_sar     numeric DEFAULT 500,        -- إيجار بالريال السعودي
  p_rent_yer     numeric DEFAULT 100000,     -- إيجار بالريال اليمني
  p_sal_khader   numeric DEFAULT 200,        -- راتب الخضر صالح
  p_sal_mohammed_r numeric DEFAULT 200,      -- راتب محمد عبدالرقيب
  p_sal_mohammed_h numeric DEFAULT 100       -- راتب محمد الحمادي
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user          uuid;
  v_period_label  text;
  v_seq           bigint;
  v_je_rent       uuid;
  v_je_sal        uuid;
  v_acc_rent_exp  uuid;
  v_acc_rent_sar  uuid;
  v_acc_rent_yer  uuid;
  v_acc_salary    uuid;
  v_acc_emp1      uuid;
  v_acc_emp2      uuid;
  v_acc_emp3      uuid;
  v_already_rent  boolean := false;
  v_already_sal   boolean := false;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT owner_id INTO v_user FROM public.companies WHERE id = p_company_id;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user THEN
    -- السماح لـ owner فقط بتشغيل القيود التلقائية
    IF NOT EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = p_company_id AND user_id = auth.uid()
        AND role IN ('owner','admin')
    ) THEN
      RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية تشغيل القيود التلقائية';
    END IF;
    v_user := auth.uid();
  END IF;

  v_period_label := to_char(p_period_start, 'YYYY-MM (FMMonth YYYY)');

  -- التحقق من عدم التكرار للشهر ذاته
  SELECT EXISTS(
    SELECT 1 FROM public.journal_entries
    WHERE company_id = p_company_id
      AND entry_date = p_period_start
      AND reference_type = 'manual'
      AND description ILIKE '%استحقاق إيجار%' || to_char(p_period_start, 'YYYY') || '%'
  ) INTO v_already_rent;

  SELECT EXISTS(
    SELECT 1 FROM public.journal_entries
    WHERE company_id = p_company_id
      AND entry_date = p_period_start
      AND reference_type = 'manual'
      AND description ILIKE '%استحقاق رواتب%' || to_char(p_period_start, 'YYYY') || '%'
  ) INTO v_already_sal;

  IF v_already_rent AND v_already_sal THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'تم ترحيل قيود هذا الشهر مسبقاً: ' || v_period_label
    );
  END IF;

  -- جلب معرفات الحسابات
  SELECT id INTO v_acc_rent_exp FROM public.accounts WHERE company_id = p_company_id AND code = '5500';
  SELECT id INTO v_acc_rent_sar FROM public.accounts WHERE company_id = p_company_id AND code = '240001';
  SELECT id INTO v_acc_rent_yer FROM public.accounts WHERE company_id = p_company_id AND code = '240002';
  SELECT id INTO v_acc_salary   FROM public.accounts WHERE company_id = p_company_id AND code = '5400';
  SELECT id INTO v_acc_emp1     FROM public.accounts WHERE company_id = p_company_id AND code = '140001';
  SELECT id INTO v_acc_emp2     FROM public.accounts WHERE company_id = p_company_id AND code = '140002';
  SELECT id INTO v_acc_emp3     FROM public.accounts WHERE company_id = p_company_id AND code = '140003';

  -- ==========================================================
  -- قيد الإيجار (إذا لم يُرحَّل بعد)
  -- ==========================================================
  IF NOT v_already_rent THEN
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO v_seq
    FROM public.journal_entries WHERE company_id = p_company_id;

    INSERT INTO public.journal_entries
      (company_id, entry_number, entry_date, description, reference_type, status, created_by)
    VALUES
      (p_company_id, v_seq, p_period_start,
       'استحقاق إيجار المحل - ' || to_char(p_period_start, 'FMMonth YYYY'),
       'manual', 'draft', v_user)
    RETURNING id INTO v_je_rent;

    INSERT INTO public.journal_entry_lines
      (journal_entry_id, account_id, company_id,
       debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount, description)
    VALUES
      -- مدين: مصروف الإيجار بالريال السعودي
      (v_je_rent, v_acc_rent_exp, p_company_id,
       p_rent_sar, 0, 'SAR', 1, p_rent_sar,
       'مصروف إيجار المحل - ريال سعودي ' || to_char(p_period_start, 'FMMonth YYYY')),
      -- دائن: مستحقات الإيجار ريال سعودي
      (v_je_rent, v_acc_rent_sar, p_company_id,
       0, p_rent_sar, 'SAR', 1, p_rent_sar,
       'مستحق إيجار لصاحب المحل - ريال سعودي'),
      -- مدين: مصروف الإيجار بالريال اليمني (مُحوَّل)
      (v_je_rent, v_acc_rent_exp, p_company_id,
       ROUND(p_rent_yer * p_yer_rate, 4), 0,
       'YER', p_yer_rate, p_rent_yer,
       'مصروف إيجار المحل - ريال يمني ' || to_char(p_period_start, 'FMMonth YYYY')),
      -- دائن: مستحقات الإيجار ريال يمني
      (v_je_rent, v_acc_rent_yer, p_company_id,
       0, ROUND(p_rent_yer * p_yer_rate, 4),
       'YER', p_yer_rate, p_rent_yer,
       'مستحق إيجار لصاحب المحل - ريال يمني');

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_je_rent;
  END IF;

  -- ==========================================================
  -- قيد الرواتب (إذا لم يُرحَّل بعد)
  -- ==========================================================
  IF NOT v_already_sal THEN
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO v_seq
    FROM public.journal_entries WHERE company_id = p_company_id;

    INSERT INTO public.journal_entries
      (company_id, entry_number, entry_date, description, reference_type, status, created_by)
    VALUES
      (p_company_id, v_seq, p_period_start,
       'استحقاق رواتب الموظفين - ' || to_char(p_period_start, 'FMMonth YYYY'),
       'manual', 'draft', v_user)
    RETURNING id INTO v_je_sal;

    INSERT INTO public.journal_entry_lines
      (journal_entry_id, account_id, company_id,
       debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount, description)
    VALUES
      -- مدين: مصروف الرواتب الإجمالي
      (v_je_sal, v_acc_salary, p_company_id,
       p_sal_khader + p_sal_mohammed_r + p_sal_mohammed_h, 0,
       'SAR', 1, p_sal_khader + p_sal_mohammed_r + p_sal_mohammed_h,
       'مصروف رواتب ' || to_char(p_period_start, 'FMMonth YYYY') ||
       ': الخضر صالح + محمد عبدالرقيب + محمد الحمادي'),
      -- دائن: سلفة/مستحق الخضر صالح
      (v_je_sal, v_acc_emp1, p_company_id,
       0, p_sal_khader, 'SAR', 1, p_sal_khader,
       'راتب ' || to_char(p_period_start, 'FMMonth YYYY') || ' - الخضر صالح'),
      -- دائن: سلفة/مستحق محمد عبدالرقيب
      (v_je_sal, v_acc_emp2, p_company_id,
       0, p_sal_mohammed_r, 'SAR', 1, p_sal_mohammed_r,
       'راتب ' || to_char(p_period_start, 'FMMonth YYYY') || ' - محمد عبدالرقيب'),
      -- دائن: سلفة/مستحق محمد الحمادي
      (v_je_sal, v_acc_emp3, p_company_id,
       0, p_sal_mohammed_h, 'SAR', 1, p_sal_mohammed_h,
       'راتب ' || to_char(p_period_start, 'FMMonth YYYY') || ' - محمد الحمادي');

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_je_sal;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'period', v_period_label,
    'rent_entry_id',   v_je_rent,
    'salary_entry_id', v_je_sal,
    'rent_posted',   NOT v_already_rent,
    'salary_posted', NOT v_already_sal,
    'message', 'تم ترحيل القيود الشهرية بنجاح'
  );
END;
$$;

-- منح صلاحية التنفيذ لمستخدمي التطبيق
GRANT EXECUTE ON FUNCTION public.post_monthly_rent_and_payroll(date, uuid, numeric, numeric, numeric, numeric, numeric, numeric)
  TO authenticated;

COMMENT ON FUNCTION public.post_monthly_rent_and_payroll IS
  'يُرحِّل قيود استحقاق الإيجار الشهري (500 ر.س + 100,000 ر.ي) وقيد رواتب الموظفين الثلاثة.
   منع التكرار: يتحقق مسبقاً من عدم وجود قيد لنفس الشهر.
   الاستدعاء: SELECT post_monthly_rent_and_payroll(''2026-10-01'');';
