-- Migration: 20260924000004_audit_log_bloat_remediation.sql
-- Description: Remediation of the `public.audit_logs` size explosion.
--
-- AUDIT FINDINGS (2026-09-24)
--   Database `zzthamxjxnxzzpswllid` had grown to 2,694 MB (Free plan limit: 500 MB).
--   `public.audit_logs` was 1,855 MB = 69% of the whole database, with 1,359,494 rows.
--
--   Root causes:
--     1. `log_audit_event()` stores the FULL previous and new row as JSONB
--        (`old_data` / `new_data`) on every change.
--     2. `sync_party_stats_on_invoice_change()` ran an UNCONDITIONAL
--        `UPDATE public.parties ...` on every invoice insert/update/delete,
--        even when every recomputed statistic was already correct. Each such
--        rewrite fired the parties audit trigger, amplifying one invoice change
--        into 2+ audit rows. Measured on the 2026-09-18 import: 136,767 party
--        UPDATE audit rows for only 1,140 distinct parties (~120 rewrites each).
--     3. A bulk data-entry/import run for the Al-Nadhari (Wael Al-Nadhari branch)
--        data set wrote 1,137,301 audit rows (1,292 MB) in a single day, of which
--        1,137,172 had `user_id IS NULL` (system/import context).
--     4. Retention was contradictory and therefore ineffective: pg_cron job 7
--        deleted rows older than 180 days while `cleanup_old_audit_logs()`
--        deleted rows older than 1 year. Both were no-ops on a 68-day-old table.
--
--   This migration fixes the *cause* going forward:
--     A. Guard `sync_party_stats_on_invoice_change()` so a party row is only
--        rewritten when one of its cached statistics actually changes.
--     B. Align both retention paths on a single 180-day window so the table is
--        bounded in the long run.
--
--   The historical bloat itself was reclaimed by a separate data migration
--   (see the accompanying report); business rows were never touched.

-- ============================================================================
-- A. Stop the write amplification on public.parties
-- ============================================================================
-- The recomputed values are now calculated once into local variables and used
-- for BOTH the SET list and the guard predicate, so the comparison uses exactly
-- the values that would be stored (including the numeric(15,2) rounding).
CREATE OR REPLACE FUNCTION public.sync_party_stats_on_invoice_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_party_id uuid;

  v_sales_paid numeric := 0;
  v_sales_returns numeric := 0;
  v_purchases_total numeric := 0;
  v_purchases_returns numeric := 0;

  v_inv_count integer;
  v_ord_count integer;
  v_last_inv timestamptz;
  v_last_pur timestamptz;
  v_paid numeric(15,2);
  v_purch numeric(15,2);
BEGIN
  v_party_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.party_id ELSE NEW.party_id END;
  IF v_party_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- 1. إجمالي مدفوعات العميل بالعملة الأساسية (مع طرح المردودات)
  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, paid_amount, exchange_rate)), 0)
  INTO v_sales_paid
  FROM public.invoices
  WHERE party_id = v_party_id AND type = 'sale'
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)), 0)
  INTO v_sales_returns
  FROM public.invoices
  WHERE party_id = v_party_id AND type IN ('sale_return', 'return_sale')
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  -- 2. إجمالي مشتريات المورد بالعملة الأساسية (مع طرح المردودات)
  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)), 0)
  INTO v_purchases_total
  FROM public.invoices
  WHERE party_id = v_party_id AND type = 'purchase'
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  SELECT COALESCE(SUM(public.fn_to_base_amount(currency_code, total_amount, exchange_rate)), 0)
  INTO v_purchases_returns
  FROM public.invoices
  WHERE party_id = v_party_id AND type IN ('purchase_return', 'return_purchase')
    AND status NOT IN ('cancelled', 'void') AND deleted_at IS NULL;

  -- 3. عدّادات وتواريخ آخر فاتورة/أمر شراء
  SELECT COUNT(*), MAX(issue_date)::timestamptz
  INTO v_inv_count, v_last_inv
  FROM public.invoices
  WHERE party_id = v_party_id AND type = 'sale'
    AND status NOT IN ('cancelled','void') AND deleted_at IS NULL;

  SELECT COUNT(*), MAX(issue_date)::timestamptz
  INTO v_ord_count, v_last_pur
  FROM public.invoices
  WHERE party_id = v_party_id AND type = 'purchase'
    AND status NOT IN ('cancelled','void') AND deleted_at IS NULL;

  -- القيم المخزّنة فعلياً (نفس تقريب العمود numeric(15,2))
  v_paid  := ROUND(GREATEST(0, ROUND(v_sales_paid  - v_sales_returns,  4)), 2);
  v_purch := ROUND(GREATEST(0, ROUND(v_purchases_total - v_purchases_returns, 4)), 2);

  -- ✅ حارس عدم التغيير: لا نُعيد كتابة صف الطرف إلّا إذا تغيّرت إحصائية فعلاً.
  --    سابقاً كان التحديث غير مشروط، فيعيد كتابة الصف ويُطلق مشغّل التدقيق
  --    حتى لو كانت كل القيم مطابقة (تضخيم كتابة وصل إلى ~120 مرة لكل طرف).
  UPDATE public.parties SET
    total_invoices_count   = v_inv_count,
    total_paid_amount      = v_paid,
    last_invoice_date      = v_last_inv,
    total_orders_count     = v_ord_count,
    total_purchases_amount = v_purch,
    last_purchase_date     = v_last_pur,
    updated_at             = now()
  WHERE id = v_party_id
    AND (total_invoices_count, total_paid_amount, last_invoice_date,
         total_orders_count, total_purchases_amount, last_purchase_date)
        IS DISTINCT FROM
        (v_inv_count, v_paid, v_last_inv, v_ord_count, v_purch, v_last_pur);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================================
-- B. Single, effective retention window for public.audit_logs (180 days)
-- ============================================================================
-- Matches the window already used by pg_cron job 7, removing the previous
-- contradiction with the 1-year window previously hard-coded here.
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '180 days';
END;
$function$;
