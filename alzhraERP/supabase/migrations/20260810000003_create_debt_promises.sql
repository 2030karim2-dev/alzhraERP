-- ============================================================
-- Migration: Debt Module - Payment Promises & Follow-up
-- Date: 2026-08-10
-- ============================================================

-- 1. Payment Promises
CREATE TABLE IF NOT EXISTS public.debt_payment_promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    amount DECIMAL(18,4) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL REFERENCES public.supported_currencies(code) ON DELETE RESTRICT,
    promise_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'broken', 'cancelled')),
    reference_type VARCHAR(20) CHECK (reference_type IN ('invoice', 'opening_balance', 'manual')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.debt_payment_promises IS 'Customer payment promises with status tracking.';

CREATE INDEX IF NOT EXISTS idx_promises_party ON public.debt_payment_promises(party_id);
CREATE INDEX IF NOT EXISTS idx_promises_company ON public.debt_payment_promises(company_id);
CREATE INDEX IF NOT EXISTS idx_promises_status ON public.debt_payment_promises(status);
CREATE INDEX IF NOT EXISTS idx_promises_date ON public.debt_payment_promises(promise_date);

-- 2. Follow-up Configuration (per company)
CREATE TABLE IF NOT EXISTS public.debt_followup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE RESTRICT,
    due_soon_days INT NOT NULL DEFAULT 7 CHECK (due_soon_days >= 1 AND due_soon_days <= 90),
    overdue_critical_days INT NOT NULL DEFAULT 30 CHECK (overdue_critical_days >= 1 AND overdue_critical_days <= 365),
    auto_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    reminder_channels TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.debt_followup_config IS 'Per-company follow-up engine configuration.';
