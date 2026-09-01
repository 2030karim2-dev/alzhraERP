-- ============================================================
-- 20260901000005 — تحصين fn_get_default_cash_account
-- ------------------------------------------------------------
-- كانت منفذة من anon/public بلا بوابة مستأجر (كشف سطح هجوم).
-- ليست SECURITY DEFINER (RLS تحميها) لكن لا حاجة لتعريضها للعامة:
-- يقتصر التنفيذ على authenticated + service_role.
-- ============================================================

revoke execute on function public.fn_get_default_cash_account(uuid, text) from anon, public;
grant execute on function public.fn_get_default_cash_account(uuid, text) to authenticated;
