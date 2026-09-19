-- ============================================================
-- Migration: 20260919000004_remediate_currency_inversions_and_guards.sql
-- Description:
-- 1. Correct isolated currency inversion anomalies:
--    - مبيع:64254 (130,000 YER mistakenly marked as SAR, GL inflated to 130k SAR)
--    - شراء:18948 (80,980.66 YER mistakenly marked as SAR, GL inflated to 80.9k SAR)
--    - مردود مبيع:66 (19,000 YER marked with exchange_rate = 1.0, GL inflated to 19k SAR)
--    - REC-WAIL-7 (1,895.64 YER payment marked with exchange_rate = 1.0)
-- 2. Correct 40,534 imported sales invoices whose line items are in SAR
--    but were tagged as YER with exchange_rate = 410, restoring their true SAR value in GL.
-- 3. Install database guard trigger to reject YER transactions with exchange_rate = 1.0.
-- ============================================================

-- Disable heavy & immutability triggers on invoices
ALTER TABLE public.invoices DISABLE TRIGGER trg_guard_posted_invoice_immutability;
ALTER TABLE public.invoices DISABLE TRIGGER trg_auto_post_invoice_journal;
ALTER TABLE public.invoices DISABLE TRIGGER trg_audit_invoices;
ALTER TABLE public.invoices DISABLE TRIGGER trg_guard_invoice_day_lock;
ALTER TABLE public.invoices DISABLE TRIGGER trg_sync_party_stats_invoice;
ALTER TABLE public.invoices DISABLE TRIGGER on_invoice_change;

-- Disable immutability and balance check triggers on journal_entry_lines
ALTER TABLE public.journal_entry_lines DISABLE TRIGGER trg_journal_entry_lines_immutability;
ALTER TABLE public.journal_entry_lines DISABLE TRIGGER ensure_journal_balance;

-- ------------------------------------------------------------
-- Part 1: Correct isolated critical invoices & returns
-- ------------------------------------------------------------

-- 1.1 Invoice مبيع:64254
UPDATE public.invoices
SET currency_code = 'YER', exchange_rate = 410.000000, updated_at = now()
WHERE id = 'c6184fb3-0dfd-4a54-b48a-1592dd498817';

UPDATE public.journal_entry_lines
SET debit_amount = round(130000.0 / 410.0, 4),
    foreign_amount = 130000.0,
    currency_code = 'YER',
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id = '4cfbd16a-caa6-434e-8f99-0219c1773057'
  AND debit_amount = 130000.0;

UPDATE public.journal_entry_lines
SET credit_amount = round(130000.0 / 410.0, 4),
    foreign_amount = 130000.0,
    currency_code = 'YER',
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id = '4cfbd16a-caa6-434e-8f99-0219c1773057'
  AND credit_amount = 130000.0;

-- 1.2 Purchase Invoice شراء:18948
UPDATE public.invoices
SET currency_code = 'YER', exchange_rate = 410.000000, updated_at = now()
WHERE id = '6d9d0820-fa37-4bc7-b0b0-7640bc2451da';

UPDATE public.journal_entry_lines
SET debit_amount = round(80980.66 / 410.0, 4),
    foreign_amount = 80980.66,
    currency_code = 'YER',
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id = '40bef426-6aef-457c-adc4-ef97520edf64'
  AND debit_amount = 80980.66;

UPDATE public.journal_entry_lines
SET credit_amount = round(80980.66 / 410.0, 4),
    foreign_amount = 80980.66,
    currency_code = 'YER',
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id = '40bef426-6aef-457c-adc4-ef97520edf64'
  AND credit_amount = 80980.66;

-- 1.3 Return Invoice مردود مبيع:66
UPDATE public.invoices
SET exchange_rate = 410.000000, updated_at = now()
WHERE id = '1cfcb4e3-23ad-4f79-bebd-d98191e72b66';

UPDATE public.journal_entry_lines
SET debit_amount = round(19000.0 / 410.0, 4),
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id = 'c4fac84b-61ea-4251-892a-3e1d4ba1471b'
  AND debit_amount = 19000.0;

UPDATE public.journal_entry_lines
SET credit_amount = round(19000.0 / 410.0, 4),
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id = 'c4fac84b-61ea-4251-892a-3e1d4ba1471b'
  AND credit_amount = 19000.0;

-- 1.4 Payment REC-WAIL-7
UPDATE public.payments
SET exchange_rate = 410.000000, updated_at = now()
WHERE id = '6d97c312-4c56-4943-8990-a32f59101383';

UPDATE public.journal_entry_lines
SET debit_amount = round(1895.64 / 410.0, 4),
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id IN ('2f772276-af35-49e3-adc1-de08caad27ba', '8a8736de-deaf-442d-ac5c-096aa3db9dac')
  AND debit_amount = 1895.64;

UPDATE public.journal_entry_lines
SET credit_amount = round(1895.64 / 410.0, 4),
    exchange_rate = 410.000000,
    updated_at = now()
WHERE journal_entry_id IN ('2f772276-af35-49e3-adc1-de08caad27ba', '8a8736de-deaf-442d-ac5c-096aa3db9dac')
  AND credit_amount = 1895.64;

-- ------------------------------------------------------------
-- Part 2: Remediate the 40,534 imported invoices
-- ------------------------------------------------------------

-- 2.1 Set true currency to SAR on invoices
UPDATE public.invoices
SET currency_code = 'SAR',
    exchange_rate = 1.000000,
    updated_at = now()
WHERE company_id = '00c55672-ca4d-4616-a845-3c38fddec480'
  AND currency_code = 'YER'
  AND exchange_rate = 410
  AND id NOT IN ('c6184fb3-0dfd-4a54-b48a-1592dd498817', '6d9d0820-fa37-4bc7-b0b0-7640bc2451da');

-- 2.2 Reconcile debit lines on AR (1100) or Cash (1010) to the real SAR invoice amount
UPDATE public.journal_entry_lines jel
SET debit_amount = i.total_amount,
    foreign_amount = i.total_amount,
    currency_code = 'SAR',
    exchange_rate = 1.000000,
    updated_at = now()
FROM public.journal_entries je
JOIN public.invoices i ON i.id = je.reference_id,
     public.accounts a
WHERE jel.journal_entry_id = je.id
  AND a.id = jel.account_id
  AND je.company_id = '00c55672-ca4d-4616-a845-3c38fddec480'
  AND i.currency_code = 'SAR'
  AND i.exchange_rate = 1.000000
  AND je.reference_type = 'sales_invoice'
  AND jel.debit_amount > 0
  AND (a.code LIKE '1100%' OR a.code LIKE '101%')
  AND abs(jel.debit_amount - i.total_amount) > 0.05;

-- 2.3 Reconcile credit lines on Sales Revenue (4100) to the real SAR invoice amount
UPDATE public.journal_entry_lines jel
SET credit_amount = i.total_amount,
    foreign_amount = i.total_amount,
    currency_code = 'SAR',
    exchange_rate = 1.000000,
    updated_at = now()
FROM public.journal_entries je
JOIN public.invoices i ON i.id = je.reference_id,
     public.accounts a
WHERE jel.journal_entry_id = je.id
  AND a.id = jel.account_id
  AND je.company_id = '00c55672-ca4d-4616-a845-3c38fddec480'
  AND i.currency_code = 'SAR'
  AND i.exchange_rate = 1.000000
  AND je.reference_type = 'sales_invoice'
  AND jel.credit_amount > 0
  AND a.code LIKE '4100%'
  AND abs(jel.credit_amount - i.total_amount) > 0.05;

-- Re-enable triggers on journal_entry_lines and invoices
ALTER TABLE public.journal_entry_lines ENABLE TRIGGER trg_journal_entry_lines_immutability;
ALTER TABLE public.journal_entry_lines ENABLE TRIGGER ensure_journal_balance;

ALTER TABLE public.invoices ENABLE TRIGGER trg_guard_posted_invoice_immutability;
ALTER TABLE public.invoices ENABLE TRIGGER trg_auto_post_invoice_journal;
ALTER TABLE public.invoices ENABLE TRIGGER trg_audit_invoices;
ALTER TABLE public.invoices ENABLE TRIGGER trg_guard_invoice_day_lock;
ALTER TABLE public.invoices ENABLE TRIGGER trg_sync_party_stats_invoice;
ALTER TABLE public.invoices ENABLE TRIGGER on_invoice_change;

-- ------------------------------------------------------------
-- Part 3: Hardening Trigger Guard (Prevent Future Inversions)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_guard_currency_inversion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. Prevent YER with exchange_rate = 1.0 (deadly 410x inflation)
  IF NEW.currency_code = 'YER' AND COALESCE(NEW.exchange_rate, 1.0) = 1.0 THEN
    RAISE EXCEPTION 'invalid_currency_rate: لا يمكن تسجيل عملية بالريال اليمني بسعر صرف 1.0 مقابل العملة الأساسية (الريال السعودي). يجب تحديد سعر صرف حقيقي (مثل 410 أو ما يعادله).';
  END IF;

  RETURN NEW;
END;
$$;

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
