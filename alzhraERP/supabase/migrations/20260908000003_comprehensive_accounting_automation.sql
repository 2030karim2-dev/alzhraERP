-- ============================================================
-- Migration: 20260908000003_comprehensive_accounting_automation.sql
-- Description:
--   1. Seed system accounts: 1390 (Accumulated Depreciation), 4400 (Unrealized FX Gain),
--      5700 (Depreciation Expense), 5800 (Unrealized FX Loss).
--   2. Create fixed_assets and fixed_asset_depreciations tables with RLS and triggers.
--   3. Implement fn_post_asset_depreciation & fn_run_all_assets_depreciation.
--   4. Implement fn_revalue_foreign_currency (Periodic FX Revaluation).
--   5. Implement fn_close_fiscal_year (Year-End Closing, 4xxx/5xxx zeroing, Retained Earnings 3200 roll-forward).
--   6. Implement fn_get_vat_return_report (VAT Filing Summary).
-- ============================================================

-- 1. Seed System Accounts
DO $$
DECLARE
  r_comp RECORD;
  v_1300_id uuid;
  v_4000_id uuid;
  v_5000_id uuid;
BEGIN
  FOR r_comp IN SELECT id, base_currency FROM companies LOOP
    SELECT id INTO v_1300_id FROM accounts WHERE company_id = r_comp.id AND code = '1300' LIMIT 1;
    SELECT id INTO v_4000_id FROM accounts WHERE company_id = r_comp.id AND code = '4000' LIMIT 1;
    SELECT id INTO v_5000_id FROM accounts WHERE company_id = r_comp.id AND code = '5000' LIMIT 1;

    -- 1390: مجمع إهلاك الأصول الثابتة
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id = r_comp.id AND code = '1390') THEN
      INSERT INTO accounts (
        company_id, code, name_ar, name_en, type, parent_id,
        currency_code, is_system, is_active, allow_posting
      )
      VALUES (
        r_comp.id, '1390', 'مجمع إهلاك الأصول الثابتة', 'Accumulated Depreciation', 'asset',
        v_1300_id, r_comp.base_currency, true, true, true
      );
    END IF;

    -- 4400: أرباح فروق تقييم العملة
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id = r_comp.id AND code = '4400') THEN
      INSERT INTO accounts (
        company_id, code, name_ar, name_en, type, parent_id,
        currency_code, is_system, is_active, allow_posting
      )
      VALUES (
        r_comp.id, '4400', 'أرباح فروق تقييم العملة', 'Unrealized FX Gain', 'revenue',
        v_4000_id, r_comp.base_currency, true, true, true
      );
    END IF;

    -- 5700: مصروف إهلاك الأصول الثابتة
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id = r_comp.id AND code = '5700') THEN
      INSERT INTO accounts (
        company_id, code, name_ar, name_en, type, parent_id,
        currency_code, is_system, is_active, allow_posting
      )
      VALUES (
        r_comp.id, '5700', 'مصروف إهلاك الأصول الثابتة', 'Depreciation Expense', 'expense',
        v_5000_id, r_comp.base_currency, true, true, true
      );
    END IF;

    -- 5800: خسائر فروق تقييم العملة
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id = r_comp.id AND code = '5800') THEN
      INSERT INTO accounts (
        company_id, code, name_ar, name_en, type, parent_id,
        currency_code, is_system, is_active, allow_posting
      )
      VALUES (
        r_comp.id, '5800', 'خسائر فروق تقييم العملة', 'Unrealized FX Loss', 'expense',
        v_5000_id, r_comp.base_currency, true, true, true
      );
    END IF;
  END LOOP;
END $$;

-- 2. Fixed Assets Tables
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  asset_code text NOT NULL,
  category text NOT NULL DEFAULT 'equipment',
  purchase_date date NOT NULL,
  purchase_cost numeric(15, 4) NOT NULL CHECK (purchase_cost >= 0),
  salvage_value numeric(15, 4) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  useful_life_months int NOT NULL CHECK (useful_life_months > 0),
  depreciation_method text NOT NULL DEFAULT 'straight_line',
  asset_account_id uuid NOT NULL REFERENCES public.accounts(id),
  accumulated_depr_account_id uuid NOT NULL REFERENCES public.accounts(id),
  depreciation_expense_account_id uuid NOT NULL REFERENCES public.accounts(id),
  last_depreciation_date date,
  total_depreciated numeric(15, 4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fully_depreciated', 'disposed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fixed_assets_company_code 
ON public.fixed_assets(company_id, asset_code) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fixed_assets_company_status 
ON public.fixed_assets(company_id, status) 
WHERE deleted_at IS NULL;

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fixed_assets_tenant_select ON public.fixed_assets;
CREATE POLICY fixed_assets_tenant_select ON public.fixed_assets
FOR SELECT USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = fixed_assets.company_id
  )
);

DROP POLICY IF EXISTS fixed_assets_tenant_modify ON public.fixed_assets;
CREATE POLICY fixed_assets_tenant_modify ON public.fixed_assets
FOR ALL USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = fixed_assets.company_id
  )
);

CREATE TABLE IF NOT EXISTS public.fixed_asset_depreciations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_date date NOT NULL,
  amount numeric(15, 4) NOT NULL CHECK (amount > 0),
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_depr_asset ON public.fixed_asset_depreciations(asset_id, period_date);
ALTER TABLE public.fixed_asset_depreciations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fixed_asset_depr_tenant ON public.fixed_asset_depreciations;
CREATE POLICY fixed_asset_depr_tenant ON public.fixed_asset_depreciations
FOR ALL USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = fixed_asset_depreciations.company_id
  )
);

-- 3. fn_post_asset_depreciation
CREATE OR REPLACE FUNCTION public.fn_post_asset_depreciation(
  p_asset_id uuid,
  p_period_date date DEFAULT CURRENT_DATE,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset RECORD;
  v_company_id uuid;
  v_branch_id uuid;
  v_base_currency text;
  v_monthly_amount numeric;
  v_depreciable_base numeric;
  v_remaining_depreciable numeric;
  v_depr_amount numeric;
  v_je_id uuid;
  v_current_user_id uuid;
BEGIN
  SELECT * INTO v_asset FROM fixed_assets WHERE id = p_asset_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'asset_not_found: الأصل الثابت غير موجود';
  END IF;

  v_company_id := v_asset.company_id;
  PERFORM public.fn_assert_company_access(v_company_id);

  IF v_asset.status != 'active' THEN
    RAISE EXCEPTION 'asset_not_active: الأصل الثابت ليس في حالة نشطة (%): لا يمكن إهلاكه', v_asset.status;
  END IF;

  IF v_asset.last_depreciation_date IS NOT NULL 
     AND DATE_TRUNC('month', v_asset.last_depreciation_date) = DATE_TRUNC('month', p_period_date) THEN
    RAISE EXCEPTION 'already_depreciated: تم احتساب إهلاك هذا الأصل لنفس الشهر مسبقاً (تاريخ الإهلاك السابق: %)', v_asset.last_depreciation_date;
  END IF;

  IF v_asset.salvage_value > v_asset.purchase_cost THEN
    RAISE EXCEPTION 'invalid_salvage_value: قيمة الخردة لا يمكن أن تتجاوز تكلفة الشراء';
  END IF;

  v_depreciable_base := v_asset.purchase_cost - v_asset.salvage_value;
  v_remaining_depreciable := v_depreciable_base - v_asset.total_depreciated;

  IF v_remaining_depreciable <= 0 THEN
    UPDATE fixed_assets SET status = 'fully_depreciated', updated_at = NOW() WHERE id = v_asset.id;
    RETURN jsonb_build_object('success', false, 'message', 'تم استنفاد إهلاك هذا الأصل بالكامل');
  END IF;

  v_monthly_amount := ROUND(v_depreciable_base / v_asset.useful_life_months, 2);
  v_depr_amount := LEAST(v_monthly_amount, v_remaining_depreciable);

  IF v_depr_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'مبلغ الإهلاك المحسوب يساوي صفر');
  END IF;

  SELECT base_currency INTO v_base_currency FROM companies WHERE id = v_company_id;
  v_base_currency := COALESCE(v_base_currency, 'SAR');

  v_branch_id := COALESCE(v_asset.branch_id, (SELECT id FROM branches WHERE company_id = v_company_id AND is_main = true LIMIT 1));
  v_current_user_id := COALESCE(p_created_by, auth.uid());

  INSERT INTO journal_entries (
    company_id, branch_id, entry_date, description,
    reference_type, reference_id, status, created_by
  )
  VALUES (
    v_company_id, v_branch_id, p_period_date,
    'إهلاك دوري للأصل: ' || v_asset.name || ' (' || v_asset.asset_code || ') لفترة ' || TO_CHAR(p_period_date, 'YYYY-MM'),
    'asset_depreciation', v_asset.id, 'draft', v_current_user_id
  )
  RETURNING id INTO v_je_id;

  INSERT INTO journal_entry_lines (
    journal_entry_id, account_id, branch_id, company_id,
    debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
  )
  VALUES
  (
    v_je_id, v_asset.depreciation_expense_account_id, v_branch_id, v_company_id,
    v_depr_amount, 0,
    'مصروف إهلاك: ' || v_asset.name, v_base_currency, 1, 0
  ),
  (
    v_je_id, v_asset.accumulated_depr_account_id, v_branch_id, v_company_id,
    0, v_depr_amount,
    'مجمع إهلاك: ' || v_asset.name, v_base_currency, 1, 0
  );

  UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;

  UPDATE fixed_assets
  SET 
    total_depreciated = total_depreciated + v_depr_amount,
    last_depreciation_date = p_period_date,
    status = CASE 
      WHEN (total_depreciated + v_depr_amount) >= v_depreciable_base THEN 'fully_depreciated'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = v_asset.id;

  INSERT INTO fixed_asset_depreciations (
    company_id, asset_id, period_date, amount, journal_entry_id
  )
  VALUES (
    v_company_id, v_asset.id, p_period_date, v_depr_amount, v_je_id
  );

  PERFORM audit_write(
    'asset_depreciation_posted',
    'fixed_asset',
    v_asset.id,
    v_company_id,
    jsonb_build_object(
      'asset_id', v_asset.id,
      'amount', v_depr_amount,
      'period_date', p_period_date,
      'journal_entry_id', v_je_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'asset_id', v_asset.id,
    'amount', v_depr_amount,
    'journal_entry_id', v_je_id,
    'period_date', p_period_date
  );
END;
$function$;

-- 4. fn_run_all_assets_depreciation
CREATE OR REPLACE FUNCTION public.fn_run_all_assets_depreciation(
  p_company_id uuid,
  p_period_date date DEFAULT CURRENT_DATE,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset RECORD;
  v_res jsonb;
  v_count int := 0;
  v_total_amount numeric := 0;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  FOR v_asset IN
    SELECT id FROM fixed_assets
    WHERE company_id = p_company_id
      AND status = 'active'
      AND deleted_at IS NULL
      AND (last_depreciation_date IS NULL OR DATE_TRUNC('month', last_depreciation_date) < DATE_TRUNC('month', p_period_date))
      AND purchase_date <= p_period_date
  LOOP
    BEGIN
      v_res := fn_post_asset_depreciation(v_asset.id, p_period_date, p_created_by);
      IF (v_res->>'success')::boolean THEN
        v_count := v_count + 1;
        v_total_amount := v_total_amount + (v_res->>'amount')::numeric;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assets_processed', v_count,
    'total_amount', v_total_amount,
    'period_date', p_period_date
  );
END;
$function$;

-- 5. fn_revalue_foreign_currency
CREATE OR REPLACE FUNCTION public.fn_revalue_foreign_currency(
  p_company_id uuid,
  p_account_id uuid,
  p_closing_rate numeric,
  p_operator text DEFAULT 'multiply',
  p_period_date date DEFAULT CURRENT_DATE,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_acc RECORD;
  v_branch_id uuid;
  v_base_currency text;
  v_cur_base_balance numeric := 0;
  v_cur_foreign_balance numeric := 0;
  v_target_base_balance numeric := 0;
  v_diff numeric := 0;
  v_gain_account_id uuid;
  v_loss_account_id uuid;
  v_je_id uuid;
  v_current_user_id uuid;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF p_closing_rate <= 0 THEN
    RAISE EXCEPTION 'invalid_rate: يجب أن يكون سعر الصرف أكبر من الصفر';
  END IF;

  SELECT base_currency INTO v_base_currency FROM companies WHERE id = p_company_id;
  v_base_currency := COALESCE(v_base_currency, 'SAR');

  SELECT * INTO v_acc FROM accounts WHERE id = p_account_id AND company_id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_not_found: الحساب غير موجود';
  END IF;

  IF v_acc.currency_code IS NULL OR v_acc.currency_code = v_base_currency THEN
    RAISE EXCEPTION 'base_currency_account: لا يمكن إعادة تقييم حساب بالعملة الأساسية (%)', v_base_currency;
  END IF;

  SELECT 
    COALESCE(SUM(debit_amount - credit_amount), 0),
    COALESCE(SUM(
      CASE 
        WHEN debit_amount > 0 THEN COALESCE(foreign_amount, 0)
        ELSE -COALESCE(foreign_amount, 0)
      END
    ), 0)
  INTO v_cur_base_balance, v_cur_foreign_balance
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = p_account_id
    AND je.company_id = p_company_id
    AND je.status = 'posted'
    AND je.deleted_at IS NULL;

  IF v_cur_foreign_balance = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رصيد الحساب بالعملة الأجنبية يساوي صفر، لا توجد فروق تقييم.',
      'difference', 0
    );
  END IF;

  IF p_operator = 'divide' THEN
    v_target_base_balance := ROUND(v_cur_foreign_balance / p_closing_rate, 2);
  ELSE
    v_target_base_balance := ROUND(v_cur_foreign_balance * p_closing_rate, 2);
  END IF;

  v_diff := v_target_base_balance - v_cur_base_balance;

  IF ROUND(v_diff, 2) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'الرصيد الدفتري مطابق تماماً لسعر الصرف الحالي، لا يوجد فارق تقييم.',
      'difference', 0,
      'current_base_balance', v_cur_base_balance,
      'foreign_balance', v_cur_foreign_balance
    );
  END IF;

  SELECT id INTO v_gain_account_id FROM accounts WHERE company_id = p_company_id AND code = '4400' LIMIT 1;
  SELECT id INTO v_loss_account_id FROM accounts WHERE company_id = p_company_id AND code = '5800' LIMIT 1;

  IF v_gain_account_id IS NULL OR v_loss_account_id IS NULL THEN
    RAISE EXCEPTION 'fx_accounts_missing: يرجى التأكد من وجود حسابات فروق التقييم 4400 و 5800';
  END IF;

  SELECT id INTO v_branch_id FROM branches WHERE company_id = p_company_id AND is_main = true LIMIT 1;
  v_current_user_id := COALESCE(p_created_by, auth.uid());

  INSERT INTO journal_entries (
    company_id, branch_id, entry_date, description,
    reference_type, reference_id, status, created_by
  )
  VALUES (
    p_company_id, v_branch_id, p_period_date,
    'إعادة تقييم فروق عملة لحساب ' || v_acc.name_ar || ' بسعر ' || p_closing_rate || ' ' || v_acc.currency_code,
    'fx_revaluation', p_account_id, 'draft', v_current_user_id
  )
  RETURNING id INTO v_je_id;

  IF v_diff > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, branch_id, company_id,
      debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
    )
    VALUES 
    (
      v_je_id, p_account_id, v_branch_id, p_company_id,
      v_diff, 0,
      'فروق تقييم موجبة لحساب ' || v_acc.name_ar, v_base_currency, 1, 0
    ),
    (
      v_je_id, v_gain_account_id, v_branch_id, p_company_id,
      0, v_diff,
      'أرباح تقييم فروق عملة: ' || v_acc.name_ar, v_base_currency, 1, 0
    );
  ELSE
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, branch_id, company_id,
      debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
    )
    VALUES 
    (
      v_je_id, v_loss_account_id, v_branch_id, p_company_id,
      ABS(v_diff), 0,
      'خسائر تقييم فروق عملة: ' || v_acc.name_ar, v_base_currency, 1, 0
    ),
    (
      v_je_id, p_account_id, v_branch_id, p_company_id,
      0, ABS(v_diff),
      'فروق تقييم سالبة لحساب ' || v_acc.name_ar, v_base_currency, 1, 0
    );
  END IF;

  UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;

  PERFORM audit_write(
    'fx_revaluation_posted',
    'journal_entry',
    v_je_id,
    p_company_id,
    jsonb_build_object(
      'account_id', p_account_id,
      'closing_rate', p_closing_rate,
      'foreign_balance', v_cur_foreign_balance,
      'previous_base_balance', v_cur_base_balance,
      'new_base_balance', v_target_base_balance,
      'difference', v_diff,
      'journal_entry_id', v_je_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'foreign_balance', v_cur_foreign_balance,
    'previous_base_balance', v_cur_base_balance,
    'new_base_balance', v_target_base_balance,
    'difference', v_diff
  );
END;
$function$;

-- 6. fn_close_fiscal_year
CREATE OR REPLACE FUNCTION public.fn_close_fiscal_year(
  p_fiscal_year_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fy RECORD;
  v_company_id uuid;
  v_branch_id uuid;
  v_base_currency text;
  v_retained_earnings_account RECORD;
  v_je_id uuid;
  v_rev_cur RECORD;
  v_exp_cur RECORD;
  v_total_rev numeric := 0;
  v_total_exp numeric := 0;
  v_net_income numeric := 0;
  v_line_count int := 0;
  v_next_fy_id uuid;
  v_next_year_name text;
  v_next_start_date date;
  v_next_end_date date;
  v_current_user_id uuid;
BEGIN
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fiscal_year_not_found: السنة المالية غير موجودة';
  END IF;

  v_company_id := v_fy.company_id;
  PERFORM public.fn_assert_company_access(v_company_id);

  IF v_fy.is_closed THEN
    RAISE EXCEPTION 'fiscal_year_already_closed: هذه السنة المالية مقفلة مسبقاً في تاريخ %', v_fy.closed_at;
  END IF;

  SELECT base_currency INTO v_base_currency FROM companies WHERE id = v_company_id;
  v_base_currency := COALESCE(v_base_currency, 'SAR');

  SELECT * INTO v_retained_earnings_account 
  FROM accounts 
  WHERE company_id = v_company_id AND code = '3200' AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'retained_earnings_account_missing: لم يتم العثور على حساب الأرباح المبقاة (3200)';
  END IF;

  SELECT id INTO v_branch_id FROM branches WHERE company_id = v_company_id AND is_main = true LIMIT 1;
  v_current_user_id := COALESCE(p_created_by, auth.uid());

  INSERT INTO journal_entries (
    company_id, branch_id, fiscal_year_id, entry_date, description,
    reference_type, reference_id, status, created_by
  )
  VALUES (
    v_company_id, v_branch_id, v_fy.id, v_fy.end_date,
    'قيد إقفال السنة المالية ' || v_fy.name || ' وترحيل الأرباح والخسائر',
    'fiscal_year_closing', v_fy.id, 'draft', v_current_user_id
  )
  RETURNING id INTO v_je_id;

  -- Close Revenues (excluding previous fiscal_year_closing)
  FOR v_rev_cur IN
    SELECT 
      jel.account_id,
      a.code,
      a.name_ar,
      SUM(jel.credit_amount - jel.debit_amount) AS net_credit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = v_company_id
      AND (je.fiscal_year_id = v_fy.id OR (je.entry_date BETWEEN v_fy.start_date AND v_fy.end_date))
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND a.type = 'revenue'
      AND je.id != v_je_id
      AND COALESCE(je.reference_type, '') != 'fiscal_year_closing'
    GROUP BY jel.account_id, a.code, a.name_ar
    HAVING SUM(jel.credit_amount - jel.debit_amount) != 0
  LOOP
    v_total_rev := v_total_rev + v_rev_cur.net_credit;
    v_line_count := v_line_count + 1;
    
    IF v_rev_cur.net_credit > 0 THEN
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_rev_cur.account_id, v_branch_id, v_company_id,
        v_rev_cur.net_credit, 0,
        'إقفال إيراد: ' || v_rev_cur.name_ar, v_base_currency, 1, 0
      );
    ELSE
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_rev_cur.account_id, v_branch_id, v_company_id,
        0, ABS(v_rev_cur.net_credit),
        'إقفال إيراد مدين: ' || v_rev_cur.name_ar, v_base_currency, 1, 0
      );
    END IF;
  END LOOP;

  -- Close Expenses (excluding previous fiscal_year_closing)
  FOR v_exp_cur IN
    SELECT 
      jel.account_id,
      a.code,
      a.name_ar,
      SUM(jel.debit_amount - jel.credit_amount) AS net_debit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = v_company_id
      AND (je.fiscal_year_id = v_fy.id OR (je.entry_date BETWEEN v_fy.start_date AND v_fy.end_date))
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND a.type = 'expense'
      AND je.id != v_je_id
      AND COALESCE(je.reference_type, '') != 'fiscal_year_closing'
    GROUP BY jel.account_id, a.code, a.name_ar
    HAVING SUM(jel.debit_amount - jel.credit_amount) != 0
  LOOP
    v_total_exp := v_total_exp + v_exp_cur.net_debit;
    v_line_count := v_line_count + 1;

    IF v_exp_cur.net_debit > 0 THEN
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_exp_cur.account_id, v_branch_id, v_company_id,
        0, v_exp_cur.net_debit,
        'إقفال مصروف: ' || v_exp_cur.name_ar, v_base_currency, 1, 0
      );
    ELSE
      INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, branch_id, company_id,
        debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
      )
      VALUES (
        v_je_id, v_exp_cur.account_id, v_branch_id, v_company_id,
        ABS(v_exp_cur.net_debit), 0,
        'إقفال مصروف دائن: ' || v_exp_cur.name_ar, v_base_currency, 1, 0
      );
    END IF;
  END LOOP;

  v_net_income := v_total_rev - v_total_exp;

  IF v_net_income > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, branch_id, company_id,
      debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
    )
    VALUES (
      v_je_id, v_retained_earnings_account.id, v_branch_id, v_company_id,
      0, v_net_income,
      'ترحيل صافي أرباح السنة المالية ' || v_fy.name, v_base_currency, 1, 0
    );
    v_line_count := v_line_count + 1;
  ELSIF v_net_income < 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, branch_id, company_id,
      debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount
    )
    VALUES (
      v_je_id, v_retained_earnings_account.id, v_branch_id, v_company_id,
      ABS(v_net_income), 0,
      'ترحيل صافي خسائر السنة المالية ' || v_fy.name, v_base_currency, 1, 0
    );
    v_line_count := v_line_count + 1;
  END IF;

  IF v_line_count > 0 THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  ELSE
    DELETE FROM journal_entries WHERE id = v_je_id;
    v_je_id := NULL;
  END IF;

  -- Close fiscal year
  UPDATE fiscal_years 
  SET is_closed = true, closed_at = NOW(), updated_at = NOW() 
  WHERE id = v_fy.id;

  -- Create next fiscal year
  v_next_start_date := v_fy.end_date + INTERVAL '1 day';
  v_next_end_date := v_next_start_date + INTERVAL '1 year' - INTERVAL '1 day';
  v_next_year_name := 'السنة المالية ' || TO_CHAR(v_next_start_date, 'YYYY');

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years 
    WHERE company_id = v_company_id AND start_date = v_next_start_date
  ) THEN
    INSERT INTO fiscal_years (
      company_id, name, start_date, end_date, is_closed
    )
    VALUES (
      v_company_id, v_next_year_name, v_next_start_date, v_next_end_date, false
    )
    RETURNING id INTO v_next_fy_id;
  ELSE
    SELECT id INTO v_next_fy_id FROM fiscal_years 
    WHERE company_id = v_company_id AND start_date = v_next_start_date LIMIT 1;
  END IF;

  PERFORM audit_write(
    'fiscal_year_closed',
    'fiscal_year',
    v_fy.id,
    v_company_id,
    jsonb_build_object(
      'fiscal_year_id', v_fy.id,
      'closing_journal_entry_id', v_je_id,
      'total_revenues', v_total_rev,
      'total_expenses', v_total_exp,
      'net_income', v_net_income,
      'next_fiscal_year_id', v_next_fy_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'fiscal_year_id', v_fy.id,
    'closing_journal_id', v_je_id,
    'total_revenues', v_total_rev,
    'total_expenses', v_total_exp,
    'net_income', v_net_income,
    'next_fiscal_year_id', v_next_fy_id
  );
END;
$function$;

-- 7. fn_get_vat_return_report
CREATE OR REPLACE FUNCTION public.fn_get_vat_return_report(
  p_company_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_standard_sales numeric := 0;
  v_standard_sales_vat numeric := 0;
  v_standard_purchases numeric := 0;
  v_standard_purchases_vat numeric := 0;
  v_output_vat_ledger numeric := 0;
  v_input_vat_ledger numeric := 0;
  v_net_vat numeric := 0;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Sales (Output VAT): Sales minus Sale Returns, including posted and paid
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'sale' THEN subtotal ELSE -subtotal END), 0),
    COALESCE(SUM(CASE WHEN type = 'sale' THEN tax_amount ELSE -tax_amount END), 0)
  INTO v_standard_sales, v_standard_sales_vat
  FROM invoices
  WHERE company_id = p_company_id
    AND type IN ('sale', 'sale_return')
    AND status IN ('posted', 'paid')
    AND deleted_at IS NULL
    AND issue_date BETWEEN p_start_date AND p_end_date;

  -- Purchases (Input VAT): Purchases minus Purchase Returns, including posted and paid
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN subtotal ELSE -subtotal END), 0),
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN tax_amount ELSE -tax_amount END), 0)
  INTO v_standard_purchases, v_standard_purchases_vat
  FROM invoices
  WHERE company_id = p_company_id
    AND type IN ('purchase', 'purchase_return')
    AND status IN ('posted', 'paid')
    AND deleted_at IS NULL
    AND issue_date BETWEEN p_start_date AND p_end_date;

  -- Ledger checks on VAT Account 2200
  SELECT 
    COALESCE(SUM(credit_amount), 0),
    COALESCE(SUM(debit_amount), 0)
  INTO v_output_vat_ledger, v_input_vat_ledger
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  JOIN accounts a ON a.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND a.code = '2200'
    AND je.status = 'posted'
    AND je.deleted_at IS NULL
    AND je.entry_date BETWEEN p_start_date AND p_end_date;

  v_net_vat := v_standard_sales_vat - v_standard_purchases_vat;

  RETURN jsonb_build_object(
    'success', true,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'sales', jsonb_build_object(
      'taxable_amount', v_standard_sales,
      'tax_amount', v_standard_sales_vat
    ),
    'purchases', jsonb_build_object(
      'taxable_amount', v_standard_purchases,
      'tax_amount', v_standard_purchases_vat
    ),
    'net_vat_payable', v_net_vat,
    'vat_account_summary', jsonb_build_object(
      'total_credits', v_output_vat_ledger,
      'total_debits', v_input_vat_ledger,
      'net_balance', (v_output_vat_ledger - v_input_vat_ledger)
    )
  );
END;
$function$;

-- Privileges
GRANT EXECUTE ON FUNCTION public.fn_post_asset_depreciation(uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_run_all_assets_depreciation(uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_revalue_foreign_currency(uuid, uuid, numeric, text, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_close_fiscal_year(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_vat_return_report(uuid, date, date) TO authenticated, service_role;
