-- ============================================================
-- Migration: Debt Module - Core Tables & View
-- Date: 2026-08-10
-- ============================================================

-- 1. Multi-Currency Party Balances VIEW
DROP VIEW IF EXISTS public.party_balances_by_currency CASCADE;

CREATE OR REPLACE VIEW public.party_balances_by_currency AS
SELECT
    jel.party_id,
    jel.company_id,
    jel.currency_code,
    SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) AS balance,
    COUNT(DISTINCT jel.journal_entry_id) AS transaction_count,
    MAX(je.entry_date) AS last_activity_date
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.deleted_at IS NULL
    AND je.status = 'posted'
WHERE jel.deleted_at IS NULL
  AND jel.party_id IS NOT NULL
  AND jel.currency_code IS NOT NULL
GROUP BY jel.party_id, jel.company_id, jel.currency_code;

COMMENT ON VIEW public.party_balances_by_currency IS 
'Multi-currency party balances from posted journal entries.';

-- 2. Party Opening Balances
CREATE TABLE IF NOT EXISTS public.party_opening_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    currency_code VARCHAR(3) NOT NULL REFERENCES public.supported_currencies(code) ON DELETE RESTRICT,
    amount DECIMAL(18,4) NOT NULL CHECK (amount >= 0),
    direction VARCHAR(10) NOT NULL DEFAULT 'debit' CHECK (direction IN ('debit', 'credit')),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_party_opening_balance UNIQUE (company_id, party_id, currency_code)
);

COMMENT ON TABLE public.party_opening_balances IS 'Opening balances per party per currency.';

CREATE INDEX IF NOT EXISTS idx_opening_balances_party ON public.party_opening_balances(party_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_company ON public.party_opening_balances(company_id);
