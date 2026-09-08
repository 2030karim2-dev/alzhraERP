-- ============================================================
-- Migration: 20260908000001_fix_reversals_and_storno_accounting.sql
-- Description:
--   1. Fix fn_reverse_journal_entries to preserve branch_id and fiscal_year_id on reversal journals and lines.
--   2. Fix void_expense to execute audit_write BEFORE return and fix variable scoping (v_expense.company_id).
--   3. Enhance void_bond to emit granular reversal reference types ('receipt_bond_void', 'payment_bond_void', 'transfer_bond_void').
--   4. Enhance get_account_ledger to return je.reference_type and je.reference_id so the UI and reporting can implement Storno netting.
-- ============================================================

-- 1. fn_reverse_journal_entries
CREATE OR REPLACE FUNCTION public.fn_reverse_journal_entries(
  p_source_reference_id uuid,
  p_source_reference_types text[],
  p_new_reference_type text,
  p_description_prefix text,
  p_created_by uuid,
  p_company_id uuid
)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_je RECORD;
  v_new_je_id uuid;
  v_line RECORD;
  v_result uuid[] := '{}';
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  FOR v_je IN
    SELECT id, description, branch_id, fiscal_year_id FROM journal_entries
    WHERE reference_id = p_source_reference_id
      AND reference_type = ANY(p_source_reference_types)
      AND status = 'posted' AND deleted_at IS NULL
      AND company_id = p_company_id
    ORDER BY created_at ASC
  LOOP
    INSERT INTO journal_entries(
      company_id, branch_id, fiscal_year_id, entry_date, description,
      reference_type, reference_id, status, created_by
    )
    VALUES (
      p_company_id, v_je.branch_id, v_je.fiscal_year_id, CURRENT_DATE,
      p_description_prefix || COALESCE(v_je.description, ''),
      p_new_reference_type, p_source_reference_id, 'draft', p_created_by
    )
    RETURNING id INTO v_new_je_id;

    FOR v_line IN 
      SELECT * FROM journal_entry_lines 
      WHERE journal_entry_id = v_je.id AND deleted_at IS NULL 
    LOOP
      INSERT INTO journal_entry_lines(
        journal_entry_id, account_id, party_id, branch_id,
        debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      )
      VALUES (
        v_new_je_id, v_line.account_id, v_line.party_id, v_line.branch_id,
        v_line.credit_amount, v_line.debit_amount,
        'عكس: ' || COALESCE(v_line.description, ''), v_line.currency_code, v_line.exchange_rate,
        v_line.foreign_amount, p_company_id
      );
    END LOOP;

    UPDATE journal_entries SET status = 'posted' WHERE id = v_new_je_id;

    v_result := v_result || v_new_je_id;
  END LOOP;

  RETURN v_result;
END;
$function$;

-- 2. void_expense
CREATE OR REPLACE FUNCTION public.void_expense(p_expense_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense RECORD;
  v_new_jes uuid[];
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Expense not found: %', p_expense_id; 
  END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_expense.company_id
  ) THEN 
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لهذه الشركة'; 
  END IF;

  IF v_expense.status = 'void' THEN 
    RAISE EXCEPTION 'Expense is already voided'; 
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = v_expense.company_id AND CURRENT_DATE BETWEEN start_date AND end_date AND is_closed = false
  ) THEN 
    RAISE EXCEPTION 'لا يمكن إلغاء مصروف في سنة مالية مغلقة'; 
  END IF;

  -- 1) Create balanced reversal journal entry if posted
  v_new_jes := public.fn_reverse_journal_entries(
    p_expense_id, ARRAY['expense'], 'expense_void', 'عكس مصروف: ' || COALESCE(v_expense.description, '') || ' - ',
    auth.uid(), v_expense.company_id
  );

  -- 2) Void the expense
  UPDATE expenses SET status = 'void', updated_at = now() WHERE id = p_expense_id;

  -- 3) Audit write BEFORE return
  BEGIN
    PERFORM public.audit_write(
      'expense_voided', 'expenses', p_expense_id, v_expense.company_id,
      jsonb_build_object(
        'amount', v_expense.amount,
        'voucher_number', v_expense.voucher_number,
        'description', v_expense.description,
        'reversal_journal_ids', v_new_jes
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true, 
    'expense_id', p_expense_id, 
    'reversal_journal_ids', v_new_jes
  );
END;
$function$;

-- 3. void_bond
CREATE OR REPLACE FUNCTION public.void_bond(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  v_new_jes uuid[];
  v_void_ref_type text;
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

  -- Determine distinct reversal reference type for granular reporting & Storno netting
  v_void_ref_type := CASE 
    WHEN v_payment.type = 'receipt' THEN 'receipt_bond_void'
    WHEN v_payment.type = 'transfer' THEN 'transfer_bond_void'
    ELSE 'payment_bond_void'
  END;

  -- Create balanced reversal journal
  v_new_jes := public.fn_reverse_journal_entries(
    p_payment_id,
    ARRAY['receipt_bond', 'payment_bond', 'transfer_bond', 'payment'],
    v_void_ref_type,
    'عكس سند: ' || COALESCE(v_payment.payment_number, '') || ' - ',
    auth.uid(),
    v_payment.company_id
  );

  -- Void the payment
  UPDATE public.payments SET status = 'void', updated_at = now() WHERE id = p_payment_id;

  -- Audit log
  BEGIN
    PERFORM public.audit_write(
      'bond_voided', 'payments', p_payment_id, v_payment.company_id,
      jsonb_build_object(
        'payment_number', v_payment.payment_number,
        'type', v_payment.type,
        'amount', v_payment.amount,
        'reversal_journal_ids', v_new_jes
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$function$;

-- 4. get_account_ledger
CREATE OR REPLACE FUNCTION public.get_account_ledger(
  p_company_id uuid,
  p_account_id uuid,
  p_from text DEFAULT NULL::text,
  p_to text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type    text;
  v_is_debit_nature boolean;
  v_opening_balance numeric := 0;
  v_entries         json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT type INTO v_account_type FROM accounts WHERE id=p_account_id AND company_id=p_company_id;
  IF v_account_type IS NULL THEN RAISE EXCEPTION 'account_not_found'; END IF;
  v_is_debit_nature := v_account_type IN ('asset','expense');

  IF p_from IS NOT NULL THEN
    WITH RECURSIVE account_tree AS (
      SELECT id FROM accounts WHERE id = p_account_id
      UNION ALL
      SELECT a.id FROM accounts a
      INNER JOIN account_tree at ON a.parent_id = at.id
    )
    SELECT COALESCE(SUM(CASE WHEN v_is_debit_nature
      THEN (COALESCE(jel.debit_amount,0)-COALESCE(jel.credit_amount,0))
      ELSE (COALESCE(jel.credit_amount,0)-COALESCE(jel.debit_amount,0)) END),0)
    INTO v_opening_balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE jel.account_id IN (SELECT id FROM account_tree) AND je.company_id=p_company_id
      AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id=p_branch_id)
      AND je.entry_date < p_from::date;
  END IF;

  WITH RECURSIVE account_tree AS (
    SELECT id FROM accounts WHERE id = p_account_id
    UNION ALL
    SELECT a.id FROM accounts a
    INNER JOIN account_tree at ON a.parent_id = at.id
  )
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.entry_number),'[]'::json)
  INTO v_entries
  FROM (
    SELECT 
      je.id AS journal_id,
      je.entry_date, 
      je.entry_number,
      je.branch_id,
      je.reference_type,
      je.reference_id,
      COALESCE(jel.description,je.description,'') AS description,
      COALESCE(jel.debit_amount,0) AS debit_amount,
      COALESCE(jel.credit_amount,0) AS credit_amount,
      COALESCE(jel.currency_code,'SAR') AS currency_code,
      COALESCE(jel.exchange_rate,1) AS exchange_rate,
      COALESCE(jel.foreign_amount,0) AS foreign_amount,
      jel.party_id,
      p.name AS party_name,
      v_opening_balance + SUM(CASE WHEN v_is_debit_nature
        THEN (COALESCE(jel.debit_amount,0)-COALESCE(jel.credit_amount,0))
        ELSE (COALESCE(jel.credit_amount,0)-COALESCE(jel.debit_amount,0)) END)
        OVER (ORDER BY je.entry_date,je.entry_number ROWS UNBOUNDED PRECEDING) AS balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id=jel.journal_entry_id
    LEFT JOIN parties p ON p.id = jel.party_id
    WHERE jel.account_id IN (SELECT id FROM account_tree) AND je.company_id=p_company_id
      AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id=p_branch_id)
      AND (p_from IS NULL OR je.entry_date>=p_from::date)
      AND (p_to   IS NULL OR je.entry_date<=p_to::date)
  ) t;

  RETURN json_build_object(
    'openingBalance',v_opening_balance,'entries',v_entries,'accountType',v_account_type);
END;
$function$;

-- 5. Privileges
REVOKE EXECUTE ON FUNCTION public.fn_reverse_journal_entries(uuid, text[], text, text, uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_reverse_journal_entries(uuid, text[], text, text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.void_expense(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_expense(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.void_bond(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_bond(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_account_ledger(uuid, uuid, text, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_ledger(uuid, uuid, text, text, uuid) TO authenticated;
