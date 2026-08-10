-- ============================================================
-- Migration: Debt Module - Messages & Outbox
-- Date: 2026-08-10
-- ============================================================

-- 1. Message Templates
CREATE TABLE IF NOT EXISTS public.debt_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    body TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' 
        CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.debt_message_templates IS 
'Templates for debt communications. Supports {{customer_name}}, {{amount}}, {{currency}}, {{due_date}}, {{days_overdue}}, {{invoice_number}}.';

CREATE INDEX IF NOT EXISTS idx_msg_templates_company ON public.debt_message_templates(company_id);

-- 2. Message Log / Outbox
CREATE TABLE IF NOT EXISTS public.debt_message_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app')),
    template_id UUID REFERENCES public.debt_message_templates(id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'queued', 'sent', 'failed', 'cancelled')),
    recipient VARCHAR(200),
    related_entity_type VARCHAR(30),
    related_entity_id UUID,
    error_info TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.debt_message_log IS 'Complete outbox and audit trail for debt communications.';

CREATE INDEX IF NOT EXISTS idx_msg_log_party ON public.debt_message_log(party_id);
CREATE INDEX IF NOT EXISTS idx_msg_log_company ON public.debt_message_log(company_id);
CREATE INDEX IF NOT EXISTS idx_msg_log_status ON public.debt_message_log(status);
CREATE INDEX IF NOT EXISTS idx_msg_log_created ON public.debt_message_log(created_at);
