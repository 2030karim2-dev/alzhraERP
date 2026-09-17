-- Migration to patch SECURITY DEFINER RPCs with verify_company_access

CREATE OR REPLACE FUNCTION public.admin_recalculate_all_stock(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int := 0;
  v_row     RECORD;
  v_qty     numeric;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
-- فقط للمالك
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'access_denied: يتطلب صلاحية مالك';
  END IF;

  FOR v_row IN
    SELECT DISTINCT product_id, warehouse_id
    FROM inventory_transactions
    WHERE company_id = p_company_id AND deleted_at IS NULL
  LOOP
    SELECT COALESCE(SUM(
      CASE transaction_type
        WHEN 'purchase'        THEN  ABS(quantity)
        WHEN 'sales_return'    THEN  ABS(quantity)
        WHEN 'transfer_in'     THEN  ABS(quantity)
        WHEN 'adj_in'          THEN  ABS(quantity)
        WHEN 'initial'         THEN  ABS(quantity)
        WHEN 'sales'           THEN -ABS(quantity)
        WHEN 'purchase_return' THEN -ABS(quantity)
        WHEN 'transfer_out'    THEN -ABS(quantity)
        WHEN 'adj_out'         THEN -ABS(quantity)
        WHEN 'adj'             THEN  quantity
        ELSE 0
      END
    ), 0) INTO v_qty
    FROM inventory_transactions
    WHERE product_id   = v_row.product_id
      AND warehouse_id = v_row.warehouse_id
      AND company_id   = p_company_id
      AND deleted_at   IS NULL;

    INSERT INTO product_stock(product_id, warehouse_id, quantity, company_id)
    VALUES (v_row.product_id, v_row.warehouse_id, GREATEST(0, v_qty), p_company_id)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity   = GREATEST(0, EXCLUDED.quantity),
      updated_at = now();

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'updated_rows', v_updated,
    'company_id',   p_company_id,
    'completed_at', now()
  );
END;
$function$

-- ===== api_v1_fin_generate_grn_je =====


CREATE OR REPLACE FUNCTION public.api_v1_fin_generate_grn_je(p_company_id uuid, p_grn_id uuid, p_created_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_grn RECORD;
    v_inv_account_id UUID;
    v_grni_account_id UUID;
    v_total_cost NUMERIC := 0;
    v_lines JSONB := '[]'::jsonb;
    v_je_result JSONB;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- 1. Get GRN Total Cost
    -- Assuming cost is fetched from the PO via grn items
    SELECT 
        SUM(gri.accepted_quantity * poi.unit_price) INTO v_total_cost
    FROM public.prc_goods_receipt_items gri
    JOIN public.prc_purchase_order_items poi ON poi.po_item_id = gri.po_item_id
    WHERE gri.grn_id = p_grn_id;

    IF v_total_cost IS NULL OR v_total_cost <= 0 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'GRN has zero total cost, no journal entry required.');
    END IF;

    -- 2. Find Accounts
    -- Standard Codes for Al-Zahra: 1200 (Inventory Asset), 2100 (GRNI - Accrued Payables)
    SELECT id INTO v_inv_account_id FROM public.fin_accounts WHERE company_id = p_company_id AND code = '1200';
    SELECT id INTO v_grni_account_id FROM public.fin_accounts WHERE company_id = p_company_id AND code = '2100';

    IF v_inv_account_id IS NULL OR v_grni_account_id IS NULL THEN
        -- If accounts are not set up, fail gracefully
        RETURN jsonb_build_object('success', FALSE, 'error', 'Required financial accounts (1200 Inventory, 2100 GRNI) are not configured.');
    END IF;

    -- 3. Build Lines
    -- Debit: Inventory Asset (1200)
    v_lines := v_lines || jsonb_build_object(
        'account_id', v_inv_account_id,
        'debit', v_total_cost,
        'credit', 0,
        'description', 'Receipt of Goods for GRN ' || p_grn_id
    );

    -- Credit: GRNI (2100)
    v_lines := v_lines || jsonb_build_object(
        'account_id', v_grni_account_id,
        'debit', 0,
        'credit', v_total_cost,
        'description', 'Accrual for unbilled receipt'
    );

    -- 4. Post Journal Entry
    v_je_result := api_v1_fin_post_journal_entry(
        p_company_id,
        CURRENT_DATE,
        'GRN',
        p_grn_id,
        'Automated Journal Entry for Goods Receipt',
        v_lines,
        p_created_by,
        TRUE -- Force Post
    );

    RETURN v_je_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_fin_post_journal_entry =====


CREATE OR REPLACE FUNCTION public.api_v1_fin_post_journal_entry(p_company_id uuid, p_journal_date date, p_reference_type character varying, p_reference_id uuid, p_description text, p_lines jsonb, p_created_by uuid DEFAULT NULL::uuid, p_force_post boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_journal_id UUID;
    v_journal_num VARCHAR;
    v_line RECORD;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
    v_fiscal_year INT;
    v_period INT;
    v_account RECORD;
    v_balance_modifier NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- 1. Validate Input
    IF jsonb_array_length(p_lines) < 2 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Journal entry must have at least 2 lines.');
    END IF;

    -- Calculate Totals
    FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(account_id UUID, debit NUMERIC, credit NUMERIC, description TEXT)
    LOOP
        v_total_debit := v_total_debit + COALESCE(v_line.debit, 0);
        v_total_credit := v_total_credit + COALESCE(v_line.credit, 0);
    END LOOP;

    -- Validate Balance
    IF v_total_debit != v_total_credit THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Journal entry is not balanced. Debit: ' || v_total_debit || ', Credit: ' || v_total_credit);
    END IF;

    IF v_total_debit = 0 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Journal entry cannot have zero total.');
    END IF;

    -- 2. Generate Number and Fiscal Period
    v_journal_num := 'JE-' || to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substring(gen_random_uuid()::text, 1, 4);
    v_fiscal_year := EXTRACT(YEAR FROM p_journal_date);
    v_period := EXTRACT(MONTH FROM p_journal_date);

    -- 3. Create Header
    INSERT INTO public.fin_journal_entries (
        company_id, journal_number, journal_date, status,
        reference_type, reference_id, total_debit, total_credit,
        description, created_by, posted_by, posted_at
    ) VALUES (
        p_company_id, v_journal_num, p_journal_date, 
        CASE WHEN p_force_post THEN 'POSTED'::fin_journal_status ELSE 'DRAFT'::fin_journal_status END,
        p_reference_type, p_reference_id, v_total_debit, v_total_credit,
        p_description, p_created_by, 
        CASE WHEN p_force_post THEN p_created_by ELSE NULL END,
        CASE WHEN p_force_post THEN NOW() ELSE NULL END
    ) RETURNING id INTO v_journal_id;

    -- 4. Create Lines and Update Balances (if posted)
    FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(account_id UUID, debit NUMERIC, credit NUMERIC, description TEXT)
    LOOP
        -- Check if account is a group
        SELECT * INTO v_account FROM public.fin_accounts WHERE id = v_line.account_id;
        IF v_account.is_group THEN
            RAISE EXCEPTION 'Cannot post directly to group account %', v_account.code;
        END IF;

        -- Insert Line
        INSERT INTO public.fin_journal_lines (
            journal_id, account_id, debit, credit, description
        ) VALUES (
            v_journal_id, v_line.account_id, COALESCE(v_line.debit, 0), COALESCE(v_line.credit, 0), v_line.description
        );

        -- Update Balance if POSTED
        IF p_force_post THEN
            -- Calculate if this increases or decreases the normal balance
            -- Assets/Expenses normally debit. Liab/Equity/Rev normally credit.
            IF v_account.account_type IN ('ASSET', 'EXPENSE') THEN
                v_balance_modifier := COALESCE(v_line.debit, 0) - COALESCE(v_line.credit, 0);
            ELSE
                v_balance_modifier := COALESCE(v_line.credit, 0) - COALESCE(v_line.debit, 0);
            END IF;

            INSERT INTO public.fin_account_balances (
                company_id, account_id, fiscal_year, period, 
                debit_total, credit_total, closing_balance
            ) VALUES (
                p_company_id, v_line.account_id, v_fiscal_year, v_period,
                COALESCE(v_line.debit, 0), COALESCE(v_line.credit, 0), v_balance_modifier
            )
            ON CONFLICT (company_id, account_id, fiscal_year, period)
            DO UPDATE SET 
                debit_total = public.fin_account_balances.debit_total + EXCLUDED.debit_total,
                credit_total = public.fin_account_balances.credit_total + EXCLUDED.credit_total,
                closing_balance = public.fin_account_balances.closing_balance + v_balance_modifier,
                updated_at = NOW();
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'journal_id', v_journal_id, 'journal_number', v_journal_num);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_inv_create_warehouse =====


CREATE OR REPLACE FUNCTION public.api_v1_inv_create_warehouse(p_company_id uuid, p_code character varying, p_name_ar character varying, p_name_en character varying DEFAULT NULL::character varying, p_location text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_warehouse_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
INSERT INTO public.inv_warehouses (company_id, code, name_ar, name_en, location, branch_id)
    VALUES (p_company_id, p_code, p_name_ar, p_name_en, p_location, p_branch_id)
    RETURNING id INTO v_warehouse_id;

    RETURN jsonb_build_object('success', true, 'warehouse_id', v_warehouse_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_inv_record_movement =====


CREATE OR REPLACE FUNCTION public.api_v1_inv_record_movement(p_company_id uuid, p_warehouse_id uuid, p_movement_type inv_movement_type, p_reference_type character varying, p_reference_id uuid, p_items jsonb, p_created_by uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_movement_id UUID;
    v_movement_num VARCHAR;
    v_item record;
    v_qty_modifier NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Determine if this adds or subtracts from stock
    -- RECEIPT (+), ISSUE (-), ADJUSTMENT (+/- depending on qty sign in items though items qty usually positive, wait, for adjustments we need sign)
    IF p_movement_type = 'RECEIPT' THEN
        v_qty_modifier := 1;
    ELSIF p_movement_type = 'ISSUE' THEN
        v_qty_modifier := -1;
    ELSIF p_movement_type = 'TRANSFER' THEN
        -- Transfer OUT from this warehouse. Transfer IN is handled separately or by caller.
        v_qty_modifier := -1;
    ELSE
        -- For adjustments, the caller provides the delta (+ or -) in the quantity field directly
        v_qty_modifier := 1; 
    END IF;

    -- 1. Generate Movement Number
    v_movement_num := 'MOV-' || to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substring(gen_random_uuid()::text, 1, 4);

    -- 2. Create Header
    INSERT INTO public.inv_stock_movements (
        company_id, movement_number, movement_type, status, warehouse_id, 
        reference_type, reference_id, created_by, notes
    ) VALUES (
        p_company_id, v_movement_num, p_movement_type, 'POSTED', p_warehouse_id,
        p_reference_type, p_reference_id, p_created_by, p_notes
    ) RETURNING id INTO v_movement_id;

    -- 3. Loop through items and update ledger
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, unit_cost NUMERIC)
    LOOP
        -- A. Insert Movement Item
        INSERT INTO public.inv_stock_movement_items (movement_id, product_id, quantity, unit_cost)
        VALUES (v_movement_id, v_item.product_id, v_item.quantity, v_item.unit_cost);

        -- B. Update Ledger (Upsert)
        INSERT INTO public.inv_stock_ledger (company_id, warehouse_id, product_id, quantity, average_cost, last_movement_at)
        VALUES (
            p_company_id, 
            p_warehouse_id, 
            v_item.product_id, 
            (v_item.quantity * v_qty_modifier), 
            v_item.unit_cost, -- Simplified average cost logic for now
            NOW()
        )
        ON CONFLICT (company_id, warehouse_id, product_id)
        DO UPDATE SET 
            quantity = public.inv_stock_ledger.quantity + (v_item.quantity * v_qty_modifier),
            last_movement_at = NOW(),
            updated_at = NOW()
            -- Note: True Average Cost calculation would be:
            -- ((old_qty * old_avg) + (new_qty * new_cost)) / (old_qty + new_qty)
            -- Handled here simply for RECEIPT only:
            , average_cost = CASE 
                WHEN p_movement_type = 'RECEIPT' AND (public.inv_stock_ledger.quantity + v_item.quantity) > 0 THEN 
                    ((public.inv_stock_ledger.quantity * public.inv_stock_ledger.average_cost) + (v_item.quantity * v_item.unit_cost)) / (public.inv_stock_ledger.quantity + v_item.quantity)
                ELSE public.inv_stock_ledger.average_cost
            END;

        -- Check negative stock if not allowed (Optional, for now we allow negative for flexibility but can add constraint)
    END LOOP;

    RETURN jsonb_build_object('success', true, 'movement_id', v_movement_id, 'movement_number', v_movement_num);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_accept_grn =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_accept_grn(p_company_id uuid, p_grn_id uuid, p_accepted_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_grn RECORD;
    v_grn_item RECORD;
    v_new_received_qty NUMERIC;
    v_po_item RECORD;
    v_po_status VARCHAR;
    v_total_po_items INT;
    v_fully_received_items INT := 0;
    v_inv_items JSONB := '[]'::jsonb;
    v_inv_result JSONB;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_grn FROM public.prc_goods_receipts
    WHERE grn_id = p_grn_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'GRN not found.');
    END IF;
    IF v_grn.status NOT IN ('draft', 'inspected') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'GRN cannot be accepted in current status: ' || v_grn.status);
    END IF;

    -- Determine if partial or full acceptance
    IF EXISTS (SELECT 1 FROM public.prc_goods_receipt_items WHERE grn_id = p_grn_id AND rejected_quantity > 0) THEN
        UPDATE public.prc_goods_receipts SET status = 'partially_accepted' WHERE grn_id = p_grn_id;
    ELSE
        UPDATE public.prc_goods_receipts SET status = 'accepted' WHERE grn_id = p_grn_id;
    END IF;

    -- Update received quantities on each PO line item and build JSON array for Inventory Movement
    FOR v_grn_item IN
        SELECT * FROM public.prc_goods_receipt_items
        WHERE grn_id = p_grn_id AND company_id = p_company_id
    LOOP
        UPDATE public.prc_purchase_order_items
        SET received_quantity = COALESCE(received_quantity, 0) + v_grn_item.accepted_quantity
        WHERE po_item_id = v_grn_item.po_item_id
        RETURNING quantity, received_quantity, unit_price INTO v_po_item;

        -- Count fully received lines
        IF v_po_item.received_quantity >= v_po_item.quantity THEN
            v_fully_received_items := v_fully_received_items + 1;
        END IF;

        -- Add to inventory movement array if quantity > 0
        IF v_grn_item.accepted_quantity > 0 THEN
            v_inv_items := v_inv_items || jsonb_build_object(
                'product_id', v_grn_item.product_id,
                'quantity', v_grn_item.accepted_quantity,
                'unit_cost', v_po_item.unit_price
            );
        END IF;
    END LOOP;

    -- Update PO status based on fulfillment
    SELECT COUNT(*) INTO v_total_po_items
    FROM public.prc_purchase_order_items WHERE po_id = v_grn.po_id;

    IF v_fully_received_items >= v_total_po_items THEN
        v_po_status := 'fully_received';
    ELSE
        v_po_status := 'partially_received';
    END IF;

    UPDATE public.prc_purchase_orders SET status = v_po_status WHERE po_id = v_grn.po_id;

    -- =========================================================================
    -- NEW: Trigger Inventory Movement (Phase 5)
    -- =========================================================================
    IF v_grn.warehouse_id IS NOT NULL AND jsonb_array_length(v_inv_items) > 0 THEN
        v_inv_result := api_v1_inv_record_movement(
            p_company_id,
            v_grn.warehouse_id,
            'RECEIPT'::inv_movement_type,
            'GRN',
            p_grn_id,
            v_inv_items,
            p_accepted_by,
            'Auto-generated from GRN Acceptance'
        );

        IF NOT (v_inv_result->>'success')::boolean THEN
            -- If inventory update fails, rollback the entire transaction
            RAISE EXCEPTION 'Inventory update failed: %', v_inv_result->>'error';
        END IF;
    END IF;

    PERFORM api_v1_sys_publish_event(
        p_company_id, 'goods_receipt', p_grn_id, 'goods_receipt.accepted',
        jsonb_build_object(
            'grn_id', p_grn_id,
            'po_id', v_grn.po_id,
            'po_status', v_po_status,
            'inventory_movement', v_inv_result,
            'accepted_by', p_accepted_by
        ),
        p_accepted_by, 'user'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'grn_status', CASE WHEN EXISTS (SELECT 1 FROM public.prc_goods_receipt_items WHERE grn_id = p_grn_id AND rejected_quantity > 0)
                           THEN 'partially_accepted' ELSE 'accepted' END,
        'po_status', v_po_status,
        'inventory_movement', v_inv_result,
        'message', 'GRN accepted. PO quantities and Inventory Ledger updated.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_act_on_pr =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_act_on_pr(p_company_id uuid, p_pr_id uuid, p_action character varying, p_actor_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_pr RECORD; v_instance RECORD; v_transition RECORD;
    v_next_state RECORD; v_new_pr_status VARCHAR;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_pr FROM prc_purchase_requests WHERE pr_id = p_pr_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PR not found.'); END IF;
    SELECT * INTO v_instance FROM sys_workflow_instances
    WHERE aggregate_id = p_pr_id AND aggregate_type = 'purchase_request'
      AND company_id = p_company_id AND status = 'in_progress'
    ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'No active workflow instance found for this PR.'); END IF;
    SELECT t.* INTO v_transition FROM sys_workflow_transitions t
    WHERE t.workflow_id = v_instance.workflow_id AND t.from_state_id = v_instance.current_state_id
      AND ((p_action = 'approve' AND t.name ILIKE '%Approve%') OR (p_action = 'reject' AND t.name ILIKE '%Reject%'))
    LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'No valid transition found for action: ' || p_action); END IF;
    SELECT * INTO v_next_state FROM sys_workflow_states WHERE state_id = v_transition.to_state_id;
    UPDATE sys_workflow_instances SET current_state_id = v_next_state.state_id,
        status = CASE WHEN v_next_state.state_type = 'terminal' THEN 'completed' ELSE 'in_progress' END
    WHERE instance_id = v_instance.instance_id;
    v_new_pr_status := CASE v_next_state.name WHEN 'Approved' THEN 'approved' WHEN 'Rejected' THEN 'rejected' ELSE 'in_review' END;
    UPDATE prc_purchase_requests SET status = v_new_pr_status WHERE pr_id = p_pr_id;
    PERFORM api_v1_sys_publish_event(
        p_company_id, 'purchase_request', p_pr_id, 'purchase_request.' || p_action || 'd',
        jsonb_build_object('pr_id', p_pr_id, 'pr_number', v_pr.pr_number, 'action', p_action, 'actor_id', p_actor_id, 'notes', p_notes, 'new_status', v_new_pr_status),
        p_actor_id, 'user'
    );
    RETURN jsonb_build_object('success', TRUE, 'new_pr_status', v_new_pr_status, 'workflow_state', v_next_state.name, 'message', 'PR ' || p_action || 'd successfully.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_add_supplier_product =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_add_supplier_product(p_company_id uuid, p_supplier_id uuid, p_product_id uuid, p_supplier_sku character varying DEFAULT NULL::character varying, p_moq numeric DEFAULT 1, p_order_multiple numeric DEFAULT 1, p_lead_time_days smallint DEFAULT 0, p_preferred_supplier boolean DEFAULT false, p_priority smallint DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_supplier_product_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM prc_suppliers WHERE supplier_id = p_supplier_id AND company_id = p_company_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Active supplier not found.');
    END IF;
    IF p_preferred_supplier THEN
        UPDATE prc_supplier_products SET preferred_supplier = FALSE
        WHERE product_id = p_product_id AND company_id = p_company_id;
    END IF;
    INSERT INTO prc_supplier_products (
        company_id, supplier_id, product_id, supplier_sku,
        minimum_order_quantity, order_multiple, lead_time_days, preferred_supplier, priority, is_active
    ) VALUES (
        p_company_id, p_supplier_id, p_product_id, p_supplier_sku,
        p_moq, p_order_multiple, p_lead_time_days, p_preferred_supplier, p_priority, TRUE
    )
    ON CONFLICT (supplier_id, product_id) DO UPDATE SET
        supplier_sku = EXCLUDED.supplier_sku, minimum_order_quantity = EXCLUDED.minimum_order_quantity,
        order_multiple = EXCLUDED.order_multiple, lead_time_days = EXCLUDED.lead_time_days,
        preferred_supplier = EXCLUDED.preferred_supplier, priority = EXCLUDED.priority, updated_at = now()
    RETURNING supplier_product_id INTO v_supplier_product_id;
    RETURN jsonb_build_object('success', TRUE, 'supplier_product_id', v_supplier_product_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_approve_supplier =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_approve_supplier(p_company_id uuid, p_supplier_id uuid, p_approved boolean, p_approved_by uuid, p_rejection_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_new_status VARCHAR; v_event_type VARCHAR;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF p_approved THEN v_new_status := 'active'; v_event_type := 'supplier.approved';
    ELSE v_new_status := 'inactive'; v_event_type := 'supplier.rejected'; END IF;
    UPDATE prc_suppliers SET status = v_new_status, is_approved = p_approved
    WHERE supplier_id = p_supplier_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier not found.'); END IF;
    PERFORM api_v1_sys_publish_event(
        p_company_id, 'supplier', p_supplier_id, v_event_type,
        jsonb_build_object('supplier_id', p_supplier_id, 'approved_by', p_approved_by, 'rejection_reason', p_rejection_reason),
        p_approved_by, 'user'
    );
    RETURN jsonb_build_object('success', TRUE, 'status', v_new_status, 'message', CASE WHEN p_approved THEN 'Supplier activated.' ELSE 'Supplier rejected.' END);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_approve_variance =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_approve_variance(p_company_id uuid, p_invoice_id uuid, p_match_id uuid, p_approved_by uuid, p_resolution_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
UPDATE prc_three_way_matches SET resolution_notes = p_resolution_notes WHERE match_id = p_match_id AND company_id = p_company_id;
    UPDATE prc_purchase_invoices SET matching_status = 'variance_approved', status = 'approved'
    WHERE invoice_id = p_invoice_id AND company_id = p_company_id;
    PERFORM api_v1_sys_publish_event(p_company_id, 'purchase_invoice', p_invoice_id, 'invoice.variance_approved',
        jsonb_build_object('invoice_id', p_invoice_id, 'approved_by', p_approved_by, 'resolution_notes', p_resolution_notes),
        p_approved_by, 'user');
    RETURN jsonb_build_object('success', TRUE, 'message', 'Variance approved. Invoice ready for payment.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_award_rfq =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_award_rfq(p_company_id uuid, p_evaluation_id uuid, p_awarded_by uuid, p_justification text DEFAULT NULL::text, p_selected_quotation_id uuid DEFAULT NULL::uuid, p_split_awards jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_evaluation RECORD; v_rfq_id UUID; v_award JSONB;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_evaluation FROM prc_rfq_evaluations WHERE evaluation_id = p_evaluation_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Evaluation not found.'); END IF;
    v_rfq_id := v_evaluation.rfq_id;
    UPDATE prc_rfq_evaluations SET status = 'completed', selected_quotation_id = p_selected_quotation_id,
        justification = p_justification, evaluation_date = now() WHERE evaluation_id = p_evaluation_id;
    IF p_split_awards IS NOT NULL THEN
        FOR v_award IN SELECT * FROM jsonb_array_elements(p_split_awards) LOOP
            INSERT INTO prc_rfq_evaluation_items (
                company_id, evaluation_id, rfq_item_id, awarded_quotation_item_id, awarded_quantity, reason_for_selection
            ) VALUES (
                p_company_id, p_evaluation_id, (v_award->>'rfq_item_id')::UUID,
                (v_award->>'quotation_item_id')::UUID, (v_award->>'awarded_quantity')::NUMERIC, v_award->>'reason'
            );
        END LOOP;
    END IF;
    IF p_selected_quotation_id IS NOT NULL THEN
        UPDATE prc_quotations SET status = 'accepted' WHERE quotation_id = p_selected_quotation_id;
        UPDATE prc_quotations SET status = 'rejected' WHERE rfq_id = v_rfq_id AND quotation_id != p_selected_quotation_id AND status = 'submitted';
    END IF;
    UPDATE prc_rfqs SET status = 'awarded' WHERE rfq_id = v_rfq_id;
    PERFORM api_v1_sys_publish_event(p_company_id, 'rfq', v_rfq_id, 'rfq.awarded',
        jsonb_build_object('rfq_id', v_rfq_id, 'evaluation_id', p_evaluation_id, 'selected_quotation_id', p_selected_quotation_id, 'awarded_by', p_awarded_by),
        p_awarded_by, 'user');
    RETURN jsonb_build_object('success', TRUE, 'rfq_id', v_rfq_id, 'message', 'RFQ awarded successfully.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_block_supplier =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_block_supplier(p_company_id uuid, p_supplier_id uuid, p_action character varying, p_reason text, p_blocked_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_new_status VARCHAR; v_supplier RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF p_action NOT IN ('block', 'blacklist') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid action. Use ''block'' or ''blacklist''.');
    END IF;
    SELECT * INTO v_supplier FROM prc_suppliers WHERE supplier_id = p_supplier_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier not found.'); END IF;
    v_new_status := CASE p_action WHEN 'block' THEN 'blocked' ELSE 'blacklisted' END;
    UPDATE prc_suppliers SET status = v_new_status, is_approved = FALSE WHERE supplier_id = p_supplier_id AND company_id = p_company_id;
    UPDATE prc_supplier_products SET is_active = FALSE WHERE supplier_id = p_supplier_id AND company_id = p_company_id;
    PERFORM api_v1_sys_publish_event(
        p_company_id, 'supplier', p_supplier_id, 'supplier.' || p_action || 'ed',
        jsonb_build_object('supplier_id', p_supplier_id, 'reason', p_reason, 'blocked_by', p_blocked_by),
        p_blocked_by, 'user'
    );
    RETURN jsonb_build_object('success', TRUE, 'new_status', v_new_status, 'message', 'Supplier has been ' || p_action || 'ed and all product links deactivated.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_calculate_ranking =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_calculate_ranking(p_company_id uuid, p_evaluation_id uuid, p_price_weight numeric DEFAULT 0.50, p_technical_weight numeric DEFAULT 0.30, p_delivery_weight numeric DEFAULT 0.20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_score_row RECORD; v_rank INT := 1; v_best_quotation_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF ABS(p_price_weight + p_technical_weight + p_delivery_weight - 1.0) > 0.001 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Weights must sum to 1.0');
    END IF;
    FOR v_score_row IN
        SELECT score_id, quotation_id,
            ROUND((price_score * p_price_weight) + (technical_score * p_technical_weight) + (delivery_score * p_delivery_weight), 2) AS weighted_total
        FROM prc_rfq_evaluation_scores WHERE evaluation_id = p_evaluation_id AND company_id = p_company_id
        ORDER BY weighted_total DESC
    LOOP
        UPDATE prc_rfq_evaluation_scores SET total_score = v_score_row.weighted_total, rank = v_rank, is_recommended = (v_rank = 1)
        WHERE score_id = v_score_row.score_id;
        IF v_rank = 1 THEN v_best_quotation_id := v_score_row.quotation_id; END IF;
        v_rank := v_rank + 1;
    END LOOP;
    RETURN jsonb_build_object('success', TRUE, 'recommended_quotation_id', v_best_quotation_id, 'message', 'Ranking calculated.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_calculate_supplier_metrics =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_calculate_supplier_metrics(p_company_id uuid, p_supplier_id uuid, p_period_start date, p_period_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_on_time_rate NUMERIC := 0; v_quality_rate NUMERIC := 0;
    v_rfq_response_rate NUMERIC := 0; v_price_variance_avg NUMERIC := 0;
    v_metric_id UUID; v_total_grns INT; v_on_time_grns INT;
    v_total_delivered NUMERIC; v_total_accepted NUMERIC;
    v_total_rfq_invites INT; v_responded_rfqs INT; v_avg_variance NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT
        COUNT(*) FILTER (WHERE gr.receipt_date::DATE <= po.expected_delivery_date OR po.expected_delivery_date IS NULL),
        COUNT(*)
    INTO v_on_time_grns, v_total_grns
    FROM prc_goods_receipts gr JOIN prc_purchase_orders po ON gr.po_id = po.po_id
    WHERE gr.supplier_id = p_supplier_id AND gr.company_id = p_company_id
      AND gr.receipt_date::DATE BETWEEN p_period_start AND p_period_end
      AND gr.status IN ('accepted', 'partially_accepted');
    IF v_total_grns > 0 THEN v_on_time_rate := ROUND((v_on_time_grns::NUMERIC / v_total_grns) * 100, 2); END IF;

    SELECT COALESCE(SUM(delivered_quantity), 0), COALESCE(SUM(accepted_quantity), 0)
    INTO v_total_delivered, v_total_accepted
    FROM prc_goods_receipt_items gi JOIN prc_goods_receipts gr ON gi.grn_id = gr.grn_id
    WHERE gr.supplier_id = p_supplier_id AND gr.company_id = p_company_id
      AND gr.receipt_date::DATE BETWEEN p_period_start AND p_period_end;
    IF v_total_delivered > 0 THEN v_quality_rate := ROUND((v_total_accepted / v_total_delivered) * 100, 2); END IF;

    SELECT COUNT(*) FILTER (WHERE status IN ('submitted', 'awarded')), COUNT(*)
    INTO v_responded_rfqs, v_total_rfq_invites
    FROM prc_rfq_suppliers rs JOIN prc_rfqs r ON rs.rfq_id = r.rfq_id
    WHERE rs.supplier_id = p_supplier_id AND rs.company_id = p_company_id
      AND r.created_at::DATE BETWEEN p_period_start AND p_period_end;
    IF v_total_rfq_invites > 0 THEN v_rfq_response_rate := ROUND((v_responded_rfqs::NUMERIC / v_total_rfq_invites) * 100, 2); END IF;

    SELECT COALESCE(AVG(ABS(variance_amount)), 0) INTO v_avg_variance
    FROM prc_purchase_invoice_items pii
    JOIN prc_purchase_invoices pi2 ON pii.invoice_id = pi2.invoice_id
    WHERE pi2.supplier_id = p_supplier_id AND pi2.company_id = p_company_id
      AND pi2.invoice_date BETWEEN p_period_start AND p_period_end;
    v_price_variance_avg := ROUND(v_avg_variance, 2);

    INSERT INTO prc_supplier_metrics (
        company_id, supplier_id, period_start, period_end,
        on_time_delivery_rate, quality_acceptance_rate, rfq_response_rate, price_variance_avg, calculated_at
    ) VALUES (
        p_company_id, p_supplier_id, p_period_start, p_period_end,
        v_on_time_rate, v_quality_rate, v_rfq_response_rate, v_price_variance_avg, now()
    )
    ON CONFLICT (company_id, supplier_id, period_start, period_end) DO UPDATE SET
        on_time_delivery_rate = EXCLUDED.on_time_delivery_rate,
        quality_acceptance_rate = EXCLUDED.quality_acceptance_rate,
        rfq_response_rate = EXCLUDED.rfq_response_rate,
        price_variance_avg = EXCLUDED.price_variance_avg,
        calculated_at = now()
    RETURNING metric_id INTO v_metric_id;

    RETURN jsonb_build_object('success', TRUE, 'metric_id', v_metric_id,
        'on_time_delivery_rate', v_on_time_rate, 'quality_acceptance_rate', v_quality_rate,
        'rfq_response_rate', v_rfq_response_rate, 'price_variance_avg', v_price_variance_avg);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_cancel_po =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_cancel_po(p_company_id uuid, p_po_id uuid, p_cancelled_by uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_po RECORD; v_grn_count INT;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_po FROM prc_purchase_orders WHERE po_id = p_po_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PO not found.'); END IF;
    IF v_po.status IN ('partially_received', 'fully_received', 'closed', 'cancelled') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot cancel PO in status: ' || v_po.status);
    END IF;
    SELECT COUNT(*) INTO v_grn_count FROM prc_goods_receipts
    WHERE po_id = p_po_id AND company_id = p_company_id AND status IN ('accepted', 'partially_accepted');
    IF v_grn_count > 0 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot cancel PO with accepted goods receipts.'); END IF;
    UPDATE prc_purchase_orders SET status = 'cancelled' WHERE po_id = p_po_id;
    PERFORM api_v1_sys_publish_event(p_company_id, 'purchase_order', p_po_id, 'purchase_order.cancelled',
        jsonb_build_object('po_id', p_po_id, 'cancelled_by', p_cancelled_by, 'reason', p_reason), p_cancelled_by, 'user');
    RETURN jsonb_build_object('success', TRUE, 'message', 'PO cancelled.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_cancel_pr =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_cancel_pr(p_company_id uuid, p_pr_id uuid, p_cancelled_by uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_pr RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_pr FROM prc_purchase_requests WHERE pr_id = p_pr_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PR not found.'); END IF;
    IF v_pr.status NOT IN ('draft', 'submitted') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Only draft or submitted PRs can be cancelled. Current status: ' || v_pr.status);
    END IF;
    UPDATE prc_purchase_requests SET status = 'cancelled' WHERE pr_id = p_pr_id;
    UPDATE sys_workflow_instances SET status = 'cancelled'
    WHERE aggregate_id = p_pr_id AND aggregate_type = 'purchase_request'
      AND company_id = p_company_id AND status = 'in_progress';
    PERFORM api_v1_sys_publish_event(
        p_company_id, 'purchase_request', p_pr_id, 'purchase_request.cancelled',
        jsonb_build_object('pr_id', p_pr_id, 'pr_number', v_pr.pr_number, 'cancelled_by', p_cancelled_by, 'reason', p_reason),
        p_cancelled_by, 'user'
    );
    RETURN jsonb_build_object('success', TRUE, 'message', 'PR cancelled.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_close_rfq =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_close_rfq(p_company_id uuid, p_rfq_id uuid, p_closed_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
UPDATE prc_rfqs SET status = 'closed' WHERE rfq_id = p_rfq_id AND company_id = p_company_id AND status = 'published';
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ not found or already closed/cancelled.'); END IF;
    PERFORM api_v1_sys_publish_event(p_company_id, 'rfq', p_rfq_id, 'rfq.closed', jsonb_build_object('rfq_id', p_rfq_id, 'closed_by', p_closed_by));
    RETURN jsonb_build_object('success', TRUE, 'message', 'RFQ closed.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_create_grn =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_create_grn(p_company_id uuid, p_po_id uuid, p_received_by uuid, p_delivery_note_number character varying DEFAULT NULL::character varying, p_warehouse_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_po RECORD; v_grn_id UUID; v_grn_number VARCHAR; v_item JSONB;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_po FROM prc_purchase_orders WHERE po_id = p_po_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PO not found.'); END IF;
    IF v_po.status NOT IN ('issued', 'partially_received') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'PO must be issued before goods can be received.');
    END IF;
    v_grn_number := 'GRN-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM prc_goods_receipts WHERE company_id = p_company_id AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now()))::TEXT, 4, '0'
    );
    INSERT INTO prc_goods_receipts (company_id, grn_number, po_id, supplier_id, receipt_date, delivery_note_number, warehouse_id, received_by, status, notes)
    VALUES (p_company_id, v_grn_number, p_po_id, v_po.supplier_id, now(), p_delivery_note_number, p_warehouse_id, p_received_by, 'draft', p_notes)
    RETURNING grn_id INTO v_grn_id;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO prc_goods_receipt_items (
            company_id, grn_id, po_item_id, product_id, delivered_quantity, accepted_quantity, rejected_quantity, unit_of_measure, rejection_reason
        ) VALUES (
            p_company_id, v_grn_id, (v_item->>'po_item_id')::UUID, (v_item->>'product_id')::UUID,
            (v_item->>'delivered_quantity')::NUMERIC, (v_item->>'accepted_quantity')::NUMERIC,
            COALESCE((v_item->>'rejected_quantity')::NUMERIC, 0), v_item->>'uom', v_item->>'rejection_reason'
        );
    END LOOP;
    RETURN jsonb_build_object('success', TRUE, 'grn_id', v_grn_id, 'grn_number', v_grn_number);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_create_po_from_quotation =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_create_po_from_quotation(p_company_id uuid, p_quotation_id uuid, p_buyer_id uuid, p_expected_delivery_date date DEFAULT NULL::date, p_shipping_terms character varying DEFAULT NULL::character varying, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_quotation RECORD; v_po_id UUID; v_po_number VARCHAR; v_item RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT q.*, r.rfq_id INTO v_quotation FROM prc_quotations q
    JOIN prc_rfqs r ON q.rfq_id = r.rfq_id WHERE q.quotation_id = p_quotation_id AND q.company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Quotation not found.'); END IF;
    IF v_quotation.status != 'accepted' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Only accepted quotations can be converted to PO.'); END IF;
    v_po_number := 'PO-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM prc_purchase_orders WHERE company_id = p_company_id AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now()))::TEXT, 5, '0'
    );
    INSERT INTO prc_purchase_orders (
        company_id, po_number, supplier_id, rfq_id, quotation_id, status,
        expected_delivery_date, currency, subtotal, tax_amount, total_amount, payment_terms, shipping_terms, notes, buyer_id
    ) VALUES (
        p_company_id, v_po_number, v_quotation.supplier_id, v_quotation.rfq_id, p_quotation_id, 'draft',
        p_expected_delivery_date, v_quotation.currency, 0, 0, 0, v_quotation.payment_terms, p_shipping_terms, p_notes, p_buyer_id
    ) RETURNING po_id INTO v_po_id;
    FOR v_item IN
        SELECT qi.*, ri.pr_item_id FROM prc_quotation_items qi
        LEFT JOIN prc_rfq_items ri ON qi.rfq_item_id = ri.rfq_item_id
        WHERE qi.quotation_id = p_quotation_id AND qi.company_id = p_company_id
    LOOP
        INSERT INTO prc_purchase_order_items (
            company_id, po_id, pr_item_id, product_id, description, quantity, unit_of_measure,
            unit_price, discount_percentage, net_unit_price, tax_percentage, total_price
        ) VALUES (
            p_company_id, v_po_id, v_item.pr_item_id, v_item.product_id, v_item.description,
            v_item.offered_quantity, v_item.unit_of_measure, v_item.unit_price, v_item.discount_percentage,
            v_item.net_unit_price, v_item.tax_percentage, v_item.total_price
        );
    END LOOP;
    UPDATE prc_purchase_orders SET
        subtotal = (SELECT SUM(net_unit_price * quantity) FROM prc_purchase_order_items WHERE po_id = v_po_id),
        tax_amount = (SELECT SUM(total_price * tax_percentage / 100) FROM prc_purchase_order_items WHERE po_id = v_po_id),
        total_amount = v_quotation.total_amount
    WHERE po_id = v_po_id;
    RETURN jsonb_build_object('success', TRUE, 'po_id', v_po_id, 'po_number', v_po_number, 'message', 'PO created from awarded quotation.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_create_pr =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_create_pr(p_company_id uuid, p_requester_id uuid, p_department_id uuid DEFAULT NULL::uuid, p_justification text DEFAULT NULL::text, p_priority character varying DEFAULT 'normal'::character varying, p_required_date date DEFAULT NULL::date, p_currency character varying DEFAULT 'SAR'::character varying, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_pr_id UUID; v_pr_number VARCHAR; v_item JSONB;
    v_total NUMERIC := 0; v_item_total NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
v_pr_number := 'PR-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM prc_purchase_requests 
         WHERE company_id = p_company_id AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now()))::TEXT, 4, '0'
    );
    IF p_priority NOT IN ('normal', 'high', 'urgent') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid priority value.');
    END IF;
    INSERT INTO prc_purchase_requests (
        company_id, pr_number, requester_id, department_id, justification, status, priority, required_date, currency
    ) VALUES (
        p_company_id, v_pr_number, p_requester_id, p_department_id, p_justification, 'draft', p_priority, p_required_date, p_currency
    ) RETURNING pr_id INTO v_pr_id;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'estimated_unit_price')::NUMERIC;
        v_total := v_total + v_item_total;
        INSERT INTO prc_purchase_request_items (
            company_id, pr_id, product_id, description, quantity, unit_of_measure, estimated_unit_price, total_estimated_price
        ) VALUES (
            p_company_id, v_pr_id, (v_item->>'product_id')::UUID, v_item->>'description',
            (v_item->>'quantity')::NUMERIC, v_item->>'uom',
            (v_item->>'estimated_unit_price')::NUMERIC, v_item_total
        );
    END LOOP;
    UPDATE prc_purchase_requests SET total_estimated_value = v_total WHERE pr_id = v_pr_id;
    RETURN jsonb_build_object('success', TRUE, 'pr_id', v_pr_id, 'pr_number', v_pr_number, 'total_estimated_value', v_total, 'message', 'PR created in draft status.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_create_rfq =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_create_rfq(p_company_id uuid, p_buyer_id uuid, p_title character varying, p_submission_deadline timestamp with time zone, p_delivery_date date DEFAULT NULL::date, p_terms_and_conditions text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb, p_pr_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_rfq_id UUID; v_rfq_number VARCHAR; v_item JSONB; v_pr_item RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF p_submission_deadline <= now() THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Submission deadline must be in the future.');
    END IF;
    v_rfq_number := 'RFQ-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM prc_rfqs WHERE company_id = p_company_id
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now()))::TEXT, 4, '0'
    );
    INSERT INTO prc_rfqs (company_id, rfq_number, title, status, submission_deadline, delivery_date, terms_and_conditions, buyer_id)
    VALUES (p_company_id, v_rfq_number, p_title, 'draft', p_submission_deadline, p_delivery_date, p_terms_and_conditions, p_buyer_id)
    RETURNING rfq_id INTO v_rfq_id;
    IF p_pr_id IS NOT NULL THEN
        FOR v_pr_item IN SELECT * FROM prc_purchase_request_items WHERE pr_id = p_pr_id AND company_id = p_company_id LOOP
            INSERT INTO prc_rfq_items (company_id, rfq_id, pr_item_id, product_id, description, quantity, unit_of_measure)
            VALUES (p_company_id, v_rfq_id, v_pr_item.pr_item_id, v_pr_item.product_id, v_pr_item.description, v_pr_item.quantity, v_pr_item.unit_of_measure);
        END LOOP;
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO prc_rfq_items (company_id, rfq_id, product_id, description, quantity, unit_of_measure, target_unit_price)
        VALUES (p_company_id, v_rfq_id, (v_item->>'product_id')::UUID, v_item->>'description',
                (v_item->>'quantity')::NUMERIC, v_item->>'uom', (v_item->>'target_unit_price')::NUMERIC);
    END LOOP;
    RETURN jsonb_build_object('success', TRUE, 'rfq_id', v_rfq_id, 'rfq_number', v_rfq_number);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_create_supplier =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_create_supplier(p_company_id uuid, p_legal_name character varying, p_trade_name character varying DEFAULT NULL::character varying, p_supplier_type character varying DEFAULT 'distributor'::character varying, p_category_id uuid DEFAULT NULL::uuid, p_country character varying DEFAULT 'SA'::character varying, p_city character varying DEFAULT ''::character varying, p_currency character varying DEFAULT 'SAR'::character varying, p_tax_number character varying DEFAULT NULL::character varying, p_commercial_registration character varying DEFAULT NULL::character varying, p_vat_number character varying DEFAULT NULL::character varying, p_website character varying DEFAULT NULL::character varying, p_initial_rating smallint DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_supplier_id UUID;
    v_supplier_code VARCHAR;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
v_supplier_code := 'SUP-' || LPAD(
        (SELECT COALESCE(MAX(SUBSTRING(supplier_code FROM 5)::INT), 0) + 1 
         FROM prc_suppliers WHERE company_id = p_company_id)::TEXT, 5, '0'
    );
    INSERT INTO prc_suppliers (
        company_id, supplier_code, legal_name, trade_name,
        supplier_type, category_id, country, city,
        currency, tax_number, commercial_registration, vat_number,
        website, initial_rating, status
    ) VALUES (
        p_company_id, v_supplier_code, p_legal_name, p_trade_name,
        p_supplier_type, p_category_id, p_country, p_city,
        p_currency, p_tax_number, p_commercial_registration, p_vat_number,
        p_website, p_initial_rating, 'draft'
    ) RETURNING supplier_id INTO v_supplier_id;
    INSERT INTO prc_supplier_scores (supplier_id, company_id)
    VALUES (v_supplier_id, p_company_id) ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', TRUE, 'supplier_id', v_supplier_id, 'supplier_code', v_supplier_code, 'message', 'Supplier created in draft status.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_instantiate_pr_workflow =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_instantiate_pr_workflow(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_template_id UUID;
    v_workflow_id UUID;
    v_state_draft UUID;
    v_state_dept UUID;
    v_state_fin UUID;
    v_state_appr UUID;
    v_state_rej UUID;
    v_trans_submit UUID;
    v_trans_dept_appr UUID;
    v_trans_dept_rej UUID;
    v_trans_fin_appr UUID;
    v_trans_fin_rej UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT template_id INTO v_template_id
    FROM sys_workflow_templates
    WHERE name = 'Standard PR Approval Workflow' LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRC-001: PR Approval Workflow Template not found.';
    END IF;
    INSERT INTO sys_workflow_definitions (company_id, template_id, name, domain)
    VALUES (p_company_id, v_template_id, 'Purchase Request Approval', 'prc')
    RETURNING workflow_id INTO v_workflow_id;
    INSERT INTO sys_workflow_states (workflow_id, name, state_type) VALUES (v_workflow_id, 'Draft', 'initial') RETURNING state_id INTO v_state_draft;
    INSERT INTO sys_workflow_states (workflow_id, name, state_type, sla_minutes) VALUES (v_workflow_id, 'Department Review', 'normal', 1440) RETURNING state_id INTO v_state_dept;
    INSERT INTO sys_workflow_states (workflow_id, name, state_type, sla_minutes) VALUES (v_workflow_id, 'Finance Review', 'normal', 2880) RETURNING state_id INTO v_state_fin;
    INSERT INTO sys_workflow_states (workflow_id, name, state_type) VALUES (v_workflow_id, 'Approved', 'terminal') RETURNING state_id INTO v_state_appr;
    INSERT INTO sys_workflow_states (workflow_id, name, state_type) VALUES (v_workflow_id, 'Rejected', 'terminal') RETURNING state_id INTO v_state_rej;
    INSERT INTO sys_workflow_transitions (workflow_id, from_state_id, to_state_id, name) VALUES (v_workflow_id, v_state_draft, v_state_dept, 'Submit PR') RETURNING transition_id INTO v_trans_submit;
    INSERT INTO sys_workflow_transitions (workflow_id, from_state_id, to_state_id, name) VALUES (v_workflow_id, v_state_dept, v_state_fin, 'Approve (Department)') RETURNING transition_id INTO v_trans_dept_appr;
    INSERT INTO sys_workflow_transitions (workflow_id, from_state_id, to_state_id, name) VALUES (v_workflow_id, v_state_dept, v_state_rej, 'Reject (Department)') RETURNING transition_id INTO v_trans_dept_rej;
    INSERT INTO sys_workflow_transitions (workflow_id, from_state_id, to_state_id, name) VALUES (v_workflow_id, v_state_fin, v_state_appr, 'Approve (Finance)') RETURNING transition_id INTO v_trans_fin_appr;
    INSERT INTO sys_workflow_transitions (workflow_id, from_state_id, to_state_id, name) VALUES (v_workflow_id, v_state_fin, v_state_rej, 'Reject (Finance)') RETURNING transition_id INTO v_trans_fin_rej;
    INSERT INTO sys_workflow_actions (action_type, payload) VALUES 
        ('publish_event', '{"event_type": "purchase_request.approved"}'),
        ('publish_event', '{"event_type": "purchase_request.rejected"}'),
        ('publish_event', '{"event_type": "purchase_request.rejected"}');
    RETURN v_workflow_id;
END;
$function$

-- ===== api_v1_prc_invite_supplier_to_rfq =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_invite_supplier_to_rfq(p_company_id uuid, p_rfq_id uuid, p_supplier_id uuid, p_invited_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_rfq RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_rfq FROM prc_rfqs WHERE rfq_id = p_rfq_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ not found.'); END IF;
    IF v_rfq.status NOT IN ('draft', 'published') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot invite to a closed or cancelled RFQ.'); END IF;
    IF NOT EXISTS (SELECT 1 FROM prc_suppliers WHERE supplier_id = p_supplier_id AND company_id = p_company_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier must be active to be invited.');
    END IF;
    INSERT INTO prc_rfq_suppliers (company_id, rfq_id, supplier_id, status)
    VALUES (p_company_id, p_rfq_id, p_supplier_id, 'invited') ON CONFLICT (rfq_id, supplier_id) DO NOTHING;
    PERFORM api_v1_sys_enqueue_job(p_company_id, 'rfq_supplier_notification',
        jsonb_build_object('rfq_id', p_rfq_id, 'supplier_id', p_supplier_id, 'rfq_number', v_rfq.rfq_number, 'notification_type', 'rfq_invitation'),
        NULL, now() + INTERVAL '30 seconds');
    RETURN jsonb_build_object('success', TRUE, 'message', 'Supplier invited and notified.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_issue_po =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_issue_po(p_company_id uuid, p_po_id uuid, p_issued_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_po RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_po FROM prc_purchase_orders WHERE po_id = p_po_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PO not found.'); END IF;
    IF v_po.status NOT IN ('draft', 'approved') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PO must be draft or approved to be issued.'); END IF;
    UPDATE prc_purchase_orders SET status = 'issued', issue_date = CURRENT_DATE WHERE po_id = p_po_id;
    PERFORM api_v1_sys_enqueue_job(p_company_id, 'po_supplier_notification',
        jsonb_build_object('po_id', p_po_id, 'po_number', v_po.po_number, 'supplier_id', v_po.supplier_id, 'notification_type', 'po_issued'),
        NULL, now() + INTERVAL '30 seconds');
    RETURN jsonb_build_object('success', TRUE, 'po_number', v_po.po_number, 'message', 'PO issued.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_publish_rfq =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_publish_rfq(p_company_id uuid, p_rfq_id uuid, p_published_by uuid, p_supplier_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_rfq RECORD; v_supplier_id UUID; v_item_count INT;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_rfq FROM prc_rfqs WHERE rfq_id = p_rfq_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ not found.'); END IF;
    IF v_rfq.status != 'draft' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Only draft RFQs can be published.'); END IF;
    SELECT COUNT(*) INTO v_item_count FROM prc_rfq_items WHERE rfq_id = p_rfq_id AND company_id = p_company_id;
    IF v_item_count = 0 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ must have at least one item before publishing.'); END IF;
    UPDATE prc_rfqs SET status = 'published' WHERE rfq_id = p_rfq_id;
    FOREACH v_supplier_id IN ARRAY p_supplier_ids LOOP
        INSERT INTO prc_rfq_suppliers (company_id, rfq_id, supplier_id, status)
        VALUES (p_company_id, p_rfq_id, v_supplier_id, 'invited') ON CONFLICT (rfq_id, supplier_id) DO NOTHING;
        PERFORM api_v1_sys_enqueue_job(p_company_id, 'rfq_supplier_notification',
            jsonb_build_object('rfq_id', p_rfq_id, 'rfq_number', v_rfq.rfq_number, 'supplier_id', v_supplier_id, 'submission_deadline', v_rfq.submission_deadline, 'notification_type', 'rfq_invitation'),
            NULL, now() + INTERVAL '30 seconds');
    END LOOP;
    PERFORM api_v1_sys_enqueue_job(p_company_id, 'rfq_auto_close', jsonb_build_object('rfq_id', p_rfq_id), NULL, v_rfq.submission_deadline);
    PERFORM api_v1_sys_publish_event(p_company_id, 'rfq', p_rfq_id, 'rfq.published',
        jsonb_build_object('rfq_id', p_rfq_id, 'rfq_number', v_rfq.rfq_number, 'suppliers_invited', array_length(p_supplier_ids, 1)), p_published_by, 'user');
    RETURN jsonb_build_object('success', TRUE, 'rfq_id', p_rfq_id, 'suppliers_invited', array_length(p_supplier_ids, 1), 'auto_close_scheduled_at', v_rfq.submission_deadline, 'message', 'RFQ published and supplier notifications queued.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_record_supplier_document =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_record_supplier_document(p_company_id uuid, p_supplier_id uuid, p_document_type character varying, p_title character varying, p_file_url character varying, p_issue_date date DEFAULT NULL::date, p_expiry_date date DEFAULT NULL::date, p_reminder_days smallint[] DEFAULT '{30,15,7}'::smallint[], p_uploaded_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_document_id UUID; v_reminder_day SMALLINT; v_reminder_date DATE;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
INSERT INTO prc_supplier_documents (
        company_id, supplier_id, document_type, title, file_url, issue_date, expiry_date, reminder_days, is_verified
    ) VALUES (
        p_company_id, p_supplier_id, p_document_type, p_title, p_file_url, p_issue_date, p_expiry_date, p_reminder_days, FALSE
    ) RETURNING document_id INTO v_document_id;
    IF p_expiry_date IS NOT NULL THEN
        FOREACH v_reminder_day IN ARRAY p_reminder_days LOOP
            v_reminder_date := p_expiry_date - v_reminder_day;
            IF v_reminder_date > CURRENT_DATE THEN
                PERFORM api_v1_sys_enqueue_job(
                    p_company_id, 'document_expiry_reminder',
                    jsonb_build_object('document_id', v_document_id, 'supplier_id', p_supplier_id, 'document_type', p_document_type, 'days_until_expiry', v_reminder_day, 'expiry_date', p_expiry_date),
                    NULL, v_reminder_date::TIMESTAMPTZ
                );
            END IF;
        END LOOP;
    END IF;
    RETURN jsonb_build_object('success', TRUE, 'document_id', v_document_id, 'reminders_scheduled', array_length(p_reminder_days, 1));
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_run_three_way_match =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_run_three_way_match(p_company_id uuid, p_invoice_id uuid, p_matched_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_invoice RECORD; v_inv_item RECORD; v_po_item RECORD;
    v_discrepancies JSONB := '[]'::JSONB; v_discrepancy JSONB;
    v_is_successful BOOLEAN := TRUE; v_match_id UUID;
    v_price_variance NUMERIC; v_qty_variance NUMERIC; v_total_accepted_qty NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_invoice FROM prc_purchase_invoices WHERE invoice_id = p_invoice_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice not found.'); END IF;
    FOR v_inv_item IN SELECT * FROM prc_purchase_invoice_items WHERE invoice_id = p_invoice_id AND company_id = p_company_id LOOP
        SELECT * INTO v_po_item FROM prc_purchase_order_items WHERE po_item_id = v_inv_item.po_item_id;
        SELECT COALESCE(SUM(gi.accepted_quantity), 0) INTO v_total_accepted_qty
        FROM prc_goods_receipt_items gi JOIN prc_goods_receipts gr ON gi.grn_id = gr.grn_id
        WHERE gi.po_item_id = v_inv_item.po_item_id AND gr.company_id = p_company_id
          AND gr.status IN ('accepted', 'partially_accepted');
        v_qty_variance := v_inv_item.invoiced_quantity - v_total_accepted_qty;
        IF ABS(v_qty_variance) > 0.001 THEN
            v_is_successful := FALSE;
            v_discrepancy := jsonb_build_object('type', 'quantity_variance', 'po_item_id', v_inv_item.po_item_id,
                'invoiced_qty', v_inv_item.invoiced_quantity, 'accepted_qty', v_total_accepted_qty, 'variance', v_qty_variance);
            v_discrepancies := v_discrepancies || v_discrepancy;
        END IF;
        v_price_variance := ABS(v_inv_item.unit_price - v_po_item.net_unit_price);
        IF v_price_variance > (v_po_item.net_unit_price * 0.01) THEN
            v_is_successful := FALSE;
            v_discrepancy := jsonb_build_object('type', 'price_variance', 'po_item_id', v_inv_item.po_item_id,
                'po_price', v_po_item.net_unit_price, 'invoice_price', v_inv_item.unit_price, 'variance', v_price_variance);
            v_discrepancies := v_discrepancies || v_discrepancy;
        END IF;
        UPDATE prc_purchase_invoice_items SET variance_amount = v_price_variance + (v_qty_variance * v_inv_item.unit_price)
        WHERE invoice_item_id = v_inv_item.invoice_item_id;
    END LOOP;
    INSERT INTO prc_three_way_matches (company_id, invoice_id, po_id, matched_by, match_date, is_successful, discrepancy_details)
    VALUES (p_company_id, p_invoice_id, v_invoice.po_id, p_matched_by, now(), v_is_successful, v_discrepancies)
    RETURNING match_id INTO v_match_id;
    UPDATE prc_purchase_invoices
    SET matching_status = CASE WHEN v_is_successful THEN 'matched' ELSE 'unmatched' END,
        status = CASE WHEN v_is_successful THEN 'matched' ELSE 'discrepancy' END
    WHERE invoice_id = p_invoice_id;
    PERFORM api_v1_sys_publish_event(p_company_id, 'purchase_invoice', p_invoice_id,
        CASE WHEN v_is_successful THEN 'invoice.matched' ELSE 'invoice.discrepancy' END,
        jsonb_build_object('invoice_id', p_invoice_id, 'match_id', v_match_id, 'is_successful', v_is_successful, 'discrepancy_count', jsonb_array_length(v_discrepancies)));
    RETURN jsonb_build_object('success', TRUE, 'match_id', v_match_id, 'is_successful', v_is_successful, 'discrepancies', v_discrepancies,
        'message', CASE WHEN v_is_successful THEN 'Three-way match successful. Invoice is ready for payment.' ELSE 'Discrepancies found. Review and approve variance or contact supplier.' END);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_schedule_analytics_job =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_schedule_analytics_job(p_company_id uuid, p_scheduled_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_period_start DATE := DATE_TRUNC('month', now() - INTERVAL '1 month')::DATE;
    v_period_end DATE := (DATE_TRUNC('month', now()) - INTERVAL '1 day')::DATE;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
PERFORM api_v1_sys_enqueue_job(
        p_company_id, 'supplier_analytics_batch',
        jsonb_build_object('period_start', v_period_start, 'period_end', v_period_end, 'job_type', 'monthly_metrics_and_sla_check'),
        NULL, now() + INTERVAL '5 minutes'
    );
    RETURN jsonb_build_object('success', TRUE, 'period_start', v_period_start, 'period_end', v_period_end,
        'message', 'Analytics batch job scheduled for ' || v_period_start || ' to ' || v_period_end);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_score_quotation =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_score_quotation(p_company_id uuid, p_evaluation_id uuid, p_quotation_id uuid, p_price_score numeric, p_technical_score numeric, p_delivery_score numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF p_price_score NOT BETWEEN 0 AND 100 OR p_technical_score NOT BETWEEN 0 AND 100 OR p_delivery_score NOT BETWEEN 0 AND 100 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Scores must be between 0 and 100.');
    END IF;
    UPDATE prc_rfq_evaluation_scores SET price_score = p_price_score, technical_score = p_technical_score,
        delivery_score = p_delivery_score, updated_at = now()
    WHERE evaluation_id = p_evaluation_id AND quotation_id = p_quotation_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Score record not found.'); END IF;
    RETURN jsonb_build_object('success', TRUE, 'message', 'Scores updated.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_start_evaluation =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_start_evaluation(p_company_id uuid, p_rfq_id uuid, p_evaluator_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_evaluation_id UUID; v_quotation RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM prc_rfqs WHERE rfq_id = p_rfq_id AND company_id = p_company_id AND status = 'closed') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ must be closed before evaluation can start.');
    END IF;
    INSERT INTO prc_rfq_evaluations (company_id, rfq_id, evaluator_id, status)
    VALUES (p_company_id, p_rfq_id, p_evaluator_id, 'in_progress')
    ON CONFLICT (company_id, rfq_id) DO UPDATE SET evaluator_id = EXCLUDED.evaluator_id, status = 'in_progress', updated_at = now()
    RETURNING evaluation_id INTO v_evaluation_id;
    FOR v_quotation IN SELECT quotation_id FROM prc_quotations WHERE rfq_id = p_rfq_id AND company_id = p_company_id AND status = 'submitted' LOOP
        INSERT INTO prc_rfq_evaluation_scores (company_id, evaluation_id, quotation_id)
        VALUES (p_company_id, v_evaluation_id, v_quotation.quotation_id) ON CONFLICT (evaluation_id, quotation_id) DO NOTHING;
    END LOOP;
    RETURN jsonb_build_object('success', TRUE, 'evaluation_id', v_evaluation_id, 'message', 'Evaluation started.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_submit_pr =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_submit_pr(p_company_id uuid, p_pr_id uuid, p_submitted_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_pr RECORD; v_workflow_id UUID; v_instance_id UUID;
    v_dept_state_id UUID;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_pr FROM prc_purchase_requests WHERE pr_id = p_pr_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PR not found.'); END IF;
    IF v_pr.status != 'draft' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Only draft PRs can be submitted.'); END IF;
    IF v_pr.total_estimated_value <= 0 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PR must have at least one item with a price.'); END IF;
    SELECT wd.workflow_id INTO v_workflow_id FROM sys_workflow_definitions wd
    WHERE wd.company_id = p_company_id AND wd.domain = 'prc' ORDER BY wd.created_at DESC LIMIT 1;
    IF v_workflow_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'PR Approval Workflow not initialized for this company.');
    END IF;
    SELECT state_id INTO v_dept_state_id FROM sys_workflow_states
    WHERE workflow_id = v_workflow_id AND name = 'Department Review' LIMIT 1;
    INSERT INTO sys_workflow_instances (
        company_id, workflow_id, aggregate_type, aggregate_id, current_state_id, status, started_by
    ) VALUES (
        p_company_id, v_workflow_id, 'purchase_request', p_pr_id, v_dept_state_id, 'in_progress', p_submitted_by
    ) RETURNING instance_id INTO v_instance_id;
    UPDATE prc_purchase_requests SET status = 'submitted' WHERE pr_id = p_pr_id;
    PERFORM api_v1_sys_publish_event(
        p_company_id, 'purchase_request', p_pr_id, 'purchase_request.submitted',
        jsonb_build_object('pr_id', p_pr_id, 'pr_number', v_pr.pr_number, 'workflow_instance_id', v_instance_id, 'submitted_by', p_submitted_by),
        p_submitted_by, 'user'
    );
    RETURN jsonb_build_object('success', TRUE, 'pr_id', p_pr_id, 'workflow_instance_id', v_instance_id, 'message', 'PR submitted for approval. Workflow started.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_submit_quotation =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_submit_quotation(p_company_id uuid, p_rfq_id uuid, p_supplier_id uuid, p_currency character varying DEFAULT 'SAR'::character varying, p_valid_until date DEFAULT NULL::date, p_payment_terms character varying DEFAULT NULL::character varying, p_delivery_lead_time_days smallint DEFAULT 0, p_notes text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_rfq RECORD; v_quotation_id UUID; v_item JSONB;
    v_net_unit_price NUMERIC; v_item_total NUMERIC; v_grand_total NUMERIC := 0;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_rfq FROM prc_rfqs WHERE rfq_id = p_rfq_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ not found.'); END IF;
    IF v_rfq.status != 'published' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ is not open for quotations. Status: ' || v_rfq.status);
    END IF;
    IF v_rfq.submission_deadline < now() THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'RFQ submission deadline has passed.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM prc_rfq_suppliers WHERE rfq_id = p_rfq_id AND supplier_id = p_supplier_id AND company_id = p_company_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier was not invited to this RFQ.');
    END IF;
    INSERT INTO prc_quotations (
        company_id, rfq_id, supplier_id, status, valid_until, currency, payment_terms, delivery_lead_time_days, notes
    ) VALUES (
        p_company_id, p_rfq_id, p_supplier_id, 'draft', p_valid_until, p_currency, p_payment_terms, p_delivery_lead_time_days, p_notes
    )
    ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET
        status = 'draft', valid_until = EXCLUDED.valid_until, currency = EXCLUDED.currency,
        payment_terms = EXCLUDED.payment_terms, delivery_lead_time_days = EXCLUDED.delivery_lead_time_days,
        notes = EXCLUDED.notes, updated_at = now()
    RETURNING quotation_id INTO v_quotation_id;
    DELETE FROM prc_quotation_items WHERE quotation_id = v_quotation_id;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_net_unit_price := (v_item->>'unit_price')::NUMERIC * (1 - COALESCE((v_item->>'discount_percentage')::NUMERIC, 0) / 100);
        v_item_total := v_net_unit_price * (v_item->>'offered_quantity')::NUMERIC;
        v_grand_total := v_grand_total + v_item_total;
        INSERT INTO prc_quotation_items (
            company_id, quotation_id, rfq_item_id, product_id, offered_quantity, unit_of_measure,
            unit_price, discount_percentage, net_unit_price, tax_percentage, total_price, remarks
        ) VALUES (
            p_company_id, v_quotation_id, (v_item->>'rfq_item_id')::UUID, (v_item->>'product_id')::UUID,
            (v_item->>'offered_quantity')::NUMERIC, v_item->>'uom', (v_item->>'unit_price')::NUMERIC,
            COALESCE((v_item->>'discount_percentage')::NUMERIC, 0), v_net_unit_price,
            COALESCE((v_item->>'tax_percentage')::NUMERIC, 0), v_item_total, v_item->>'remarks'
        );
    END LOOP;
    UPDATE prc_quotations SET total_amount = v_grand_total, status = 'submitted', updated_at = now()
    WHERE quotation_id = v_quotation_id;
    UPDATE prc_rfq_suppliers SET status = 'submitted', responded_at = now()
    WHERE rfq_id = p_rfq_id AND supplier_id = p_supplier_id;
    RETURN jsonb_build_object('success', TRUE, 'quotation_id', v_quotation_id, 'total_amount', v_grand_total, 'message', 'Quotation submitted successfully.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_submit_supplier_approval =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_submit_supplier_approval(p_company_id uuid, p_supplier_id uuid, p_submitted_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_supplier RECORD;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_supplier FROM prc_suppliers WHERE supplier_id = p_supplier_id AND company_id = p_company_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier not found.'); END IF;
    IF v_supplier.status != 'draft' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Only draft suppliers can be submitted for approval.'); END IF;
    UPDATE prc_suppliers SET status = 'inactive' WHERE supplier_id = p_supplier_id;
    PERFORM api_v1_sys_publish_event(
        p_company_id, 'supplier', p_supplier_id, 'supplier.submitted_for_approval',
        jsonb_build_object('supplier_id', p_supplier_id, 'legal_name', v_supplier.legal_name, 'submitted_by', p_submitted_by),
        p_submitted_by, 'user'
    );
    RETURN jsonb_build_object('success', TRUE, 'message', 'Supplier submitted for approval.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_update_supplier_scores =====


CREATE OR REPLACE FUNCTION public.api_v1_prc_update_supplier_scores(p_company_id uuid, p_supplier_id uuid, p_period_start date, p_period_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_metrics RECORD; v_overall NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT * INTO v_metrics FROM prc_supplier_metrics
    WHERE company_id = p_company_id AND supplier_id = p_supplier_id
      AND period_start = p_period_start AND period_end = p_period_end;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Metrics not found. Run calculate_supplier_metrics first.'); END IF;
    v_overall := ROUND(
        (v_metrics.on_time_delivery_rate * 0.30) + (v_metrics.quality_acceptance_rate * 0.40) +
        (v_metrics.rfq_response_rate * 0.15) + (GREATEST(0, 100 - v_metrics.price_variance_avg) * 0.15), 2
    );
    UPDATE prc_supplier_scores SET
        delivery_score = v_metrics.on_time_delivery_rate,
        quality_score = v_metrics.quality_acceptance_rate,
        response_score = v_metrics.rfq_response_rate,
        price_score = GREATEST(0, 100 - v_metrics.price_variance_avg),
        overall_score = v_overall,
        last_evaluated_at = now()
    WHERE supplier_id = p_supplier_id AND company_id = p_company_id;
    RETURN jsonb_build_object('success', TRUE, 'overall_score', v_overall, 'message', 'Supplier scores updated.');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_update_supplier_terms =====


