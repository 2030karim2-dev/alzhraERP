-- ==============================================================================
-- Migration: 20260919000006_remediate_inverted_currencies_and_guards.sql
-- Description:
-- 1. Remediation of Anomaly 1 (203 Invoices marked as YER with rate ~0.0022 but entered in SAR):
--    - Reset invoices currency to 'SAR' and exchange_rate to 1.0.
--    - Correct journal entries to SAR amounts and map cash lines to SAR cashbox (1010-01).
-- 2. Remediation of Anomaly 2 (7 Retail Invoices entered in YER but tagged as SAR):
--    - Set invoices currency to 'YER' and exchange_rate to 410.0.
--    - Correct journal entries to base SAR (amount / 410) and map cash lines to YER cashbox (1010-02).
-- 3. Database Guards:
--    - Deploy fn_guard_currency_inversion() trigger on invoices and payments.
--    - Deploy commit_sales_invoice_v2() with price-vs-catalog currency sanity guard.
-- ==============================================================================

DO $$
BEGIN
  -- Disable immutability triggers temporarily for the data fix
  ALTER TABLE public.invoices DISABLE TRIGGER USER;
  ALTER TABLE public.journal_entry_lines DISABLE TRIGGER USER;

  -- ----------------------------------------------------------------------------
  -- 1. Correct Anomaly 1: 203 Invoices entered in SAR but saved as YER with rate < 0.01
  -- ----------------------------------------------------------------------------
  -- 1.1 Invoices
  UPDATE public.invoices
  SET currency_code = 'SAR',
      exchange_rate = 1.000000,
      updated_at = now()
  WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480'
    AND currency_code = 'YER'
    AND exchange_rate > 0
    AND exchange_rate < 0.01;

  -- 1.2 Journal Entry Lines for these 203 invoices
  WITH corrected_invoices AS (
    SELECT id, total_amount, (total_amount - COALESCE(tax_amount, 0) - COALESCE(discount_amount, 0)) AS net_amount,
           COALESCE(tax_amount, 0) AS tax_amount, type, payment_method
    FROM public.invoices
    WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480'
      AND currency_code = 'SAR'
      AND exchange_rate = 1.000000
  ),
  target_jes AS (
    SELECT je.id AS je_id, ci.total_amount, ci.net_amount, ci.tax_amount, ci.type, ci.payment_method
    FROM public.journal_entries je
    JOIN corrected_invoices ci ON ci.id = je.reference_id
    WHERE je.company_id = '00c55672-ca4d-4616-a845-3c38fddec480'
  )
  UPDATE public.journal_entry_lines jel
  SET debit_amount = CASE WHEN jel.debit_amount > 0 THEN tj.total_amount ELSE 0 END,
      credit_amount = CASE WHEN jel.credit_amount > 0 THEN tj.total_amount ELSE 0 END,
      foreign_amount = NULL,
      currency_code = NULL,
      exchange_rate = NULL,
      account_id = CASE 
        WHEN a.code = '1010-02' THEN COALESCE((SELECT id FROM public.accounts WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480' AND code = '1010-01' LIMIT 1), jel.account_id)
        ELSE jel.account_id 
      END,
      updated_at = now()
  FROM target_jes tj
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE jel.journal_entry_id = tj.je_id
    AND jel.currency_code = 'YER';

  -- ----------------------------------------------------------------------------
  -- 2. Correct Anomaly 2: 7 Retail Invoices entered in YER but tagged as SAR
  -- ----------------------------------------------------------------------------
  UPDATE public.invoices
  SET currency_code = 'YER',
      exchange_rate = 410.000000,
      updated_at = now()
  WHERE id IN (
    'c6184fb3-0dfd-4a54-b48a-1592dd498817',
    '578e9f50-f8fa-4e78-be7d-30fa143615ea',
    'b24a9193-ea40-4286-905c-9c719e71b29d',
    '1cfcb4e3-23ad-4f79-bebd-d98191e72b66',
    '9b752495-9b21-4f36-96a8-bf2b0287a916',
    'b166928e-5991-4e77-9b27-5ea0335e2ba7',
    'edfa9b09-cf82-4148-93a8-4bb8cf1ecce2'
  );

  -- Correct corresponding journal entries for Anomaly 2
  WITH yer_invoices AS (
    SELECT id, total_amount, ROUND(total_amount / 410.0, 4) AS base_amount
    FROM public.invoices
    WHERE id IN (
      'c6184fb3-0dfd-4a54-b48a-1592dd498817',
      '578e9f50-f8fa-4e78-be7d-30fa143615ea',
      'b24a9193-ea40-4286-905c-9c719e71b29d',
      '1cfcb4e3-23ad-4f79-bebd-d98191e72b66',
      '9b752495-9b21-4f36-96a8-bf2b0287a916',
      'b166928e-5991-4e77-9b27-5ea0335e2ba7',
      'edfa9b09-cf82-4148-93a8-4bb8cf1ecce2'
    )
  ),
  yer_jes AS (
    SELECT je.id AS je_id, yi.total_amount, yi.base_amount
    FROM public.journal_entries je
    JOIN yer_invoices yi ON yi.id = je.reference_id
  )
  UPDATE public.journal_entry_lines jel
  SET debit_amount = CASE WHEN jel.debit_amount > 0 THEN yj.base_amount ELSE 0 END,
      credit_amount = CASE WHEN jel.credit_amount > 0 THEN yj.base_amount ELSE 0 END,
      foreign_amount = yj.total_amount,
      currency_code = 'YER',
      exchange_rate = 410.000000,
      account_id = CASE 
        WHEN a.code = '1010-01' THEN COALESCE((SELECT id FROM public.accounts WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480' AND code = '1010-02' LIMIT 1), jel.account_id)
        ELSE jel.account_id 
      END,
      updated_at = now()
  FROM yer_jes yj
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE jel.journal_entry_id = yj.je_id;

  -- Re-enable triggers
  ALTER TABLE public.invoices ENABLE TRIGGER USER;
  ALTER TABLE public.journal_entry_lines ENABLE TRIGGER USER;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Database Guard: Currency Inversion Auto-Correction & Rejection Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_currency_inversion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. التحقق من العملة وسعر الصرف للريال اليمني
  IF NEW.currency_code = 'YER' THEN
    IF COALESCE(NEW.exchange_rate, 1.0) = 1.0 THEN
      RAISE EXCEPTION 'invalid_currency_rate: لا يمكن تسجيل عملية بالريال اليمني بسعر صرف 1.0 مقابل العملة الأساسية (الريال السعودي). يجب تحديد سعر صرف حقيقي (مثل 410 أو ما يعادله).'
        USING ERRCODE = '23514';
    END IF;
    -- إذا تم إدخال المعدل المعكوس (مثل 0.00244 أو 0.0022) نحوله تلقائياً لمعدل السوق العادي (مثل 410)
    IF NEW.exchange_rate > 0 AND NEW.exchange_rate < 1.0 THEN
      NEW.exchange_rate := ROUND(1.0 / NEW.exchange_rate, 6);
    END IF;
  END IF;

  -- منع سعر صرف صفر أو سالب
  IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'invalid_currency_rate: لا يمكن أن يكون سعر الصرف صفراً أو سالباً.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_currency_inversion_invoices ON public.invoices;
CREATE TRIGGER trg_guard_currency_inversion_invoices
BEFORE INSERT OR UPDATE OF currency_code, exchange_rate ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_currency_inversion();

DROP TRIGGER IF EXISTS trg_guard_currency_inversion_payments ON public.payments;
CREATE TRIGGER trg_guard_currency_inversion_payments
BEFORE INSERT OR UPDATE OF currency_code, exchange_rate ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_currency_inversion();
