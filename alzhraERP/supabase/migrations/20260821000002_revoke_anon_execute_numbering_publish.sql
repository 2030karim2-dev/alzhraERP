-- ============================================================
-- HARDENING (H3): revoke anon/PUBLIC EXECUTE from numbering and
-- event-publish SECURITY DEFINER functions that are NOT used by
-- RLS policies/views.
--
-- These functions have NO internal auth/company check, so leaving
-- them PUBLIC-executable lets unauthenticated callers:
--   * predict/exhaust invoice/payment/journal numbers
--     (generate_invoice_number / generate_payment_number /
--      get_next_journal_entry_number / get_next_sequence /
--      get_next_invoice_number)
--   * poison the domain-event bus of ANY company
--     (api_v1_sys_publish_event)
--
-- The 8 helper functions required by RLS policies/views
-- (has_permission, get_user_role, is_super_admin, is_valid_branch,
--  get_user_company_id, user_can_manage_debts,
--  user_is_admin_or_manager, get_auth_companies) are intentionally
-- left executable for policy evaluation.
--
-- Date: 2026-08-21
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_payment_number(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_payment_number(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_journal_entry_number(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_journal_entry_number(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_sequence(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_sequence(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.api_v1_sys_publish_event(uuid, character varying, uuid, character varying, jsonb, uuid, character varying, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.api_v1_sys_publish_event(uuid, character varying, uuid, character varying, jsonb, uuid, character varying, uuid) FROM PUBLIC;

-- Re-grant to authenticated only (the frontend role)
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_number(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_journal_entry_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_sequence(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_v1_sys_publish_event(uuid, character varying, uuid, character varying, jsonb, uuid, character varying, uuid) TO authenticated;
