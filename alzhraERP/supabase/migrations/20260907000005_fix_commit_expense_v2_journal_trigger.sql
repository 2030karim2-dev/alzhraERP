-- Migration: Fix commit_expense_v2 journal entry draft status before adding lines
-- Description: Inserts journal entry as 'draft' first to satisfy prevent_posted_journal_line_modification trigger,
--              then updates status to 'posted' once lines are safely attached.

CREATE OR REPLACE FUNCTION public.commit_expense_v2(p_company_id uuid, p_user_id uuid, p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expense_id uuid;
  v_voucher_number text;
  v_category_id uuid;
  v_amount numeric;
  v_currency_code text;
  v_exchange_rate numeric;
  v_date date;
  v_description text;
  v_payment_method text;
  v_branch_id uuid;
  v_fiscal_year_id uuid;
  v_cash_account_id uuid;
  v_expense_account_id uuid;
  v_entry_id uuid;
  v_raw_cat text;
  v_raw_branch text;
  v_raw_amount text;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id_required: معرف المنشأة مطلوب';
  END IF;

  -- 1) Sanitize Category UUID
  v_raw_cat := TRIM(COALESCE(p_data->>'category_id', ''));
  IF v_raw_cat <> '' AND v_raw_cat ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_category_id := v_raw_cat::uuid;
  ELSE
    v_category_id := NULL;
  END IF;

  -- Verify category exists for this company, else find or create default
  IF v_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.expense_categories
      WHERE id = v_category_id AND company_id = p_company_id AND deleted_at IS NULL
    ) THEN
      v_category_id := NULL;
    END IF;
  END IF;

  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id FROM public.expense_categories
    WHERE company_id = p_company_id AND deleted_at IS NULL
    ORDER BY is_system DESC, created_at ASC
    LIMIT 1;

    IF v_category_id IS NULL THEN
      INSERT INTO public.expense_categories (company_id, name, is_system)
      VALUES (p_company_id, 'مصروفات عامة', true)
      RETURNING id INTO v_category_id;
    END IF;
  END IF;

  -- 2) Sanitize Amount
  v_raw_amount := REPLACE(REPLACE(COALESCE(p_data->>'amount', '0'), ',', '.'), ' ', '');
  v_amount := COALESCE(v_raw_amount::numeric, 0);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: مبلغ المصروف يجب أن يكون أكبر من الصفر';
  END IF;

  v_currency_code := COALESCE(NULLIF(p_data->>'currency_code', ''), NULLIF(p_data->>'currency', ''), 'SAR');
  v_exchange_rate := COALESCE(NULLIF(p_data->>'exchange_rate', '')::numeric, 1);
  IF v_exchange_rate <= 0 THEN v_exchange_rate := 1; END IF;

  -- 3) Sanitize Date
  BEGIN
    v_date := COALESCE(
      NULLIF(p_data->>'expense_date', '')::date,
      NULLIF(p_data->>'date', '')::date,
      CURRENT_DATE
    );
  EXCEPTION WHEN OTHERS THEN
    v_date := CURRENT_DATE;
  END;

  v_description := COALESCE(NULLIF(TRIM(p_data->>'description'), ''), 'مصروف نثري');
  v_payment_method := COALESCE(NULLIF(p_data->>'payment_method', ''), 'cash');

  -- 4) Sanitize Branch UUID
  v_raw_branch := TRIM(COALESCE(p_data->>'branch_id', ''));
  IF v_raw_branch <> '' AND v_raw_branch ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_branch_id := v_raw_branch::uuid;
  ELSE
    v_branch_id := NULL;
  END IF;

  -- 5) Fiscal Year
  SELECT id INTO v_fiscal_year_id FROM public.fiscal_years
  WHERE company_id = p_company_id AND is_closed = false
    AND v_date BETWEEN start_date AND end_date
  LIMIT 1;

  -- 6) Voucher Number
  v_voucher_number := TRIM(COALESCE(p_data->>'voucher_number', ''));
  IF v_voucher_number = '' THEN
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_voucher_number
    FROM public.journal_entries WHERE company_id = p_company_id;
    v_voucher_number := 'EXP-' || v_voucher_number;
  END IF;

  -- 7) Insert Expense
  INSERT INTO public.expenses (
    company_id, category_id, voucher_number, description,
    amount, currency_code, exchange_rate, expense_date,
    status, payment_method, created_by, branch_id
  ) VALUES (
    p_company_id, v_category_id, v_voucher_number, v_description,
    v_amount, v_currency_code, v_exchange_rate, v_date,
    'posted', v_payment_method, p_user_id, v_branch_id
  ) RETURNING id INTO v_expense_id;

  -- 8) Resolve Postable Expense Account
  SELECT a.id INTO v_expense_account_id
  FROM public.expense_categories ec
  JOIN public.accounts a ON a.id = ec.account_id
  WHERE ec.id = v_category_id
    AND a.company_id = p_company_id
    AND a.allow_posting = true
    AND a.is_active = true
    AND a.deleted_at IS NULL;

  IF v_expense_account_id IS NULL THEN
    SELECT id INTO v_expense_account_id FROM public.accounts
    WHERE company_id = p_company_id
      AND (type = 'expense' OR code LIKE '5%')
      AND allow_posting = true
      AND is_active = true
      AND deleted_at IS NULL
    ORDER BY CASE WHEN code LIKE '5%' THEN 0 ELSE 1 END, code
    LIMIT 1;
  END IF;

  -- 9) Resolve Postable Cash / Asset Account
  SELECT id INTO v_cash_account_id FROM public.accounts
  WHERE company_id = p_company_id
    AND (code LIKE '101%' OR code LIKE '1101%' OR (type = 'asset' AND (name_ar LIKE '%صندوق%' OR name_ar LIKE '%نقد%' OR name_ar LIKE '%كاش%')))
    AND allow_posting = true
    AND is_active = true
    AND deleted_at IS NULL
  ORDER BY CASE WHEN currency_code = v_currency_code THEN 0 ELSE 1 END, code
  LIMIT 1;

  IF v_cash_account_id IS NULL THEN
    SELECT id INTO v_cash_account_id FROM public.accounts
    WHERE company_id = p_company_id
      AND type = 'asset'
      AND allow_posting = true
      AND is_active = true
      AND deleted_at IS NULL
    ORDER BY code
    LIMIT 1;
  END IF;

  -- 10) Create Journal Entry (inserted as 'draft' first so lines can be added without violating prevent_posted_journal_line_modification)
  IF v_cash_account_id IS NOT NULL AND v_expense_account_id IS NOT NULL THEN
    INSERT INTO public.journal_entries (
      company_id, entry_date, description,
      reference_type, reference_id, status, created_by, branch_id, fiscal_year_id
    ) VALUES (
      p_company_id,
      v_date, v_description,
      'expense', v_expense_id, 'draft', p_user_id, v_branch_id, v_fiscal_year_id
    ) RETURNING id INTO v_entry_id;

    -- Debit: Expense
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount,
      description, currency_code, company_id, branch_id
    ) VALUES (
      v_entry_id, v_expense_account_id, v_amount, 0,
      v_description, v_currency_code, p_company_id, v_branch_id
    );

    -- Credit: Cash
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount,
      description, currency_code, company_id, branch_id
    ) VALUES (
      v_entry_id, v_cash_account_id, 0, v_amount,
      v_description, v_currency_code, p_company_id, v_branch_id
    );

    -- Finalize Journal Entry to 'posted'
    UPDATE public.journal_entries
    SET status = 'posted'
    WHERE id = v_entry_id;
  END IF;

  -- 11) Audit Write
  BEGIN
    PERFORM public.audit_write(
      'expense_committed', 'expenses',
      v_expense_id,
      p_company_id,
      jsonb_build_object('amount', v_amount, 'voucher_number', v_voucher_number)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'id', v_expense_id,
    'voucher_number', v_voucher_number,
    'amount', v_amount,
    'status', 'posted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_expense_v2(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_expense_v2(uuid, uuid, jsonb) TO service_role;
