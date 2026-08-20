-- ============================================================
-- FIX (H4 + encoding): get_next_sequence crash + mojibake
-- ------------------------------------------------------------
-- H4) `get_next_sequence` cast `MAX(NULLIF(invoice_number,'')::bigint)`
--     threw `invalid input syntax for type bigint` because live
--     invoice/payment numbers are formatted ('INV-20260820-0001').
--     Fixed with regexp extraction of the trailing numeric portion;
--     NULL/empty/no-match rows are skipped (COALESCE→1). The
--     'payment' branch now uses payments (was journal_entries).
--
-- Encoding) `validate_data_integrity` and `generate_invoice_number`
--     comments carried corrupted UTF-8 (mojibake) in the repo
--     baseline. This migration carries the clean UTF-8 versions
--     (matching the live DB for validate_data_integrity).
--
-- Date: 2026-08-21
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_next_sequence(p_company_id uuid, p_sequence_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
  CASE p_sequence_name
    WHEN 'invoice' THEN
      SELECT COALESCE(MAX((regexp_match(invoice_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'sale' AND deleted_at IS NULL;
    WHEN 'purchase' THEN
      SELECT COALESCE(MAX((regexp_match(invoice_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'purchase' AND deleted_at IS NULL;
    WHEN 'expense' THEN
      SELECT COALESCE(MAX((regexp_match(voucher_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.expenses WHERE company_id = p_company_id AND deleted_at IS NULL;
    WHEN 'payment' THEN
      SELECT COALESCE(MAX((regexp_match(payment_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.payments WHERE company_id = p_company_id AND deleted_at IS NULL;
    WHEN 'bond' THEN
      SELECT COALESCE(MAX((regexp_match(payment_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.payments WHERE company_id = p_company_id AND deleted_at IS NULL;
    ELSE
      v_next := 1;
  END CASE;

  RETURN v_next::text;
END;
$function$;

-- ============================================================
-- validate_data_integrity — clean UTF-8 messages
-- (body identical to the live DB)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_data_integrity(p_company_id uuid)
 RETURNS TABLE(check_name text, status text, details text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id AND ucr.role IN('owner','admin')) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  SELECT 'invoice_overpayment'::text, CASE WHEN COUNT(*)>0 THEN '⚠️ مشكلة' ELSE '✅ سليم' END::text,
    (COUNT(*)||' فاتورة paid_amount > total_amount')::text
  FROM invoices WHERE company_id=p_company_id AND paid_amount>total_amount+0.01 AND deleted_at IS NULL
  UNION ALL
  SELECT 'negative_stock', CASE WHEN COUNT(*)>0 THEN '⚠️ مشكلة' ELSE '✅ سليم' END, COUNT(*)||' سجل مخزون سالب'
  FROM product_stock WHERE company_id=p_company_id AND quantity<0
  UNION ALL
  SELECT 'journal_balance',
    CASE WHEN ABS(COALESCE(SUM(jel.debit_amount),0)-COALESCE(SUM(jel.credit_amount),0))<0.01 THEN '✅ متوازن' ELSE '⚠️ غير متوازن' END,
    'الفرق: '||ROUND(ABS(COALESCE(SUM(jel.debit_amount),0)-COALESCE(SUM(jel.credit_amount),0)),4)::text
  FROM journal_entry_lines jel JOIN journal_entries je ON je.id=jel.journal_entry_id
  WHERE je.company_id=p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
  UNION ALL
  SELECT 'cross_company_allocations', CASE WHEN COUNT(*)>0 THEN '🔴 خطأ حرج' ELSE '✅ سليم' END,
    COUNT(*)||' تخصيص دفع بين شركات مختلفة'
  FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id JOIN invoices inv ON inv.id=pa.invoice_id
  WHERE py.company_id!=inv.company_id AND pa.deleted_at IS NULL;
END;$function$;

-- ============================================================
-- generate_invoice_number — clean UTF-8 comments (behaviour same)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id uuid, p_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  v_prefix := CASE p_type
    WHEN 'sale'             THEN 'INV'
    WHEN 'purchase'         THEN 'PUR'
    WHEN 'sale_return'      THEN 'RET'   -- [FIX] كان 'return_sale'
    WHEN 'purchase_return'  THEN 'RPR'   -- [FIX] كان 'return_purchase'
    ELSE                         'DOC'
  END;

  -- استخدام advisory lock لمنع تكرار الأرقام في التزامن
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || p_type));

  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE company_id = p_company_id AND type = p_type AND deleted_at IS NULL;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE,'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$;
