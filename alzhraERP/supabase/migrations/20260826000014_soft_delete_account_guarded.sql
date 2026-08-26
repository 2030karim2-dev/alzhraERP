-- ============================================================
-- Atomic guarded soft-delete for chart-of-accounts
-- ------------------------------------------------------------
-- Problem (deep review 2026-08-26):
--   accountsApi.deleteAccount used a two-step client flow:
--   (1) count journal_entry_lines + child accounts, then
--   (2) UPDATE accounts.deleted_at.
--   Between the two requests another session can post a journal
--   line against the account (TOCTOU) → an account WITH movements
--   gets soft-deleted, corrupting ledger totals and history.
--
-- Fix:
--   SECURITY DEFINER RPC `soft_delete_account_guarded(p_company_id,
--   p_account_id)` performs guard checks + the soft-delete inside ONE
--   implicit transaction — integrity enforced at the source.
--
-- Security model (RLS bypassed by DEFINER — the gate is explicit):
--   * Caller must be an authenticated member of p_company_id
--     (membership check mirrors fn_assert_company_access semantics).
--   * Account must exist, be alive (deleted_at IS NULL) and belong to
--     p_company_id → otherwise 'account_not_found'.
--   * System accounts are never deletable → 'is_system'.
--
-- Frontend contract:
--   { "ok": true } on success; exceptions carry Arabic reason messages
--   prefixed by machine codes: access_denied: | account_not_found: |
--   is_system: | has_journal_entries: | has_children:
--
-- Rollout note:
--   Frontend falls back to the legacy client-side two-step flow when
--   this RPC is absent (pre-migration databases), so deploying the
--   frontend first is safe; apply this migration to close the race.
-- Date: 2026-08-26
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.soft_delete_account_guarded(
    p_company_id uuid,
    p_account_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_lines     integer;
    v_children  integer;
    v_is_system boolean;
BEGIN
    -- ── Gate: any authenticated member of p_company_id ────────────────
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
          AND ucr.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'access_denied: غير مصرّح لك بتعديل دليل حسابات هذه الشركة';
    END IF;

    -- ── Locate the account (tenant-scoped, alive) ─────────────────────
    SELECT a.is_system INTO v_is_system
    FROM public.accounts a
    WHERE a.id = p_account_id
      AND a.company_id = p_company_id
      AND a.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'account_not_found: الحساب غير موجود أو تم حذفه مسبقاً';
    END IF;

    IF v_is_system THEN
        RAISE EXCEPTION 'is_system: لا يمكن حذف حساب نظام';
    END IF;

    -- ── Guard 1: existing journal lines (same transaction as delete) ──
    SELECT count(*) INTO v_lines
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = p_account_id
      AND jel.deleted_at IS NULL;

    IF v_lines > 0 THEN
        RAISE EXCEPTION 'has_journal_entries: لا يمكن حذف حساب له قيود محاسبية مرتبطة. قم بتصفير الرصيد أولاً.';
    END IF;

    -- ── Guard 2: child accounts ────────────────────────────────────────
    SELECT count(*) INTO v_children
    FROM public.accounts c
    WHERE c.parent_id = p_account_id
      AND c.company_id = p_company_id
      AND c.deleted_at IS NULL;

    IF v_children > 0 THEN
        RAISE EXCEPTION 'has_children: لا يمكن حذف حساب رئيسي له حسابات فرعية مرتبطة.';
    END IF;

    -- ── Soft-delete (guarded again by alive+tenant predicates) ────────
    UPDATE public.accounts
       SET deleted_at = now()
     WHERE id = p_account_id
       AND company_id = p_company_id
       AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'account_not_found: الحساب غير موجود أو تم حذفه مسبقاً';
    END IF;

    RETURN jsonb_build_object('ok', true, 'account_id', p_account_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.soft_delete_account_guarded(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_account_guarded(uuid, uuid) FROM anon, PUBLIC;

COMMIT;
