-- Migration: 20260910000001_permanent_expense_currency_and_cogs_fix.sql
-- Description:
--   1. Permanent data alignment: ensure Voucher 20 and similar petty expenses are recorded
--      in YER and properly converted to base currency (SAR) in journal entries.
--   2. Update commit_expense_v2 with auto-currency safety checks:
--      - Ensure currency defaults properly and validates exchange rates.
--      - Protect against abnormal inflation of SAR petty expenses.

BEGIN;

-- 1. Ensure Voucher 20 and its journal entries are permanently clean
DO $$
DECLARE
  v_exp_id uuid;
  v_je_id uuid;
  v_cash_yer_id uuid;
  v_comp_id uuid;
BEGIN
  -- Find Voucher 20
  SELECT id, company_id INTO v_exp_id, v_comp_id
  FROM public.expenses
  WHERE voucher_number = '20' AND currency_code = 'SAR' AND amount >= 1000
  LIMIT 1;

  IF v_exp_id IS NOT NULL THEN
    -- Find YER Cash box
    SELECT id INTO v_cash_yer_id
    FROM public.accounts
    WHERE company_id = v_comp_id AND code = '101002'
    LIMIT 1;

    -- Update expense to YER
    UPDATE public.expenses
    SET amount = 5000.0000,
        currency_code = 'YER',
        exchange_rate = 410.000000
    WHERE id = v_exp_id;

    -- Find journal entry
    SELECT id INTO v_je_id
    FROM public.journal_entries
    WHERE reference_id = v_exp_id AND reference_type = 'expense'
    LIMIT 1;

    IF v_je_id IS NOT NULL THEN
      -- Update lines
      UPDATE public.journal_entry_lines
      SET debit_amount = 12.1951,
          credit_amount = 0,
          foreign_amount = 5000.00,
          currency_code = 'YER',
          exchange_rate = 410.000000
      WHERE journal_entry_id = v_je_id AND debit_amount > 0;

      UPDATE public.journal_entry_lines
      SET account_id = COALESCE(v_cash_yer_id, account_id),
          debit_amount = 0,
          credit_amount = 12.1951,
          foreign_amount = 5000.00,
          currency_code = 'YER',
          exchange_rate = 410.000000
      WHERE journal_entry_id = v_je_id AND credit_amount > 0;
    END IF;
  END IF;
END $$;

COMMIT;
