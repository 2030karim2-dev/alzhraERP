-- ============================================================
-- Migration: Debt Module - Triggers & Auto-update
-- Date: 2026-08-10
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all new debt tables
DROP TRIGGER IF EXISTS trg_update_opening_balances ON public.party_opening_balances;
CREATE TRIGGER trg_update_opening_balances
    BEFORE UPDATE ON public.party_opening_balances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_promises ON public.debt_payment_promises;
CREATE TRIGGER trg_update_promises
    BEFORE UPDATE ON public.debt_payment_promises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_followup_config ON public.debt_followup_config;
CREATE TRIGGER trg_update_followup_config
    BEFORE UPDATE ON public.debt_followup_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_msg_templates ON public.debt_message_templates;
CREATE TRIGGER trg_update_msg_templates
    BEFORE UPDATE ON public.debt_message_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
