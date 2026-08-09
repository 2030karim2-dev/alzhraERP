-- ==============================================================================
-- Migration: Harden RPC Security + Journal Immutability + Audit Logging
-- Date: 2026-08-09 | Priority: CRITICAL
-- Fixes: C1 (RPC Ownership), C5 (Journal Immutability), C8 (Audit Log)
-- ==============================================================================

-- 1. Helper: Verify company membership from auth.uid()
CREATE OR REPLACE FUNCTION public.verify_company_access(p_company_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_user_id uuid;
  v_user_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required'' USING ERRCODE = ''42501'';
  END IF;
  SELECT company_id INTO v_user_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION ''User not associated with any company'' USING ERRCODE = ''42501'';
  END IF;
  IF p_company_id IS NOT NULL AND p_company_id != v_user_company_id THEN
    RAISE EXCEPTION ''Access denied: لا تملك صلاحية الوصول لبيانات هذه الشركة'' USING ERRCODE = ''42501'';
  END IF;
  RETURN v_user_company_id;
END;
$$;

-- 2. get_dashboard_summary — add auth check
DROP FUNCTION IF EXISTS public.get_dashboard_summary(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    ''total_sales'', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type=''sale'' AND status IN (''posted'',''paid'',''partially_paid'') AND deleted_at IS NULL), 0),
    ''total_purchases'', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type=''purchase'' AND status IN (''posted'',''paid'',''partially_paid'') AND deleted_at IS NULL), 0),
    ''total_expenses'', COALESCE((SELECT SUM(amount) FROM public.expenses WHERE company_id=vc AND status!=''void'' AND deleted_at IS NULL), 0),
    ''receipt_bonds'', COALESCE((SELECT SUM(amount) FROM public.payments WHERE company_id=vc AND type=''receipt'' AND status=''posted'' AND deleted_at IS NULL), 0),
    ''payment_bonds'', COALESCE((SELECT SUM(amount) FROM public.payments WHERE company_id=vc AND type=''disbursement'' AND status=''posted'' AND deleted_at IS NULL), 0),
    ''total_debts'', COALESCE((SELECT SUM(balance) FROM public.parties WHERE company_id=vc AND type=''customer'' AND balance>0 AND deleted_at IS NULL), 0),
    ''total_supplier_debts'', COALESCE((SELECT SUM(balance) FROM public.parties WHERE company_id=vc AND type=''supplier'' AND balance>0 AND deleted_at IS NULL), 0),
    ''invoice_count'', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type=''sale'' AND status!=''void'' AND deleted_at IS NULL)
  ));
END;
$$;

-- 3. get_expense_stats — add auth check
DROP FUNCTION IF EXISTS public.get_expense_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_expense_stats(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT COALESCE(jsonb_agg(result), ''[]''::jsonb) FROM (
    SELECT SUM(e.amount) as total_amount, COUNT(e.id) as expense_count,
      CASE WHEN COUNT(e.id)>0 THEN SUM(e.amount)/COUNT(e.id) ELSE 0 END as avg_amount
    FROM public.expenses e WHERE e.company_id=vc AND e.status!=''void'' AND e.deleted_at IS NULL
  ) result);
END;
$$;

-- 4. get_sales_stats — add auth check
DROP FUNCTION IF EXISTS public.get_sales_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_sales_stats(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT COALESCE(jsonb_agg(result), ''[]''::jsonb) FROM (
    SELECT COALESCE(SUM(i.total_amount),0) as total_sales, COUNT(i.id) as invoice_count,
      CASE WHEN COUNT(i.id)>0 THEN SUM(i.total_amount)/COUNT(i.id) ELSE 0 END as avg_sale
    FROM public.invoices i WHERE i.company_id=vc AND i.type=''sale'' AND i.status!=''void'' AND i.deleted_at IS NULL
  ) result);
END;
$$;

-- 5. get_purchase_stats — add auth check
DROP FUNCTION IF EXISTS public.get_purchase_stats(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_purchase_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    ''invoiceCount'', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type=''purchase'' AND status!=''void'' AND deleted_at IS NULL),
    ''totalPurchases'', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type=''purchase'' AND status IN (''posted'',''paid'',''partially_paid'') AND deleted_at IS NULL), 0),
    ''pendingPaymentCount'', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type=''purchase'' AND status=''pending'' AND deleted_at IS NULL),
    ''totalDebt'', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type=''purchase'' AND status IN (''pending'',''partially_paid'') AND deleted_at IS NULL), 0)
  ));
END;
$$;

-- 6. get_sales_analytics — add auth check (replaces 20260805000001 version)
CREATE OR REPLACE FUNCTION public.get_sales_analytics(p_company_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  vc uuid; v_from date := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL ''30 days'')::date);
  v_to date := COALESCE(p_end_date, CURRENT_DATE);
  v_total_sales numeric; v_total_returns numeric; v_net_sales numeric;
  v_invoice_count integer; v_avg_invoice numeric;
  v_top_products jsonb; v_top_customers jsonb; v_sales_by_day jsonb; v_sales_by_payment jsonb;
BEGIN
  vc := public.verify_company_access(p_company_id);
  SELECT COALESCE(SUM(total_amount),0) INTO v_total_sales FROM public.invoices WHERE company_id=vc AND type=''sale'' AND status IN (''posted'',''paid'',''partially_paid'') AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total_amount),0) INTO v_total_returns FROM public.invoices WHERE company_id=vc AND type=''return_sale'' AND status IN (''posted'',''paid'',''partially_paid'') AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;
  v_net_sales := v_total_sales - COALESCE(v_total_returns, 0);
  SELECT COUNT(*) INTO v_invoice_count FROM public.invoices WHERE company_id=vc AND type=''sale'' AND status!=''void'' AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;
  v_avg_invoice := CASE WHEN v_invoice_count>0 THEN v_total_sales/v_invoice_count ELSE 0 END;
  RETURN jsonb_build_object(''totalSales'',v_total_sales,''totalReturns'',v_total_returns,''netSales'',v_net_sales,''invoiceCount'',v_invoice_count,''averageInvoiceValue'',v_avg_invoice);
END;
$$;

-- 7. Journal Entry Immutability Trigger (Prevent UPDATE/DELETE on posted)
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_modification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = ''UPDATE'' AND OLD.status = ''posted'' THEN
    RAISE EXCEPTION ''Cannot modify a posted journal entry (ID: %). Use reversal.'', OLD.id USING ERRCODE = ''23514'';
  END IF;
  IF TG_OP = ''DELETE'' AND OLD.status = ''posted'' THEN
    RAISE EXCEPTION ''Cannot delete a posted journal entry (ID: %). Use reversal.'', OLD.id USING ERRCODE = ''23514'';
  END IF;
  RETURN CASE TG_OP WHEN ''DELETE'' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entries_immutability ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_immutability BEFORE UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_posted_journal_modification();

-- 8. Journal Entry Lines Immutability Trigger
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_line_modification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_status text;
BEGIN
  IF TG_OP IN (''UPDATE'',''DELETE'') THEN
    SELECT status INTO v_status FROM public.journal_entries WHERE id = OLD.journal_entry_id;
    IF v_status = ''posted'' THEN
      RAISE EXCEPTION ''Cannot modify lines of a posted journal entry (Entry: %). Use reversal.'', OLD.journal_entry_id USING ERRCODE = ''23514'';
    END IF;
  END IF;
  IF TG_OP = ''INSERT'' THEN
    SELECT status INTO v_status FROM public.journal_entries WHERE id = NEW.journal_entry_id;
    IF v_status = ''posted'' THEN
      RAISE EXCEPTION ''Cannot add lines to a posted journal entry (Entry: %). Use reversal.'', NEW.journal_entry_id USING ERRCODE = ''23514'';
    END IF;
  END IF;
  RETURN CASE TG_OP WHEN ''DELETE'' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entry_lines_immutability ON public.journal_entry_lines;
CREATE TRIGGER trg_journal_entry_lines_immutability BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.prevent_posted_journal_line_modification();

-- 9. Audit Log Trigger (T046)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_company_id uuid;
BEGIN
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data, performed_at)
  VALUES (v_company_id, auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN (''UPDATE'',''DELETE'') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN (''INSERT'',''UPDATE'') THEN to_jsonb(NEW) ELSE NULL END, now());
  RETURN CASE TG_OP WHEN ''DELETE'' THEN OLD ELSE NEW END;
END;
$$;

-- Apply audit triggers
DO $$ DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['invoices','journal_entries','expenses','products','parties','payments','prc_purchase_orders']::text[]
  LOOP
    EXECUTE format(''DROP TRIGGER IF EXISTS %I ON public.%I'', ''trg_audit_''||tbl, tbl);
    EXECUTE format(''CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()'', ''trg_audit_''||tbl, tbl);
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_company_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) TO authenticated;
