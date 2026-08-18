-- ============================================================
-- BASELINE: all public functions (exact definitions)
-- Generated 2026-08-18 from project zzthamxjxnxzzpswllid (schema-only, public schema).
-- ============================================================

-- Functions

-- ===== add_vin_parts_to_inventory =====

CREATE OR REPLACE FUNCTION public.add_vin_parts_to_inventory(p_company_id uuid, p_vehicle jsonb, p_parts jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_company    uuid;
    v_vehicle_id uuid;
    v_make       text;
    v_model      text;
    v_year       integer;
    v_year_from  integer;
    v_year_to    integer;
    v_part       jsonb;
    v_base       text;
    v_sku        text;
    v_suffix     text;
    v_product_id uuid;
    v_source     text;
    v_created    integer := 0;
BEGIN
    -- 1) Tenant isolation + role (mirrors products_insert RLS)
    v_company := public.verify_company_access(p_company_id);
    IF NOT public.user_is_admin_or_manager() THEN
        RAISE EXCEPTION 'Insufficient privileges to add products' USING ERRCODE = '42501';
    END IF;

    -- 2) Vehicle resolution (find-or-create when no catalog id present)
    v_make := COALESCE(NULLIF(TRIM(p_vehicle->>'make'), ''), '');
    IF v_make = '' THEN
        RAISE EXCEPTION 'Vehicle make is required' USING ERRCODE = '22023';
    END IF;
    v_model     := NULLIF(TRIM(p_vehicle->>'model'), '');
    v_year      := NULLIF(p_vehicle->>'year', '')::integer;
    v_year_from := COALESCE(NULLIF(p_vehicle->>'year_start', '')::integer, v_year);
    v_year_to   := COALESCE(NULLIF(p_vehicle->>'year_end', '')::integer, v_year);

    v_vehicle_id := NULLIF(p_vehicle->>'id', '')::uuid;
    IF v_vehicle_id IS NULL THEN
        v_vehicle_id := public.ensure_vehicle(
            v_make, v_model, v_year,
            NULLIF(p_vehicle->>'engine', ''), NULLIF(p_vehicle->>'body_type', ''),
            NULLIF(p_vehicle->>'drive_type', ''), NULLIF(p_vehicle->>'fuel_type', ''),
            NULLIF(p_vehicle->>'transmission', ''), NULLIF(p_vehicle->>'region', '')
        );
    END IF;

    -- 3) Create each part atomically (single transaction)
    FOR v_part IN SELECT value FROM jsonb_array_elements(COALESCE(p_parts, '[]'::jsonb)) LOOP
        v_base := left(upper(regexp_replace(COALESCE(v_part->>'part_number', ''), '[^A-Z0-9]', '', 'g')), 24);
        v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
        v_sku := CASE WHEN v_base <> '' THEN 'VIN-' || v_base || '-' || v_suffix ELSE 'VIN-' || v_suffix END;

        INSERT INTO public.products (
            company_id, name_ar, sku, part_number, brand,
            sale_price, purchase_price, cost_price, min_stock_level, unit, status
        ) VALUES (
            v_company,
            COALESCE(NULLIF(v_part->>'description', ''), NULLIF(v_part->>'part_number', ''), 'قطعة غيار'),
            v_sku,
            NULLIF(v_part->>'part_number', ''),
            COALESCE(NULLIF(v_part->>'manufacturer', ''), v_make),
            0, 0, 0, 0, 'pcs', 'active'
        )
        RETURNING id INTO v_product_id;

        INSERT INTO public.vehicle_products (
            company_id, vehicle_id, product_id, fitment_status, source, created_by
        ) VALUES (
            v_company, v_vehicle_id, v_product_id, 'POSSIBLE', 'vin_extract', auth.uid()
        )
        ON CONFLICT (vehicle_id, product_id) DO NOTHING;

        v_source := CASE upper(COALESCE(v_part->>'source', 'manual'))
            WHEN 'MEGAZIP' THEN 'MEGAZIP'
            WHEN 'AI' THEN 'AI'
            WHEN 'FAPI' THEN 'FAPI'
            ELSE 'MANUAL'
        END;

        INSERT INTO public.part_compatibility (
            company_id, part_number, manufacturer,
            vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to,
            compatibility_status, source, confidence, evidence
        ) VALUES (
            v_company,
            COALESCE(NULLIF(v_part->>'part_number', ''), v_sku),
            NULLIF(v_part->>'manufacturer', ''),
            v_make, v_model, v_year_from, v_year_to,
            'POSSIBLE', v_source, 2,
            jsonb_build_object('description', NULLIF(v_part->>'description', ''), 'source', v_part->>'source')
        )
        ON CONFLICT ON CONSTRAINT uq_part_compat DO NOTHING;

        v_created := v_created + 1;
    END LOOP;

    RETURN v_created;
END;
$function$

-- ===== admin_recalculate_all_stock =====

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

CREATE OR REPLACE FUNCTION public.api_v1_prc_update_supplier_terms(p_company_id uuid, p_supplier_id uuid, p_payment_terms character varying, p_credit_limit numeric DEFAULT 0, p_credit_days smallint DEFAULT 0, p_incoterm character varying DEFAULT NULL::character varying, p_shipping_terms character varying DEFAULT NULL::character varying, p_delivery_method character varying DEFAULT NULL::character varying, p_return_policy text DEFAULT NULL::text, p_warranty_terms text DEFAULT NULL::text, p_penalty_rules text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM prc_suppliers WHERE supplier_id = p_supplier_id AND company_id = p_company_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier not found.');
    END IF;
    INSERT INTO prc_supplier_terms (
        company_id, supplier_id, payment_terms, credit_limit, credit_days,
        incoterm, shipping_terms, delivery_method, return_policy, warranty_terms, penalty_rules
    ) VALUES (
        p_company_id, p_supplier_id, p_payment_terms, p_credit_limit, p_credit_days,
        p_incoterm, p_shipping_terms, p_delivery_method, p_return_policy, p_warranty_terms, p_penalty_rules
    )
    ON CONFLICT (supplier_id) DO UPDATE SET
        payment_terms = EXCLUDED.payment_terms, credit_limit = EXCLUDED.credit_limit,
        credit_days = EXCLUDED.credit_days, incoterm = EXCLUDED.incoterm,
        shipping_terms = EXCLUDED.shipping_terms, delivery_method = EXCLUDED.delivery_method,
        return_policy = EXCLUDED.return_policy, warranty_terms = EXCLUDED.warranty_terms,
        penalty_rules = EXCLUDED.penalty_rules, updated_at = now();
    RETURN jsonb_build_object('success', TRUE, 'message', 'Commercial terms updated.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_prc_upsert_supplier_price =====

CREATE OR REPLACE FUNCTION public.api_v1_prc_upsert_supplier_price(p_company_id uuid, p_supplier_product_id uuid, p_unit_price numeric, p_currency character varying DEFAULT 'SAR'::character varying, p_minimum_quantity numeric DEFAULT 1, p_discount numeric DEFAULT 0, p_tax_percentage numeric DEFAULT 15, p_effective_from timestamp with time zone DEFAULT now(), p_effective_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_price_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM prc_supplier_products WHERE supplier_product_id = p_supplier_product_id AND company_id = p_company_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Supplier product not found.');
    END IF;
    UPDATE prc_supplier_prices SET status = 'superseded', effective_to = p_effective_from
    WHERE supplier_product_id = p_supplier_product_id AND company_id = p_company_id
      AND minimum_quantity = p_minimum_quantity AND status = 'active';
    INSERT INTO prc_supplier_prices (
        company_id, supplier_product_id, effective_from, effective_to,
        minimum_quantity, unit_price, discount, currency, tax_percentage, status
    ) VALUES (
        p_company_id, p_supplier_product_id, p_effective_from, p_effective_to,
        p_minimum_quantity, p_unit_price, p_discount, p_currency, p_tax_percentage, 'active'
    ) RETURNING price_id INTO v_price_id;
    RETURN jsonb_build_object('success', TRUE, 'price_id', v_price_id, 'message', 'Price record created. Previous price superseded.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$function$

-- ===== api_v1_sys_enqueue_job =====

CREATE OR REPLACE FUNCTION public.api_v1_sys_enqueue_job(p_company_id uuid, p_job_type character varying, p_payload jsonb, p_correlation_id uuid DEFAULT NULL::uuid, p_run_after timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_job_id UUID;
    v_priority SMALLINT;
BEGIN
    SELECT numeric_priority INTO v_priority 
    FROM sys_job_types WHERE job_type = p_job_type;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYS-004: Job type % is not registered in sys_job_types', p_job_type;
    END IF;
    INSERT INTO sys_job_queue (
        company_id, job_type, payload, correlation_id, run_after, numeric_priority
    ) VALUES (
        p_company_id, p_job_type, p_payload, p_correlation_id, p_run_after, v_priority
    ) RETURNING job_id INTO v_job_id;
    RETURN v_job_id;
END;
$function$

-- ===== api_v1_sys_is_feature_enabled =====

CREATE OR REPLACE FUNCTION public.api_v1_sys_is_feature_enabled(p_flag_name character varying, p_company_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_role character varying DEFAULT NULL::character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_flag RECORD;
BEGIN
    SELECT * INTO v_flag FROM sys_feature_flags 
    WHERE flag_name = p_flag_name AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY company_id NULLS LAST LIMIT 1;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF NOT v_flag.is_enabled THEN RETURN FALSE; END IF;
    IF v_flag.effective_from IS NOT NULL AND now() < v_flag.effective_from THEN RETURN FALSE; END IF;
    IF v_flag.effective_to IS NOT NULL AND now() > v_flag.effective_to THEN RETURN FALSE; END IF;
    IF v_flag.target_companies IS NOT NULL AND p_company_id != ALL(v_flag.target_companies) THEN RETURN FALSE; END IF;
    IF v_flag.target_users IS NOT NULL AND p_user_id != ALL(v_flag.target_users) THEN RETURN FALSE; END IF;
    IF v_flag.target_roles IS NOT NULL AND p_role != ALL(v_flag.target_roles) THEN RETURN FALSE; END IF;
    IF v_flag.rollout_percentage IS NOT NULL AND v_flag.rollout_percentage < 100 THEN
        IF (abs(hashtext(COALESCE(p_company_id::text, p_user_id::text, 'default'))) % 100) >= v_flag.rollout_percentage THEN
            RETURN FALSE;
        END IF;
    END IF;
    RETURN TRUE;
END;
$function$

-- ===== api_v1_sys_publish_event =====

CREATE OR REPLACE FUNCTION public.api_v1_sys_publish_event(p_company_id uuid, p_aggregate_type character varying, p_aggregate_id uuid, p_event_type character varying, p_payload jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_type character varying DEFAULT 'system'::character varying, p_correlation_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO sys_domain_events (
        company_id, aggregate_type, aggregate_id, event_type, 
        payload, actor_id, actor_type, correlation_id
    ) VALUES (
        p_company_id, p_aggregate_type, p_aggregate_id, p_event_type, 
        p_payload, p_actor_id, p_actor_type, p_correlation_id
    ) RETURNING event_id INTO v_event_id;
    PERFORM pg_notify('new_domain_event', v_event_id::text);
    RETURN v_event_id;
END;
$function$

-- ===== api_v1_sys_worker_heartbeat =====

CREATE OR REPLACE FUNCTION public.api_v1_sys_worker_heartbeat(p_worker_id character varying)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    UPDATE sys_background_workers 
    SET heartbeat_at = now(), status = 'active'
    WHERE worker_id = p_worker_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYS-005: Worker % not registered', p_worker_id;
    END IF;
END;
$function$

-- ===== assemble_kit =====

CREATE OR REPLACE FUNCTION public.assemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_available_qty NUMERIC;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Process each component
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
        -- Check stock
        SELECT COALESCE(quantity, 0) INTO v_available_qty
        FROM product_stock
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

        IF v_available_qty < (v_component.quantity * p_quantity) THEN
            RAISE EXCEPTION 'Insufficient stock for component %: need %, available %',
                v_component.component_product_id,
                v_component.quantity * p_quantity,
                v_available_qty;
        END IF;

        -- Reduce component stock
        UPDATE product_stock
        SET quantity = quantity - (v_component.quantity * p_quantity),
            updated_at = NOW()
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

        -- Log inventory transaction for component
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            -(v_component.quantity * p_quantity),
            'adj_out', 'kit_assembly', p_kit_product_id, p_user_id
        );
    END LOOP;

    -- Increase kit stock
    INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
    VALUES (p_kit_product_id, p_warehouse_id, p_quantity, p_company_id, NOW(), NOW())
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = product_stock.quantity + p_quantity, updated_at = NOW();

    -- Log inventory transaction for kit
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, p_quantity,
        'adj_in', 'kit_assembly', p_kit_product_id, p_user_id
    );
END;
$function$

-- ===== assert_account_belongs_to_company =====

CREATE OR REPLACE FUNCTION public.assert_account_belongs_to_company(p_account_id uuid, p_company_id uuid, p_param_name text DEFAULT 'p_cash_account_id'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_account_company uuid;
BEGIN
  IF p_account_id IS NULL THEN RETURN; END IF;

  SELECT company_id INTO v_account_company
  FROM accounts WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الحساب % غير موجود أو محذوف',
      p_param_name, p_account_id;
  END IF;

  IF v_account_company != p_company_id THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الحساب % ينتمي للشركة % وليس للشركة %',
      p_param_name, p_account_id, v_account_company, p_company_id;
  END IF;
END;
$function$

-- ===== assert_party_belongs_to_company =====

CREATE OR REPLACE FUNCTION public.assert_party_belongs_to_company(p_party_id uuid, p_company_id uuid, p_param_name text DEFAULT 'p_party_id'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_party_company uuid;
BEGIN
  IF p_party_id IS NULL THEN RETURN; END IF;

  SELECT company_id INTO v_party_company
  FROM parties WHERE id = p_party_id AND deleted_at IS NULL;

  IF v_party_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الطرف % غير موجود أو محذوف',
      p_param_name, p_party_id;
  END IF;

  IF v_party_company != p_company_id THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — الطرف % ينتمي للشركة % وليس للشركة %',
      p_param_name, p_party_id, v_party_company, p_company_id;
  END IF;
END;
$function$

-- ===== assert_product_belongs_to_company =====

CREATE OR REPLACE FUNCTION public.assert_product_belongs_to_company(p_product_id uuid, p_company_id uuid, p_param_name text DEFAULT 'product_id'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_product_company uuid;
BEGIN
  IF p_product_id IS NULL THEN RETURN; END IF;

  SELECT company_id INTO v_product_company
  FROM products WHERE id = p_product_id AND deleted_at IS NULL;

  IF v_product_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — المنتج % غير موجود أو محذوف',
      p_param_name, p_product_id;
  END IF;

  IF v_product_company != p_company_id THEN
    RAISE EXCEPTION 'tenant_violation: المعامل [%] — المنتج % ينتمي للشركة % وليس للشركة %',
      p_param_name, p_product_id, v_product_company, p_company_id;
  END IF;
END;
$function$

-- ===== audit_table_changes =====

CREATE OR REPLACE FUNCTION public.audit_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_details TEXT;
    v_action TEXT;
    v_entity_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF TG_TABLE_NAME = 'invoices' THEN
        v_company_id := COALESCE(NEW.company_id, OLD.company_id);
        IF v_user_id IS NULL THEN v_user_id := COALESCE(NEW.created_by, OLD.created_by); END IF;
    ELSIF TG_TABLE_NAME = 'journal_entries' THEN
        v_company_id := COALESCE(NEW.company_id, OLD.company_id);
        IF v_user_id IS NULL THEN v_user_id := COALESCE(NEW.created_by, OLD.created_by); END IF;
    ELSIF TG_TABLE_NAME IN ('accounts', 'parties', 'warehouses', 'products') THEN
        v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSE
        BEGIN
            v_company_id := COALESCE(NEW.company_id, OLD.company_id);
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
    END IF;

    -- Get entity_id as UUID directly
    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
    ELSE
        v_entity_id := NEW.id;
    END IF;

    v_action := TG_OP;
    IF TG_OP = 'DELETE' THEN
        v_details := 'Record deleted permanently.';
    ELSIF TG_OP = 'INSERT' THEN
        v_details := 'Initial record creation.';
    ELSE
        v_details := 'Changes made to record.';
    END IF;

    IF v_company_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (
                company_id, user_id, action, entity, entity_id, details, created_at
            ) VALUES (
                v_company_id,
                v_user_id,
                v_action,
                TG_TABLE_NAME,
                v_entity_id,
                v_details,
                NOW()
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$

-- ===== auto_assign_fiscal_year_to_invoice =====

CREATE OR REPLACE FUNCTION public.auto_assign_fiscal_year_to_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fiscal_year_id IS NULL THEN
    SELECT id INTO NEW.fiscal_year_id
    FROM public.fiscal_years
    WHERE company_id = NEW.company_id
      AND NEW.issue_date BETWEEN start_date AND end_date
      AND is_closed = false
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$

-- ===== auto_fill_invoice_number =====

CREATE OR REPLACE FUNCTION public.auto_fill_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number(NEW.company_id, NEW.type);
  END IF;
  RETURN NEW;
END;
$function$

-- ===== auto_fill_payment_number =====

CREATE OR REPLACE FUNCTION public.auto_fill_payment_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    NEW.payment_number := generate_payment_number(NEW.company_id, NEW.type);
  END IF;
  RETURN NEW;
END;
$function$

-- ===== auto_journal_from_invoice =====

CREATE OR REPLACE FUNCTION public.auto_journal_from_invoice(p_invoice_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv           RECORD;
  v_je_id       uuid;
  v_net_amount  numeric;
  v_sar_amount  numeric;
  v_cash_acc    uuid;
  v_ar_acc      uuid  := '0edcac7e-3552-4ff5-a1a3-e48379399f5b'; -- ذمم عملاء
  v_ap_acc      uuid  := '1b459821-fdf7-432c-a475-254cf3e4ee24'; -- ذمم موردين
  v_inv_acc     uuid  := '72e507c7-5520-4126-aac4-0f10e5c589d6'; -- المخزون
  v_rev_acc     uuid  := 'acd99daf-b9ac-4ee6-8e1c-9da0ab02eb9b'; -- إيرادات
  v_cogs_acc    uuid  := '7c573746-a1c0-4b6e-8ac7-52b6e9087814'; -- COGS
  v_vat_acc     uuid  := '529b501f-b0cc-4520-8ade-93846137e538'; -- VAT
  v_desc        text;
BEGIN
  -- جلب بيانات الفاتورة
  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'فاتورة غير موجودة: %', p_invoice_id; END IF;

  -- منع التكرار: إذا وُجد قيد مرتبط بالفعل
  IF EXISTS (SELECT 1 FROM journal_entries WHERE reference_id = p_invoice_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'يوجد قيد محاسبي مرتبط بهذه الفاتورة مسبقاً';
  END IF;

  -- المبالغ بالريال السعودي كمعادل
  v_net_amount := ROUND((inv.subtotal - inv.discount_amount) * inv.exchange_rate, 2);
  v_sar_amount := ROUND(inv.total_amount * inv.exchange_rate, 2);
  v_cash_acc   := get_cash_account(inv.currency_code, inv.payment_method, inv.company_id);

  v_desc := CASE inv.type
    WHEN 'sale'             THEN 'قيد تلقائي - مبيعات - '
    WHEN 'purchase'         THEN 'قيد تلقائي - مشتريات - '
    WHEN 'sale_return'      THEN 'قيد تلقائي - مردود مبيعات - '
    WHEN 'purchase_return'  THEN 'قيد تلقائي - مردود مشتريات - '
    ELSE 'قيد تلقائي - '
  END || inv.invoice_number;

  -- إنشاء القيد
  INSERT INTO journal_entries(company_id, entry_date, description, reference_type, reference_id, status)
  VALUES (inv.company_id, inv.issue_date, v_desc, 'invoice', p_invoice_id, 'posted')
  RETURNING id INTO v_je_id;

  -- ============ فاتورة مبيعات ============
  IF inv.type = 'sale' THEN
    IF inv.payment_method = 'cash' OR inv.paid_amount >= inv.total_amount THEN
      -- نقداً: مدين صندوق / دائن إيرادات + VAT
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,description,currency_code,foreign_amount,exchange_rate,company_id,party_id)
      VALUES
        (v_je_id, v_cash_acc, v_sar_amount, 0, 'قبض نقدي', inv.currency_code, inv.total_amount, inv.exchange_rate, inv.company_id, inv.party_id),
        (v_je_id, v_rev_acc,  0, v_net_amount, 'إيراد مبيعات', inv.currency_code, inv.subtotal-inv.discount_amount, inv.exchange_rate, inv.company_id, NULL),
        (v_je_id, v_vat_acc,  0, ROUND(inv.tax_amount*inv.exchange_rate,2), 'ضريبة قيمة مضافة', inv.currency_code, inv.tax_amount, inv.exchange_rate, inv.company_id, NULL);
    ELSE
      -- آجل: مدين ذمم عملاء / دائن إيرادات + VAT
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,description,currency_code,foreign_amount,exchange_rate,company_id,party_id)
      VALUES
        (v_je_id, v_ar_acc,  v_sar_amount, 0, 'ذمة عميل', inv.currency_code, inv.total_amount, inv.exchange_rate, inv.company_id, inv.party_id),
        (v_je_id, v_rev_acc, 0, v_net_amount, 'إيراد مبيعات', inv.currency_code, inv.subtotal-inv.discount_amount, inv.exchange_rate, inv.company_id, NULL),
        (v_je_id, v_vat_acc, 0, ROUND(inv.tax_amount*inv.exchange_rate,2), 'ضريبة قيمة مضافة', inv.currency_code, inv.tax_amount, inv.exchange_rate, inv.company_id, NULL);
    END IF;

  -- ============ فاتورة مشتريات ============
  ELSIF inv.type = 'purchase' THEN
    IF inv.payment_method = 'cash' OR inv.paid_amount >= inv.total_amount THEN
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,description,currency_code,foreign_amount,exchange_rate,company_id,party_id)
      VALUES
        (v_je_id, v_inv_acc,  v_net_amount, 0, 'مخزون', inv.currency_code, inv.subtotal-inv.discount_amount, inv.exchange_rate, inv.company_id, NULL),
        (v_je_id, v_vat_acc,  ROUND(inv.tax_amount*inv.exchange_rate,2), 0, 'ضريبة مدخلات', inv.currency_code, inv.tax_amount, inv.exchange_rate, inv.company_id, NULL),
        (v_je_id, v_cash_acc, 0, v_sar_amount, 'دفع نقدي للمورد', inv.currency_code, inv.total_amount, inv.exchange_rate, inv.company_id, inv.party_id);
    ELSE
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,description,currency_code,foreign_amount,exchange_rate,company_id,party_id)
      VALUES
        (v_je_id, v_inv_acc, v_net_amount, 0, 'مخزون', inv.currency_code, inv.subtotal-inv.discount_amount, inv.exchange_rate, inv.company_id, NULL),
        (v_je_id, v_vat_acc, ROUND(inv.tax_amount*inv.exchange_rate,2), 0, 'ضريبة مدخلات', inv.currency_code, inv.tax_amount, inv.exchange_rate, inv.company_id, NULL),
        (v_je_id, v_ap_acc,  0, v_sar_amount, 'ذمة مورد', inv.currency_code, inv.total_amount, inv.exchange_rate, inv.company_id, inv.party_id);
    END IF;

  -- ============ مردود مبيعات ============
  ELSIF inv.type = 'sale_return' THEN
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,description,currency_code,foreign_amount,exchange_rate,company_id,party_id)
    VALUES
      (v_je_id, v_rev_acc,  v_net_amount, 0, 'رد إيراد - مردود', inv.currency_code, inv.subtotal, inv.exchange_rate, inv.company_id, NULL),
      (v_je_id, v_vat_acc,  ROUND(inv.tax_amount*inv.exchange_rate,2), 0, 'رد ضريبة - مردود', inv.currency_code, inv.tax_amount, inv.exchange_rate, inv.company_id, NULL),
      (v_je_id, v_cash_acc, 0, v_sar_amount, 'صرف للعميل - مردود', inv.currency_code, inv.total_amount, inv.exchange_rate, inv.company_id, inv.party_id);

  -- ============ مردود مشتريات ============
  ELSIF inv.type = 'purchase_return' THEN
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,description,currency_code,foreign_amount,exchange_rate,company_id,party_id)
    VALUES
      (v_je_id, v_ap_acc,  v_sar_amount, 0, 'تسوية مورد - مردود', inv.currency_code, inv.total_amount, inv.exchange_rate, inv.company_id, inv.party_id),
      (v_je_id, v_inv_acc, 0, v_net_amount, 'رد مخزون - مردود', inv.currency_code, inv.subtotal, inv.exchange_rate, inv.company_id, NULL),
      (v_je_id, v_vat_acc, 0, ROUND(inv.tax_amount*inv.exchange_rate,2), 'رد ضريبة مدخلات', inv.currency_code, inv.tax_amount, inv.exchange_rate, inv.company_id, NULL);
  END IF;

  RETURN v_je_id;
END;
$function$

-- ===== break_overdue_promises =====

CREATE OR REPLACE FUNCTION public.break_overdue_promises(p_company_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    UPDATE public.debt_payment_promises
    SET status = 'broken', updated_at = NOW()
    WHERE company_id = p_company_id
      AND status = 'pending'
      AND promise_date < CURRENT_DATE
    RETURNING id;
END;
$function$

-- ===== bulk_adjust_stock =====

CREATE OR REPLACE FUNCTION public.bulk_adjust_stock(p_company_id uuid, p_warehouse_id uuid, p_adjustments jsonb, p_reason text DEFAULT 'تعديل يدوي'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item         jsonb;
  v_product_id   uuid;
  v_new_qty      numeric;
  v_current_qty  numeric;
  v_diff         numeric;
  v_tx_type      text;
  v_unit_cost    numeric;
  v_adjusted     int := 0;
  v_skipped      int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- التحقق من المستودع
  IF NOT EXISTS (
    SELECT 1 FROM warehouses
    WHERE id = p_warehouse_id AND company_id = p_company_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'warehouse_not_found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_adjustments) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_new_qty    := GREATEST(0, (v_item->>'new_quantity')::numeric);

    -- الكمية الحالية والتكلفة المرجحة الحالية
    SELECT COALESCE(quantity, 0), COALESCE(weighted_avg_cost, 0)
    INTO v_current_qty, v_unit_cost
    FROM product_stock
    WHERE product_id = v_product_id AND warehouse_id = p_warehouse_id;

    v_diff := v_new_qty - COALESCE(v_current_qty, 0);

    IF ABS(v_diff) < 0.001 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;  -- لا تغيير
    END IF;

    v_tx_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

    INSERT INTO inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, created_by, unit_cost
    ) VALUES (
      p_company_id, v_product_id, p_warehouse_id,
      ABS(v_diff),
      v_tx_type, 'bulk_adjustment', auth.uid(), COALESCE(v_unit_cost, 0)
    );

    v_adjusted := v_adjusted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'adjusted_count', v_adjusted,
    'skipped_count',  v_skipped,
    'warehouse_id',   p_warehouse_id
  );
END;
$function$

-- ===== bulk_update_product_prices =====

CREATE OR REPLACE FUNCTION public.bulk_update_product_prices(p_company_id uuid, p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item       jsonb;
  v_updated    int := 0;
  v_product_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF jsonb_array_length(p_updates) > 500 THEN
    RAISE EXCEPTION 'too_many_items: الحد الأقصى 500 منتج في الدفعة الواحدة';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
    v_product_id := (v_item->>'product_id')::uuid;

    UPDATE products SET
      sale_price     = CASE WHEN v_item ? 'sale_price'     THEN (v_item->>'sale_price')::numeric     ELSE sale_price     END,
      purchase_price = CASE WHEN v_item ? 'purchase_price' THEN (v_item->>'purchase_price')::numeric ELSE purchase_price END,
      cost_price     = CASE WHEN v_item ? 'cost_price'     THEN (v_item->>'cost_price')::numeric     ELSE cost_price     END,
      updated_at     = now(),
      updated_by     = auth.uid()
    WHERE id = v_product_id
      AND company_id = p_company_id
      AND deleted_at IS NULL;

    IF FOUND THEN v_updated := v_updated + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('updated_count', v_updated, 'requested', jsonb_array_length(p_updates));
END;
$function$

-- ===== calculate_product_cogs =====

CREATE OR REPLACE FUNCTION public.calculate_product_cogs(p_company_id uuid, p_product_id uuid)
 RETURNS TABLE(product_id uuid, product_name text, total_purchased numeric, total_cost_sar numeric, avg_cost_sar numeric, qty_sold numeric, cogs_sar numeric, current_stock numeric, stock_value_sar numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  -- كل مشتريات المنتج بالريال السعودي
  purchases AS (
    SELECT
      ii.product_id,
      SUM(ii.quantity)                               AS total_qty,
      SUM(ii.quantity * ii.cost_price * inv.exchange_rate) AS total_cost
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    WHERE inv.company_id = p_company_id
      AND inv.type = 'purchase'
      AND ii.product_id = p_product_id
      AND inv.deleted_at IS NULL
    GROUP BY ii.product_id
  ),
  -- كل مبيعات المنتج
  sales AS (
    SELECT
      ii.product_id,
      SUM(ii.quantity) AS qty_sold
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    WHERE inv.company_id = p_company_id
      AND inv.type = 'sale'
      AND ii.product_id = p_product_id
      AND inv.deleted_at IS NULL
    GROUP BY ii.product_id
  ),
  -- المخزون الحالي
  stock AS (
    SELECT ps.product_id, SUM(ps.quantity) AS current_qty
    FROM product_stock ps
    WHERE ps.company_id = p_company_id AND ps.product_id = p_product_id
    GROUP BY ps.product_id
  )
  SELECT
    p.id,
    p.name_ar::text,
    COALESCE(pu.total_qty, 0),
    COALESCE(pu.total_cost, 0),
    CASE WHEN COALESCE(pu.total_qty,0) > 0
         THEN ROUND(pu.total_cost / pu.total_qty, 4) ELSE 0 END,
    COALESCE(s.qty_sold, 0),
    ROUND(COALESCE(s.qty_sold, 0) *
      CASE WHEN COALESCE(pu.total_qty,0) > 0
           THEN pu.total_cost / pu.total_qty ELSE 0 END, 2),
    COALESCE(st.current_qty, 0),
    ROUND(COALESCE(st.current_qty, 0) *
      CASE WHEN COALESCE(pu.total_qty,0) > 0
           THEN pu.total_cost / pu.total_qty ELSE 0 END, 2)
  FROM products p
  LEFT JOIN purchases pu ON pu.product_id = p.id
  LEFT JOIN sales s      ON s.product_id  = p.id
  LEFT JOIN stock st     ON st.product_id = p.id
  WHERE p.id = p_product_id AND p.company_id = p_company_id;
END;
$function$

-- ===== check_account_circular_reference =====

CREATE OR REPLACE FUNCTION public.check_account_circular_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_id uuid := NEW.parent_id;
  v_depth     int  := 0;
  v_visited   uuid[] := ARRAY[NEW.id];
BEGIN
  -- لا شيء للفحص إن لم يكن هناك parent
  IF v_parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- التحقق المباشر: لا يمكن أن يكون الحساب أباً لنفسه
  IF v_parent_id = NEW.id THEN
    RAISE EXCEPTION 'لا يمكن أن يكون الحساب أبًا لنفسه';
  END IF;

  WHILE v_parent_id IS NOT NULL LOOP
    v_depth := v_depth + 1;
    
    IF v_depth > 20 THEN
      RAISE EXCEPTION 'تم اكتشاف تداخل عميق في شجرة الحسابات (أكثر من 20 مستوى)';
    END IF;
    
    -- فحص الحلقات
    IF v_parent_id = ANY(v_visited) THEN
      RAISE EXCEPTION 'تم اكتشاف مرجع دائري في شجرة الحسابات';
    END IF;
    
    v_visited := v_visited || v_parent_id;
    
    SELECT parent_id INTO v_parent_id 
    FROM public.accounts 
    WHERE id = v_parent_id;
  END LOOP;
  
  RETURN NEW;
END;
$function$

-- ===== check_fiscal_year_overlap =====

CREATE OR REPLACE FUNCTION public.check_fiscal_year_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = NEW.company_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND start_date <= NEW.end_date
    AND end_date >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Fiscal year overlaps with an existing fiscal year for this company';
  END IF;
  RETURN NEW;
END;
$function$

-- ===== check_invoice_paid_status =====

CREATE OR REPLACE FUNCTION public.check_invoice_paid_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
   IF NEW.status NOT IN ('paid', 'cancelled', 'void') AND NEW.type IN ('sale', 'purchase') THEN
      IF (NEW.paid_amount >= (NEW.total_amount - 0.005)) AND (NEW.total_amount > 0) THEN
          NEW.status := 'paid';
      END IF;
   END IF;
   RETURN NEW;
END;
$function$

-- ===== check_journal_balance =====

CREATE OR REPLACE FUNCTION public.check_journal_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_debit  NUMERIC;
  v_total_credit NUMERIC;
  v_entry_id     UUID;
BEGIN
  v_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  SELECT
    COALESCE(SUM(debit_amount),  0),
    COALESCE(SUM(credit_amount), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE journal_entry_id = v_entry_id AND deleted_at IS NULL;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'القيد غير متوازن: المدين = %, الدائن = %',
      v_total_debit, v_total_credit;
  END IF;
  RETURN NEW;
END;
$function$

-- ===== check_rate_limit =====

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_company_id uuid, p_endpoint text, p_max_requests integer DEFAULT 60, p_window_seconds integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_window_start TIMESTAMP WITH TIME ZONE; v_request_count INT;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  SELECT window_start, request_count INTO v_window_start, v_request_count
  FROM public.api_rate_limits WHERE company_id=p_company_id AND endpoint=p_endpoint;
  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (company_id, endpoint, request_count, window_start) VALUES (p_company_id, p_endpoint, 1, NOW());
    RETURN TRUE;
  END IF;
  IF EXTRACT(EPOCH FROM (NOW()-v_window_start)) > p_window_seconds THEN
    UPDATE public.api_rate_limits SET request_count=1, window_start=NOW() WHERE company_id=p_company_id AND endpoint=p_endpoint;
    RETURN TRUE;
  END IF;
  IF v_request_count >= p_max_requests THEN RETURN FALSE; END IF;
  UPDATE public.api_rate_limits SET request_count = request_count+1 WHERE company_id=p_company_id AND endpoint=p_endpoint;
  RETURN TRUE;
END;
$function$

-- ===== check_stock_availability =====

CREATE OR REPLACE FUNCTION public.check_stock_availability(p_product_id uuid, p_warehouse_id uuid, p_requested_qty numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_available numeric;
BEGIN
    SELECT quantity INTO v_available 
    FROM public.product_stock 
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
    
    IF v_available IS NULL OR v_available < p_requested_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product % in warehouse %. Requested: %, Available: %', p_product_id, p_warehouse_id, p_requested_qty, COALESCE(v_available, 0);
    END IF;
    
    RETURN TRUE;
END;
$function$

-- ===== cleanup_old_audit_logs =====

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
END;
$function$

-- ===== cleanup_old_records =====

CREATE OR REPLACE FUNCTION public.cleanup_old_records()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  DELETE FROM public.notification_log
  WHERE created_at < NOW() - INTERVAL '30 days';

  DELETE FROM public.ai_part_lookup_cache
  WHERE expires_at < NOW();

  DELETE FROM public.api_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  RAISE NOTICE 'cleanup_old_records: completed at %', NOW();
END;
$function$

-- ===== commit_expense_v2 =====

CREATE OR REPLACE FUNCTION public.commit_expense_v2(p_company_id uuid, p_user_id uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense_id uuid;
  v_voucher_number text;
  v_category_id uuid;
  v_amount numeric;
  v_currency_code text;
  v_exchange_rate numeric;
  v_date date;
  v_description text;
  v_payment_method text;
  v_branch_id uuid;
  v_fiscal_year_id uuid;
  v_cash_account_id uuid;
  v_expense_account_id uuid;
  v_entry_id uuid;
BEGIN
  v_category_id := (p_data->>'category_id')::uuid;
  v_amount := COALESCE((p_data->>'amount')::numeric, 0);
  v_currency_code := COALESCE(p_data->>'currency_code', 'SAR');
  v_exchange_rate := COALESCE((p_data->>'exchange_rate')::numeric, 1);
  v_date := COALESCE((p_data->>'expense_date')::date, CURRENT_DATE);
  v_description := COALESCE(p_data->>'description', '');
  v_payment_method := COALESCE(p_data->>'payment_method', 'cash');
  v_branch_id := (p_data->>'branch_id')::uuid;

  -- Get fiscal year
  SELECT id INTO v_fiscal_year_id FROM public.fiscal_years
  WHERE company_id = p_company_id AND is_closed = false
  AND v_date BETWEEN start_date AND end_date LIMIT 1;

  -- Generate voucher number
  v_voucher_number := COALESCE(p_data->>'voucher_number', '');
  IF v_voucher_number = '' THEN
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_voucher_number
    FROM public.journal_entries WHERE company_id = p_company_id;
    v_voucher_number := 'EXP-' || v_voucher_number::text;
  END IF;

  -- Create expense record
  INSERT INTO public.expenses (
    company_id, category_id, voucher_number, description,
    amount, currency_code, exchange_rate, expense_date,
    status, payment_method, created_by, branch_id
  ) VALUES (
    p_company_id, v_category_id, v_voucher_number, v_description,
    v_amount, v_currency_code, v_exchange_rate, v_date,
    'posted', v_payment_method, p_user_id, v_branch_id
  ) RETURNING id INTO v_expense_id;

  -- Get accounts
  SELECT id INTO v_cash_account_id FROM public.accounts
  WHERE company_id = p_company_id AND code LIKE '1%' AND type = 'asset' AND is_active = true LIMIT 1;

  SELECT id INTO v_expense_account_id FROM public.accounts
  WHERE company_id = p_company_id AND code LIKE '5%' AND type = 'expense' LIMIT 1;

  -- Create journal entry
  IF v_cash_account_id IS NOT NULL AND v_expense_account_id IS NOT NULL THEN
    INSERT INTO public.journal_entries (
      company_id, entry_number, entry_date, description,
      reference_type, reference_id, status, created_by, branch_id, fiscal_year_id
    ) VALUES (
      p_company_id,
      (SELECT COALESCE(MAX(entry_number), 0) + 1 FROM public.journal_entries WHERE company_id = p_company_id),
      v_date, v_description,
      'expense', v_expense_id, 'posted', p_user_id, v_branch_id, v_fiscal_year_id
    ) RETURNING id INTO v_entry_id;

    -- Debit: Expense
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount,
      description, currency_code, company_id, branch_id
    ) VALUES (
      v_entry_id, v_expense_account_id, v_amount, 0,
      v_description, v_currency_code, p_company_id, v_branch_id
    );

    -- Credit: Cash
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount,
      description, currency_code, company_id, branch_id
    ) VALUES (
      v_entry_id, v_cash_account_id, 0, v_amount,
      v_description, v_currency_code, p_company_id, v_branch_id
    );
  END IF;

  RETURN jsonb_build_object('id', v_expense_id, 'voucher_number', v_voucher_number);
END;
$function$

-- ===== commit_payment =====

CREATE OR REPLACE FUNCTION public.commit_payment(p_company_id uuid, p_user_id uuid, p_type text, p_amount numeric, p_date date, p_cash_account_id uuid, p_counterparty_type text DEFAULT NULL::text, p_counterparty_id uuid DEFAULT NULL::uuid, p_description text DEFAULT ''::text, p_payment_method text DEFAULT 'cash'::text, p_reference_number text DEFAULT ''::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_foreign_amount numeric DEFAULT NULL::numeric, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
  v_payment_id uuid;
  v_payment_number text;
  v_fiscal_year_id uuid;
BEGIN
  v_company := public.verify_company_access(p_company_id);

  -- Get fiscal year
  SELECT id INTO v_fiscal_year_id FROM public.fiscal_years
  WHERE company_id = v_company AND is_closed = false
  AND p_date BETWEEN start_date AND end_date LIMIT 1;

  -- Generate payment number
  SELECT COALESCE(MAX(NULLIF(payment_number, '')::bigint), 0) + 1 INTO v_payment_number
  FROM public.payments WHERE company_id = v_company;
  v_payment_number := v_payment_number::text;

  -- Create payment - the journal is created by the AFTER INSERT trigger
  -- trg_auto_post_payment_journal (fn_auto_post_payment_journal), which resolves
  -- AR/AP from the party and posts a balanced draft->posted entry.
  INSERT INTO public.payments (
    company_id, payment_number, type, amount,
    currency_code, exchange_rate, payment_date, payment_method,
    account_id, reference_type, notes, status,
    created_by, branch_id, party_id
  ) VALUES (
    v_company, v_payment_number, p_type, p_amount,
    p_currency_code, p_exchange_rate, p_date, p_payment_method,
    p_cash_account_id, 'bond', p_description, 'posted',
    p_user_id, p_branch_id, 
    CASE WHEN p_counterparty_type = 'party' THEN p_counterparty_id ELSE NULL END
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('id', v_payment_id, 'payment_number', v_payment_number);
END;
$function$

-- ===== commit_purchase_invoice =====

CREATE OR REPLACE FUNCTION public.commit_purchase_invoice(p_company_id uuid, p_user_id uuid, p_supplier_id uuid, p_items jsonb, p_exchange_rate numeric DEFAULT 1.0, p_currency text DEFAULT 'SAR'::text, p_issue_date date DEFAULT CURRENT_DATE, p_payment_method text DEFAULT 'credit'::text, p_payment_account_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_invoice_number text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid, p_due_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid                  uuid := auth.uid();  -- [FIX أمني] لا نثق بـ p_user_id
  v_invoice_id           uuid;
  v_gen_number           text;
  v_subtotal             numeric(14,4) := 0;
  v_tax_total            numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              record;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_qty                  numeric;
  v_unit_cost            numeric;
  v_item_tax             numeric;
  v_item_discount        numeric;
  v_line_total           numeric;
begin
  if v_uid is null or not exists (
    select 1 from user_company_roles ucr
    where ucr.user_id = v_uid and ucr.company_id = p_company_id
  ) then
    raise exception 'access_denied';
  end if;

  if not exists (
    select 1 from fiscal_years
    where company_id = p_company_id
      and p_issue_date between start_date and end_date
      and is_closed = false
  ) then
    raise exception 'تاريخ الفاتورة يقع خارج سنة مالية مفتوحة';
  end if;

  if coalesce(p_exchange_rate, 0) <= 0 then
    raise exception 'سعر الصرف يجب أن يكون أكبر من صفر';
  end if;

  select id into v_primary_wh_id from warehouses
  where company_id=p_company_id and (p_branch_id is null or branch_id = p_branch_id) and is_primary=true and deleted_at is null limit 1;
  if v_primary_wh_id is null then
    select id into v_primary_wh_id from warehouses
    where company_id=p_company_id and (p_branch_id is null or branch_id = p_branch_id) and deleted_at is null limit 1;
  end if;
  if v_primary_wh_id is null then
    raise exception 'لا يوجد مستودع مُعرَّف للشركة/الفرع';
  end if;

  if not exists (select 1 from accounts where company_id=p_company_id and code='2100') then
    raise exception 'حساب الدائنين (2100) غير موجود';
  end if;
  if not exists (select 1 from accounts where company_id=p_company_id and code='1200') then
    raise exception 'حساب المخزون (1200) غير موجود';
  end if;

  v_gen_number := case
    when p_invoice_number is not null and trim(p_invoice_number) != ''
    then p_invoice_number
    else get_next_invoice_number(p_company_id, 'PUR')
  end;

  insert into invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    issue_date, due_date, notes, created_by, currency_code, exchange_rate,
    payment_method, subtotal, tax_amount, total_amount, paid_amount
  ) values (
    p_company_id, p_branch_id, p_supplier_id, v_gen_number, 'purchase', 'draft',
    p_issue_date, p_due_date, p_notes, v_uid, p_currency, p_exchange_rate,
    p_payment_method, 0, 0, 0, 0
  ) returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
    where id=(v_item->>'product_id')::uuid and company_id=p_company_id and deleted_at is null;
    if v_product is null then
      raise exception 'المنتج غير موجود: %', v_item->>'product_id';
    end if;

    v_qty          := coalesce((v_item->>'quantity')::numeric, 0);
    v_unit_cost    := coalesce((v_item->>'unit_cost')::numeric, (v_item->>'unit_price')::numeric, v_product.purchase_price);
    v_item_tax     := coalesce((v_item->>'tax_amount')::numeric, 0);
    v_item_discount:= coalesce((v_item->>'discount_amount')::numeric, 0);
    v_line_total   := round((v_qty * v_unit_cost) - v_item_discount + v_item_tax, 4);

    if v_qty <= 0 then raise exception 'الكمية يجب أن تكون أكبر من صفر'; end if;

    insert into invoice_items(
      invoice_id, product_id, description, quantity,
      unit_price, cost_price, discount_amount, tax_amount,
      tax_rate_id, total, company_id
    ) values (
      v_invoice_id, v_product.id, v_product.name_ar, v_qty,
      v_unit_cost, v_unit_cost, v_item_discount, v_item_tax,
      nullif(v_item->>'tax_rate_id','')::uuid,
      v_line_total, p_company_id
    );

    insert into inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, reference_id, created_by,
      unit_cost, total_cost
    ) values (
      p_company_id, v_product.id, v_primary_wh_id, v_qty,
      'purchase', 'invoice', v_invoice_id, v_uid,
      v_unit_cost, round(v_qty * v_unit_cost, 4)
    );

    v_subtotal  := v_subtotal  + round(v_qty * v_unit_cost - v_item_discount, 4);
    v_tax_total := v_tax_total + v_item_tax;
  end loop;

  v_total := v_subtotal + v_tax_total;

  update invoices
  set subtotal=v_subtotal, tax_amount=v_tax_total, total_amount=v_total
  where id=v_invoice_id;

  update invoices set status = 'posted' where id = v_invoice_id;

  select je.id into v_journal_id
  from journal_entries je
  where je.reference_id = v_invoice_id
    and je.reference_type = 'purchase_invoice'
    and je.deleted_at is null
  limit 1;

  if v_journal_id is null then
    raise exception 'فشل الترحيل المحاسبي التلقائي لفاتورة الشراء % - لم يُنشأ أي قيد', v_gen_number;
  end if;

  return jsonb_build_object(
    'id',           v_invoice_id,
    'invoice_number', v_gen_number,
    'total_amount', v_total,
    'tax_amount',   v_tax_total,
    'currency',     p_currency,
    'exchange_rate', p_exchange_rate,
    'status',       'posted'
  );
end;
$function$

-- ===== commit_purchase_return =====

CREATE OR REPLACE FUNCTION public.commit_purchase_return(p_company_id uuid, p_user_id uuid, p_supplier_id uuid, p_items jsonb, p_notes text, p_currency text, p_exchange_rate numeric, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id           uuid;
  v_invoice_number       text;
  v_subtotal             numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              RECORD;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_payable_account_id   uuid;
  v_inventory_account_id uuid;
  v_base_total           numeric(14,4);
  v_base_subtotal        numeric(14,4);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND CURRENT_DATE BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  SELECT id INTO v_primary_wh_id FROM warehouses
    WHERE company_id=p_company_id AND (p_branch_id is null or branch_id=p_branch_id) AND is_primary=true LIMIT 1;
  IF v_primary_wh_id IS NULL THEN
    SELECT id INTO v_primary_wh_id FROM warehouses WHERE company_id=p_company_id AND (p_branch_id is null or branch_id=p_branch_id) LIMIT 1;
  END IF;
  IF v_primary_wh_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستودع للفرع';
  END IF;

  SELECT id INTO v_payable_account_id
    FROM accounts WHERE company_id=p_company_id AND code='2100' LIMIT 1;
  IF v_payable_account_id IS NULL THEN RAISE EXCEPTION 'حساب الدائنين (2100) مفقود'; END IF;

  SELECT id INTO v_inventory_account_id
    FROM accounts WHERE company_id=p_company_id AND code='1200' LIMIT 1;
  IF v_inventory_account_id IS NULL THEN RAISE EXCEPTION 'حساب المخزون (1200) مفقود'; END IF;

  v_invoice_number := get_next_invoice_number(p_company_id, 'RPR');

  INSERT INTO invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    notes, created_by, currency_code, exchange_rate, tax_amount, subtotal, total_amount
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_invoice_number,
    'purchase_return', 'posted',
    p_notes, p_user_id, p_currency, p_exchange_rate, 0, 0, 0
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products
      WHERE id=(v_item->>'product_id')::uuid
        AND company_id=p_company_id AND deleted_at IS NULL;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_item->>'product_id';
    END IF;

    DECLARE
      v_qty       numeric := (v_item->>'quantity')::numeric;
      v_unit_cost numeric := COALESCE((v_item->>'unit_cost')::numeric, v_product.purchase_price);
      v_discount  numeric := COALESCE((v_item->>'discount_amount')::numeric, 0);
      v_line_sub  numeric := (v_qty * v_unit_cost) - v_discount;
    BEGIN
      IF v_qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;

      INSERT INTO invoice_items(
        invoice_id, product_id, description, quantity,
        unit_price, cost_price, discount_amount, tax_amount, total, company_id
      ) VALUES (
        v_invoice_id, v_product.id, v_product.name_ar, v_qty,
        v_unit_cost, v_unit_cost, v_discount, 0, v_line_sub, p_company_id
      );

      INSERT INTO inventory_transactions(
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by,
        unit_cost, total_cost
      ) VALUES (
        p_company_id, v_product.id, v_primary_wh_id, v_qty,
        'purchase_return', 'invoice', v_invoice_id, p_user_id,
        v_unit_cost, round(v_qty * v_unit_cost, 4)
      );

      v_subtotal := v_subtotal + v_line_sub;
    END;
  END LOOP;

  v_total := v_subtotal;
  UPDATE invoices SET subtotal=v_subtotal, tax_amount=0, total_amount=v_total WHERE id=v_invoice_id;

  v_base_subtotal := ROUND(v_subtotal * p_exchange_rate, 4);
  v_base_total    := ROUND(v_total    * p_exchange_rate, 4);

  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, CURRENT_DATE, 'مرتجع مشتريات ' || v_invoice_number,
    'purchase_return', v_invoice_id, 'posted', p_user_id
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_entry_lines(
    journal_entry_id, account_id, party_id, debit_amount, credit_amount,
    description, currency_code, exchange_rate, foreign_amount, company_id, branch_id
  ) VALUES
    (v_journal_id, v_payable_account_id, p_supplier_id, v_base_total, 0,
     'تخفيض ذمم المورد - ' || v_invoice_number, p_currency, p_exchange_rate, v_total, p_company_id, p_branch_id),
    (v_journal_id, v_inventory_account_id, NULL, 0, v_base_subtotal,
     'خصم مخزون مرتجع - ' || v_invoice_number, p_currency, p_exchange_rate, v_subtotal, p_company_id, p_branch_id);

  RETURN jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', v_base_total, 'currency', p_currency, 'status', 'posted'
  );
END;
$function$

-- ===== commit_sale_return =====

CREATE OR REPLACE FUNCTION public.commit_sale_return(p_company_id uuid, p_user_id uuid, p_party_id uuid, p_items jsonb, p_exchange_rate numeric DEFAULT 1.0, p_currency text DEFAULT 'SAR'::text, p_reference_invoice_id uuid DEFAULT NULL::uuid, p_return_reason text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid                  uuid := auth.uid();  -- [FIX أمني] لا نثق بـ p_user_id
  v_invoice_id           uuid;
  v_invoice_number       text;
  v_subtotal             numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_cost_total           numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              record;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_qty                  numeric;
  v_unit_price           numeric;
  v_line_total           numeric;
  v_line_cost            numeric;
  v_original_cost        numeric;
  v_unit_cost_for_txn    numeric;
begin
  if v_uid is null or not exists (
    select 1 from user_company_roles ucr
    where ucr.user_id = v_uid and ucr.company_id = p_company_id
  ) then
    raise exception 'access_denied';
  end if;

  if not exists (
    select 1 from fiscal_years
    where company_id = p_company_id
      and current_date between start_date and end_date
      and is_closed = false
  ) then
    raise exception 'التاريخ يقع خارج سنة مالية مفتوحة';
  end if;

  select id into v_primary_wh_id from warehouses
  where company_id=p_company_id and is_primary=true and deleted_at is null limit 1;
  if v_primary_wh_id is null then
    select id into v_primary_wh_id from warehouses
    where company_id=p_company_id and deleted_at is null limit 1;
  end if;

  if not exists (select 1 from accounts where company_id=p_company_id and code='1100') then
    raise exception 'حساب المدينون (1100) مفقود';
  end if;
  if not exists (select 1 from accounts where company_id=p_company_id and code='4100') then
    raise exception 'حساب الإيرادات (4100) مفقود';
  end if;

  v_invoice_number := get_next_invoice_number(p_company_id, 'RSL');

  insert into invoices(
    company_id, party_id, invoice_number, type, status,
    notes, created_by, currency_code, exchange_rate,
    reference_invoice_id, return_reason,
    subtotal, tax_amount, total_amount, paid_amount, payment_method,
    branch_id
  ) values (
    p_company_id, p_party_id, v_invoice_number, 'sale_return', 'draft',
    p_notes, v_uid, p_currency, p_exchange_rate,
    p_reference_invoice_id, p_return_reason,
    0, 0, 0, 0, 'credit',
    p_branch_id
  ) returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
    where id=(v_item->>'product_id')::uuid and company_id=p_company_id and deleted_at is null;
    if v_product is null then
      raise exception 'المنتج غير موجود: %', v_item->>'product_id';
    end if;

    v_qty        := coalesce((v_item->>'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, v_product.sale_price);
    v_line_total := round(v_qty * v_unit_price, 4);

    v_original_cost := null;
    if p_reference_invoice_id is not null then
      select ii.cost_price into v_original_cost from invoice_items ii
      where ii.invoice_id = p_reference_invoice_id and ii.product_id = v_product.id limit 1;
    end if;
    v_line_cost := round(v_qty * coalesce(v_original_cost, v_product.cost_price, 0), 4);
    v_unit_cost_for_txn := coalesce(v_original_cost, v_product.cost_price, 0);

    insert into invoice_items(
      invoice_id, product_id, description, quantity,
      unit_price, cost_price, tax_amount, total, company_id
    ) values (
      v_invoice_id, v_product.id, v_product.name_ar, v_qty,
      v_unit_price, coalesce(v_original_cost, v_product.cost_price, 0),
      0, v_line_total, p_company_id
    );

    insert into inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, reference_id, created_by,
      unit_cost, total_cost
    ) values (
      p_company_id, v_product.id, v_primary_wh_id, v_qty,
      'sales_return', 'invoice', v_invoice_id, v_uid,
      v_unit_cost_for_txn, round(v_qty * v_unit_cost_for_txn, 4)
    );

    v_subtotal   := v_subtotal   + v_line_total;
    v_cost_total := v_cost_total + v_line_cost;
  end loop;

  v_total := v_subtotal;

  update invoices set subtotal=v_subtotal, tax_amount=0, total_amount=v_total where id=v_invoice_id;

  update invoices set status = 'posted' where id = v_invoice_id;

  select je.id into v_journal_id
  from journal_entries je
  where je.reference_id = v_invoice_id
    and je.reference_type = 'sales_return'
    and je.deleted_at is null
  limit 1;

  if v_journal_id is null then
    raise exception 'فشل الترحيل المحاسبي التلقائي لمرتجع المبيعات % - لم يُنشأ أي قيد', v_invoice_number;
  end if;

  return jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', round(v_total * p_exchange_rate, 4), 'currency', p_currency, 'status', 'posted'
  );
end;
$function$

-- ===== commit_sales_invoice_v2 =====

CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(p_party_id uuid, p_invoice_date date, p_due_date date, p_items jsonb, p_payment_type text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_idempotency_key text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_available numeric;
  v_db_price numeric;
  v_min_allowed_price numeric;
  v_line_total numeric;
  v_total_amount numeric := 0;
  v_total_tax numeric := 0;
  v_warehouse_id uuid;
  v_stock_record record;
  v_party_name text;
BEGIN
  -- === AUTHENTICATION ===
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  -- === IDEMPOTENCY CHECK ===
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices
    WHERE company_id = v_company_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  -- === VALIDATION: Items must exist ===
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invoice must have at least one item';
  END IF;

  -- === GET DEFAULT WAREHOUSE ===
  SELECT id INTO v_warehouse_id FROM public.warehouses
  WHERE company_id = v_company_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  -- === GET PARTY NAME ===
  IF p_party_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id AND company_id = v_company_id;
  END IF;

  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric, warehouse_id uuid)
  LOOP
    -- Validate quantity
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity (%) for product %', v_item.quantity, v_item.product_id;
    END IF;

    -- Get DB price for validation
    SELECT sale_price INTO v_db_price FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in company', v_item.product_id;
    END IF;

    -- === PRICE VALIDATION (C4) ===
    -- Cannot sell below 70% of sale_price (configurable per business rules)
    v_min_allowed_price := v_db_price * 0.7;
    IF v_item.unit_price < v_min_allowed_price THEN
      RAISE EXCEPTION 'Price (%) below minimum allowed (%) for product %',
        v_item.unit_price, v_min_allowed_price, v_item.product_id;
    END IF;

    -- Validate tax rate
    IF v_item.tax_rate < 0 OR v_item.tax_rate > 100 THEN
      RAISE EXCEPTION 'Invalid tax rate (%) for product %', v_item.tax_rate, v_item.product_id;
    END IF;

    -- === STOCK CHECK WITH ROW LOCK (C3 + C9) ===
    -- SELECT ... FOR UPDATE locks the stock row, preventing concurrent modifications
    SELECT ps.quantity, ps.warehouse_id INTO v_stock_record
    FROM public.product_stock ps
    WHERE ps.product_id = v_item.product_id
      AND ps.warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND ps.company_id = v_company_id
    FOR UPDATE;  -- Row-level exclusive lock

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No stock record found for product % in warehouse', v_item.product_id;
    END IF;

    v_available := v_stock_record.quantity;

    IF v_available < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_item.product_id, v_available, v_item.quantity;
    END IF;

    -- Calculate totals (within the locked context)
    v_line_total := v_item.quantity * v_item.unit_price;
    v_total_amount := v_total_amount + v_line_total;
    v_total_tax := v_total_tax + COALESCE(v_line_total * v_item.tax_rate / 100, 0);
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  SELECT COALESCE('INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad((COUNT(*) + 1)::text, 4, '0'), 'INV-0001') INTO v_invoice_number
  FROM public.invoices
  WHERE company_id = v_company_id
    AND issue_date BETWEEN date_trunc('year', CURRENT_DATE) AND CURRENT_DATE + INTERVAL '1 day';

  -- === PHASE 3: CREATE INVOICE ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, payment_method, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount, v_total_tax, p_payment_type, 'posted', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + DEDUCT STOCK ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric, warehouse_id uuid)
  LOOP
    v_line_total := v_item.quantity * v_item.unit_price;

    -- Insert invoice item
    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, total, tax_amount, company_id
    ) VALUES (
      v_invoice_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      v_line_total, round(v_line_total * v_item.tax_rate / 100, 4), v_company_id
    );

    -- Deduct stock (row already locked from Phase 1)
    UPDATE public.product_stock
    SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE product_id = v_item.product_id
      AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND company_id = v_company_id;

    -- Record inventory movement
    INSERT INTO public.inventory_transactions (
      company_id, product_id, warehouse_id, quantity, transaction_type,
      reference_type, reference_id, unit_cost, total_cost, created_by
    ) VALUES (
      v_company_id, v_item.product_id, COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity, 'sales', 'sales_invoice', v_invoice_id,
      v_item.unit_price, v_line_total, v_user_id
    );
  END LOOP;

  -- === PHASE 5: UPDATE PARTY BALANCE ===
  -- Party balances are computed (see party_balances_by_currency); no stored column.

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  -- Automatic ROLLBACK of all changes (PostgreSQL transaction)
  RAISE;
END;
$function$

-- ===== complete_promise =====

CREATE OR REPLACE FUNCTION public.complete_promise(p_company_id uuid, p_promise_id uuid, p_payment_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    UPDATE public.debt_payment_promises
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        reference_type = CASE WHEN p_payment_id IS NOT NULL THEN 'payment' ELSE reference_type END,
        reference_id = COALESCE(p_payment_id, reference_id)
    WHERE id = p_promise_id
      AND company_id = p_company_id
      AND status = 'pending';
END;
$function$

-- ===== convert_quotation_to_invoice =====

CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice(p_quotation_id uuid, p_issue_date date DEFAULT CURRENT_DATE, p_due_date date DEFAULT NULL::date, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id  uuid;
  v_quot        quotations%ROWTYPE;
  v_invoice_id  uuid;
  v_inv_type    text;
  v_inv_number  text;
BEGIN
  -- جلب بيانات العرض
  SELECT * INTO v_quot
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quotation_not_found: %', p_quotation_id;
  END IF;

  IF v_quot.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'quotation_deleted';
  END IF;

  IF v_quot.status IN ('converted','rejected') THEN
    RAISE EXCEPTION 'quotation_already_converted_or_rejected: %', v_quot.status;
  END IF;

  -- التحقق من الصلاحية
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = v_quot.company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- تحديد نوع الفاتورة
  v_inv_type := CASE v_quot.type
    WHEN 'sales'    THEN 'sale'
    WHEN 'purchase' THEN 'purchase'
    ELSE 'sale'
  END;

  -- توليد رقم الفاتورة
  v_inv_number := generate_invoice_number(v_quot.company_id, v_inv_type);

  -- إنشاء الفاتورة
  INSERT INTO invoices (
    company_id, party_id, invoice_number, type, status,
    subtotal, discount_amount, tax_amount, total_amount,
    issue_date, due_date, notes, currency_code, exchange_rate,
    created_by
  )
  VALUES (
    v_quot.company_id,
    v_quot.party_id,
    v_inv_number,
    v_inv_type,
    'draft',
    v_quot.subtotal,
    COALESCE(v_quot.discount_amount, 0),
    COALESCE(v_quot.tax_amount, 0),
    v_quot.total_amount,
    p_issue_date,
    p_due_date,
    COALESCE(p_notes, v_quot.notes),
    COALESCE(v_quot.currency_code, 'SAR'),
    COALESCE(v_quot.exchange_rate, 1),
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  -- نسخ البنود
  INSERT INTO invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, discount_amount, tax_amount, total,
    cost_price, company_id
  )
  SELECT
    v_invoice_id,
    qi.product_id,
    qi.description,
    qi.quantity,
    qi.unit_price,
    ROUND(qi.unit_price * qi.quantity * COALESCE(qi.discount_percent,0) / 100, 2),
    COALESCE(qi.total - (qi.unit_price * qi.quantity * (1 - COALESCE(qi.discount_percent,0)/100)), 0),
    qi.total,
    COALESCE((SELECT p.cost_price FROM products p WHERE p.id = qi.product_id), 0),
    v_quot.company_id
  FROM quotation_items qi
  WHERE qi.quotation_id = p_quotation_id;

  -- تحديث حالة العرض
  UPDATE quotations
  SET
    status             = 'converted',
    converted_invoice_id = v_invoice_id,
    converted_at       = now(),
    updated_at         = now()
  WHERE id = p_quotation_id;

  RETURN v_invoice_id;
END;
$function$

-- ===== create_cashbox =====

CREATE OR REPLACE FUNCTION public.create_cashbox(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_name text DEFAULT 'صندوق جديد'::text, p_currency_code text DEFAULT 'SAR'::text, p_opening_balance numeric DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_account_id uuid;
  v_next_code         text;
  v_account_id        uuid;
  v_cashbox_id        uuid;
  v_max_code          int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_parent_account_id
  FROM accounts
  WHERE company_id = p_company_id
    AND code = '1010'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_parent_account_id IS NULL THEN
    RAISE EXCEPTION 'Main cashbox account (1010) not found';
  END IF;

  SELECT COALESCE(MAX(CASE WHEN code ~ '^[0-9]+$' THEN code::int ELSE NULL END), 101000)
  INTO v_max_code
  FROM accounts
  WHERE company_id = p_company_id
    AND parent_id = v_parent_account_id
    AND deleted_at IS NULL;

  v_next_code := (v_max_code + 1)::text;

  INSERT INTO accounts (company_id, code, name_ar, type, currency_code, parent_id, is_system, allow_posting)
  VALUES (p_company_id, v_next_code, p_name, 'asset', p_currency_code, v_parent_account_id, false, true)
  RETURNING id INTO v_account_id;

  INSERT INTO cashboxes (company_id, branch_id, name, account_id, currency_code, opening_balance, created_by)
  VALUES (p_company_id, p_branch_id, p_name, v_account_id, p_currency_code, p_opening_balance, auth.uid())
  RETURNING id INTO v_cashbox_id;

  RETURN json_build_object(
    'cashbox_id', v_cashbox_id,
    'account_id', v_account_id,
    'account_code', v_next_code
  );
END;
$function$

-- ===== create_exchange_company =====

CREATE OR REPLACE FUNCTION public.create_exchange_company(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_name text DEFAULT 'شركة صرافة جديدة'::text, p_currency_code text DEFAULT 'SAR'::text, p_opening_balance numeric DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_account_id uuid;
  v_next_code         text;
  v_account_id        uuid;
  v_entity_id         uuid;
  v_max_code          int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_parent_account_id
  FROM accounts
  WHERE company_id = p_company_id
    AND code = '1030'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_parent_account_id IS NULL THEN
    INSERT INTO accounts (company_id, code, name_ar, type, currency_code, is_system, allow_posting)
    VALUES (p_company_id, '1030', 'شركات الصرافة', 'asset', 'SAR', true, false)
    RETURNING id INTO v_parent_account_id;
  END IF;

  SELECT COALESCE(MAX(CASE WHEN code ~ '^[0-9]+$' THEN code::int ELSE NULL END), 103000)
  INTO v_max_code
  FROM accounts
  WHERE company_id = p_company_id
    AND parent_id = v_parent_account_id
    AND deleted_at IS NULL;

  v_next_code := (v_max_code + 1)::text;

  INSERT INTO accounts (company_id, code, name_ar, type, currency_code, parent_id, is_system, allow_posting)
  VALUES (p_company_id, v_next_code, p_name, 'asset', p_currency_code, v_parent_account_id, false, true)
  RETURNING id INTO v_account_id;

  INSERT INTO exchange_companies (company_id, branch_id, name, account_id, currency_code, opening_balance, created_by)
  VALUES (p_company_id, p_branch_id, p_name, v_account_id, p_currency_code, p_opening_balance, auth.uid())
  RETURNING id INTO v_entity_id;

  RETURN json_build_object(
    'exchange_company_id', v_entity_id,
    'account_id', v_account_id,
    'account_code', v_next_code
  );
END;
$function$

-- ===== create_financial_bond =====

CREATE OR REPLACE FUNCTION public.create_financial_bond(p_company_id uuid, p_bond_type text, p_amount numeric, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1.0, p_foreign_amount numeric DEFAULT NULL::numeric, p_date date DEFAULT CURRENT_DATE, p_cash_account_id uuid DEFAULT NULL::uuid, p_counterparty_id uuid DEFAULT NULL::uuid, p_counterparty_type text DEFAULT 'party'::text, p_description text DEFAULT ''::text, p_invoice_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT 'cash'::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_journal_id uuid; v_payment_id uuid; v_counterparty_account_id uuid;
  v_party_type text; v_ref_type text; v_control_account_code text;
  v_party_id uuid := NULL; v_base_amount numeric; v_foreign_amount numeric;
  v_effective_rate numeric;
  v_uid uuid := auth.uid();  -- [FIX أمني حرج] كانت تثق بـ p_user_id عبر COALESCE عندما لا يوجد auth.uid() (حالة anon) — تم إزالة الثقة بالكامل
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'access_denied: يتطلب تسجيل الدخول';
  END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = v_uid AND ucr.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id AND p_date BETWEEN start_date AND end_date AND is_closed = false
  ) THEN RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة'; END IF;

  IF p_cash_account_id IS NULL THEN RAISE EXCEPTION 'حساب الصندوق / البنك إلزامي'; END IF;
  PERFORM assert_account_belongs_to_company(p_cash_account_id, p_company_id, 'p_cash_account_id');

  v_effective_rate := COALESCE(NULLIF(p_exchange_rate, 0), 1.0);
  v_foreign_amount := COALESCE(NULLIF(p_foreign_amount, 0), p_amount);
  v_base_amount    := ROUND(v_foreign_amount * v_effective_rate, 4);
  IF p_currency_code = (SELECT base_currency FROM companies WHERE id = p_company_id LIMIT 1) THEN
    v_base_amount := v_foreign_amount; v_effective_rate := 1.0;
  END IF;

  v_ref_type := CASE p_bond_type
    WHEN 'receipt' THEN 'receipt_bond' WHEN 'payment' THEN 'payment_bond'
    WHEN 'disbursement' THEN 'payment_bond' WHEN 'transfer' THEN 'internal_transfer'
    ELSE NULL END;
  IF v_ref_type IS NULL THEN RAISE EXCEPTION 'نوع السند غير صحيح: %', p_bond_type; END IF;

  IF p_bond_type = 'transfer' THEN
    PERFORM assert_account_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (transfer target account)');
    v_counterparty_account_id := p_counterparty_id;
  ELSIF p_counterparty_type = 'account' THEN
    PERFORM assert_account_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (account)');
    v_counterparty_account_id := p_counterparty_id;
  ELSE
    PERFORM assert_party_belongs_to_company(p_counterparty_id, p_company_id, 'p_counterparty_id (party)');
    v_party_id := p_counterparty_id;
    SELECT type INTO v_party_type FROM parties WHERE id = p_counterparty_id;
    IF v_party_type IS NULL THEN RAISE EXCEPTION 'الطرف التجاري غير موجود: %', p_counterparty_id; END IF;
  END IF;

  INSERT INTO payments(
    company_id, branch_id, party_id, type, amount, currency_code, exchange_rate,
    payment_date, payment_method, account_id, reference_type, notes, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, v_party_id, CASE WHEN p_bond_type='disbursement' THEN 'disbursement' ELSE p_bond_type END,
    v_foreign_amount, p_currency_code, v_effective_rate,
    p_date, p_payment_method, p_cash_account_id, v_ref_type, p_description, 'posted', v_uid
  ) RETURNING id INTO v_payment_id;

  IF v_party_id IS NOT NULL THEN
    SELECT id INTO v_journal_id FROM journal_entries WHERE reference_id = v_payment_id AND deleted_at IS NULL LIMIT 1;
    IF v_journal_id IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: لم يتم ترحيل السند تلقائياً كما هو متوقع';
    END IF;
  ELSE
    INSERT INTO journal_entries(company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by)
    VALUES (p_company_id, p_branch_id, p_date, p_description, v_ref_type, v_payment_id, 'posted', v_uid)
    RETURNING id INTO v_journal_id;

    IF p_bond_type = 'transfer' THEN
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id, branch_id)
      VALUES
        (v_journal_id, v_counterparty_account_id, NULL, v_base_amount, 0, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id),
        (v_journal_id, p_cash_account_id, NULL, 0, v_base_amount, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id);
    ELSE
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount, description, currency_code, exchange_rate, foreign_amount, company_id, branch_id)
      VALUES
        (v_journal_id, v_counterparty_account_id, NULL, v_base_amount, 0, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id),
        (v_journal_id, p_cash_account_id, NULL, 0, v_base_amount, p_description, p_currency_code, v_effective_rate, v_foreign_amount, p_company_id, p_branch_id);
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    INSERT INTO payment_allocations(payment_id, invoice_id, amount, company_id)
    VALUES (v_payment_id, p_invoice_id, v_foreign_amount, p_company_id) ON CONFLICT DO NOTHING;
    UPDATE invoices SET paid_amount = GREATEST(0, COALESCE(paid_amount,0) + v_foreign_amount), updated_at = now()
    WHERE id = p_invoice_id AND company_id = p_company_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_payment_id, 'payment_number', (SELECT payment_number FROM payments WHERE id = v_payment_id),
    'journal_id', v_journal_id, 'base_amount', v_base_amount, 'foreign_amount', v_foreign_amount,
    'exchange_rate', v_effective_rate, 'status', 'success'
  );
END;
$function$

-- ===== create_stock_transfer =====

CREATE OR REPLACE FUNCTION public.create_stock_transfer(p_from_warehouse uuid, p_to_warehouse uuid, p_items jsonb, p_company_id uuid, p_user_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transfer_id uuid;
    v_item jsonb;
BEGIN
    -- Check basic permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لهذه الشركة';
    END IF;

    -- 1. Insert transfer record
    INSERT INTO public.stock_transfers (
        company_id, from_warehouse_id, to_warehouse_id, notes, status, created_by
    )
    VALUES (
        p_company_id, p_from_warehouse, p_to_warehouse, p_notes, 'pending', p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 2. Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.stock_transfer_items (
            transfer_id, company_id, product_id, quantity
        ) VALUES (
            v_transfer_id, p_company_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::numeric
        );
    END LOOP;

    -- 3. Execute the transfer using the existing process_stock_transfer
    PERFORM public.process_stock_transfer(v_transfer_id);

    RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);
END;
$function$

-- ===== disassemble_kit =====

CREATE OR REPLACE FUNCTION public.disassemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_kit_qty NUMERIC;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Check kit stock
    SELECT COALESCE(quantity, 0) INTO v_kit_qty
    FROM product_stock
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

    IF v_kit_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient kit stock: need %, available %', p_quantity, v_kit_qty;
    END IF;

    -- Reduce kit stock
    UPDATE product_stock
    SET quantity = quantity - p_quantity,
        updated_at = NOW()
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

    -- Log inventory transaction for kit removal
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, -p_quantity,
        'adj_out', 'kit_disassembly', p_kit_product_id, p_user_id
    );

    -- Increase component stock
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
        INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
        VALUES (v_component.component_product_id, p_warehouse_id, v_component.quantity * p_quantity, p_company_id, NOW(), NOW())
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = product_stock.quantity + (v_component.quantity * p_quantity), updated_at = NOW();

        -- Log inventory transaction for component return
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            v_component.quantity * p_quantity,
            'adj_in', 'kit_disassembly', p_kit_product_id, p_user_id
        );
    END LOOP;
END;
$function$

-- ===== ensure_vehicle =====

CREATE OR REPLACE FUNCTION public.ensure_vehicle(p_make text, p_model text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer, p_engine text DEFAULT NULL::text, p_body_type text DEFAULT NULL::text, p_drive_type text DEFAULT NULL::text, p_fuel_type text DEFAULT NULL::text, p_transmission text DEFAULT NULL::text, p_region text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id    UUID;
    v_model TEXT  := COALESCE(NULLIF(TRIM(p_model), ''), '');
    v_year  INTEGER := COALESCE(p_year, 0);
BEGIN
    -- Find an existing vehicle (case-insensitive make + model, year in range).
    -- year_start = 0 means "unknown" and matches any requested year.
    SELECT id INTO v_id
    FROM public.vehicles
    WHERE lower(make) = lower(p_make)
      AND (p_model IS NULL OR lower(COALESCE(model, '')) = lower(p_model))
      AND (
            p_year IS NULL
            OR year_start = 0
            OR (year_start <= p_year AND year_end >= p_year)
          )
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO public.vehicles (
        make, model, year_start, year_end,
        engine, body_type, drive_type, fuel_type, transmission, region
    ) VALUES (
        p_make, v_model, v_year, v_year,
        p_engine, p_body_type, p_drive_type, p_fuel_type, p_transmission, p_region
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$

-- ===== finalize_audit_session =====

CREATE OR REPLACE FUNCTION public.finalize_audit_session(p_session_id uuid, p_user_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_adj_count INT := 0;
BEGIN
    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found';
    END IF;

    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := GREATEST(0, (v_item->>'counted_quantity')::NUMERIC);

        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_session.warehouse_id,
            v_new_qty,
            v_session.company_id
        )
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = EXCLUDED.quantity;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$function$

-- ===== fn_accounting_health_check =====

CREATE OR REPLACE FUNCTION public.fn_accounting_health_check()
 RETURNS TABLE(check_name text, severity text, issue_count bigint, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  IF NOT (current_setting('role', true) = 'service_role' OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'access_denied: هذه الأداة التشخيصية مقصورة على مدراء النظام';
  END IF;

  return query
  select 'missing_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(ref, ', '), 'لا توجد مشاكل')
  from (
    select i.invoice_number as ref from invoices i
    where i.status not in ('draft','cancelled') and i.deleted_at is null
    and not exists (select 1 from journal_entries je where je.reference_id=i.id and je.deleted_at is null)
    union all
    select p.payment_number from payments p
    where p.status = 'posted' and p.deleted_at is null
    and not exists (select 1 from journal_entries je where je.reference_id=p.id and je.deleted_at is null)
  ) x;

  return query
  select 'unbalanced_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(entry_number::text, ', '), 'لا توجد مشاكل')
  from (
    select je.entry_number
    from journal_entries je
    join journal_entry_lines jel on jel.journal_entry_id = je.id and jel.deleted_at is null
    where je.deleted_at is null
    group by je.id, je.entry_number
    having round(sum(jel.debit_amount) - sum(jel.credit_amount), 2) <> 0
  ) x;

  return query
  select 'posting_to_non_postable_account'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(a.code, ', '), 'لا توجد مشاكل')
  from journal_entry_lines jel
  join accounts a on a.id = jel.account_id
  where jel.deleted_at is null and (a.allow_posting = false or a.is_active = false);

  return query
  select 'trial_balance_imbalance'::text, 'critical'::text,
    case when abs(coalesce(sum(total_debit),0) - coalesce(sum(total_credit),0)) > 0.01 then 1 else 0 end::bigint,
    'الفرق: ' || round(coalesce(sum(total_debit),0) - coalesce(sum(total_credit),0), 2)::text
  from vw_trial_balance;

  return query
  select 'journal_in_closed_fiscal_year'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(je.entry_number::text, ', '), 'لا توجد مشاكل')
  from journal_entries je
  join fiscal_years fy on fy.company_id = je.company_id and je.entry_date between fy.start_date and fy.end_date
  where fy.is_closed = true and je.deleted_at is null;

  return query
  select 'payment_missing_account'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(payment_number, ', '), 'لا توجد مشاكل')
  from payments
  where status = 'posted' and account_id is null and deleted_at is null;

  return query
  select 'negative_stock'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(product_id::text, ', '), 'لا توجد مشاكل')
  from product_stock where quantity < 0;

  return query
  select 'party_balances_mismatch'::text, 'critical'::text,
    case when abs(
      coalesce((select sum(balance) from party_balances where type='customer'),0)
      - coalesce((select net_balance from vw_trial_balance where code='1100'),0)
    ) > 0.01 then 1 else 0 end::bigint,
    'AR: parties=' || coalesce((select sum(balance) from party_balances where type='customer'),0)::text
    || ' vs ledger=' || coalesce((select net_balance from vw_trial_balance where code='1100'),0)::text;

  return query
  select 'report_function_join_pattern_risk'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(p.proname, ', '), 'لا توجد مشاكل')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.proname like 'report_%'
  and pg_get_functiondef(p.oid) ~* 'LEFT\s+JOIN\s+journal_entry_lines\s+jel\s+ON\s+a\.id\s*=\s*jel\.account_id\s+AND\s+jel\.deleted_at\s+IS\s+NULL\s*$';
end;
$function$

-- ===== fn_archive_supplier_price =====

CREATE OR REPLACE FUNCTION public.fn_archive_supplier_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price THEN
    INSERT INTO public.supplier_price_history (
      company_id, supplier_id, product_id,
      unit_price, currency_code, effective_date
    ) VALUES (
      NEW.company_id, NEW.supplier_id, NEW.product_id,
      OLD.cost_price, 
      COALESCE(NEW.currency_code, 'SAR'),  -- ✅ ديناميكي بدل hard-coded
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$function$

-- ===== fn_assert_company_access =====

CREATE OR REPLACE FUNCTION public.fn_assert_company_access(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لبيانات هذه الشركة';
  END IF;
END;
$function$

-- ===== fn_auto_post_invoice_journal =====

CREATE OR REPLACE FUNCTION public.fn_auto_post_invoice_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_je_id uuid;
  v_acc_ar uuid;
  v_acc_ap uuid;
  v_acc_revenue uuid;
  v_acc_vat uuid;
  v_acc_inventory uuid;
  v_acc_cogs uuid;
  v_total_cost numeric(18,4);
  v_net_amount numeric(18,4);
  v_net_receivable numeric(18,4);
  v_already_posted boolean;
  v_postable_statuses text[] := array['posted','confirmed','paid','partially_paid'];
begin
  if not (new.status = any(v_postable_statuses)) then
    return new;
  end if;

  select exists(
    select 1 from public.journal_entries je
    where je.reference_id = new.id and je.deleted_at is null
  ) into v_already_posted;
  if v_already_posted then
    return new;
  end if;

  v_acc_ar        := fn_get_account_id(new.company_id, '1100');
  v_acc_ap        := fn_get_account_id(new.company_id, '2100');
  v_acc_revenue   := fn_get_account_id(new.company_id, '4100');
  v_acc_vat       := fn_get_account_id(new.company_id, '2200');
  v_acc_inventory := fn_get_account_id(new.company_id, '1200');
  v_acc_cogs      := fn_get_account_id(new.company_id, '5100');

  -- Net value after tax & discount
  v_net_amount := (new.total_amount - coalesce(new.tax_amount,0)) - coalesce(new.discount_amount,0);
  -- Amount actually receivable/payable - NET of discount (keeps the journal balanced)
  v_net_receivable := new.total_amount - coalesce(new.discount_amount,0);

  if new.type = 'sale' then
    if v_acc_ar is null or v_acc_revenue is null then
      raise exception 'auto_post_failed: ?????? AR(1100)/Revenue(4100) ??? ?????? ????? % - ??? ??????? ??? ????? ???????? %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_invoice', new.id,
            '????? ?????? - ?????? ?????? ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ar, new.company_id, new.branch_id, v_net_receivable, 0, new.currency_code, coalesce(new.exchange_rate,1), '?????? - ' || coalesce(new.invoice_number,''), new.party_id);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_net_amount, new.currency_code, coalesce(new.exchange_rate,1), '??????? ?????? - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: ???? ??????? (2200) ??? ????? ????? % - ???????? % ????? ????? %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, new.tax_amount, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;

    select coalesce(sum(ii.quantity * ii.cost_price), 0) into v_total_cost
    from invoice_items ii where ii.invoice_id = new.id;

    if v_total_cost > 0 then
      if v_acc_inventory is null or v_acc_cogs is null then
        raise exception 'auto_post_failed: ?????? ???????(1200)/????? ???????(5100) ??? ?????? ????? % - ???????? % ??? ????? %', new.company_id, coalesce(new.invoice_number,''), v_total_cost;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cost, 0, 'SAR', 1, '????? ????? ????? - ' || coalesce(new.invoice_number,''));

      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_total_cost, 'SAR', 1, '????? ????? - ' || coalesce(new.invoice_number,''));
    end if;

  elsif new.type in ('sale_return', 'return_sale') then

    if v_acc_ar is null or v_acc_revenue is null then
      raise exception 'auto_post_failed: ?????? AR(1100)/Revenue(4100) ??? ?????? ????? % - ??? ??????? ??? ????? ??????? %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'sales_return', new.id,
            '????? ?????? - ????? ?????? ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_net_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '??? ????? - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: ???? ??????? (2200) ??? ????? ????? % - ??????? % ????? ????? %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, new.tax_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '??? ????? - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ar, new.company_id, new.branch_id, 0, v_net_receivable, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? - ' || coalesce(new.invoice_number,''), new.party_id);

    select coalesce(sum(ii.quantity * ii.cost_price), 0) into v_total_cost
    from invoice_items ii where ii.invoice_id = new.id;

    if v_total_cost > 0 then
      if v_acc_inventory is null or v_acc_cogs is null then
        raise exception 'auto_post_failed: ?????? ???????(1200)/????? ???????(5100) ??? ?????? ????? % - ??????? % ?? ????? %', new.company_id, coalesce(new.invoice_number,''), v_total_cost;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cost, 0, 'SAR', 1, '????? ??????? - ' || coalesce(new.invoice_number,''));

      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description)
      values (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cost, 'SAR', 1, '??? ????? - ' || coalesce(new.invoice_number,''));
    end if;

  elsif new.type = 'purchase' then
    if v_acc_ap is null or v_acc_inventory is null then
      raise exception 'auto_post_failed: ?????? AP(2100)/Inventory(1200) ??? ?????? ????? % - ??? ??????? ??? ????? ?????? ?????? %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'purchase_invoice', new.id,
            '????? ?????? - ?????? ???? ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_net_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '????? ????? - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: ???? ??????? (2200) ??? ????? ????? % - ?????? ?????? % ????? ????? %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, new.tax_amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '????? ??????? - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, v_net_receivable, new.currency_code, coalesce(new.exchange_rate,1), '?????? - ' || coalesce(new.invoice_number,''), new.party_id);

  elsif new.type in ('purchase_return', 'return_purchase') then
    if v_acc_ap is null or v_acc_inventory is null then
      raise exception 'auto_post_failed: ?????? AP(2100)/Inventory(1200) ??? ?????? ????? % - ??? ??????? ??? ????? ????? ?????? %', new.company_id, coalesce(new.invoice_number,'');
    end if;

    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.issue_date, 'purchase_return', new.id,
            '????? ?????? - ????? ???? ' || coalesce(new.invoice_number,''), 'draft', new.created_by)
    returning id into v_je_id;

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_ap, new.company_id, new.branch_id, v_net_receivable, 0, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? - ' || coalesce(new.invoice_number,''), new.party_id);

    insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
    values (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_net_amount, new.currency_code, coalesce(new.exchange_rate,1), '????? ????? - ' || coalesce(new.invoice_number,''), new.party_id);

    if coalesce(new.tax_amount,0) <> 0 then
      if v_acc_vat is null then
        raise exception 'auto_post_failed: ???? ??????? (2200) ??? ????? ????? % - ????? ?????? % ????? ????? %', new.company_id, coalesce(new.invoice_number,''), new.tax_amount;
      end if;
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, new.tax_amount, new.currency_code, coalesce(new.exchange_rate,1), '??? ????? - ' || coalesce(new.invoice_number,''), new.party_id);
    end if;
  end if;

  update journal_entries set status = 'posted' where id = v_je_id;
  return new;
end;
$function$

-- ===== fn_auto_post_payment_journal =====

CREATE OR REPLACE FUNCTION public.fn_auto_post_payment_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_je_id uuid; v_acc_ar uuid; v_acc_ap uuid; v_already_posted boolean; v_party_type text;
begin
  if new.status <> 'posted' then return new; end if;

  select exists(select 1 from public.journal_entries je where je.reference_id = new.id and je.deleted_at is null)
    into v_already_posted;
  if v_already_posted then return new; end if;

  if new.party_id is null then
    return new;
  end if;

  if new.account_id is null then
    raise exception 'auto_post_failed: ?????? % ???? account_id (?????/???) - ?? ???? ??????? ???? ????? ???? ?????/?????', new.payment_number;
  end if;

  select type into v_party_type from public.parties where id = new.party_id;
  if v_party_type is null then
    raise exception 'auto_post_failed: ?? ???? ????? ??? ????? (????/????) ?????? % - party_id % ??? ????? ?? ???? type', new.payment_number, new.party_id;
  end if;

  v_acc_ar := fn_get_account_id(new.company_id, '1100');
  v_acc_ap := fn_get_account_id(new.company_id, '2100');

  if v_party_type = 'customer' then
    if v_acc_ar is null then
      raise exception 'auto_post_failed: ???? AR(1100) ??? ????? ????? % - ?? ???? ????? ?????? %', new.company_id, new.payment_number;
    end if;
    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.payment_date,
      case when new.type = 'receipt' then 'receipt_bond' else 'payment_bond' end, new.id,
      '????? ?????? - ' || (case when new.type='receipt' then '??? ??? ?? ???? ' else '??? ???/????? ???? ????? ' end) || new.payment_number,
      'draft', new.created_by)
    returning id into v_je_id;

    if new.type = 'receipt' then
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '??? - ' || new.payment_number, new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ar, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? - ' || new.payment_number, new.party_id);
    else
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ar, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? (????? ????) - ' || new.payment_number, new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), '??? ???? ????? - ' || new.payment_number, new.party_id);
    end if;

  elsif v_party_type = 'supplier' then
    if v_acc_ap is null then
      raise exception 'auto_post_failed: ???? AP(2100) ??? ????? ????? % - ?? ???? ????? ?????? %', new.company_id, new.payment_number;
    end if;
    insert into journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    values (new.company_id, new.branch_id, new.payment_date,
      case when new.type = 'disbursement' then 'payment_bond' else 'receipt_bond' end, new.id,
      '????? ?????? - ' || (case when new.type='disbursement' then '??? ??? ????? ' else '??? ???/????? ???? ?? ???? ' end) || new.payment_number,
      'draft', new.created_by)
    returning id into v_je_id;

    if new.type = 'disbursement' then
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ap, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? - ' || new.payment_number, new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), '??? - ' || new.payment_number, new.party_id);
    else
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, new.account_id, new.company_id, new.branch_id, new.amount, 0, new.currency_code, coalesce(new.exchange_rate,1), '??? ???? ?? ???? - ' || new.payment_number, new.party_id);
      insert into journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, currency_code, exchange_rate, description, party_id)
      values (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, new.amount, new.currency_code, coalesce(new.exchange_rate,1), '????? ?????? (????? ????) - ' || new.payment_number, new.party_id);
    end if;
  else
    raise exception 'auto_post_failed: ??? ??? ??? ????? (%) ?????? % - ??? ?? ???? customer ?? supplier', v_party_type, new.payment_number;
  end if;

  update journal_entries set status = 'posted' where id = v_je_id;
  return new;
end;
$function$

-- ===== fn_check_fiscal_year_overlap =====

CREATE OR REPLACE FUNCTION public.fn_check_fiscal_year_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = NEW.company_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (NEW.start_date, NEW.end_date) OVERLAPS (start_date, end_date)
  ) THEN
    RAISE EXCEPTION 'تتداخل السنة المالية مع سنة مالية موجودة';
  END IF;
  RETURN NEW;
END;
$function$

-- ===== fn_check_inventory_transaction_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_inventory_transaction_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_warehouse_company uuid;
  v_product_company   uuid;
BEGIN
  -- تحقق من المستودع
  IF NEW.warehouse_id IS NOT NULL THEN
    SELECT company_id INTO v_warehouse_company
    FROM warehouses WHERE id = NEW.warehouse_id;

    IF v_warehouse_company IS NULL THEN
      RAISE EXCEPTION 'tenant_violation: المستودع % غير موجود', NEW.warehouse_id;
    END IF;

    IF v_warehouse_company != NEW.company_id THEN
      RAISE EXCEPTION 'tenant_violation: المستودع % ينتمي للشركة % وليس للشركة %',
        NEW.warehouse_id, v_warehouse_company, NEW.company_id;
    END IF;
  END IF;

  -- تحقق من المنتج
  IF NEW.product_id IS NOT NULL THEN
    SELECT company_id INTO v_product_company
    FROM products WHERE id = NEW.product_id;

    IF v_product_company IS NULL THEN
      RAISE EXCEPTION 'tenant_violation: المنتج % غير موجود في حركة المخزون', NEW.product_id;
    END IF;

    IF v_product_company != NEW.company_id THEN
      RAISE EXCEPTION 'tenant_violation: المنتج % ينتمي للشركة % وليس للشركة %',
        NEW.product_id, v_product_company, NEW.company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_check_invoice_item_product_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_invoice_item_product_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_product_company uuid;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_product_company
  FROM products WHERE id = NEW.product_id;

  IF v_product_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: المنتج % غير موجود في بند الفاتورة', NEW.product_id;
  END IF;

  IF v_product_company != NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: المنتج % ينتمي للشركة % وليس للشركة %',
      NEW.product_id, v_product_company, NEW.company_id;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_check_invoice_party_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_invoice_party_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_party_company uuid;
BEGIN
  IF NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_party_company
  FROM parties WHERE id = NEW.party_id;

  IF v_party_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: الطرف % غير موجود في الفاتورة', NEW.party_id;
  END IF;

  IF v_party_company != NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: طرف الفاتورة % ينتمي للشركة % وليس للشركة %',
      NEW.party_id, v_party_company, NEW.company_id;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_check_journal_line_account_postable =====

CREATE OR REPLACE FUNCTION public.fn_check_journal_line_account_postable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_allow_posting boolean;
  v_is_active boolean;
begin
  select allow_posting, is_active into v_allow_posting, v_is_active
  from public.accounts where id = new.account_id;

  if v_is_active is distinct from true then
    raise exception 'account_inactive: لا يمكن الترحيل على حساب غير نشط (account_id=%)', new.account_id;
  end if;

  if v_allow_posting is distinct from true then
    raise exception 'account_not_postable: هذا حساب تجميعي/أب لا يُسمح بالترحيل عليه مباشرة (account_id=%)', new.account_id;
  end if;

  return new;
end;
$function$

-- ===== fn_check_journal_line_account_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_journal_line_account_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_account_company uuid;
  v_entry_company   uuid;
BEGIN
  -- تحقق من أن الحساب ينتمي لنفس شركة السطر
  SELECT company_id INTO v_account_company
  FROM accounts WHERE id = NEW.account_id;

  v_entry_company := COALESCE(NEW.company_id, (
    SELECT company_id FROM journal_entries WHERE id = NEW.journal_entry_id
  ));

  IF v_account_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: الحساب % غير موجود', NEW.account_id;
  END IF;

  IF v_account_company != v_entry_company THEN
    RAISE EXCEPTION 'tenant_violation: الحساب % ينتمي للشركة % وليس للشركة %',
      NEW.account_id, v_account_company, v_entry_company;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_check_journal_line_entry_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_journal_line_entry_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_entry_company uuid;
BEGIN
  SELECT company_id INTO v_entry_company
  FROM journal_entries WHERE id = NEW.journal_entry_id;

  IF v_entry_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: القيد % غير موجود', NEW.journal_entry_id;
  END IF;

  IF NEW.company_id IS NOT NULL AND v_entry_company != NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: القيد % ينتمي للشركة % وليس للشركة %',
      NEW.journal_entry_id, v_entry_company, NEW.company_id;
  END IF;

  -- إجبار company_id على نفس شركة القيد دائماً
  NEW.company_id := v_entry_company;

  RETURN NEW;
END;
$function$

-- ===== fn_check_journal_line_party_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_journal_line_party_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_party_company uuid;
  v_entry_company uuid;
BEGIN
  IF NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_party_company
  FROM parties WHERE id = NEW.party_id;

  v_entry_company := COALESCE(NEW.company_id, (
    SELECT company_id FROM journal_entries WHERE id = NEW.journal_entry_id
  ));

  IF v_party_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: الطرف التجاري % غير موجود', NEW.party_id;
  END IF;

  IF v_party_company != v_entry_company THEN
    RAISE EXCEPTION 'tenant_violation: الطرف % ينتمي للشركة % وليس للشركة %',
      NEW.party_id, v_party_company, v_entry_company;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_check_payment_account_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_payment_account_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_account_company uuid;
BEGIN
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_account_company
  FROM accounts WHERE id = NEW.account_id;

  IF v_account_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: حساب الصندوق % غير موجود في السند', NEW.account_id;
  END IF;

  IF v_account_company != NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: حساب الصندوق % ينتمي للشركة % وليس للشركة %',
      NEW.account_id, v_account_company, NEW.company_id;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_check_payment_party_tenant =====

CREATE OR REPLACE FUNCTION public.fn_check_payment_party_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_party_company uuid;
BEGIN
  IF NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_party_company
  FROM parties WHERE id = NEW.party_id;

  IF v_party_company IS NULL THEN
    RAISE EXCEPTION 'tenant_violation: الطرف % غير موجود في السند', NEW.party_id;
  END IF;

  IF v_party_company != NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: طرف السند % ينتمي للشركة % وليس للشركة %',
      NEW.party_id, v_party_company, NEW.company_id;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== fn_get_account_id =====

CREATE OR REPLACE FUNCTION public.fn_get_account_id(p_company_id uuid, p_code text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select id from public.accounts where company_id = p_company_id and code = p_code limit 1;
$function$

-- ===== fn_post_inventory_movement =====

CREATE OR REPLACE FUNCTION public.fn_post_inventory_movement(p_company_id uuid, p_product_id uuid, p_warehouse_id uuid, p_quantity numeric, p_transaction_type text, p_reference_type text, p_reference_id uuid, p_created_by uuid, p_unit_cost numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cost numeric;
  v_id uuid;
BEGIN
  IF p_unit_cost IS NOT NULL THEN
    v_cost := p_unit_cost;
  ELSE
    SELECT weighted_avg_cost INTO v_cost
    FROM product_stock WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    IF v_cost IS NULL THEN
      SELECT cost_price INTO v_cost FROM products WHERE id = p_product_id;
    END IF;
    v_cost := COALESCE(v_cost, 0);
  END IF;

  INSERT INTO inventory_transactions(
    company_id, product_id, warehouse_id, quantity, unit_cost,
    transaction_type, reference_type, reference_id, created_by
  ) VALUES (
    p_company_id, p_product_id, p_warehouse_id, p_quantity, v_cost,
    p_transaction_type, p_reference_type, p_reference_id, p_created_by
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$

-- ===== fn_release_payment_allocations =====

CREATE OR REPLACE FUNCTION public.fn_release_payment_allocations(p_payment_id uuid DEFAULT NULL::uuid, p_invoice_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_alloc RECORD;
BEGIN
  IF p_payment_id IS NULL AND p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'must_provide_payment_or_invoice_id';
  END IF;

  FOR v_alloc IN
    SELECT * FROM payment_allocations
    WHERE deleted_at IS NULL
      AND (p_payment_id IS NULL OR payment_id = p_payment_id)
      AND (p_invoice_id IS NULL OR invoice_id = p_invoice_id)
  LOOP
    UPDATE invoices SET paid_amount = GREATEST(0, COALESCE(paid_amount,0) - v_alloc.amount), updated_at = now()
    WHERE id = v_alloc.invoice_id;

    UPDATE payment_allocations SET deleted_at = now() WHERE id = v_alloc.id;
  END LOOP;
END;
$function$

-- ===== fn_require_inventory_cost =====

CREATE OR REPLACE FUNCTION public.fn_require_inventory_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.unit_cost is null or new.unit_cost < 0 then
    raise exception 'inventory_cost_required: يجب تحديد unit_cost صالح (>=0) لكل حركة مخزون';
  end if;
  if new.total_cost is null then
    new.total_cost := round(abs(new.quantity) * new.unit_cost, 4);
  end if;
  return new;
end;
$function$

-- ===== fn_reverse_inventory_for_reference =====

CREATE OR REPLACE FUNCTION public.fn_reverse_inventory_for_reference(p_reference_id uuid, p_source_reference_types text[], p_new_reference_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_txn RECORD;
  v_opposite_type text;
BEGIN
  FOR v_txn IN
    SELECT * FROM inventory_transactions
    WHERE reference_id = p_reference_id
      AND reference_type = ANY(p_source_reference_types)
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    v_opposite_type := CASE v_txn.transaction_type
      WHEN 'sales' THEN 'sales_return'
      WHEN 'sales_return' THEN 'sales'
      WHEN 'purchase' THEN 'purchase_return'
      WHEN 'purchase_return' THEN 'purchase'
      WHEN 'transfer_in' THEN 'transfer_out'
      WHEN 'transfer_out' THEN 'transfer_in'
      WHEN 'adj_in' THEN 'adj_out'
      WHEN 'adj_out' THEN 'adj_in'
      ELSE 'adj_out'
    END;

    INSERT INTO inventory_transactions(
      company_id, product_id, warehouse_id, quantity, unit_cost,
      transaction_type, reference_type, reference_id, created_by
    ) VALUES (
      v_txn.company_id, v_txn.product_id, v_txn.warehouse_id, v_txn.quantity, v_txn.unit_cost,
      v_opposite_type, p_new_reference_type, p_reference_id, auth.uid()
    );
  END LOOP;
END;
$function$

-- ===== fn_reverse_journal_entries =====

CREATE OR REPLACE FUNCTION public.fn_reverse_journal_entries(p_source_reference_id uuid, p_source_reference_types text[], p_new_reference_type text, p_description_prefix text, p_created_by uuid, p_company_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_je RECORD;
  v_new_je_id uuid;
  v_line RECORD;
  v_result uuid[] := '{}';
BEGIN
  FOR v_je IN
    SELECT id, description FROM journal_entries
    WHERE reference_id = p_source_reference_id
      AND reference_type = ANY(p_source_reference_types)
      AND status = 'posted' AND deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO journal_entries(company_id, entry_date, description, reference_type, reference_id, status, created_by)
    VALUES (p_company_id, CURRENT_DATE, p_description_prefix || COALESCE(v_je.description,''),
            p_new_reference_type, p_source_reference_id, 'posted', p_created_by)
    RETURNING id INTO v_new_je_id;

    FOR v_line IN SELECT * FROM journal_entry_lines WHERE journal_entry_id = v_je.id AND deleted_at IS NULL LOOP
      INSERT INTO journal_entry_lines(journal_entry_id, account_id, party_id, debit_amount, credit_amount,
                                       description, currency_code, exchange_rate, foreign_amount, company_id)
      VALUES (v_new_je_id, v_line.account_id, v_line.party_id, v_line.credit_amount, v_line.debit_amount,
              'عكس: ' || COALESCE(v_line.description,''), v_line.currency_code, v_line.exchange_rate,
              v_line.foreign_amount, p_company_id);
    END LOOP;

    v_result := v_result || v_new_je_id;
  END LOOP;

  RETURN v_result;
END;
$function$

-- ===== fn_sync_invoice_paid_amount =====

CREATE OR REPLACE FUNCTION public.fn_sync_invoice_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.invoices SET
    paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM public.payment_allocations
                   WHERE invoice_id = v_invoice_id AND deleted_at IS NULL)
  WHERE id = v_invoice_id;
  RETURN NEW;
END;
$function$

-- ===== fn_sync_party_stats =====

CREATE OR REPLACE FUNCTION public.fn_sync_party_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_party_id uuid;
BEGIN
  v_party_id := COALESCE(NEW.party_id, OLD.party_id);
  IF v_party_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.parties SET
    total_invoices_count = (
      SELECT COUNT(*) FROM public.invoices
      WHERE party_id = v_party_id AND status != 'void' AND deleted_at IS NULL
    ),
    total_paid_amount = (
      SELECT COALESCE(SUM(paid_amount), 0) FROM public.invoices
      WHERE party_id = v_party_id AND status != 'void' AND deleted_at IS NULL
    ),
    last_invoice_date = (
      SELECT MAX(created_at) FROM public.invoices
      WHERE party_id = v_party_id AND status != 'void' AND deleted_at IS NULL
    )
  WHERE id = v_party_id;
  RETURN NEW;
END;
$function$

-- ===== fn_update_weighted_avg_cost =====

CREATE OR REPLACE FUNCTION public.fn_update_weighted_avg_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_old_qty numeric;
  v_old_avg numeric;
  v_new_avg numeric;
begin
  if new.transaction_type = 'purchase' and new.quantity > 0 then
    select quantity, weighted_avg_cost into v_old_qty, v_old_avg
    from public.product_stock
    where product_id = new.product_id and warehouse_id = new.warehouse_id
    for update;

    if v_old_qty is null then
      v_old_qty := 0;
      v_old_avg := 0;
    end if;

    if (v_old_qty + new.quantity) <= 0 then
      v_new_avg := new.unit_cost;
    else
      v_new_avg := round(
        (v_old_qty * coalesce(v_old_avg,0) + new.quantity * new.unit_cost)
        / (v_old_qty + new.quantity), 4);
    end if;

    update public.product_stock
    set weighted_avg_cost = v_new_avg
    where product_id = new.product_id and warehouse_id = new.warehouse_id;

    -- [FIX] مزامنة products.cost_price/purchase_price بنفس الرقم الصحيح (بدل حساب مستقل متعارض)
    update public.products
    set cost_price = v_new_avg,
        purchase_price = new.unit_cost
    where id = new.product_id;
  end if;

  return new;
end;
$function$

-- ===== fn_validate_invoice_business_rules =====

CREATE OR REPLACE FUNCTION public.fn_validate_invoice_business_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_party_status text;
  v_credit_limit numeric;
  v_current_balance numeric;
BEGIN
  IF NEW.party_id IS NOT NULL AND NEW.type = 'sale' AND NEW.status NOT IN ('draft','cancelled') THEN
    SELECT status, credit_limit INTO v_party_status, v_credit_limit
    FROM public.parties
    WHERE id = NEW.party_id AND company_id = NEW.company_id;

    IF v_party_status = 'blocked' THEN
      RAISE EXCEPTION 'العميل محظور، لا يمكن إصدار فاتورة مبيعات له';
    END IF;

    IF v_credit_limit IS NOT NULL AND v_credit_limit > 0 THEN
      SELECT COALESCE(balance, 0) INTO v_current_balance
      FROM public.party_balances
      WHERE party_id = NEW.party_id AND company_id = NEW.company_id;

      IF (COALESCE(v_current_balance,0) + NEW.total_amount) > v_credit_limit THEN
        RAISE EXCEPTION 'تجاوز حد الائتمان المسموح للعميل (الحد: %, الرصيد المتوقع بعد الفاتورة: %)',
          v_credit_limit, COALESCE(v_current_balance,0) + NEW.total_amount;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== generate_invoice_number =====

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
$function$

-- ===== generate_journal_entry_number =====

CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.entry_number IS NULL THEN
    NEW.entry_number := (
      SELECT COALESCE(MAX(entry_number), 0) + 1
      FROM public.journal_entries
      WHERE company_id = NEW.company_id
    );
  END IF;
  RETURN NEW;
END;
$function$

-- ===== generate_payment_number =====

CREATE OR REPLACE FUNCTION public.generate_payment_number(p_company_id uuid, p_type text)
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
    WHEN 'receipt'      THEN 'RCP'
    WHEN 'disbursement' THEN 'DSB'
    ELSE                     'PMT'
  END;

  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || p_type || 'payment_number'));

  SELECT COUNT(*) + 1
  INTO v_count
  FROM public.payments
  WHERE company_id = p_company_id
    AND type       = p_type
    AND deleted_at IS NULL;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$

-- ===== get_account_ledger =====

CREATE OR REPLACE FUNCTION public.get_account_ledger(p_company_id uuid, p_account_id uuid, p_from text DEFAULT NULL::text, p_to text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type    text;
  v_is_debit_nature boolean;
  v_opening_balance numeric := 0;
  v_entries         json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT type INTO v_account_type FROM accounts WHERE id=p_account_id AND company_id=p_company_id;
  IF v_account_type IS NULL THEN RAISE EXCEPTION 'account_not_found'; END IF;
  v_is_debit_nature := v_account_type IN ('asset','expense');

  IF p_from IS NOT NULL THEN
    WITH RECURSIVE account_tree AS (
      SELECT id FROM accounts WHERE id = p_account_id
      UNION ALL
      SELECT a.id FROM accounts a
      INNER JOIN account_tree at ON a.parent_id = at.id
    )
    SELECT COALESCE(SUM(CASE WHEN v_is_debit_nature
      THEN (COALESCE(jel.debit_amount,0)-COALESCE(jel.credit_amount,0))
      ELSE (COALESCE(jel.credit_amount,0)-COALESCE(jel.debit_amount,0)) END),0)
    INTO v_opening_balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE jel.account_id IN (SELECT id FROM account_tree) AND je.company_id=p_company_id
      AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id=p_branch_id)
      AND je.entry_date < p_from::date;
  END IF;

  WITH RECURSIVE account_tree AS (
    SELECT id FROM accounts WHERE id = p_account_id
    UNION ALL
    SELECT a.id FROM accounts a
    INNER JOIN account_tree at ON a.parent_id = at.id
  )
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.entry_number),'[]'::json)
  INTO v_entries
  FROM (
    SELECT je.entry_date, je.entry_number,
      je.branch_id,
      COALESCE(jel.description,je.description,'') AS description,
      COALESCE(jel.debit_amount,0) AS debit_amount,
      COALESCE(jel.credit_amount,0) AS credit_amount,
      COALESCE(jel.currency_code,'SAR') AS currency_code,
      COALESCE(jel.exchange_rate,1) AS exchange_rate,
      COALESCE(jel.foreign_amount,0) AS foreign_amount,
      v_opening_balance + SUM(CASE WHEN v_is_debit_nature
        THEN (COALESCE(jel.debit_amount,0)-COALESCE(jel.credit_amount,0))
        ELSE (COALESCE(jel.credit_amount,0)-COALESCE(jel.debit_amount,0)) END)
        OVER (ORDER BY je.entry_date,je.entry_number ROWS UNBOUNDED PRECEDING) AS balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE jel.account_id IN (SELECT id FROM account_tree) AND je.company_id=p_company_id
      AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id=p_branch_id)
      AND (p_from IS NULL OR je.entry_date>=p_from::date)
      AND (p_to   IS NULL OR je.entry_date<=p_to::date)
  ) t;

  RETURN json_build_object(
    'openingBalance',v_opening_balance,'entries',v_entries,'accountType',v_account_type);
END;$function$

-- ===== get_all_parties =====

CREATE OR REPLACE FUNCTION public.get_all_parties(p_company_id uuid, p_type text DEFAULT 'all'::text, p_status text DEFAULT 'active'::text)
 RETURNS TABLE(id uuid, company_id uuid, name text, type text, phone text, email text, tax_number text, address text, status text, category_id uuid, category_name text, customer_type text, lead_source text, preferred_contact_method text, credit_limit numeric, total_invoices_count integer, total_paid_amount numeric, last_invoice_date timestamp with time zone, customer_since date, loyalty_points integer, supplier_type text, payment_terms_days integer, min_order_amount numeric, delivery_lead_days integer, is_active_supplier boolean, avg_rating numeric, total_orders_count integer, total_purchases_amount numeric, last_purchase_date timestamp with time zone, balance numeric, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.company_id,
    p.name,
    p.type,
    p.phone,
    p.email,
    p.tax_number,
    p.address,
    p.status,
    p.category_id,
    pc.name           AS category_name,
    p.customer_type,
    p.lead_source,
    p.preferred_contact_method,
    p.credit_limit,
    p.total_invoices_count,
    p.total_paid_amount,
    p.last_invoice_date,
    p.customer_since,
    p.loyalty_points,
    p.supplier_type,
    p.payment_terms_days,
    p.min_order_amount,
    p.delivery_lead_days,
    p.is_active_supplier,
    p.avg_rating,
    p.total_orders_count,
    p.total_purchases_amount,
    p.last_purchase_date,
    COALESCE(pb.balance, 0)::numeric AS balance,
    p.created_at,
    p.updated_at
  FROM parties p
  LEFT JOIN party_categories pc ON pc.id = p.category_id
  LEFT JOIN party_balances    pb ON pb.party_id = p.id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND (p_type   = 'all' OR p.type   = p_type   OR p.type = 'both')
    AND (p_status = 'all' OR p.status = p_status)
  ORDER BY p.name ASC;
END;
$function$

-- ===== get_all_products =====

CREATE OR REPLACE FUNCTION public.get_all_products(p_company_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'active'::text)
 RETURNS TABLE(id uuid, company_id uuid, name_ar text, sku text, part_number text, brand text, description text, size text, specifications text, unit text, purchase_price numeric, sale_price numeric, cost_price numeric, image_url text, barcode text, alternative_numbers text, status text, min_stock_level integer, category_id uuid, category_name text, is_kit boolean, has_core_charge boolean, core_charge_amount numeric, location text, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, total_quantity numeric, warehouse_quantities jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.company_id,
    p.name_ar,
    p.sku,
    p.part_number,
    p.brand,
    p.description,
    p.size,
    p.specifications,
    p.unit,
    p.purchase_price,
    p.sale_price,
    p.cost_price,
    p.image_url,
    p.barcode,
    p.alternative_numbers,
    p.status,
    p.min_stock_level,
    p.category_id,
    pc.name                                              AS category_name,
    p.is_kit,
    p.has_core_charge,
    p.core_charge_amount,
    p.location,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    COALESCE(
      SUM(ps.quantity) FILTER (
        WHERE p_warehouse_id IS NULL
           OR ps.warehouse_id = p_warehouse_id
      ), 0
    )::numeric                                           AS total_quantity,
    COALESCE(
      jsonb_object_agg(
        ps.warehouse_id::text,
        ps.quantity
      ) FILTER (
        WHERE ps.warehouse_id IS NOT NULL
          AND (p_warehouse_id IS NULL OR ps.warehouse_id = p_warehouse_id)
      ),
      '{}'::jsonb
    )                                                    AS warehouse_quantities
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN product_stock      ps
    ON ps.product_id  = p.id
   AND ps.company_id  = p_company_id
  WHERE p.company_id  = p_company_id
    AND p.deleted_at  IS NULL
    AND (p_status = 'all' OR p.status = p_status)
  GROUP BY
    p.id, p.company_id, p.name_ar, p.sku, p.part_number, p.brand,
    p.description, p.size, p.specifications, p.unit,
    p.purchase_price, p.sale_price, p.cost_price,
    p.image_url, p.barcode, p.alternative_numbers, p.status,
    p.min_stock_level, p.category_id, pc.name,
    p.is_kit, p.has_core_charge, p.core_charge_amount,
    p.location, p.created_at, p.updated_at, p.deleted_at
  ORDER BY p.name_ar ASC;
$function$

-- ===== get_auth_companies =====

CREATE OR REPLACE FUNCTION public.get_auth_companies()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id
  FROM user_company_roles
  WHERE user_id = auth.uid()
$function$

-- ===== get_auth_company_id =====

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id
  FROM user_company_roles
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$function$

-- ===== get_bonds_stats =====

CREATE OR REPLACE FUNCTION public.get_bonds_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_amount numeric:=0; v_total_count int:=0;
  v_receipt_count int:=0; v_receipt_amount numeric:=0;
  v_payment_count int:=0; v_payment_amount numeric:=0;
  v_chart_data json; v_account_data json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT
    COALESCE(SUM(amount*COALESCE(exchange_rate,1)),0), COUNT(*),
    COUNT(*) FILTER (WHERE type='receipt'),
    COALESCE(SUM(amount*COALESCE(exchange_rate,1)) FILTER (WHERE type='receipt'),0),
    COUNT(*) FILTER (WHERE type='disbursement'),
    COALESCE(SUM(amount*COALESCE(exchange_rate,1)) FILTER (WHERE type='disbursement'),0)
  INTO v_total_amount,v_total_count,v_receipt_count,v_receipt_amount,v_payment_count,v_payment_amount
  FROM payments WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND status!='void' AND deleted_at IS NULL;

  WITH dates AS (SELECT date_trunc('day',NOW()-(n||' days')::interval)::date AS d FROM generate_series(0,29) n),
  daily AS (SELECT d.d AS date,COALESCE(SUM(b.amount*COALESCE(b.exchange_rate,1)),0) AS amount,COUNT(b.id) AS count
    FROM dates d LEFT JOIN payments b ON d.d=b.payment_date AND b.company_id=p_company_id AND (p_branch_id IS NULL OR b.branch_id=p_branch_id)
      AND b.status!='void' AND b.deleted_at IS NULL GROUP BY d.d)
  SELECT json_agg(json_build_object('date',date,'amount',amount,'count',count) ORDER BY date)
  INTO v_chart_data FROM daily;

  WITH acc AS (SELECT COALESCE(a.name_ar,'غير محدد') AS name,
    COALESCE(SUM(py.amount*COALESCE(py.exchange_rate,1)),0) AS amount, COUNT(*) AS count
    FROM payments py LEFT JOIN accounts a ON py.account_id=a.id
    WHERE py.company_id=p_company_id AND (p_branch_id IS NULL OR py.branch_id=p_branch_id) AND py.status!='void' AND py.deleted_at IS NULL
    GROUP BY a.name_ar ORDER BY amount DESC LIMIT 5)
  SELECT COALESCE(json_agg(json_build_object('name',name,'amount',amount,'count',count)),'[]'::json)
  INTO v_account_data FROM acc;

  RETURN json_build_object(
    'totalAmount',v_total_amount,'count',v_total_count,
    'chartData',COALESCE(v_chart_data,'[]'::json),'accountData',v_account_data,
    'totals',json_build_object('receiptCount',v_receipt_count,'receiptAmount',v_receipt_amount,
      'paymentCount',v_payment_count,'paymentAmount',v_payment_amount,
      'netAmount',v_receipt_amount-v_payment_amount));
END;$function$

-- ===== get_cash_account =====

CREATE OR REPLACE FUNCTION public.get_cash_account(p_currency text, p_method text, p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  IF p_method IN ('bank','transfer','wire') THEN
    SELECT id INTO v_id FROM accounts WHERE company_id=p_company_id AND code='1020' LIMIT 1;
    RETURN v_id;
  END IF;
  SELECT id INTO v_id FROM accounts WHERE company_id=p_company_id
    AND code = CASE p_currency WHEN 'SAR' THEN '101001' WHEN 'YER' THEN '101002'
      WHEN 'USD' THEN '101003' WHEN 'OMR' THEN '101004' WHEN 'CNY' THEN '101005' ELSE '101001' END
  LIMIT 1;
  RETURN v_id;
END;
$function$

-- ===== get_cash_liquidity =====

CREATE OR REPLACE FUNCTION public.get_cash_liquidity(p_company_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_liquidity numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT COALESCE(SUM(jel.debit_amount)-SUM(jel.credit_amount),0)
  INTO v_liquidity
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id=jel.journal_entry_id
  JOIN accounts a ON a.id=jel.account_id
  WHERE je.company_id=p_company_id AND je.status='posted'
    AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    AND a.company_id=p_company_id AND (a.code LIKE '101%' OR a.code LIKE '102%');
  RETURN COALESCE(v_liquidity,0);
END;$function$

-- ===== get_changes_since =====

CREATE OR REPLACE FUNCTION public.get_changes_since(p_company_id uuid, p_since timestamp with time zone, p_tables text[] DEFAULT ARRAY['products'::text, 'parties'::text, 'invoices'::text, 'payments'::text, 'expenses'::text])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- منتجات محدثة
  IF 'products' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'products', COALESCE(
        (SELECT jsonb_agg(row_to_json(p))
         FROM products p
         WHERE p.company_id = p_company_id
           AND p.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- أطراف محدثة
  IF 'parties' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'parties', COALESCE(
        (SELECT jsonb_agg(row_to_json(p))
         FROM parties p
         WHERE p.company_id = p_company_id
           AND p.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- فواتير محدثة
  IF 'invoices' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'invoices', COALESCE(
        (SELECT jsonb_agg(row_to_json(i))
         FROM invoices i
         WHERE i.company_id = p_company_id
           AND i.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- مدفوعات محدثة
  IF 'payments' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'payments', COALESCE(
        (SELECT jsonb_agg(row_to_json(pmt))
         FROM payments pmt
         WHERE pmt.company_id = p_company_id
           AND pmt.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- مصروفات محدثة
  IF 'expenses' = ANY(p_tables) THEN
    v_result := v_result || jsonb_build_object(
      'expenses', COALESCE(
        (SELECT jsonb_agg(row_to_json(e))
         FROM expenses e
         WHERE e.company_id = p_company_id
           AND e.updated_at > p_since),
        '[]'::jsonb
      )
    );
  END IF;

  -- إضافة وقت الاستجابة لاستخدامه في المزامنة التالية
  v_result := v_result || jsonb_build_object('synced_at', now());

  RETURN v_result;
END;
$function$

-- ===== get_company_settings =====

CREATE OR REPLACE FUNCTION public.get_company_settings(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN jsonb_build_object(
    'company',    (SELECT row_to_json(c) FROM companies c WHERE c.id = p_company_id),
    'warehouses', (SELECT json_agg(row_to_json(w) ORDER BY w.is_primary DESC, w.name_ar)
                   FROM warehouses w WHERE w.company_id = p_company_id AND w.deleted_at IS NULL),
    'tax_rates',  (SELECT json_agg(row_to_json(t) ORDER BY t.is_default DESC, t.percentage)
                   FROM tax_rates t WHERE t.company_id = p_company_id AND t.deleted_at IS NULL AND t.is_active),
    'fiscal_years',(SELECT json_agg(row_to_json(fy) ORDER BY fy.start_date DESC)
                   FROM fiscal_years fy WHERE fy.company_id = p_company_id),
    'current_fiscal_year', (
                   SELECT row_to_json(fy) FROM fiscal_years fy
                   WHERE fy.company_id = p_company_id
                     AND CURRENT_DATE BETWEEN fy.start_date AND fy.end_date
                     AND fy.is_closed = false
                   LIMIT 1),
    'messaging',  (SELECT row_to_json(mc) FROM messaging_config mc WHERE mc.company_id = p_company_id),
    'currencies', (SELECT json_agg(row_to_json(sc)) FROM supported_currencies sc),
    'exchange_rates', (
                   SELECT json_agg(row_to_json(er) ORDER BY er.effective_date DESC)
                   FROM exchange_rates er WHERE er.company_id = p_company_id
                     AND er.effective_date = (
                       SELECT MAX(er2.effective_date) FROM exchange_rates er2
                       WHERE er2.company_id = p_company_id AND er2.currency_code = er.currency_code
                     )
                  ),
    'team_members',(SELECT json_agg(json_build_object(
                     'user_id', ucr.user_id,
                     'role',    ucr.role,
                     'full_name',pr.full_name,
                     'avatar_url',pr.avatar_url
                   ) ORDER BY ucr.role, pr.full_name)
                   FROM user_company_roles ucr
                   LEFT JOIN profiles pr ON pr.id = ucr.user_id
                   WHERE ucr.company_id = p_company_id)
  );
END;
$function$

-- ===== get_customer_stats =====

CREATE OR REPLACE FUNCTION public.get_customer_stats(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT json_build_object(
    'totalCustomers',COUNT(*),'activeCustomers',COUNT(*) FILTER (WHERE p.status='active'),
    'newThisMonth',COUNT(*) FILTER (WHERE p.customer_since>=DATE_TRUNC('month',CURRENT_DATE)),
    'avgInvoicesPerCustomer',COALESCE(AVG(p.total_invoices_count),0),
    'totalOutstanding',COALESCE(SUM(pb.balance),0),
    'highValueCustomers',COUNT(*) FILTER (WHERE p.total_paid_amount>10000))
  INTO result FROM parties p LEFT JOIN party_balances pb ON p.id=pb.party_id
  WHERE p.company_id=p_company_id AND p.type='customer' AND p.deleted_at IS NULL;
  RETURN result;
END;$function$

-- ===== get_dashboard_summary =====

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    'total_sales', COALESCE((SELECT SUM(total_amount) FROM public.invoices
        WHERE company_id=vc AND type='sale'
          AND status IN ('posted','paid','partial','partially_paid')
          AND deleted_at IS NULL
          AND (p_date_from IS NULL OR issue_date >= p_date_from)
          AND (p_date_to IS NULL OR issue_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'total_purchases', COALESCE((SELECT SUM(total_amount) FROM public.invoices
        WHERE company_id=vc AND type='purchase'
          AND status IN ('posted','paid','partial','partially_paid')
          AND deleted_at IS NULL
          AND (p_date_from IS NULL OR issue_date >= p_date_from)
          AND (p_date_to IS NULL OR issue_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM public.expenses
        WHERE company_id=vc AND status IN ('posted','paid') AND deleted_at IS NULL
          AND (p_date_from IS NULL OR expense_date >= p_date_from)
          AND (p_date_to IS NULL OR expense_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'receipt_bonds', COALESCE((SELECT SUM(amount) FROM public.payments
        WHERE company_id=vc AND type='receipt' AND status='posted' AND deleted_at IS NULL
          AND (p_date_from IS NULL OR payment_date >= p_date_from)
          AND (p_date_to IS NULL OR payment_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'payment_bonds', COALESCE((SELECT SUM(amount) FROM public.payments
        WHERE company_id=vc AND type='disbursement' AND status='posted' AND deleted_at IS NULL
          AND (p_date_from IS NULL OR payment_date >= p_date_from)
          AND (p_date_to IS NULL OR payment_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'total_debts', COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
        FROM public.invoices i
        WHERE i.company_id=vc AND i.type='sale'
          AND i.status IN ('posted','partial')
          AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0),
    'total_supplier_debts', COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
        FROM public.invoices i
        WHERE i.company_id=vc AND i.type='purchase'
          AND i.status IN ('posted','partial')
          AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0),
    'invoice_count', (SELECT COUNT(*) FROM public.invoices
        WHERE company_id=vc AND type='sale'
          AND status NOT IN ('draft','void')
          AND deleted_at IS NULL
          AND (p_date_from IS NULL OR issue_date >= p_date_from)
          AND (p_date_to IS NULL OR issue_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id))
  ));
END;
$function$

-- ===== get_dashboard_summary =====

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    'total_sales', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type='sale' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL), 0),
    'total_purchases', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type='purchase' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM public.expenses WHERE company_id=vc AND status!='void' AND deleted_at IS NULL), 0),
    'receipt_bonds', COALESCE((SELECT SUM(amount) FROM public.payments WHERE company_id=vc AND type='receipt' AND status='posted' AND deleted_at IS NULL), 0),
    'payment_bonds', COALESCE((SELECT SUM(amount) FROM public.payments WHERE company_id=vc AND type='disbursement' AND status='posted' AND deleted_at IS NULL), 0),
    'total_debts', COALESCE((SELECT SUM(balance) FROM public.parties WHERE company_id=vc AND type='customer' AND balance>0 AND deleted_at IS NULL), 0),
    'total_supplier_debts', COALESCE((SELECT SUM(balance) FROM public.parties WHERE company_id=vc AND type='supplier' AND balance>0 AND deleted_at IS NULL), 0),
    'invoice_count', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type='sale' AND status!='void' AND deleted_at IS NULL)
  ));
END;
$function$

-- ===== get_dashboard_totals =====

CREATE OR REPLACE FUNCTION public.get_dashboard_totals(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sales numeric; v_purchases numeric; v_expenses numeric;
  v_debts numeric; v_supplier_debts numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT COALESCE(SUM(total_amount),0) INTO v_sales FROM invoices
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND type='sale' AND status!='void' AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total_amount),0) INTO v_purchases FROM invoices
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND type='purchase' AND status!='void' AND deleted_at IS NULL;
  SELECT COALESCE(SUM(amount),0) INTO v_expenses FROM expenses
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND status!='void' AND deleted_at IS NULL;
  SELECT COALESCE(SUM(balance),0) INTO v_debts FROM party_balances
    WHERE company_id=p_company_id AND type='customer' AND balance>0;
  SELECT COALESCE(SUM(balance),0) INTO v_supplier_debts FROM party_balances
    WHERE company_id=p_company_id AND type='supplier' AND balance>0;
  RETURN json_build_object(
    'total_sales',v_sales,'total_purchases',v_purchases,
    'total_expenses',v_expenses,'total_debts',v_debts,'total_supplier_debts',v_supplier_debts);
END;$function$

-- ===== get_dead_stock =====

CREATE OR REPLACE FUNCTION public.get_dead_stock(p_company_id uuid, days_threshold integer DEFAULT 90, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name_ar text, sku text, part_number text, stock_quantity integer, cost_price numeric, total_value numeric, last_sale_date date, days_since_last_sale integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name_ar::text, p.sku::text, p.part_number::text, COALESCE(SUM(ps.quantity),0)::integer,
    p.cost_price, (COALESCE(SUM(ps.quantity),0)*p.cost_price)::numeric, MAX(inv.issue_date), (CURRENT_DATE-MAX(inv.issue_date))::integer
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id=p.id
  LEFT JOIN public.invoice_items ii ON ii.product_id=p.id
  LEFT JOIN public.invoices inv ON inv.id=ii.invoice_id AND inv.type='sale' AND inv.status NOT IN ('cancelled','void') AND inv.deleted_at IS NULL
  WHERE p.company_id=p_company_id AND p.deleted_at IS NULL AND p.status='active'
  GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.cost_price
  HAVING COALESCE(SUM(ps.quantity),0) > 0 AND (MAX(inv.issue_date) IS NULL OR (CURRENT_DATE-MAX(inv.issue_date)) > days_threshold)
  ORDER BY (COALESCE(SUM(ps.quantity),0)*p.cost_price) DESC LIMIT p_limit OFFSET p_offset;
END;
$function$

-- ===== get_debt_analytics_summary =====

CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND i.due_date < v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND i.due_date = v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(amount) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(amount) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'sent'), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'
                  AND created_at >= NOW() - INTERVAL '24 hours'), 0),
        'total_debtors',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)
                WHERE reminder_status = 'needs_reminder'), 0),
        'by_currency',
            (SELECT json_agg(json_build_object(
                'currency', x.currency_code,
                'balance', x.balance,
                'count', x.transaction_count))
             FROM public.party_balances_by_currency x
             WHERE x.company_id = p_company_id AND x.balance > 0)
    ) INTO v_result;
    RETURN v_result;
END;
$function$

-- ===== get_debt_followup_dashboard =====

CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(p_company_id uuid, p_due_soon_days integer DEFAULT 7, p_critical_days integer DEFAULT 30, p_reminder_window_days integer DEFAULT 3)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, currency_code text, outstanding_balance numeric, overdue_amount numeric, oldest_due_date date, next_due_date date, days_overdue integer, classification text, reminder_status text, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, pending_promise_date date, invoice_count bigint, opening_balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    WITH invoice_debts AS (
        SELECT
            i.party_id,
            i.currency_code,
            SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS outstanding,
            SUM(CASE WHEN i.due_date < v_today
                THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS overdue_amount,
            MIN(i.due_date) FILTER (WHERE i.due_date < v_today) AS oldest_due_date,
            MIN(i.due_date) FILTER (WHERE i.due_date >= v_today) AS next_due_date,
            COUNT(*) AS invoice_count
        FROM public.invoices i
        WHERE i.company_id = p_company_id
          AND i.type = 'sale'
          AND i.status IN ('posted', 'partial')
          AND i.deleted_at IS NULL
          AND i.party_id IS NOT NULL
        GROUP BY i.party_id, i.currency_code
    ),
    opening_balances AS (
        SELECT
            ob.party_id,
            ob.currency_code,
            SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END) AS opening_amount
        FROM public.party_opening_balances ob
        WHERE ob.company_id = p_company_id
        GROUP BY ob.party_id, ob.currency_code
    ),
    combined AS (
        SELECT
            COALESCE(id.party_id, ob.party_id) AS party_id,
            COALESCE(id.currency_code, ob.currency_code) AS currency_code,
            COALESCE(id.outstanding, 0) + COALESCE(ob.opening_amount, 0) AS outstanding_balance,
            COALESCE(id.overdue_amount, 0) AS overdue_amount,
            id.oldest_due_date,
            id.next_due_date,
            COALESCE(id.invoice_count, 0) AS invoice_count,
            COALESCE(ob.opening_amount, 0) AS opening_balance
        FROM invoice_debts id
        FULL OUTER JOIN opening_balances ob
            ON ob.party_id = id.party_id AND ob.currency_code = id.currency_code
    ),
    promise_summary AS (
        SELECT
            pp.party_id,
            COUNT(*) FILTER (WHERE pp.status = 'pending') AS pending_promise_count,
            SUM(pp.amount) FILTER (WHERE pp.status = 'pending') AS pending_promise_amount,
            MIN(pp.promise_date) FILTER (WHERE pp.status = 'pending') AS pending_promise_date,
            BOOL_OR(pp.status = 'broken') AS has_broken_promise
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = p_company_id
        GROUP BY pp.party_id
    ),
    last_reminders AS (
        SELECT DISTINCT ON (ml.party_id)
            ml.party_id, ml.created_at AS last_reminded_at
        FROM public.debt_message_log ml
        WHERE ml.company_id = p_company_id AND ml.status = 'sent'
        ORDER BY ml.party_id, ml.created_at DESC
    ),
    last_contacts AS (
        SELECT DISTINCT ON (ca.customer_id)
            ca.customer_id, ca.created_at AS last_contact_date
        FROM public.customer_activities ca
        WHERE ca.company_id = p_company_id
        ORDER BY ca.customer_id, ca.created_at DESC
    )


    SELECT
        c.party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'عام')::TEXT AS category,
        p.credit_limit,
        c.currency_code::TEXT AS currency_code,
        c.outstanding_balance,
        c.overdue_amount,
        c.oldest_due_date,
        c.next_due_date,
        CASE WHEN c.oldest_due_date IS NOT NULL
            THEN (v_today - c.oldest_due_date) ELSE 0 END AS days_overdue,
        CASE
            WHEN c.oldest_due_date IS NOT NULL
                 AND (v_today - c.oldest_due_date) >= p_critical_days THEN 'critical'
            WHEN c.oldest_due_date IS NOT NULL AND c.oldest_due_date < v_today THEN 'overdue'
            WHEN c.oldest_due_date = v_today THEN 'due_today'
            WHEN c.next_due_date IS NOT NULL
                 AND c.next_due_date <= v_today + p_due_soon_days THEN 'due_soon'
            ELSE 'current'
        END AS classification,
        CASE
            WHEN lr.last_reminded_at IS NOT NULL
                 AND lr.last_reminded_at >= NOW() - make_interval(days => p_reminder_window_days)
                 THEN 'reminded'
            ELSE 'needs_reminder'
        END AS reminder_status,
        lr.last_reminded_at,
        lc.last_contact_date,
        COALESCE(ps.has_broken_promise, false) AS has_broken_promise,
        COALESCE(ps.pending_promise_count, 0) AS pending_promise_count,
        COALESCE(ps.pending_promise_amount, 0) AS pending_promise_amount,
        ps.pending_promise_date,
        c.invoice_count,
        c.opening_balance
    FROM combined c
    JOIN public.parties p ON p.id = c.party_id AND p.deleted_at IS NULL
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN promise_summary ps ON ps.party_id = c.party_id
    LEFT JOIN last_reminders lr ON lr.party_id = c.party_id
    LEFT JOIN last_contacts lc ON lc.customer_id = c.party_id
    WHERE c.outstanding_balance > 0
    ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST;
END;
$function$

-- ===== get_debt_party_overview =====

CREATE OR REPLACE FUNCTION public.get_debt_party_overview(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, total_outstanding numeric, overdue_amount numeric, due_today_amount numeric, invoice_count bigint, opening_balance numeric, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT
        p.id AS party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'عام')::TEXT AS category,
        p.credit_limit,
        COALESCE(SUM(CASE WHEN i.id IS NOT NULL
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC
            + COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC
            AS total_outstanding,
        COALESCE(SUM(CASE WHEN i.due_date < v_today
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC AS overdue_amount,
        COALESCE(SUM(CASE WHEN i.due_date = v_today
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC AS due_today_amount,
        COUNT(i.id) AS invoice_count,
        COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
            FROM public.party_opening_balances ob
            WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC AS opening_balance,
        EXISTS (SELECT 1 FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'broken') AS has_broken_promise,
        COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::BIGINT AS pending_promise_count,
        COALESCE((SELECT SUM(pp.amount) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::NUMERIC AS pending_promise_amount,
        (SELECT ml.created_at FROM public.debt_message_log ml
            WHERE ml.company_id = p_company_id AND ml.party_id = p_party_id
              AND ml.status = 'sent'
            ORDER BY ml.created_at DESC LIMIT 1) AS last_reminded_at,
        (SELECT ca.created_at FROM public.customer_activities ca
            WHERE ca.company_id = p_company_id AND ca.customer_id = p_party_id
            ORDER BY ca.created_at DESC LIMIT 1) AS last_contact_date
    FROM public.parties p
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN public.invoices i
        ON i.party_id = p.id AND i.company_id = p_company_id
        AND i.type = 'sale' AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
    WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, pc.name, p.credit_limit;
END;
$function$

-- ===== get_debt_today_tasks =====

CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(p_company_id uuid)
 RETURNS TABLE(task_type character varying, party_id uuid, party_name text, party_phone text, currency_code text, amount numeric, reference_info text, urgency character varying)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT 'due_today'::VARCHAR AS task_type,
            i.party_id, p.name::TEXT AS party_name, p.phone::TEXT AS party_phone,
            i.currency_code::TEXT AS currency_code,
            (i.total_amount - COALESCE(i.paid_amount, 0))::NUMERIC AS amount,
            COALESCE(i.invoice_number, i.id::TEXT)::TEXT AS reference_info,
            'high'::VARCHAR AS urgency
        FROM public.invoices i
        JOIN public.parties p ON p.id = i.party_id AND p.deleted_at IS NULL
        WHERE i.company_id = p_company_id
          AND i.type = 'sale' AND i.status IN ('posted', 'partial')
          AND i.due_date = v_today AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0

        UNION ALL
        SELECT 'promise_due'::VARCHAR,
            pp.party_id, p.name::TEXT, p.phone::TEXT,
            pp.currency_code::TEXT,
            pp.amount,
            ('وعد ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
            'high'::VARCHAR
        FROM public.debt_payment_promises pp
        JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
        WHERE pp.company_id = p_company_id AND pp.status = 'pending'
          AND pp.promise_date = v_today

        UNION ALL
        SELECT 'broken_promise'::VARCHAR,
            pp.party_id, p.name::TEXT, p.phone::TEXT,
            pp.currency_code::TEXT,
            pp.amount,
            ('وعد متجاوز ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
            'critical'::VARCHAR
        FROM public.debt_payment_promises pp
        JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
        WHERE pp.company_id = p_company_id AND pp.status = 'pending'
          AND pp.promise_date < v_today

        UNION ALL
        SELECT 'failed_message'::VARCHAR,
            dm.party_id, p.name::TEXT, p.phone::TEXT,
            NULL::TEXT AS currency_code,
            NULL::NUMERIC AS amount,
            COALESCE(dm.error_info, 'رسالة فاشلة')::TEXT AS reference_info,
            'medium'::VARCHAR
        FROM public.debt_message_log dm
        JOIN public.parties p ON p.id = dm.party_id AND p.deleted_at IS NULL
        WHERE dm.company_id = p_company_id AND dm.status = 'failed'
          AND dm.created_at::DATE = v_today
    ) sub
    ORDER BY CASE sub.urgency
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        sub.amount DESC NULLS LAST;
END;
$function$

-- ===== get_expense_categories_summary =====

CREATE OR REPLACE FUNCTION public.get_expense_categories_summary(p_company_id uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category_name text, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ec.name, 'غير مصنف') AS category_name,
        SUM(e.amount * COALESCE(e.exchange_rate, 1))::NUMERIC AS total_amount
    FROM expenses e
    LEFT JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.company_id = p_company_id
      AND e.status <> 'void'
      AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
      AND (p_date_to   IS NULL OR e.expense_date <= p_date_to)
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
    GROUP BY ec.name
    ORDER BY total_amount DESC
    LIMIT 10;
END;
$function$

-- ===== get_expense_stats =====

CREATE OR REPLACE FUNCTION public.get_expense_stats(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT COALESCE(jsonb_agg(result), '[]'::jsonb) FROM (
    SELECT SUM(e.amount) as total_amount, COUNT(e.id) as expense_count,
      CASE WHEN COUNT(e.id)>0 THEN SUM(e.amount)/COUNT(e.id) ELSE 0 END as avg_amount
    FROM public.expenses e WHERE e.company_id=vc AND e.status!='void' AND e.deleted_at IS NULL
  ) result);
END;
$function$

-- ===== get_inventory_valuation =====

CREATE OR REPLACE FUNCTION public.get_inventory_valuation(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cost numeric; v_market numeric; v_prods bigint; v_stock numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT COALESCE(SUM(ps.quantity*p.cost_price),0),
    COALESCE(SUM(ps.quantity*p.sale_price),0),
    COUNT(DISTINCT p.id), COALESCE(SUM(ps.quantity),0)
  INTO v_cost,v_market,v_prods,v_stock
  FROM products p LEFT JOIN product_stock ps ON p.id=ps.product_id
  WHERE p.company_id=p_company_id AND p.deleted_at IS NULL;
  RETURN json_build_object('costValue',v_cost,'marketValue',v_market,
    'profit',v_market-v_cost,
    'profitMargin',CASE WHEN v_cost>0 THEN ROUND((v_market-v_cost)/v_cost*100,2) ELSE 0 END,
    'totalProducts',v_prods,'totalStock',v_stock);
END;$function$

-- ===== get_invoice_with_items =====

CREATE OR REPLACE FUNCTION public.get_invoice_with_items(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid; v_result jsonb;
BEGIN
  SELECT i.company_id INTO v_company_id FROM invoices i WHERE i.id = p_invoice_id AND i.deleted_at IS NULL;
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT jsonb_build_object(
    'invoice', row_to_json(inv)::jsonb, 'party', row_to_json(pty)::jsonb,
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', ii.id, 'product_id', ii.product_id, 'product_name', p.name_ar, 'product_sku', p.sku,
        'product_part_no', p.part_number, 'product_brand', p.brand, 'description', ii.description,
        'quantity', ii.quantity, 'unit_price', ii.unit_price, 'cost_price', ii.cost_price,
        'discount_amount', ii.discount_amount, 'tax_amount', ii.tax_amount, 'total', ii.total,
        'is_core_return', ii.is_core_return, 'tax_rate_id', ii.tax_rate_id, 'tax_rate_name', tr.name_ar,
        'tax_percentage', tr.percentage) ORDER BY ii.id)
      FROM invoice_items ii LEFT JOIN products p ON p.id = ii.product_id LEFT JOIN tax_rates tr ON tr.id = ii.tax_rate_id
      WHERE ii.invoice_id = p_invoice_id), '[]'::jsonb),
    'payments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'payment_id', pa.payment_id, 'amount', pa.amount, 'payment_number', pmt.payment_number,
        'payment_date', pmt.payment_date, 'payment_method', pmt.payment_method, 'status', pmt.status) ORDER BY pmt.payment_date)
      FROM payment_allocations pa JOIN payments pmt ON pmt.id = pa.payment_id
      WHERE pa.invoice_id = p_invoice_id AND pa.deleted_at IS NULL), '[]'::jsonb)
  ) INTO v_result
  FROM invoices inv LEFT JOIN parties pty ON pty.id = inv.party_id WHERE inv.id = p_invoice_id;
  RETURN v_result;
END;
$function$

-- ===== get_item_movements_with_balance =====

CREATE OR REPLACE FUNCTION public.get_item_movements_with_balance(p_company_id uuid, p_product_id uuid)
 RETURNS TABLE(id uuid, date timestamp with time zone, quantity numeric, transaction_type text, original_type text, reference_type text, source_user text, source_name text, document_number text, notes text, raw_quantity numeric, balance_after numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  WITH raw AS (
    SELECT m.id, m.created_at AS date, m.quantity AS db_qty,
      m.transaction_type AS original_type, m.reference_type, m.reference_id,
      ''::text AS notes,
      COALESCE(u.email,'System') AS source_user
    FROM inventory_transactions m
    LEFT JOIN auth.users u ON m.created_by=u.id
    WHERE m.product_id=p_product_id AND m.company_id=p_company_id AND m.deleted_at IS NULL
  ),
  res_inv AS (
    SELECT r.id,
      CASE WHEN i.type='sale' THEN 'فاتورة بيع #'||i.invoice_number
           WHEN i.type='purchase' THEN 'فاتورة شراء #'||i.invoice_number
           WHEN i.type='sale_return' THEN 'مردود مبيعات #'||i.invoice_number
           WHEN i.type='purchase_return' THEN 'مردود مشتريات #'||i.invoice_number
           ELSE 'فاتورة #'||i.invoice_number END AS doc_num,
      COALESCE(p.name,'---') AS src_name
    FROM raw r JOIN invoices i ON r.reference_id=i.id
    LEFT JOIN parties p ON i.party_id=p.id
    WHERE r.reference_type ILIKE '%invoice%'
  ),
  res_tr AS (
    SELECT r.id,'مناقلة مخزنية' AS doc_num,
      COALESCE(wf.name_ar,'?')||' ◄ '||COALESCE(wt.name_ar,'?') AS src_name
    FROM raw r JOIN stock_transfers t ON r.reference_id=t.id
    LEFT JOIN warehouses wf ON t.from_warehouse_id=wf.id
    LEFT JOIN warehouses wt ON t.to_warehouse_id=wt.id
    WHERE r.reference_type='transfer'
  ),
  proc AS (
    SELECT r.id, r.date, ABS(COALESCE(r.db_qty,0)) AS quantity,
      CASE WHEN r.original_type IN('purchase','sales_return','adj_in','transfer_in','initial') THEN 'in'
           WHEN r.original_type IN('sales','purchase_return','adj_out','transfer_out') THEN 'out'
           ELSE CASE WHEN COALESCE(r.db_qty,0)>0 THEN 'in' ELSE 'out' END END AS transaction_type,
      r.original_type, r.reference_type, r.source_user::text,
      COALESCE(i.src_name, t.src_name,
        CASE WHEN r.reference_type='audit' THEN 'تسوية جردية' ELSE '---' END)::text AS source_name,
      COALESCE(i.doc_num, t.doc_num,
        CASE WHEN r.reference_type='audit' THEN 'جرد مخزني' ELSE '---' END)::text AS document_number,
      COALESCE(r.notes,'')::text AS notes,
      COALESCE(r.db_qty,0) AS raw_quantity
    FROM raw r
    LEFT JOIN res_inv i ON r.id=i.id
    LEFT JOIN res_tr  t ON r.id=t.id
  )
  SELECT p.*, SUM(p.raw_quantity) OVER (ORDER BY p.date ASC ROWS UNBOUNDED PRECEDING) AS balance_after
  FROM proc p ORDER BY p.date DESC;
END;$function$

-- ===== get_low_stock_products =====

CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, quantity numeric, min_quantity numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name_ar,
        COALESCE(SUM(ps.quantity), 0)                        AS quantity,
        COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)   AS min_quantity
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
        AND (p_branch_id IS NULL OR ps.warehouse_id IN (
            SELECT w.id FROM warehouses w WHERE w.branch_id = p_branch_id
        ))
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
    GROUP BY p.id, p.name_ar, p.min_stock_level
    HAVING COALESCE(SUM(ps.quantity), 0) <= COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)
    ORDER BY quantity ASC
    LIMIT 50;
END;
$function$

-- ===== get_matching_inventory_products =====

CREATE OR REPLACE FUNCTION public.get_matching_inventory_products(p_company_id uuid, p_vehicle_make text, p_vehicle_model text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_company uuid;
    v_result  jsonb;
BEGIN
    -- Enforce tenant isolation: raises 42501 unless p_company_id matches
    -- the caller's own company (mirrors other hardened RPCs).
    v_company := public.verify_company_access(p_company_id);

    SELECT jsonb_agg(row_to_json(r) ORDER BY (r.match_source <> 'brand_match') DESC, r.name_ar)
    INTO v_result
    FROM (
        SELECT DISTINCT ON (p.id)
            p.id                                  AS product_id,
            p.sku,
            p.part_number,
            p.name_ar,
            p.brand,
            p.sale_price,
            p.status,
            COALESCE(pc.compatibility_status, 'UNKNOWN') AS compatibility_status,
            COALESCE(pc.source, 'brand_match')           AS match_source
        FROM public.products p
        LEFT JOIN public.part_compatibility pc
            ON pc.company_id = v_company
            AND lower(pc.vehicle_make) = lower(p_vehicle_make)
            AND (
                p_vehicle_model IS NULL
                OR pc.vehicle_model IS NULL
                OR lower(pc.vehicle_model) = lower(p_vehicle_model)
            )
            AND (
                p_year IS NULL
                OR pc.vehicle_year_from IS NULL
                OR (pc.vehicle_year_from <= p_year
                    AND (pc.vehicle_year_to IS NULL OR pc.vehicle_year_to >= p_year))
            )
            AND (
                lower(p.part_number) = lower(pc.part_number)
                OR lower(p.sku) = lower(pc.part_number)
            )
        WHERE p.company_id = v_company
          AND p.deleted_at IS NULL
          AND (
              pc.id IS NOT NULL
              OR (p.brand IS NOT NULL AND lower(p.brand) = lower(p_vehicle_make))
          )
        ORDER BY
            p.id,
            CASE COALESCE(pc.compatibility_status, 'UNKNOWN')
                WHEN 'CONFIRMED' THEN 1
                WHEN 'POSSIBLE' THEN 2
                WHEN 'UNKNOWN' THEN 3
                WHEN 'NOT_COMPATIBLE' THEN 4
                ELSE 5
            END,
            (pc.id IS NOT NULL) DESC
    ) r;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$

-- ===== get_monthly_performance =====

CREATE OR REPLACE FUNCTION public.get_monthly_performance(p_company_id uuid, p_year integer, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(month_index integer, month_name text, revenues numeric, expenses numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_start DATE := make_date(p_year, 1, 1);
    v_end   DATE := make_date(p_year, 12, 31);
BEGIN
    RETURN QUERY
    WITH month_series AS (
        SELECT
            generate_series(0, 11)         AS month_idx,
            to_char(
                make_date(p_year, generate_series(0,11)+1, 1),
                'Month'
            )                              AS month_nm
    ),
    journal_agg AS (
        SELECT
            EXTRACT(MONTH FROM je.entry_date)::INT - 1 AS month_idx,
            a.type                                      AS account_type,
            SUM(
                CASE a.type
                    WHEN 'revenue' THEN (jel.credit_amount - jel.debit_amount)
                    WHEN 'expense' THEN (jel.debit_amount - jel.credit_amount)
                    ELSE 0
                END
            ) AS net_amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        JOIN accounts a ON a.id = jel.account_id
        WHERE je.company_id = p_company_id
          AND je.entry_date BETWEEN v_start AND v_end
          AND je.status = 'posted'
          AND a.type IN ('revenue', 'expense')
          AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
        GROUP BY EXTRACT(MONTH FROM je.entry_date), a.type
    )
    SELECT
        ms.month_idx,
        TRIM(ms.month_nm),
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'revenue' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS revenues,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'expense' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS expenses
    FROM month_series ms
    LEFT JOIN journal_agg ja ON ja.month_idx = ms.month_idx
    GROUP BY ms.month_idx, ms.month_nm
    ORDER BY ms.month_idx;
END;
$function$

-- ===== get_next_invoice_number =====

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_company_id uuid, p_type text DEFAULT 'sale'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
  SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1
  INTO v_next
  FROM public.invoices
  WHERE company_id = p_company_id AND type = p_type;
  
  RETURN v_next::text;
END;
$function$

-- ===== get_next_journal_entry_number =====

CREATE OR REPLACE FUNCTION public.get_next_journal_entry_number(p_company_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
  SELECT COALESCE(MAX(entry_number), 0) + 1
  INTO   v_next
  FROM   public.journal_entries
  WHERE  company_id = p_company_id;

  RETURN v_next;
END;
$function$

-- ===== get_next_sequence =====

CREATE OR REPLACE FUNCTION public.get_next_sequence(p_company_id uuid, p_sequence_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
  v_table text;
  v_column text;
BEGIN
  CASE p_sequence_name
    WHEN 'invoice' THEN
      SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'sale';
    WHEN 'purchase' THEN
      SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'purchase';
    WHEN 'expense' THEN
      SELECT COALESCE(MAX(NULLIF(voucher_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.expenses WHERE company_id = p_company_id;
    WHEN 'payment' THEN
      SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_next
      FROM public.journal_entries WHERE company_id = p_company_id;
    WHEN 'bond' THEN
      SELECT COALESCE(MAX(NULLIF(payment_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.payments WHERE company_id = p_company_id;
    ELSE
      v_next := 1;
  END CASE;
  
  RETURN v_next::text;
END;
$function$

-- ===== get_overdue_invoices =====

CREATE OR REPLACE FUNCTION public.get_overdue_invoices(p_company_id uuid, p_type text DEFAULT 'sale'::text)
 RETURNS TABLE(invoice_id uuid, invoice_number text, party_id uuid, party_name text, party_phone text, issue_date date, due_date date, days_overdue integer, total_amount numeric, paid_amount numeric, remaining numeric, aging_bucket text, currency_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    i.id                                          AS invoice_id,
    i.invoice_number,
    i.party_id,
    p.name                                        AS party_name,
    p.phone                                       AS party_phone,
    i.issue_date,
    i.due_date,
    (CURRENT_DATE - i.due_date)::int              AS days_overdue,
    i.total_amount,
    i.paid_amount,
    (i.total_amount - i.paid_amount)              AS remaining,
    CASE
      WHEN (CURRENT_DATE - i.due_date) BETWEEN  1 AND  30 THEN '1-30 يوم'
      WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND  60 THEN '31-60 يوم'
      WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND  90 THEN '61-90 يوم'
      WHEN (CURRENT_DATE - i.due_date) >  90               THEN 'أكثر من 90 يوم'
      ELSE 'غير محدد'
    END                                           AS aging_bucket,
    i.currency_code
  FROM invoices i
  LEFT JOIN parties p ON p.id = i.party_id
  WHERE i.company_id   = p_company_id
    AND i.deleted_at   IS NULL
    AND i.due_date     < CURRENT_DATE
    AND i.due_date     IS NOT NULL
    AND i.type         = p_type
    AND i.status       IN ('confirmed','posted','partially_paid')
    AND (i.total_amount - i.paid_amount) > 0.01
  ORDER BY days_overdue DESC, remaining DESC;
END;
$function$

-- ===== get_paginated_invoices =====

CREATE OR REPLACE FUNCTION public.get_paginated_invoices(p_company_id uuid, p_type text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_party_id uuid DEFAULT NULL::uuid, p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT NULL::date, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_order_by text DEFAULT 'issue_date'::text, p_order_dir text DEFAULT 'DESC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset     int;
  v_rows       jsonb;
  v_total      int;
  v_sum        numeric;
  v_paid_sum   numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- تحقق من المعاملات
  p_page      := GREATEST(1, COALESCE(p_page, 1));
  p_page_size := LEAST(200, GREATEST(1, COALESCE(p_page_size, 25)));
  p_order_dir := CASE WHEN UPPER(p_order_dir)='ASC' THEN 'ASC' ELSE 'DESC' END;
  p_order_by  := CASE p_order_by
    WHEN 'issue_date'      THEN 'i.issue_date'
    WHEN 'due_date'        THEN 'i.due_date'
    WHEN 'total_amount'    THEN 'i.total_amount'
    WHEN 'invoice_number'  THEN 'i.invoice_number'
    WHEN 'party_name'      THEN 'p.name'
    ELSE 'i.issue_date'
  END;

  v_offset := (p_page - 1) * p_page_size;

  -- العدد الكلي + الإجماليات
  SELECT
    COUNT(*),
    COALESCE(SUM(i.total_amount),0),
    COALESCE(SUM(i.paid_amount),0)
  INTO v_total, v_sum, v_paid_sum
  FROM invoices i
  WHERE i.company_id = p_company_id
    AND i.deleted_at IS NULL
    AND (p_type      IS NULL OR i.type      = p_type)
    AND (p_status    IS NULL OR i.status    = p_status)
    AND (p_party_id  IS NULL OR i.party_id  = p_party_id)
    AND (p_from_date IS NULL OR i.issue_date >= p_from_date)
    AND (p_to_date   IS NULL OR i.issue_date <= p_to_date)
    AND (p_search    IS NULL OR i.invoice_number ILIKE '%' || p_search || '%');

  -- البيانات مع صفحة
  SELECT COALESCE(jsonb_agg(row_order), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',             i.id,
      'invoice_number', i.invoice_number,
      'type',           i.type,
      'status',         i.status,
      'issue_date',     i.issue_date,
      'due_date',       i.due_date,
      'total_amount',   i.total_amount,
      'subtotal',       i.subtotal,
      'tax_amount',     i.tax_amount,
      'discount_amount',i.discount_amount,
      'paid_amount',    i.paid_amount,
      'remaining',      (i.total_amount - i.paid_amount),
      'currency_code',  i.currency_code,
      'payment_method', i.payment_method,
      'party_id',       i.party_id,
      'party_name',     p.name,
      'party_phone',    p.phone,
      'created_at',     i.created_at,
      'updated_at',     i.updated_at
    ) AS row_order
    FROM invoices i
    LEFT JOIN parties p ON p.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.deleted_at IS NULL
      AND (p_type      IS NULL OR i.type      = p_type)
      AND (p_status    IS NULL OR i.status    = p_status)
      AND (p_party_id  IS NULL OR i.party_id  = p_party_id)
      AND (p_from_date IS NULL OR i.issue_date >= p_from_date)
      AND (p_to_date   IS NULL OR i.issue_date <= p_to_date)
      AND (p_search    IS NULL OR i.invoice_number ILIKE '%' || p_search || '%')
    ORDER BY
      CASE WHEN p_order_by='i.issue_date'     AND p_order_dir='DESC' THEN i.issue_date     END DESC,
      CASE WHEN p_order_by='i.issue_date'     AND p_order_dir='ASC'  THEN i.issue_date     END ASC,
      CASE WHEN p_order_by='i.due_date'       AND p_order_dir='DESC' THEN i.due_date       END DESC,
      CASE WHEN p_order_by='i.due_date'       AND p_order_dir='ASC'  THEN i.due_date       END ASC,
      CASE WHEN p_order_by='i.total_amount'   AND p_order_dir='DESC' THEN i.total_amount   END DESC,
      CASE WHEN p_order_by='i.total_amount'   AND p_order_dir='ASC'  THEN i.total_amount   END ASC,
      CASE WHEN p_order_by='i.invoice_number' AND p_order_dir='DESC' THEN i.invoice_number END DESC,
      CASE WHEN p_order_by='i.invoice_number' AND p_order_dir='ASC'  THEN i.invoice_number END ASC,
      CASE WHEN p_order_by='p.name'           AND p_order_dir='DESC' THEN p.name           END DESC,
      CASE WHEN p_order_by='p.name'           AND p_order_dir='ASC'  THEN p.name           END ASC,
      i.id  -- tiebreaker
    LIMIT  p_page_size
    OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'data',        v_rows,
    'pagination',  jsonb_build_object(
      'total',       v_total,
      'page',        p_page,
      'page_size',   p_page_size,
      'total_pages', CEIL(v_total::float / p_page_size)
    ),
    'summary', jsonb_build_object(
      'total_amount', ROUND(v_sum, 2),
      'paid_amount',  ROUND(v_paid_sum, 2),
      'remaining',    ROUND(v_sum - v_paid_sum, 2)
    )
  );
END;
$function$

-- ===== get_party_all_balances =====

CREATE OR REPLACE FUNCTION public.get_party_all_balances(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id
    ORDER BY pb.currency_code;
END;
$function$

-- ===== get_party_balance_by_currency =====

CREATE OR REPLACE FUNCTION public.get_party_balance_by_currency(p_company_id uuid, p_party_id uuid, p_currency_code character varying)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id AND pb.currency_code = p_currency_code;
END;
$function$

-- ===== get_party_statement =====

CREATE OR REPLACE FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_movements json;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.line_id), '[]'::json)
  INTO v_movements
  FROM (
    SELECT jel.id AS line_id, je.entry_date,
      CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'INV'
        WHEN je.reference_type = 'purchase_invoice' THEN 'PUR'
        WHEN je.reference_type IN ('payment','payment_bond') THEN 'PAY'
        WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'RCV'
        WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'RET'
        WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'PRET'
        WHEN je.reference_type = 'expense' THEN 'EXP'
        ELSE COALESCE('JV-' || je.entry_number::text, 'JV') END AS ref,
      CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'فاتورة مبيعات'
        WHEN je.reference_type = 'purchase_invoice' THEN 'فاتورة مشتريات'
        WHEN je.reference_type IN ('payment','payment_bond') THEN 'سند دفع'
        WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'سند قبض'
        WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'مرتجع مبيعات'
        WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'مرتجع مشتريات'
        WHEN je.reference_type = 'expense' THEN 'صرف مصروف' ELSE 'قيد محاسبي' END AS operation_type,
      COALESCE(jel.description, je.description, 'حركة محاسبية') AS description,
      je.reference_type AS type, COALESCE(jel.debit_amount,0) AS debit, COALESCE(jel.credit_amount,0) AS credit,
      jel.currency_code AS currency,
      SUM(COALESCE(jel.debit_amount,0) - COALESCE(jel.credit_amount,0)) OVER (ORDER BY je.entry_date, jel.id ROWS UNBOUNDED PRECEDING) AS balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND jel.party_id = p_party_id AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
  ) t;
  RETURN v_movements;
END;
$function$

-- ===== get_party_summary =====

CREATE OR REPLACE FUNCTION public.get_party_summary(p_party_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_result     jsonb;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM parties p WHERE p.id = p_party_id AND p.deleted_at IS NULL;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'party_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT jsonb_build_object(
    'party',    row_to_json(p)::jsonb,
    'balance',  COALESCE(pb.balance, 0),
    'stats', jsonb_build_object(
      'total_invoices',       COUNT(DISTINCT i.id),
      'total_sales',          COALESCE(SUM(i.total_amount) FILTER (WHERE i.type='sale'),      0),
      'total_purchases',      COALESCE(SUM(i.total_amount) FILTER (WHERE i.type='purchase'),  0),
      'unpaid_invoices',      COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('confirmed','posted','partially_paid') AND i.total_amount > i.paid_amount),
      'unpaid_amount',        COALESCE(SUM(i.total_amount - i.paid_amount) FILTER (WHERE i.status IN ('confirmed','posted','partially_paid') AND i.total_amount > i.paid_amount), 0),
      'overdue_invoices',     COUNT(DISTINCT i.id) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status IN ('confirmed','posted','partially_paid') AND i.total_amount > i.paid_amount),
      'last_invoice_date',    MAX(i.issue_date)
    ),
    'recent_invoices', COALESCE(
      (SELECT jsonb_agg(x ORDER BY x->>'issue_date' DESC)
       FROM (
         SELECT jsonb_build_object(
           'id',             ri.id,
           'invoice_number', ri.invoice_number,
           'type',           ri.type,
           'status',         ri.status,
           'total_amount',   ri.total_amount,
           'paid_amount',    ri.paid_amount,
           'issue_date',     ri.issue_date,
           'due_date',       ri.due_date
         ) AS x
         FROM invoices ri
         WHERE ri.party_id = p_party_id AND ri.deleted_at IS NULL
         ORDER BY ri.issue_date DESC
         LIMIT 10
       ) sub),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM parties p
  LEFT JOIN party_balances pb ON pb.party_id = p.id
  LEFT JOIN invoices i ON i.party_id = p_party_id AND i.deleted_at IS NULL
  WHERE p.id = p_party_id
  GROUP BY p.id, p.company_id, p.name, p.type, p.phone, p.email,
           p.tax_number, p.address, p.status, p.category_id,
           p.customer_type, p.lead_source, p.preferred_contact_method,
           p.credit_limit, p.total_invoices_count, p.total_paid_amount,
           p.last_invoice_date, p.customer_since, p.loyalty_points,
           p.satisfaction_score, p.supplier_type, p.commercial_registration,
           p.payment_terms_days, p.min_order_amount, p.delivery_lead_days,
           p.is_active_supplier, p.avg_rating, p.total_orders_count,
           p.total_purchases_amount, p.last_purchase_date,
           p.created_at, p.updated_at, p.deleted_at, pb.balance;

  RETURN v_result;
END;
$function$

-- ===== get_popular_products =====

CREATE OR REPLACE FUNCTION public.get_popular_products(p_company_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name_ar text, sku text, part_number text, brand text, sale_price numeric, cost_price numeric, barcode text, category_name text, total_stock numeric, min_stock_level integer, status text, image_url text, sales_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.name_ar, p.sku, p.part_number, p.brand,
    p.sale_price, p.cost_price, p.barcode,
    pc.name as category_name,
    COALESCE(SUM(ps.quantity), 0) as total_stock,
    p.min_stock_level, p.status, p.image_url,
    COUNT(ii.id) as sales_count
  FROM public.products p
  LEFT JOIN public.invoice_items ii ON ii.product_id = p.id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
    AND i.type = 'sale' AND i.status IN ('posted', 'paid', 'partially_paid') AND i.deleted_at IS NULL
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id AND ps.company_id = p.company_id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status = 'active'
  GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.cost_price,
           p.barcode, pc.name, p.min_stock_level, p.status, p.image_url
  ORDER BY sales_count DESC, p.updated_at DESC
  LIMIT p_limit;
END;
$function$

-- ===== get_potential_duplicates =====

CREATE OR REPLACE FUNCTION public.get_potential_duplicates(p_company_id uuid, p_type text DEFAULT 'customer'::text)
 RETURNS TABLE(id1 uuid, id2 uuid, name1 text, name2 text, phone1 text, phone2 text, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT a.id, b.id, a.name, b.name, a.phone, b.phone, similarity(a.name, b.name)
  FROM public.parties a JOIN public.parties b ON a.id < b.id AND a.company_id = b.company_id
  WHERE a.company_id = p_company_id AND a.type = p_type AND b.type = p_type
    AND a.deleted_at IS NULL AND b.deleted_at IS NULL
    AND (similarity(a.name,b.name) > 0.7 OR (a.phone IS NOT NULL AND a.phone = b.phone))
  ORDER BY similarity DESC;
END;
$function$

-- ===== get_product_analytics =====

CREATE OR REPLACE FUNCTION public.get_product_analytics(p_company_id uuid, p_product_id uuid, p_days integer DEFAULT 90)
 RETURNS TABLE(total_sold numeric, total_revenue numeric, total_purchased numeric, total_cost numeric, gross_profit numeric, avg_sale_price numeric, current_stock numeric, transaction_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT COALESCE(sales.qty,0), COALESCE(sales.rev,0), COALESCE(purch.qty,0), COALESCE(purch.cost,0),
    COALESCE(sales.rev - purch.cost,0), COALESCE(sales.avg_price,0), COALESCE(stock.qty,0), COALESCE(sales.cnt+purch.cnt,0)
  FROM (SELECT SUM(ii.quantity) qty, SUM(ii.total) rev, AVG(ii.unit_price) avg_price, COUNT(*) cnt
        FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id
        WHERE ii.product_id=p_product_id AND i.company_id=p_company_id AND i.type='sale' AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days) sales,
       (SELECT SUM(ii.quantity) qty, SUM(ii.cost_price*ii.quantity) cost, COUNT(*) cnt
        FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id
        WHERE ii.product_id=p_product_id AND i.company_id=p_company_id AND i.type='purchase' AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days) purch,
       (SELECT COALESCE(SUM(ps.quantity),0) qty FROM public.product_stock ps WHERE ps.product_id=p_product_id) stock;
END;
$function$

-- ===== get_product_fitment =====

CREATE OR REPLACE FUNCTION public.get_product_fitment(p_id uuid, p_company_id uuid)
 RETURNS TABLE(fitment_id uuid, vehicle_id uuid, make text, model text, year_start integer, year_end integer, submodel text, notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT pf.id, v.id, v.make, v.model, v.year_start, v.year_end, v.submodel, pf.notes
  FROM public.product_fitment pf
  JOIN public.vehicles v ON pf.vehicle_id = v.id
  WHERE pf.product_id = p_id AND pf.company_id = p_company_id;
END;
$function$

-- ===== get_product_stock_history =====

CREATE OR REPLACE FUNCTION public.get_product_stock_history(p_company_id uuid, p_product_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid, p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT CURRENT_DATE, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, transaction_date timestamp with time zone, transaction_type text, quantity numeric, running_balance numeric, reference_type text, reference_id uuid, invoice_number text, warehouse_id uuid, warehouse_name text, created_by uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    it.id,
    it.created_at                             AS transaction_date,
    it.transaction_type,
    it.quantity,
    SUM(
      CASE
        WHEN it.transaction_type IN ('purchase','sales_return','transfer_in','adj_in','initial') THEN  it.quantity
        WHEN it.transaction_type IN ('sales','purchase_return','transfer_out','adj_out')         THEN -it.quantity
        ELSE 0
      END
    ) OVER (
      PARTITION BY it.product_id,
                   CASE WHEN p_warehouse_id IS NULL THEN NULL ELSE it.warehouse_id END
      ORDER BY it.created_at, it.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                         AS running_balance,
    it.reference_type,
    it.reference_id,
    inv.invoice_number,
    it.warehouse_id,
    w.name_ar                                 AS warehouse_name,
    it.created_by
  FROM inventory_transactions it
  LEFT JOIN warehouses w   ON w.id   = it.warehouse_id
  LEFT JOIN invoices   inv ON inv.id = it.reference_id
                          AND it.reference_type = 'invoice'
  WHERE it.company_id  = p_company_id
    AND it.product_id  = p_product_id
    AND it.deleted_at  IS NULL
    AND (p_warehouse_id IS NULL OR it.warehouse_id = p_warehouse_id)
    AND (p_from_date    IS NULL OR it.created_at::date >= p_from_date)
    AND it.created_at::date <= p_to_date
  ORDER BY it.created_at DESC, it.id DESC
  LIMIT p_limit;
END;
$function$

-- ===== get_products_page =====

CREATE OR REPLACE FUNCTION public.get_products_page(p_company_id uuid, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50, p_status text DEFAULT 'active'::text, p_category_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_warehouse_id uuid DEFAULT NULL::uuid, p_low_stock boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT
      p.id, p.company_id, p.name_ar, p.sku, p.part_number, p.brand,
      p.sale_price, p.cost_price, p.purchase_price, p.image_url,
      p.barcode, p.status, p.min_stock_level, p.category_id,
      p.location, p.is_kit, p.has_core_charge, p.core_charge_amount,
      p.unit, p.alternative_numbers, p.size, p.created_at, p.updated_at,
      pc.name AS category_name,
      COALESCE(
        SUM(ps.quantity) FILTER (
          WHERE p_warehouse_id IS NULL OR ps.warehouse_id = p_warehouse_id
        ), 0
      ) AS total_quantity
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN product_stock      ps ON ps.product_id = p.id AND ps.company_id = p_company_id
    WHERE p.company_id   = p_company_id
      AND p.deleted_at   IS NULL
      AND (p_status = 'all' OR p.status = p_status)
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (
        p_search IS NULL OR p_search = '' OR
        p.name_ar             ILIKE '%' || p_search || '%' OR
        p.sku                 ILIKE '%' || p_search || '%' OR
        p.part_number         ILIKE '%' || p_search || '%' OR
        p.barcode             = p_search OR
        p.alternative_numbers ILIKE '%' || p_search || '%'
      )
    GROUP BY p.id, p.company_id, p.name_ar, p.sku, p.part_number, p.brand,
             p.sale_price, p.cost_price, p.purchase_price, p.image_url,
             p.barcode, p.status, p.min_stock_level, p.category_id,
             p.location, p.is_kit, p.has_core_charge, p.core_charge_amount,
             p.unit, p.alternative_numbers, p.size, p.created_at, p.updated_at, pc.name
    HAVING (NOT p_low_stock OR COALESCE(SUM(ps.quantity),0) < p.min_stock_level)
  ),
  counted AS (SELECT COUNT(*) AS total FROM filtered),
  paged AS (
    SELECT * FROM filtered
    ORDER BY name_ar
    LIMIT  LEAST(p_page_size, 500)
    OFFSET (p_page - 1) * LEAST(p_page_size, 500)
  )
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(row_to_json(paged)::jsonb), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'total',       (SELECT total FROM counted),
      'page',        p_page,
      'page_size',   LEAST(p_page_size, 500),
      'total_pages', CEIL((SELECT total FROM counted)::float / LEAST(p_page_size, 500))
    )
  )
  FROM paged;
$function$

-- ===== get_purchase_stats =====

CREATE OR REPLACE FUNCTION public.get_purchase_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    'invoiceCount', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type='purchase' AND status!='void' AND deleted_at IS NULL),
    'totalPurchases', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type='purchase' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL), 0),
    'pendingPaymentCount', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type='purchase' AND status='pending' AND deleted_at IS NULL),
    'totalDebt', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type='purchase' AND status IN ('pending','partially_paid') AND deleted_at IS NULL), 0)
  ));
END;
$function$

-- ===== get_sales_analytics =====

CREATE OR REPLACE FUNCTION public.get_sales_analytics(p_company_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  vc uuid; v_from date := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  v_to date := COALESCE(p_end_date, CURRENT_DATE);
  v_total_sales numeric; v_total_returns numeric; v_net_sales numeric;
  v_invoice_count integer; v_avg_invoice numeric;
  v_top_products jsonb; v_top_customers jsonb; v_sales_by_day jsonb; v_sales_by_payment jsonb;
BEGIN
  vc := public.verify_company_access(p_company_id);
  SELECT COALESCE(SUM(total_amount),0) INTO v_total_sales FROM public.invoices WHERE company_id=vc AND type='sale' AND status IN ('posted','paid','partially_paid') AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total_amount),0) INTO v_total_returns FROM public.invoices WHERE company_id=vc AND type='return_sale' AND status IN ('posted','paid','partially_paid') AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;
  v_net_sales := v_total_sales - COALESCE(v_total_returns, 0);
  SELECT COUNT(*) INTO v_invoice_count FROM public.invoices WHERE company_id=vc AND type='sale' AND status!='void' AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;
  v_avg_invoice := CASE WHEN v_invoice_count>0 THEN v_total_sales/v_invoice_count ELSE 0 END;
  RETURN jsonb_build_object('totalSales',v_total_sales,'totalReturns',v_total_returns,'netSales',v_net_sales,'invoiceCount',v_invoice_count,'averageInvoiceValue',v_avg_invoice);
END;
$function$

-- ===== get_sales_chart_data =====

CREATE OR REPLACE FUNCTION public.get_sales_chart_data(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS TABLE(name text, value numeric, date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_date_from, (CURRENT_DATE - INTERVAL '30 days'));
  v_to date := COALESCE(p_date_to, CURRENT_DATE);
  v_day date;
BEGIN
  v_day := v_from;
  WHILE v_day <= v_to LOOP
    name := to_char(v_day, 'YYYY-MM-DD');
    date := v_day;
    
    SELECT COALESCE(SUM(
      CASE WHEN currency_code != 'SAR' AND exchange_rate > 0 THEN total_amount * exchange_rate
           ELSE total_amount END
    ), 0) INTO value
    FROM public.invoices
    WHERE company_id = p_company_id
      AND type = 'sale'
      AND status IN ('posted', 'paid', 'partially_paid')
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND issue_date = v_day
      AND deleted_at IS NULL;
    
    RETURN NEXT;
    v_day := v_day + INTERVAL '1 day';
  END LOOP;
END;
$function$

-- ===== get_sales_stats =====

CREATE OR REPLACE FUNCTION public.get_sales_stats(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT COALESCE(jsonb_agg(result), '[]'::jsonb) FROM (
    SELECT COALESCE(SUM(i.total_amount),0) as total_sales, COUNT(i.id) as invoice_count,
      CASE WHEN COUNT(i.id)>0 THEN SUM(i.total_amount)/COUNT(i.id) ELSE 0 END as avg_sale
    FROM public.invoices i WHERE i.company_id=vc AND i.type='sale' AND i.status!='void' AND i.deleted_at IS NULL
  ) result);
END;
$function$

-- ===== get_similar_products =====

CREATE OR REPLACE FUNCTION public.get_similar_products(p_name text, p_company_id uuid)
 RETURNS TABLE(id uuid, name_ar text, similarity_score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  SELECT p.id, p.name_ar::text, similarity(p.name_ar, p_name)
  FROM products p
  WHERE p.company_id=p_company_id AND p.status!='archived' AND p.deleted_at IS NULL
    AND similarity(p.name_ar, p_name)>0.3
  ORDER BY similarity(p.name_ar, p_name) DESC LIMIT 5;
END;$function$

-- ===== get_stock_valuation =====

CREATE OR REPLACE FUNCTION public.get_stock_valuation(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result json;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  SELECT json_build_object(
    'total_value', COALESCE(SUM(ps.quantity*p.cost_price),0), 'total_items', COUNT(DISTINCT p.id),
    'total_qty', COALESCE(SUM(ps.quantity),0),
    'by_warehouse', json_agg(json_build_object('warehouse_id', w.id, 'warehouse_name', w.name_ar,
        'value', COALESCE(SUM(ps.quantity*p.cost_price),0), 'qty', COALESCE(SUM(ps.quantity),0))))
  INTO v_result
  FROM public.product_stock ps JOIN public.products p ON p.id=ps.product_id JOIN public.warehouses w ON w.id=ps.warehouse_id
  WHERE p.company_id=p_company_id AND p.deleted_at IS NULL AND w.deleted_at IS NULL AND ps.quantity > 0;
  RETURN COALESCE(v_result, '{}');
END;
$function$

-- ===== get_top_customers_by_revenue =====

CREATE OR REPLACE FUNCTION public.get_top_customers_by_revenue(p_company_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, total_revenue numeric, invoice_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name::text, COALESCE(p.total_paid_amount,0), p.total_invoices_count::bigint
  FROM parties p WHERE p.company_id=p_company_id AND p.type='customer' AND p.deleted_at IS NULL
  ORDER BY p.total_paid_amount DESC NULLS LAST LIMIT p_limit;
END;
$function$

-- ===== get_top_products_and_customers =====

CREATE OR REPLACE FUNCTION public.get_top_products_and_customers(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 5)
 RETURNS TABLE(top_products jsonb, top_customers jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Top Products by quantity sold
  SELECT jsonb_agg(result) INTO top_products
  FROM (
    SELECT 
      p.name_ar as name,
      p.sku,
      SUM(ii.quantity) as total_quantity,
      SUM(ii.total) as total_revenue,
      p.sale_price as price,
      p.image_url
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    JOIN public.products p ON p.id = ii.product_id
    WHERE ii.company_id = p_company_id
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND i.deleted_at IS NULL
    GROUP BY p.id, p.name_ar, p.sku, p.sale_price, p.image_url
    ORDER BY total_revenue DESC
    LIMIT p_limit
  ) result;

  -- Top Customers by revenue
  SELECT jsonb_agg(result) INTO top_customers
  FROM (
    SELECT 
      pr.name,
      SUM(i.total_amount) as total_revenue,
      COUNT(i.id) as invoice_count,
      pr.phone,
      pr.email
    FROM public.invoices i
    JOIN public.parties pr ON pr.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND i.deleted_at IS NULL
    GROUP BY pr.id, pr.name, pr.phone, pr.email
    ORDER BY total_revenue DESC
    LIMIT p_limit
  ) result;

  RETURN NEXT;
END;
$function$

-- ===== get_top_selling_products =====

CREATE OR REPLACE FUNCTION public.get_top_selling_products(p_company_id uuid, p_limit integer DEFAULT 10, p_days integer DEFAULT 30)
 RETURNS TABLE(id uuid, name_ar text, sku text, category_id uuid, total_sold numeric, total_revenue numeric, total_cost numeric, gross_profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name_ar, p.sku, p.category_id, SUM(ii.quantity)::numeric, SUM(ii.total)::numeric,
    SUM(ii.quantity*ii.cost_price)::numeric, (SUM(ii.total)-SUM(ii.quantity*ii.cost_price))::numeric
  FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id JOIN public.products p ON p.id=ii.product_id
  WHERE i.company_id=p_company_id AND i.type='sale' AND i.status IN ('posted','paid') AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days
  GROUP BY p.id, p.name_ar, p.sku, p.category_id ORDER BY total_sold DESC LIMIT p_limit;
END;
$function$

-- ===== get_user_company_id =====

CREATE OR REPLACE FUNCTION public.get_user_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.user_company_roles
  WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1;
$function$

-- ===== get_user_permissions =====

CREATE OR REPLACE FUNCTION public.get_user_permissions()
 RETURNS TABLE(permission text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT rp.permission
    FROM public.role_permissions rp
    JOIN public.user_profiles up ON up.role = rp.role
    WHERE up.id = auth.uid()
    ORDER BY rp.permission;
$function$

-- ===== get_user_profile =====

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid    uuid;
  v_result jsonb;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2
        ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
        AND ucr1.role IN ('owner','admin')
        AND ucr2.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'access_denied: يمكنك رؤية ملفات أعضاء شركتك فقط';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'id',           p.id,
    'full_name',    p.full_name,
    'avatar_url',   p.avatar_url,
    'created_at',   p.created_at,
    'companies', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'company_id',   c.id,
        'company_name', c.name_ar,
        'role',         ucr.role,
        'branch_id',    ucr.branch_id,
        'branch_name',  b.name,
        'joined_at',    ucr.created_at
      ) ORDER BY ucr.created_at DESC)
      FROM user_company_roles ucr
      JOIN companies c ON c.id = ucr.company_id
      LEFT JOIN branches b ON b.id = ucr.branch_id
      WHERE ucr.user_id = v_uid), '[]'::jsonb)
  ) INTO v_result
  FROM profiles p WHERE p.id = v_uid;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$

-- ===== get_user_role =====

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT role 
        FROM public.user_company_roles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$function$

-- ===== get_vehicle_products =====

CREATE OR REPLACE FUNCTION public.get_vehicle_products(v_id uuid, p_company_id uuid)
 RETURNS TABLE(product_id uuid, fitment_id uuid, name text, sku text, part_number text, price numeric, total_stock numeric, notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT p.id, pf.id, p.name_ar, p.sku, p.part_number, p.sale_price,
    COALESCE((SELECT SUM(quantity) FROM public.product_stock ps WHERE ps.product_id = p.id), 0),
    COALESCE(pf.notes, '')::text
  FROM public.product_fitment pf
  JOIN public.products p ON pf.product_id = p.id
  WHERE pf.vehicle_id = v_id AND p.company_id = p_company_id AND p.status = 'active';
END;
$function$

-- ===== get_warehouses_with_stats =====

CREATE OR REPLACE FUNCTION public.get_warehouses_with_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, location text, "itemCount" bigint, "totalStock" numeric, "stockValue" numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT w.id, w.name_ar, w.location, COUNT(DISTINCT ps.product_id), COALESCE(SUM(ps.quantity),0), COALESCE(SUM(ps.quantity*p.cost_price),0)
  FROM public.warehouses w
  LEFT JOIN public.product_stock ps ON ps.warehouse_id=w.id
  LEFT JOIN public.products p ON p.id=ps.product_id AND p.deleted_at IS NULL
  WHERE w.company_id=p_company_id 
    AND w.deleted_at IS NULL
    AND (p_branch_id IS NULL OR w.branch_id = p_branch_id)
  GROUP BY w.id, w.name_ar, w.location ORDER BY w.is_primary DESC, w.name_ar;
END;
$function$

-- ===== handle_new_user =====

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$function$

-- ===== has_permission =====

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.user_profiles up ON up.role = rp.role
        WHERE up.id = auth.uid()
        AND rp.permission = p_permission
    );
$function$

-- ===== incentive_actor =====

CREATE OR REPLACE FUNCTION public.incentive_actor(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN COALESCE(auth.uid(), (SELECT user_id FROM user_company_roles WHERE company_id=p_company_id AND role IN ('owner','admin') ORDER BY created_at LIMIT 1));
END; $function$

-- ===== incentive_apply_adjustment =====

CREATE OR REPLACE FUNCTION public.incentive_apply_adjustment(p_company_id uuid, p_calculation_id uuid, p_adjustment_type text, p_amount numeric, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT has_permission('commission:review') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_adjustments
    (calculation_id, company_id, adjustment_type, amount, reason, created_by)
  VALUES (p_calculation_id, p_company_id, p_adjustment_type, p_amount, p_reason, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'ADJUSTMENT', 'incentive_adjustment', v_id, jsonb_build_object('type', p_adjustment_type, 'amount', p_amount, 'reason', p_reason));
  RETURN v_id;
END;
$function$

-- ===== incentive_approve_invoice_allocation =====

CREATE OR REPLACE FUNCTION public.incentive_approve_invoice_allocation(p_invoice_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_complete boolean;
BEGIN
  IF NOT has_permission('incentive:manage_pending') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM incentive_engineer_links
                 WHERE invoice_id = p_invoice_id AND company_id = p_company_id AND status = 'assigned') THEN
    RAISE EXCEPTION 'no_active_assignments';
  END IF;

  SELECT incentive_check_allocation_complete(p_invoice_id) INTO v_complete;
  IF NOT v_complete THEN
    RAISE EXCEPTION 'allocation_not_100: invoice % allocation sum is not 100%% — full rollback, no partial state', p_invoice_id;
  END IF;

  UPDATE incentive_engineer_links
     SET allocation_status = 'assigned', updated_at = now()
   WHERE invoice_id = p_invoice_id AND status = 'assigned';

  UPDATE incentive_pending_invoices
     SET status = 'assigned', resolved_at = now(), resolved_by = incentive_actor(p_company_id)
   WHERE invoice_id = p_invoice_id AND status IN ('pending','assigned') AND company_id = p_company_id;

  PERFORM incentive_log_audit(p_company_id, 'APPROVE', 'invoice_allocation', p_invoice_id, jsonb_build_object('company_id', p_company_id));
END;
$function$

-- ===== incentive_assert_period_allows =====

CREATE OR REPLACE FUNCTION public.incentive_assert_period_allows(p_period_id uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_period RECORD;
BEGIN
  SELECT state, is_test_period INTO v_period FROM incentive_periods WHERE id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'period_not_found: period % does not exist', p_period_id; END IF;

  IF v_period.is_test_period = true AND p_action IN ('lock','pay','post','void') THEN
    RAISE EXCEPTION 'test_period_action_denied: action "%" is forbidden on test periods', p_action;
  END IF;

  IF p_action = 'calculate' AND v_period.state != 'open' THEN
    RAISE EXCEPTION 'period_not_open: current state is %', v_period.state;
  END IF;
  IF p_action = 'review' AND v_period.state != 'calculating' AND v_period.state != 'calculated' THEN
    RAISE EXCEPTION 'period_not_calculated: current state is %', v_period.state;
  END IF;
  IF p_action = 'approve' AND v_period.state != 'under_review' AND v_period.state != 'calculated' THEN
    RAISE EXCEPTION 'period_not_under_review: current state is %', v_period.state;
  END IF;
  IF p_action = 'lock' AND v_period.state != 'approved' THEN
    RAISE EXCEPTION 'period_not_approved: current state is %', v_period.state;
  END IF;
  IF p_action = 'pay' AND v_period.state != 'approved' AND v_period.state != 'locked' THEN
    RAISE EXCEPTION 'period_not_payable: current state is %', v_period.state;
  END IF;
  IF p_action = 'post' AND v_period.state != 'approved' AND v_period.state != 'locked' THEN
    RAISE EXCEPTION 'period_not_postable: current state is %', v_period.state;
  END IF;
END;
$function$

-- ===== incentive_calculate_period =====

CREATE OR REPLACE FUNCTION public.incentive_calculate_period(p_company_id uuid, p_period_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period record;
  v_actor uuid;
  v_count integer := 0;
  v_user record;
  v_invoice record;
  v_rule record;
  v_tier record;
  v_calc_id uuid;
  v_gross_sales numeric(16,2);
  v_net_sales numeric(16,2);
  v_gross_profit numeric(16,2);
  v_collected numeric(16,2);
  v_invoice_count integer;
  v_customer_count integer;
  v_target_value numeric(14,2);
  v_target_pct numeric(7,2);
  v_base numeric(16,2);
  v_rule_amount numeric(16,2);
  v_base_commission numeric(16,2);
  v_bonus numeric(16,2);
BEGIN
  IF NOT (user_is_admin_or_manager() OR has_permission('commission:calculate')) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO v_period
  FROM incentive_periods
  WHERE id = p_period_id AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM incentive_assert_period_allows(p_period_id, 'calculate');
  v_actor := incentive_actor(p_company_id);

  IF EXISTS (
    SELECT 1 FROM incentive_calculations
    WHERE company_id = p_company_id
      AND period_id = p_period_id
      AND status IN ('approved','partially_paid','paid','cancelled','reversed')
  ) THEN
    RAISE EXCEPTION 'period_has_immutable_calculations';
  END IF;

  UPDATE incentive_periods
     SET state = 'calculating', updated_at = now()
   WHERE id = p_period_id AND company_id = p_company_id;

  DELETE FROM incentive_calculations
   WHERE company_id = p_company_id
     AND period_id = p_period_id
     AND status IN ('draft','calculated','eligible');

  FOR v_user IN
    SELECT DISTINCT a.user_id, a.plan_id
    FROM incentive_assignments a
    JOIN incentive_plans p ON p.id = a.plan_id
      AND p.company_id = p_company_id
      AND p.status = 'active'
      AND p.deleted_at IS NULL
    WHERE a.company_id = p_company_id
      AND a.status = 'active'
      AND a.effective_from <= v_period.period_end
      AND (a.effective_to IS NULL OR a.effective_to >= v_period.period_start)
  LOOP
    SELECT
      COALESCE(SUM(COALESCE(i.subtotal, i.total_amount, 0) * l.allocation_pct / 100), 0),
      COALESCE(SUM(COALESCE(i.total_amount, 0) * l.allocation_pct / 100), 0),
      COALESCE(SUM(COALESCE(ii_metrics.gross_profit, 0) * l.allocation_pct / 100), 0),
      COALESCE(SUM(COALESCE(i.paid_amount, 0) * l.allocation_pct / 100), 0),
      COUNT(DISTINCT i.id),
      COUNT(DISTINCT i.party_id)
    INTO v_gross_sales, v_net_sales, v_gross_profit, v_collected,
         v_invoice_count, v_customer_count
    FROM incentive_engineer_links l
    JOIN invoices i ON i.id = l.invoice_id
      AND i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.status NOT IN ('cancelled','void')
      AND i.deleted_at IS NULL
      AND i.issue_date BETWEEN v_period.period_start AND v_period.period_end
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(COALESCE(ii.total, 0) - COALESCE(ii.cost_price, 0) * COALESCE(ii.quantity, 0)), 0) AS gross_profit
      FROM invoice_items ii
      WHERE ii.invoice_id = i.id AND ii.company_id = p_company_id
    ) ii_metrics ON true
    WHERE l.company_id = p_company_id
      AND l.user_id = v_user.user_id
      AND l.status = 'assigned'
      AND l.allocation_status = 'assigned';

    IF v_invoice_count = 0 THEN
      CONTINUE;
    END IF;

    SELECT t.target_value
      INTO v_target_value
    FROM incentive_targets t
    WHERE t.company_id = p_company_id
      AND t.target_scope = 'employee'
      AND t.user_id = v_user.user_id
      AND t.status = 'active'
      AND t.period_start <= v_period.period_end
      AND t.period_end >= v_period.period_start
    ORDER BY t.period_start DESC
    LIMIT 1;

    v_target_pct := CASE
      WHEN COALESCE(v_target_value, 0) > 0 THEN ROUND((v_net_sales / v_target_value) * 100, 2)
      ELSE NULL
    END;
    v_base_commission := 0;
    v_bonus := 0;

    INSERT INTO incentive_calculations (
      company_id, period_id, plan_id, user_id,
      gross_sales, net_sales, gross_profit, collected_amount,
      invoice_count, customer_count, target_value, target_achievement_pct,
      base_commission, bonus_amount, adjustment_amount, deduction_amount,
      total_commission, currency_code, status, calculated_at, calculated_by
    )
    SELECT p_company_id, p_period_id, v_user.plan_id, v_user.user_id,
      v_gross_sales, v_net_sales, v_gross_profit, v_collected,
      v_invoice_count, v_customer_count, v_target_value, v_target_pct,
      0, 0, 0, 0, 0, p.currency_code, 'calculated', now(), v_actor
    FROM incentive_plans p
    WHERE p.id = v_user.plan_id
    RETURNING id INTO v_calc_id;

    FOR v_rule IN
      SELECT * FROM incentive_rules
      WHERE company_id = p_company_id
        AND plan_id = v_user.plan_id
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY priority, created_at, id
    LOOP
      v_base := CASE v_rule.rule_type
        WHEN 'sales' THEN v_gross_sales
        WHEN 'profit' THEN v_gross_profit
        WHEN 'collection' THEN v_collected
        WHEN 'invoice_count' THEN v_invoice_count
        WHEN 'customer_count' THEN v_customer_count
        WHEN 'target_achievement' THEN COALESCE(v_target_pct, 0)
        ELSE v_net_sales
      END;
      v_rule_amount := 0;

      IF v_rule.calculation_method = 'percentage' THEN
        v_rule_amount := ROUND(v_base * COALESCE(v_rule.rate, 0) / 100, 2);
      ELSIF v_rule.calculation_method = 'fixed_amount' THEN
        v_rule_amount := COALESCE(v_rule.fixed_amount, 0);
      ELSE
        SELECT * INTO v_tier
        FROM incentive_tiers
        WHERE company_id = p_company_id
          AND plan_id = v_user.plan_id
          AND (rule_id = v_rule.id OR rule_id IS NULL)
          AND v_base >= from_amount
          AND (to_amount IS NULL OR v_base <= to_amount)
        ORDER BY tier_order DESC
        LIMIT 1;
        IF FOUND THEN
          v_rule_amount := COALESCE(ROUND(v_base * v_tier.rate / 100, 2), v_tier.fixed_bonus, 0);
        END IF;
      END IF;

      IF v_rule_amount <> 0 THEN
        IF v_rule.rule_type = 'target_achievement' OR v_rule.calculation_method = 'tiered' THEN
          v_bonus := v_bonus + v_rule_amount;
        ELSE
          v_base_commission := v_base_commission + v_rule_amount;
        END IF;
        INSERT INTO incentive_calculation_lines (
          calculation_id, company_id, source_type, source_id, rule_id,
          tier_id, description, base_amount, rate, calculated_amount, currency_code
        )
        SELECT v_calc_id, p_company_id,
          CASE WHEN v_rule.rule_type = 'target_achievement' THEN 'target_bonus' ELSE 'invoice_sale' END,
          NULL, v_rule.id, v_tier.id, v_rule.name, v_base, v_rule.rate,
          v_rule_amount, p.currency_code
        FROM incentive_plans p
        WHERE p.id = v_user.plan_id;
      END IF;
    END LOOP;

    UPDATE incentive_calculations
       SET base_commission = v_base_commission,
           bonus_amount = v_bonus,
           total_commission = v_base_commission + v_bonus,
           updated_at = now()
     WHERE id = v_calc_id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE incentive_periods
     SET state = 'calculated', calculated_at = now(), updated_at = now()
   WHERE id = p_period_id AND company_id = p_company_id;

  PERFORM incentive_log_audit(
    p_company_id,
    'CALCULATE',
    'incentive_period',
    p_period_id,
    jsonb_build_object('calculation_count', v_count, 'period_state', 'calculated')
  );

  RETURN v_count;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE incentive_periods
       SET state = 'open', updated_at = now()
     WHERE id = p_period_id AND company_id = p_company_id AND state = 'calculating';
    RAISE;
END;
$function$

-- ===== incentive_check_allocation_complete =====

CREATE OR REPLACE FUNCTION public.incentive_check_allocation_complete(p_invoice_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sum numeric;
  v_company_id uuid;
BEGIN
  SELECT i.company_id INTO v_company_id
  FROM invoices i
  WHERE i.id = p_invoice_id;

  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(SUM(l.allocation_pct), 0) INTO v_sum
  FROM incentive_engineer_links l
  WHERE l.invoice_id = p_invoice_id
    AND l.company_id = v_company_id
    AND l.status IN ('assigned', 'approved');

  RETURN v_sum = 100.0;
END;
$function$

-- ===== incentive_create_assignment =====

CREATE OR REPLACE FUNCTION public.incentive_create_assignment(p_company_id uuid, p_user_id uuid, p_plan_id uuid, p_effective_from date, p_branch_id uuid DEFAULT NULL::uuid, p_effective_to date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT has_permission('incentive:manage_assignments') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF EXISTS (
    SELECT 1 FROM incentive_assignments
     WHERE company_id = p_company_id AND user_id = p_user_id AND status = 'active'
       AND (effective_to IS NULL OR effective_to >= p_effective_from)
       AND p_effective_from <= COALESCE(effective_to, 'infinity'::date)
  ) THEN
    RAISE EXCEPTION 'assignment_overlap: user already has an active plan for this date range';
  END IF;
  INSERT INTO incentive_assignments
    (company_id, user_id, plan_id, branch_id, effective_from, effective_to, created_by)
  VALUES (p_company_id, p_user_id, p_plan_id, p_branch_id, p_effective_from, p_effective_to, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_assignment', v_id, jsonb_build_object('user_id', p_user_id, 'plan_id', p_plan_id));
  RETURN v_id;
END;
$function$

-- ===== incentive_create_engineer_link =====

CREATE OR REPLACE FUNCTION public.incentive_create_engineer_link(p_invoice_id uuid, p_company_id uuid, p_user_id uuid, p_allocation_pct numeric, p_assignment_type text DEFAULT 'direct'::text, p_reason text DEFAULT NULL::text, p_source text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
  v_total numeric;
  v_period_id uuid;
BEGIN
  IF NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_invoice_id::text, 0));

  IF p_allocation_pct IS NULL OR p_allocation_pct <= 0 OR p_allocation_pct > 100 THEN
    RAISE EXCEPTION 'invalid_allocation_pct';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = p_invoice_id
      AND i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.company_id = p_company_id
      AND ucr.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'engineer_not_in_company';
  END IF;

  SELECT p2.id INTO v_period_id
  FROM incentive_periods p2
  WHERE p2.company_id = p_company_id
    AND p2.period_start <= (SELECT issue_date FROM invoices WHERE id = p_invoice_id)
    AND p2.period_end >= (SELECT issue_date FROM invoices WHERE id = p_invoice_id)
    AND p2.state IN ('open','locked')
  ORDER BY p2.period_start DESC
  LIMIT 1;

  IF v_period_id IS NULL THEN
    SELECT p3.id INTO v_period_id
    FROM incentive_periods p3
    WHERE p3.company_id = p_company_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM incentive_assert_period_allows(v_period_id, 'assign');

  SELECT COALESCE(SUM(allocation_pct), 0) INTO v_total
  FROM incentive_engineer_links
  WHERE invoice_id = p_invoice_id
    AND company_id = p_company_id
    AND status IN ('assigned','approved');

  IF v_total + p_allocation_pct > 100 THEN
    RAISE EXCEPTION 'allocation_overflow: adding % would exceed 100 percent, current sum %', p_allocation_pct, v_total
      USING DETAIL = format('current=%s adding=%s', v_total, p_allocation_pct);
  END IF;

  INSERT INTO incentive_engineer_links
    (invoice_id, company_id, user_id, allocation_pct, assignment_type, reason, source, assigned_by)
  VALUES
    (p_invoice_id, p_company_id, p_user_id, p_allocation_pct, p_assignment_type, p_reason, p_source, incentive_actor(p_company_id))
  RETURNING id INTO v_id;

  IF p_source = 'historical' OR COALESCE(p_reason, '') ILIKE '%historical%' THEN
    PERFORM incentive_log_audit(
      p_company_id,
      'HISTORICAL_ASSIGNMENT',
      'incentive_engineer_links',
      v_id,
      jsonb_build_object(
        'invoice_id', p_invoice_id,
        'user_id', p_user_id,
        'allocation_pct', p_allocation_pct,
        'reason', p_reason
      )
    );
  END IF;

  PERFORM incentive_check_allocation_complete(p_invoice_id);
  RETURN v_id;
END;
$function$

-- ===== incentive_create_plan =====

CREATE OR REPLACE FUNCTION public.incentive_create_plan(p_company_id uuid, p_name text, p_calculation_basis text, p_currency_code text, p_description text DEFAULT NULL::text, p_collection_mode text DEFAULT 'on_collected_only'::text, p_tier_method text DEFAULT 'flat'::text, p_tier_currency_code text DEFAULT NULL::text, p_effective_from date DEFAULT NULL::date, p_effective_to date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT has_permission('incentive:manage_plans') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_plans
    (company_id, name, description, calculation_basis, currency_code, collection_mode, tier_method, tier_currency_code, effective_from, effective_to, created_by)
  VALUES (p_company_id, p_name, p_description, p_calculation_basis, p_currency_code, p_collection_mode, p_tier_method, p_tier_currency_code, p_effective_from, p_effective_to, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_plan', v_id, jsonb_build_object('name', p_name, 'basis', p_calculation_basis));
  RETURN v_id;
END;
$function$

-- ===== incentive_create_rule =====

CREATE OR REPLACE FUNCTION public.incentive_create_rule(p_company_id uuid, p_plan_id uuid, p_name text, p_rule_type text, p_calculation_method text, p_threshold_min numeric DEFAULT NULL::numeric, p_threshold_max numeric DEFAULT NULL::numeric, p_rate numeric DEFAULT NULL::numeric, p_fixed_amount numeric DEFAULT NULL::numeric, p_priority integer DEFAULT 0, p_conditions jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT has_permission('incentive:manage_plans') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_rules
    (company_id, plan_id, name, rule_type, calculation_method, threshold_min, threshold_max, rate, fixed_amount, priority, conditions, created_by)
  VALUES (p_company_id, p_plan_id, p_name, p_rule_type, p_calculation_method, p_threshold_min, p_threshold_max, p_rate, p_fixed_amount, p_priority, p_conditions, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_rule', v_id, jsonb_build_object('plan_id', p_plan_id, 'type', p_rule_type, 'method', p_calculation_method));
  RETURN v_id;
END;
$function$

-- ===== incentive_create_target =====

CREATE OR REPLACE FUNCTION public.incentive_create_target(p_company_id uuid, p_target_scope text, p_target_owner_type text, p_target_owner_id uuid, p_target_type text, p_period_start date, p_period_end date, p_target_value numeric, p_currency_code text, p_user_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid, p_period_type text DEFAULT 'monthly'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT has_permission('incentive:manage_targets') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_targets
    (company_id, target_scope, target_owner_type, target_owner_id, user_id, branch_id, target_type, period_type, period_start, period_end, target_value, currency_code, created_by)
  VALUES (p_company_id, p_target_scope, p_target_owner_type, p_target_owner_id, p_user_id, p_branch_id, p_target_type, p_period_type, p_period_start, p_period_end, p_target_value, p_currency_code, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_target', v_id, jsonb_build_object('scope', p_target_scope, 'type', p_target_type, 'value', p_target_value));
  RETURN v_id;
END;
$function$

-- ===== incentive_deactivate_assignment =====

CREATE OR REPLACE FUNCTION public.incentive_deactivate_assignment(p_assignment_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT has_permission('incentive:manage_assignments') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  UPDATE incentive_assignments SET status = 'inactive', updated_by = incentive_actor(p_company_id)
   WHERE id = p_assignment_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_assignment', p_assignment_id, jsonb_build_object('status', 'inactive'));
END;
$function$

-- ===== incentive_deactivate_target =====

CREATE OR REPLACE FUNCTION public.incentive_deactivate_target(p_target_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT has_permission('incentive:manage_targets') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  UPDATE incentive_targets SET status = 'inactive', updated_by = incentive_actor(p_company_id)
   WHERE id = p_target_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_target', p_target_id, jsonb_build_object('status', 'inactive'));
END;
$function$

-- ===== incentive_detect_pending_invoices =====

CREATE OR REPLACE FUNCTION public.incentive_detect_pending_invoices(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_count integer;
BEGIN
  IF NOT has_permission('incentive:manage_pending') AND NOT has_permission('incentive:manage_pending_branch') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_pending_invoices
     (company_id, invoice_id, branch_id, status, detected_at, created_by)
  SELECT i.company_id, i.id, i.branch_id, 'pending', now(), incentive_actor(p_company_id)
    FROM invoices i
   WHERE i.company_id = p_company_id
     AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
     AND i.type = 'sale'
     AND i.status NOT IN ('cancelled','void')
     AND NOT EXISTS (SELECT 1 FROM incentive_engineer_links l
                     WHERE l.invoice_id = i.id AND l.status = 'assigned')
     AND NOT EXISTS (SELECT 1 FROM incentive_pending_invoices p
                     WHERE p.invoice_id = i.id AND p.status IN ('pending','assigned'));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_pending_invoices_batch', NULL, jsonb_build_object('detected', v_count));
  END IF;
  RETURN v_count;
END;
$function$

-- ===== incentive_detect_pending_invoices_system =====

CREATE OR REPLACE FUNCTION public.incentive_detect_pending_invoices_system()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer := 0;
  v_count integer;
  v_company_id uuid;
BEGIN
  FOR v_company_id IN SELECT id FROM public.companies ORDER BY id LOOP
    INSERT INTO public.incentive_pending_invoices (company_id, invoice_id, branch_id, status, detected_at, created_by)
    SELECT i.company_id, i.id, i.branch_id, 'pending', now(), public.incentive_actor(v_company_id)
    FROM public.invoices i
    WHERE i.company_id = v_company_id
      AND i.type = 'sale'
      AND i.status NOT IN ('cancelled', 'void')
      AND NOT EXISTS (SELECT 1 FROM public.incentive_engineer_links l WHERE l.invoice_id = i.id AND l.status = 'assigned')
      AND NOT EXISTS (SELECT 1 FROM public.incentive_pending_invoices p WHERE p.invoice_id = i.id AND p.status IN ('pending', 'assigned'));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    IF v_count > 0 THEN
      PERFORM public.incentive_log_audit(v_company_id, 'CREATE', 'incentive_pending_invoices_batch', NULL, jsonb_build_object('detected', v_count, 'source', 'system_scheduler'));
    END IF;
  END LOOP;
  RETURN v_total;
END;
$function$

-- ===== incentive_log_audit =====

CREATE OR REPLACE FUNCTION public.incentive_log_audit(p_company_id uuid, p_action text, p_entity text, p_entity_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, entity, entity_id, details)
  VALUES (p_company_id, incentive_actor(p_company_id), p_action, p_entity, p_entity_id, p_details);
END;
$function$

-- ===== incentive_mark_pending_resolved =====

CREATE OR REPLACE FUNCTION public.incentive_mark_pending_resolved(p_pending_id uuid, p_company_id uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT has_permission('incentive:manage_pending') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF p_status NOT IN ('resolved','ignored') THEN RAISE EXCEPTION 'invalid_resolution_status'; END IF;
  UPDATE incentive_pending_invoices
     SET status = p_status, resolved_at = now(), resolved_by = incentive_actor(p_company_id), reason = p_reason
   WHERE id = p_pending_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pending_record_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_pending_invoices', p_pending_id, jsonb_build_object('new_status', p_status, 'reason', p_reason));
END;
$function$

-- ===== incentive_open_period =====

CREATE OR REPLACE FUNCTION public.incentive_open_period(p_company_id uuid, p_period_label text, p_period_start date, p_period_end date, p_currency_code text, p_branch_id uuid DEFAULT NULL::uuid, p_is_test_period boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT has_permission('incentive:manage_periods') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  INSERT INTO incentive_periods
    (company_id, branch_id, period_label, period_start, period_end, is_test_period, currency_code, created_by)
  VALUES (p_company_id, p_branch_id, p_period_label, p_period_start, p_period_end, p_is_test_period, p_currency_code, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'CREATE', 'incentive_period', v_id, jsonb_build_object('label', p_period_label, 'test', p_is_test_period));
  RETURN v_id;
END;
$function$

-- ===== incentive_period_transition =====

CREATE OR REPLACE FUNCTION public.incentive_period_transition(p_period_id uuid, p_company_id uuid, p_new_state text, p_by_permission text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_required_permission text;
BEGIN
  v_required_permission := CASE p_new_state
    WHEN 'calculating' THEN 'incentive:period_calculating'
    WHEN 'calculated' THEN 'incentive:period_calculated'
    WHEN 'under_review' THEN 'incentive:period_under_review'
    WHEN 'approved' THEN 'incentive:period_approved'
    WHEN 'locked' THEN 'incentive:period_locked'
    WHEN 'paid' THEN 'incentive:period_paid'
    ELSE NULL
  END;

  IF v_required_permission IS NULL THEN
    RAISE EXCEPTION 'invalid_period_state';
  END IF;

  IF NOT user_is_admin_or_manager() AND NOT has_permission(v_required_permission) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  PERFORM incentive_assert_period_allows(p_period_id, p_new_state);

  UPDATE incentive_periods
  SET state = p_new_state,
      updated_at = now(),
      calculated_at = CASE WHEN p_new_state = 'calculated' THEN now() ELSE calculated_at END,
      approved_at = CASE WHEN p_new_state = 'approved' THEN now() ELSE approved_at END,
      locked_at = CASE WHEN p_new_state = 'locked' THEN now() ELSE locked_at END,
      paid_at = CASE WHEN p_new_state = 'paid' THEN now() ELSE paid_at END
  WHERE id = p_period_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found';
  END IF;

  PERFORM incentive_log_audit(
    p_company_id,
    'UPDATE',
    'incentive_period',
    p_period_id,
    jsonb_build_object('new_state', p_new_state, 'required_permission', v_required_permission)
  );
END;
$function$

-- ===== incentive_record_payment =====

CREATE OR REPLACE FUNCTION public.incentive_record_payment(p_company_id uuid, p_calculation_id uuid, p_user_id uuid, p_amount numeric, p_payment_date date, p_payment_method text, p_currency_code text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid; v_period_id uuid;
BEGIN
  IF NOT has_permission('commission:pay') AND NOT has_permission('commission:record_payment') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT period_id INTO v_period_id FROM incentive_calculations WHERE id = p_calculation_id;
  PERFORM incentive_assert_period_allows(v_period_id, 'pay');
  INSERT INTO incentive_payments
    (calculation_id, company_id, user_id, amount, payment_date, payment_method, reference, notes, currency_code, created_by)
  VALUES (p_calculation_id, p_company_id, p_user_id, p_amount, p_payment_date, p_payment_method, p_reference, p_notes, p_currency_code, incentive_actor(p_company_id))
  RETURNING id INTO v_id;
  PERFORM incentive_log_audit(p_company_id, 'PAYMENT', 'incentive_payment', v_id, jsonb_build_object('amount', p_amount, 'calculation_id', p_calculation_id));
  RETURN v_id;
END;
$function$

-- ===== incentive_revoke_engineer_link =====

CREATE OR REPLACE FUNCTION public.incentive_revoke_engineer_link(p_link_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT has_permission('incentive:manage_pending') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  UPDATE incentive_engineer_links SET status = 'revoked', allocation_status = 'revoked'
  WHERE id = p_link_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'link_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_engineer_link', p_link_id, jsonb_build_object('status', 'revoked'));
END;
$function$

-- ===== incentive_update_plan =====

CREATE OR REPLACE FUNCTION public.incentive_update_plan(p_plan_id uuid, p_company_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_calculation_basis text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_effective_to date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_old jsonb;
BEGIN
  IF NOT has_permission('incentive:manage_plans') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT jsonb_build_object('name', name, 'basis', calculation_basis, 'status', status) INTO v_old
    FROM incentive_plans WHERE id = p_plan_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  UPDATE incentive_plans SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    calculation_basis = COALESCE(p_calculation_basis, calculation_basis),
    status = COALESCE(p_status, status),
    effective_to = COALESCE(p_effective_to, effective_to),
    updated_by = incentive_actor(p_company_id)
  WHERE id = p_plan_id AND company_id = p_company_id;
  PERFORM incentive_log_audit(p_company_id, 'UPDATE', 'incentive_plan', p_plan_id, v_old);
END;
$function$

-- ===== incentive_void_calculation =====

CREATE OR REPLACE FUNCTION public.incentive_void_calculation(p_calculation_id uuid, p_company_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_period_id uuid;
BEGIN
  IF NOT has_permission('commission:review') AND NOT user_is_admin_or_manager() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT period_id INTO v_period_id FROM incentive_calculations WHERE id = p_calculation_id AND company_id = p_company_id;
  PERFORM incentive_assert_period_allows(v_period_id, 'review');
  UPDATE incentive_calculations SET status = 'cancelled', collection_note = p_reason
   WHERE id = p_calculation_id AND company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'calculation_not_found'; END IF;
  PERFORM incentive_log_audit(p_company_id, 'VOID', 'incentive_calculation', p_calculation_id, jsonb_build_object('reason', p_reason));
END;
$function$

-- ===== is_super_admin =====

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  );
$function$

-- ===== is_valid_branch =====

CREATE OR REPLACE FUNCTION public.is_valid_branch(p_company_id uuid, p_branch_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    p_branch_id IS NULL OR
    EXISTS (
      SELECT 1 FROM branches
      WHERE id = p_branch_id
        AND company_id = p_company_id
    )
  );
$function$

-- ===== log_audit_event =====

CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_company_id uuid; v_entity_id uuid; BEGIN v_company_id := COALESCE(NEW.company_id, OLD.company_id); v_entity_id := COALESCE(NEW.id, OLD.id); INSERT INTO public.audit_logs (company_id, user_id, action, entity, entity_id, details, created_at, updated_at) VALUES (v_company_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_entity_id, jsonb_build_object('old_data', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END, 'new_data', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END), now(), now()); RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END; END; $function$

-- ===== log_cron_backup_event =====

CREATE OR REPLACE FUNCTION public.log_cron_backup_event()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company RECORD;
BEGIN
  FOR v_company IN
    SELECT id FROM public.companies WHERE is_active = true
  LOOP
    INSERT INTO public.audit_logs (
      company_id, action, entity, entity_id, details, created_at
    ) VALUES (
      v_company.id,
      'CRON_BACKUP',
      'system',
      gen_random_uuid(),
      jsonb_build_object('message', 'Scheduled backup triggered', 'triggered_at', now()),
      NOW()
    );
  END LOOP;
END;
$function$

-- ===== log_table_changes =====

CREATE OR REPLACE FUNCTION public.log_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs(company_id, user_id, action, entity, entity_id, details)
    VALUES (
      COALESCE((to_jsonb(NEW)->>'company_id')::uuid, NULL),
      auth.uid(),
      'INSERT',
      TG_TABLE_NAME,
      (to_jsonb(NEW)->>'id')::uuid,
      jsonb_build_object('new', to_jsonb(NEW))
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(company_id, user_id, action, entity, entity_id, details)
    VALUES (
      COALESCE((to_jsonb(NEW)->>'company_id')::uuid, NULL),
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      (to_jsonb(NEW)->>'id')::uuid,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs(company_id, user_id, action, entity, entity_id, details)
    VALUES (
      COALESCE((to_jsonb(OLD)->>'company_id')::uuid, NULL),
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      (to_jsonb(OLD)->>'id')::uuid,
      jsonb_build_object('old', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$

-- ===== normalize_arabic =====

CREATE OR REPLACE FUNCTION public.normalize_arabic(p_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_text IS NULL THEN
        RETURN '';
    END IF;
    RETURN regexp_replace(
        translate(
            lower(p_text),
            'أإآةى',
            'اااهي'
        ),
        '[\u064B-\u065F]', -- إزالة الحركات
        '',
        'g'
    );
END;
$function$

-- ===== normalize_oem_v1 =====

CREATE OR REPLACE FUNCTION public.normalize_oem_v1(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN '';
  END IF;
  -- Remove spaces, hyphens, slashes, and periods, then uppercase
  RETURN UPPER(regexp_replace(input_text, '[\s\-\/\.]', '', 'g'));
END;
$function$

-- ===== post_manual_journal =====

CREATE OR REPLACE FUNCTION public.post_manual_journal(p_company_id uuid, p_user_id uuid, p_date date, p_description text, p_lines jsonb, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_reference_type text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_journal_id   uuid;
  v_line         RECORD;
  v_base_debit   numeric;
  v_base_credit  numeric;
  v_foreign_amt  numeric;
  v_total_debit  numeric := 0;
  v_total_credit numeric := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied: ????? ?????? ????? ??? ?????';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND p_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION '?? ???? ????? ???? ?? ??? ????? ?????';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(debit numeric, credit numeric)
  LOOP
    v_total_debit  := v_total_debit  + ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_total_credit := v_total_credit + ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
  END LOOP;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION '????? ??? ??????: ???? (%) != ???? (%)', v_total_debit, v_total_credit;
  END IF;

  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, p_date, p_description,
    COALESCE(p_reference_type, 'manual'), 'draft', p_user_id
  ) RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(account_id uuid, party_id uuid, debit numeric, credit numeric, description text)
  LOOP
    v_base_debit  := ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_base_credit := ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
    v_foreign_amt := GREATEST(COALESCE(v_line.debit, 0), COALESCE(v_line.credit, 0));

    INSERT INTO journal_entry_lines(
      journal_entry_id, account_id, party_id,
      debit_amount, credit_amount, description,
      currency_code, exchange_rate, foreign_amount, company_id, branch_id
    ) VALUES (
      v_journal_id, v_line.account_id, v_line.party_id,
      v_base_debit, v_base_credit,
      COALESCE(v_line.description, p_description),
      p_currency_code, p_exchange_rate, v_foreign_amt,
      p_company_id, p_branch_id
    );
  END LOOP;

  UPDATE journal_entries SET status = 'posted' WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$function$

-- ===== prc_publish_evaluation_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_evaluation_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'rfq_evaluation', NEW.evaluation_id, 'rfq_evaluation.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'rfq_id', NEW.rfq_id)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_grn_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_grn_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'goods_receipt', NEW.grn_id, 'goods_receipt.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'grn_number', NEW.grn_number, 'po_id', NEW.po_id)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_invoice_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_invoice_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'purchase_invoice', NEW.invoice_id, 'purchase_invoice.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'invoice_number', NEW.invoice_number, 'po_id', NEW.po_id)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_po_created_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_po_created_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    PERFORM api_v1_sys_publish_event(
        NEW.company_id, 'purchase_order', NEW.po_id, 'purchase_order.created',
        row_to_json(NEW)::jsonb, NEW.buyer_id, 'user'
    );
    RETURN NEW;
END;
$function$

-- ===== prc_publish_po_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_po_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'purchase_order', NEW.po_id, 'purchase_order.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'po_number', NEW.po_number, 'supplier_id', NEW.supplier_id)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_pr_created_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_pr_created_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    PERFORM api_v1_sys_publish_event(
        NEW.company_id, 'purchase_request', NEW.pr_id, 'purchase_request.created',
        row_to_json(NEW)::jsonb, NEW.requester_id, 'user'
    );
    RETURN NEW;
END;
$function$

-- ===== prc_publish_pr_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_pr_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'purchase_request', NEW.pr_id, 'purchase_request.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'pr_number', NEW.pr_number)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_quotation_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_quotation_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'quotation', NEW.quotation_id, 'quotation.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'rfq_id', NEW.rfq_id, 'supplier_id', NEW.supplier_id)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_rfq_status_changed_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_rfq_status_changed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM api_v1_sys_publish_event(
            NEW.company_id, 'rfq', NEW.rfq_id, 'rfq.status_changed',
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'rfq_number', NEW.rfq_number)
        );
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prc_publish_sla_violation_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_sla_violation_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    PERFORM api_v1_sys_publish_event(
        NEW.company_id, 'sla_violation', NEW.violation_id, 'sla_violation.recorded',
        jsonb_build_object('supplier_id', NEW.supplier_id, 'sla_id', NEW.sla_id, 'reference_type', NEW.reference_type, 'actual_value', NEW.actual_value)
    );
    RETURN NEW;
END;
$function$

-- ===== prc_publish_supplier_created_event =====

CREATE OR REPLACE FUNCTION public.prc_publish_supplier_created_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    PERFORM api_v1_sys_publish_event(
        NEW.company_id, 'supplier', NEW.supplier_id, 'supplier.created', row_to_json(NEW)::jsonb
    );
    RETURN NEW;
END;
$function$

-- ===== prevent_company_id_change =====

CREATE OR REPLACE FUNCTION public.prevent_company_id_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'لا يمكن تغيير company_id بعد الإنشاء';
  END IF;
  RETURN NEW;
END;
$function$

-- ===== prevent_inventory_hard_delete =====

CREATE OR REPLACE FUNCTION public.prevent_inventory_hard_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- بدلاً من الحذف الحقيقي، نضع deleted_at
  UPDATE inventory_transactions 
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NULL; -- يمنع الحذف الفعلي
END;
$function$

-- ===== prevent_invoice_in_closed_fiscal_year =====

CREATE OR REPLACE FUNCTION public.prevent_invoice_in_closed_fiscal_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fiscal_year_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM fiscal_years fy
      WHERE fy.id = NEW.fiscal_year_id
        AND fy.is_closed = true
    ) THEN
      RAISE EXCEPTION 'fiscal_year_closed: لا يمكن إضافة فاتورة لسنة مالية مغلقة';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$

-- ===== prevent_journal_entry_in_closed_fiscal_year =====

CREATE OR REPLACE FUNCTION public.prevent_journal_entry_in_closed_fiscal_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_closed boolean;
begin
  -- نتحقق من القفل بناءً على entry_date مباشرة (لا نعتمد فقط على fiscal_year_id المُدخل يدويًا)
  select fy.is_closed into v_is_closed
  from public.fiscal_years fy
  where fy.company_id = new.company_id
    and new.entry_date between fy.start_date and fy.end_date
  limit 1;

  if v_is_closed = true then
    raise exception 'fiscal_year_closed: لا يمكن ترحيل أو تعديل قيد في سنة مالية مقفلة (تاريخ القيد: %)', new.entry_date;
  end if;

  return new;
end;
$function$

-- ===== prevent_negative_stock_on_sale =====

CREATE OR REPLACE FUNCTION public.prevent_negative_stock_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'negative_stock: الكمية في المخزون لا يمكن أن تكون سالبة (المنتج: %, المستودع: %)',
      NEW.product_id, NEW.warehouse_id;
  END IF;
  RETURN NEW;
END;
$function$

-- ===== prevent_posted_journal_edit =====

CREATE OR REPLACE FUNCTION public.prevent_posted_journal_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'posted' AND NEW.status != 'void' AND OLD.deleted_at IS NULL THEN
    IF OLD.description IS DISTINCT FROM NEW.description
       OR OLD.entry_date   IS DISTINCT FROM NEW.entry_date
       OR OLD.company_id   IS DISTINCT FROM NEW.company_id
    THEN
      RAISE EXCEPTION
        'لا يمكن تعديل قيد محاسبي مُرحَّل (رقم: %). استخدم void أولاً ثم أنشئ قيداً جديداً.',
        OLD.entry_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$

-- ===== prevent_posted_journal_line_modification =====

CREATE OR REPLACE FUNCTION public.prevent_posted_journal_line_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_status text;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT status INTO v_status FROM public.journal_entries WHERE id = OLD.journal_entry_id;
    IF v_status = 'posted' THEN
      RAISE EXCEPTION 'Cannot modify lines of a posted journal entry (Entry: %). Use reversal.', OLD.journal_entry_id USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_status FROM public.journal_entries WHERE id = NEW.journal_entry_id;
    IF v_status = 'posted' THEN
      RAISE EXCEPTION 'Cannot add lines to a posted journal entry (Entry: %). Use reversal.', NEW.journal_entry_id USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$function$

-- ===== prevent_posted_journal_modification =====

CREATE OR REPLACE FUNCTION public.prevent_posted_journal_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot modify a posted journal entry (ID: %). Use reversal.', OLD.id USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot delete a posted journal entry (ID: %). Use reversal.', OLD.id USING ERRCODE = '23514';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$function$

-- ===== prevent_sys_activity_log_modification =====

CREATE OR REPLACE FUNCTION public.prevent_sys_activity_log_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RAISE EXCEPTION 'SYS-001: sys_activity_log is immutable. UPDATE and DELETE operations are strictly forbidden.';
    RETURN NULL;
END;
$function$

-- ===== prevent_sys_domain_events_deletion =====

CREATE OR REPLACE FUNCTION public.prevent_sys_domain_events_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RAISE EXCEPTION 'SYS-002: sys_domain_events records cannot be deleted. Archiving is the only allowed removal method.';
    RETURN NULL;
END;
$function$

-- ===== prevent_sys_domain_events_payload_update =====

CREATE OR REPLACE FUNCTION public.prevent_sys_domain_events_payload_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF (
        NEW.aggregate_type IS DISTINCT FROM OLD.aggregate_type OR
        NEW.aggregate_id IS DISTINCT FROM OLD.aggregate_id OR
        NEW.event_type IS DISTINCT FROM OLD.event_type OR
        NEW.payload IS DISTINCT FROM OLD.payload OR
        NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    ) THEN
        RAISE EXCEPTION 'SYS-003: Core event data (type, payload, aggregate, occurred_at) is immutable. Only status tracking fields can be updated.';
    END IF;
    RETURN NEW;
END;
$function$

-- ===== prevent_system_account_modification =====

CREATE OR REPLACE FUNCTION public.prevent_system_account_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
   IF TG_OP = 'DELETE' THEN
      IF OLD.is_system = true THEN
         RAISE EXCEPTION 'لا يمكن حذف الحسابات الأساسية للنظام';
      END IF;
      RETURN OLD;
   ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.is_system = true THEN
         -- Explicitly block modification of core properties on system accounts 
         -- (code, type, company_id, currencies...)
         IF NEW.code != OLD.code OR NEW.type != OLD.type OR NEW.company_id != OLD.company_id OR NEW.currency_code != OLD.currency_code OR NEW.is_system = false THEN
            RAISE EXCEPTION 'لا يمكن تعديل خصائص الحسابات الأساسية للنظام';
         END IF;
      END IF;
      RETURN NEW;
   END IF;
   RETURN COALESCE(NEW, OLD);
END;
$function$

-- ===== process_sales_return =====

CREATE OR REPLACE FUNCTION public.process_sales_return(p_invoice_id uuid, p_party_id uuid, p_payment_method text, p_items jsonb, p_return_reason text, p_status text, p_notes text, p_issue_date date, p_currency_code text, p_exchange_rate numeric, p_company_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_return_invoice_id UUID;
  v_invoice_number    TEXT;
  v_total_amount      NUMERIC := 0;
  v_subtotal          NUMERIC := 0;
  v_cost_total        NUMERIC := 0;
  v_warehouse_id      UUID;
  v_journal_id        UUID;
  v_item              RECORD;
  v_account_revenue   UUID;
  v_account_receivable UUID;
  v_account_cash      UUID;
  v_account_inventory UUID;
  v_account_cogs      UUID;
  v_credit_account    UUID;
BEGIN
  -- [FIX أمني حرج] لم تكن الدالة تتحقق أبداً أن p_user_id عضو في p_company_id.
  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = p_user_id AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- ① التحقق من السنة المالية المفتوحة
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- ② توليد رقم الفاتورة
  v_invoice_number := public.get_next_invoice_number(p_company_id, 'RET');

  -- ③ حساب الإجماليات من الأصناف
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x("productId" UUID, quantity NUMERIC, "unitPrice" NUMERIC, "costPrice" NUMERIC)
  LOOP
    v_subtotal   := v_subtotal   + (v_item.quantity * v_item."unitPrice");
    v_cost_total := v_cost_total + (v_item.quantity * v_item."costPrice");
  END LOOP;

  v_total_amount := v_subtotal;

  -- ④ إنشاء فاتورة المرتجع
  -- [FIX] كان type يُسجَّل كـ 'return_sale' وهي قيمة غير موجودة أبداً في invoices_type_check
  -- (التي تسمح فقط بـ 'sale_return')، مما كان يجعل الدالة تفشل بالكامل لأي استدعاء.
  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', p_status, p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    p_currency_code, p_exchange_rate, p_invoice_id,
    p_return_reason, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

  -- ⑤ إضافة أصناف الفاتورة
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, total, cost_price, tax_amount, company_id
  )
  SELECT
    v_return_invoice_id,
    (item->>'productId')::UUID,
    (item->>'name'),
    (item->>'quantity')::NUMERIC,
    (item->>'unitPrice')::NUMERIC,
    (item->>'quantity')::NUMERIC * (item->>'unitPrice')::NUMERIC,
    COALESCE((item->>'costPrice')::NUMERIC, 0),
    0,
    p_company_id
  FROM jsonb_array_elements(p_items) AS item;

  -- ⑥ تحريك المخزون وإنشاء القيود المحاسبية عند الترحيل
  IF p_status = 'posted' THEN

    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND is_primary = true
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id
      FROM public.warehouses
      WHERE company_id = p_company_id
      LIMIT 1;
    END IF;

    IF v_warehouse_id IS NOT NULL THEN
      FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items)
          AS x("productId" UUID, quantity NUMERIC, "costPrice" NUMERIC)
      LOOP
        IF v_item."productId" IS NOT NULL THEN
          -- [FIX] إضافة unit_cost (نفس مشكلة process_stock_transfer):
          -- trg_require_inventory_cost يفرض NOT NULL على كل حركة مخزون.
          INSERT INTO public.inventory_transactions (
            company_id, product_id, warehouse_id, quantity, unit_cost,
            transaction_type, reference_type, reference_id, created_by
          ) VALUES (
            p_company_id, v_item."productId", v_warehouse_id, v_item.quantity,
            COALESCE(v_item."costPrice", 0),
            'sales_return', 'invoice', v_return_invoice_id, p_user_id
          );
        END IF;
      END LOOP;
    END IF;

    SELECT id INTO v_account_revenue     FROM public.accounts WHERE company_id = p_company_id AND code = '4100' LIMIT 1;
    SELECT id INTO v_account_receivable  FROM public.accounts WHERE company_id = p_company_id AND code = '1100' LIMIT 1;
    SELECT id INTO v_account_cash        FROM public.accounts WHERE company_id = p_company_id AND code = '1010' LIMIT 1;
    SELECT id INTO v_account_inventory   FROM public.accounts WHERE company_id = p_company_id AND code = '1200' LIMIT 1;
    SELECT id INTO v_account_cogs        FROM public.accounts WHERE company_id = p_company_id AND code = '5100' LIMIT 1;

    INSERT INTO public.journal_entries (
      company_id, entry_date, description, status,
      reference_type, reference_id, created_by
    ) VALUES (
      p_company_id, p_issue_date,
      'مرتجع مبيعات - ' || v_invoice_number,
      'posted', 'invoice', v_return_invoice_id, p_user_id
    ) RETURNING id INTO v_journal_id;

    IF v_account_revenue IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_account_revenue,
        ROUND(v_subtotal * p_exchange_rate, 4), 0,
        'عكس إيراد - مرتجع مبيعات',
        p_currency_code, p_exchange_rate, v_subtotal, p_company_id
      );
    END IF;

    v_credit_account := CASE
      WHEN p_payment_method = 'cash' THEN v_account_cash
      ELSE v_account_receivable
    END;

    IF v_credit_account IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_credit_account, p_party_id,
        0, ROUND(v_total_amount * p_exchange_rate, 4),
        CASE WHEN p_payment_method = 'cash'
             THEN 'رد نقدية للعميل'
             ELSE 'عكس مديونية العميل'
        END,
        p_currency_code, p_exchange_rate, v_total_amount, p_company_id
      );
    END IF;

    IF v_cost_total > 0
       AND v_account_inventory IS NOT NULL
       AND v_account_cogs IS NOT NULL
    THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES
      (
        v_journal_id, v_account_inventory,
        ROUND(v_cost_total * p_exchange_rate, 4), 0,
        'إرجاع بضاعة للمخزن',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      ),
      (
        v_journal_id, v_account_cogs,
        0, ROUND(v_cost_total * p_exchange_rate, 4),
        'عكس تكلفة البضاعة المباعة',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      );
    END IF;

  END IF;

  RETURN jsonb_build_object(
    'id',             v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'status',         'success'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$function$

-- ===== process_stock_transfer =====

CREATE OR REPLACE FUNCTION public.process_stock_transfer(p_transfer_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
  v_item     RECORD;
BEGIN
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;
  IF v_transfer IS NULL THEN RAISE EXCEPTION 'التحويل غير موجود: %', p_transfer_id; END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_transfer.company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لهذه الشركة';
  END IF;

  IF v_transfer.status = 'completed' THEN RAISE EXCEPTION 'تم تنفيذ هذا التحويل مسبقاً'; END IF;
  IF v_transfer.status = 'cancelled' THEN RAISE EXCEPTION 'لا يمكن تنفيذ تحويل مُلغى'; END IF;

  FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
    PERFORM public.fn_post_inventory_movement(
      v_transfer.company_id, v_item.product_id, v_transfer.from_warehouse_id, v_item.quantity,
      'transfer_out', 'stock_transfer', p_transfer_id, v_transfer.created_by
    );
    PERFORM public.fn_post_inventory_movement(
      v_transfer.company_id, v_item.product_id, v_transfer.to_warehouse_id, v_item.quantity,
      'transfer_in', 'stock_transfer', p_transfer_id, v_transfer.created_by
    );
  END LOOP;

  UPDATE public.stock_transfers SET status='completed', updated_at=now() WHERE id = p_transfer_id;
  RETURN p_transfer_id;
END;
$function$

-- ===== recalculate_all_party_balances =====

CREATE OR REPLACE FUNCTION public.recalculate_all_party_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r           RECORD;
  new_balance NUMERIC;
BEGIN
  FOR r IN SELECT id, type FROM public.parties WHERE deleted_at IS NULL LOOP

    IF r.type = 'customer' THEN
      SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0)
      INTO new_balance
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.party_id   = r.id
        AND jel.deleted_at IS NULL
        AND je.status      = 'posted'
        AND je.deleted_at  IS NULL;

    ELSIF r.type = 'supplier' THEN
      SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0)
      INTO new_balance
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.party_id   = r.id
        AND jel.deleted_at IS NULL
        AND je.status      = 'posted'
        AND je.deleted_at  IS NULL;

    ELSE
      new_balance := 0;
    END IF;

    -- ✅ لا نحتاج لتحديث parties.balance (العمود غير موجود)
    -- الرصيد محسوب ديناميكياً في party_balances View
    -- هذه الدالة فقط للتحقق/التقرير
    RAISE NOTICE 'Party %: balance = %', r.id, new_balance;
  END LOOP;
END;
$function$

-- ===== recalculate_invoice_totals =====

CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_invoice_id UUID;
  v_subtotal   NUMERIC;
  v_tax        NUMERIC;
  v_discount   NUMERIC;
  v_total      NUMERIC;
BEGIN
  -- تحديد invoice_id سواء INSERT/UPDATE/DELETE
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- إعادة حساب من بنود الفاتورة
  SELECT 
    COALESCE(SUM(quantity * unit_price), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(discount_amount), 0),
    COALESCE(SUM(total), 0)
  INTO v_subtotal, v_tax, v_discount, v_total
  FROM invoice_items
  WHERE invoice_id = v_invoice_id;

  -- تحديث رأس الفاتورة
  UPDATE invoices SET
    subtotal        = v_subtotal,
    tax_amount      = v_tax,
    discount_amount = v_discount,
    total_amount    = v_total,
    updated_at      = NOW()
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$

-- ===== recalculate_party_balance =====

CREATE OR REPLACE FUNCTION public.recalculate_party_balance(p_party_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.recalculate_party_balance_from_ledger(p_party_id);
END;
$function$

-- ===== recalculate_party_balance_from_ledger =====

CREATE OR REPLACE FUNCTION public.recalculate_party_balance_from_ledger(p_party_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance    NUMERIC(14,4);
  v_party_type TEXT;
BEGIN
  SELECT type INTO v_party_type FROM public.parties WHERE id = p_party_id;

  IF v_party_type = 'customer' THEN
    SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0)
    INTO v_balance
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    JOIN public.accounts a ON a.id = jel.account_id
    WHERE jel.party_id   = p_party_id
      AND jel.deleted_at IS NULL
      AND je.status      = 'posted'
      AND je.deleted_at  IS NULL
      AND a.code          = '1100';

  ELSIF v_party_type = 'supplier' THEN
    SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0)
    INTO v_balance
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    JOIN public.accounts a ON a.id = jel.account_id
    WHERE jel.party_id   = p_party_id
      AND jel.deleted_at IS NULL
      AND je.status      = 'posted'
      AND je.deleted_at  IS NULL
      AND a.code          = '2100';

  ELSE
    v_balance := 0;
  END IF;

  RETURN COALESCE(v_balance, 0);
END;
$function$

-- ===== recalculate_product_stock =====

CREATE OR REPLACE FUNCTION public.recalculate_product_stock(p_product_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wh         RECORD;
  v_company_id uuid;
  v_qty        numeric;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.products WHERE id = p_product_id;

  FOR v_wh IN
    SELECT DISTINCT warehouse_id FROM public.inventory_transactions
    WHERE product_id    = p_product_id
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
      AND deleted_at    IS NULL
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN transaction_type IN ('purchase','sales_return','transfer_in','adj_in','initial') THEN  ABS(quantity)
        WHEN transaction_type IN ('sales','purchase_return','transfer_out','adj_out')         THEN -ABS(quantity)
        WHEN transaction_type = 'adj'                                                         THEN  quantity
        ELSE quantity
      END
    ), 0)
    INTO v_qty
    FROM public.inventory_transactions
    WHERE product_id    = p_product_id
      AND warehouse_id  = v_wh.warehouse_id
      AND deleted_at    IS NULL;

    -- ✅ تضمين company_id
    INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
    VALUES (p_product_id, v_wh.warehouse_id, v_qty, v_company_id)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity   = EXCLUDED.quantity,
      updated_at = now();
  END LOOP;
END;
$function$

-- ===== recalculate_product_stock_for_warehouse =====

CREATE OR REPLACE FUNCTION public.recalculate_product_stock_for_warehouse(p_product_id uuid, p_warehouse_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total      numeric;
  v_company_id uuid;
BEGIN
  -- جلب company_id من جدول products (المصدر الموثوق)
  SELECT company_id INTO v_company_id
  FROM public.products WHERE id = p_product_id;

  SELECT COALESCE(SUM(
    CASE transaction_type
      WHEN 'purchase'         THEN  ABS(quantity)
      WHEN 'sales_return'     THEN  ABS(quantity)
      WHEN 'transfer_in'      THEN  ABS(quantity)
      WHEN 'adj_in'           THEN  ABS(quantity)
      WHEN 'initial'          THEN  ABS(quantity)
      WHEN 'sales'            THEN -ABS(quantity)
      WHEN 'purchase_return'  THEN -ABS(quantity)
      WHEN 'transfer_out'     THEN -ABS(quantity)
      WHEN 'adj_out'          THEN -ABS(quantity)
      WHEN 'adj'              THEN  quantity
      ELSE                         quantity
    END
  ), 0)
  INTO v_total
  FROM public.inventory_transactions
  WHERE product_id   = p_product_id
    AND warehouse_id = p_warehouse_id
    AND deleted_at   IS NULL;

  -- ✅ تضمين company_id لمنع NOT NULL violation
  INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
  VALUES (p_product_id, p_warehouse_id, v_total, v_company_id)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity   = EXCLUDED.quantity,
    updated_at = now();
END;
$function$

-- ===== record_debt_reminder =====

CREATE OR REPLACE FUNCTION public.record_debt_reminder(p_company_id uuid, p_party_id uuid, p_message_text text, p_channel character varying DEFAULT 'whatsapp'::character varying, p_template_id uuid DEFAULT NULL::uuid, p_recipient character varying DEFAULT NULL::character varying, p_related_entity_type character varying DEFAULT NULL::character varying, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(message_log_id uuid, activity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_msg_id UUID;
DECLARE v_act_id UUID;
BEGIN
    -- Tenant guard: party must belong to this company
    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    INSERT INTO public.debt_message_log (
        company_id, party_id, channel, template_id, message_text,
        status, recipient, related_entity_type, related_entity_id, created_by, sent_at
    ) VALUES (
        p_company_id, p_party_id, p_channel, p_template_id, p_message_text,
        'sent', p_recipient, p_related_entity_type, p_related_entity_id, auth.uid(), NOW()
    )
    RETURNING id INTO v_msg_id;

    INSERT INTO public.customer_activities (
        company_id, customer_id, activity_type, subject, description,
        status, priority, scheduled_at, completed_at, created_by
    ) VALUES (
        p_company_id, p_party_id, 'follow_up', 'تذكير دين', p_message_text,
        'completed', 'medium', NOW(), NOW(), auth.uid()
    )
    RETURNING id INTO v_act_id;

    RETURN QUERY SELECT v_msg_id, v_act_id;
END;
$function$

-- ===== report_balance_sheet =====

CREATE OR REPLACE FUNCTION public.report_balance_sheet(p_company_id uuid, p_as_of_date date DEFAULT NULL::date)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date := COALESCE(p_as_of_date, CURRENT_DATE);
  v_assets numeric;
  v_liabilities numeric;
  v_equity numeric;
  v_cash numeric;
  v_receivables numeric;
  v_inventory_value numeric;
  v_payables numeric;
BEGIN
  -- Assets (accounts starting with 1)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_assets
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '1%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Liabilities (accounts starting with 2)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_liabilities
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '2%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Equity (accounts starting with 3)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_equity
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '3%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date;

  -- Return rows in proper order
  category := 'الأصول'; amount := v_assets; type := 'asset'; RETURN NEXT;
  category := 'الالتزامات'; amount := v_liabilities; type := 'liability'; RETURN NEXT;
  category := 'حقوق الملكية'; amount := v_equity; type := 'equity'; RETURN NEXT;
END;
$function$

-- ===== report_cash_flow =====

CREATE OR REPLACE FUNCTION public.report_cash_flow(p_company_id uuid, p_from date, p_to date)
 RETURNS TABLE(category text, inflow numeric, outflow numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operating_in numeric;
  v_operating_out numeric;
  v_investing_in numeric;
  v_investing_out numeric;
  v_financing_in numeric;
  v_financing_out numeric;
BEGIN
  -- Operating inflow (sales cash receipts)
  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_operating_in
  FROM public.invoices i
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('paid', 'partially_paid')
    AND i.payment_method = 'cash'
    AND i.issue_date BETWEEN p_from AND p_to
    AND i.deleted_at IS NULL;

  -- Operating outflow (expenses paid)
  SELECT COALESCE(SUM(e.amount), 0) INTO v_operating_out
  FROM public.expenses e
  WHERE e.company_id = p_company_id
    AND e.status = 'posted'
    AND e.payment_method IN ('cash', 'bank')
    AND e.expense_date BETWEEN p_from AND p_to
    AND e.deleted_at IS NULL;

  -- Receipt bonds
  SELECT COALESCE(SUM(p.amount), 0) INTO v_financing_in
  FROM public.payments p
  WHERE p.company_id = p_company_id
    AND p.type = 'receipt'
    AND p.status = 'posted'
    AND p.payment_date BETWEEN p_from AND p_to
    AND p.deleted_at IS NULL;

  -- Payment bonds
  SELECT COALESCE(SUM(p.amount), 0) INTO v_financing_out
  FROM public.payments p
  WHERE p.company_id = p_company_id
    AND p.type = 'disbursement'
    AND p.status = 'posted'
    AND p.payment_date BETWEEN p_from AND p_to
    AND p.deleted_at IS NULL;

  category := 'التشغيل'; inflow := v_operating_in; outflow := v_operating_out; RETURN NEXT;
  category := 'الاستثمار'; inflow := 0; outflow := 0; RETURN NEXT;
  category := 'التمويل'; inflow := v_financing_in; outflow := v_financing_out; RETURN NEXT;
END;
$function$

-- ===== report_debt_aging =====

CREATE OR REPLACE FUNCTION public.report_debt_aging(p_company_id uuid)
 RETURNS TABLE(customer_name text, total numeric, days_0_30 numeric, days_31_60 numeric, days_61_90 numeric, days_90_plus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pr.name, 'نقدي') as customer_name,
    SUM(i.total_amount - COALESCE(i.paid_amount, 0)) as total,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_0_30,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_31_60,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_90_plus
  FROM public.invoices i
  LEFT JOIN public.parties pr ON pr.id = i.party_id
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('posted', 'partially_paid')
    AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    AND i.deleted_at IS NULL
  GROUP BY pr.id, pr.name
  ORDER BY total DESC;
END;
$function$

-- ===== report_debts =====

CREATE OR REPLACE FUNCTION public.report_debts(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_debts json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH party_balances AS (
    SELECT 
      p.id,
      p.name,
      p.type,
      SUM(CASE 
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount)
        ELSE 0 
      END) as remaining_amount
    FROM parties p
    JOIN invoices i ON p.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.status IN ('confirmed','posted','partially_paid')
      AND i.deleted_at IS NULL
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.type
    HAVING ABS(SUM(
      CASE 
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount)
        ELSE 0 
      END
    )) > 0.01
  )
  SELECT 
    COALESCE(SUM(remaining_amount) FILTER (WHERE type IN ('customer', 'both') AND remaining_amount > 0), 0),
    COALESCE(SUM(ABS(remaining_amount)) FILTER (WHERE type IN ('supplier', 'both') AND remaining_amount < 0), 0),
    COALESCE(json_agg(row_to_json(pb)), '[]'::json)
  INTO v_receivables, v_payables, v_debts
  FROM party_balances pb;

  RETURN json_build_object(
    'summary', json_build_object(
      'receivables', v_receivables,
      'payables', v_payables
    ),
    'debts', v_debts
  );
END;
$function$

-- ===== report_profit_loss =====

CREATE OR REPLACE FUNCTION public.report_profit_loss(p_company_id uuid, p_from date, p_to date)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue numeric;
  v_expense numeric;
  v_gross_profit numeric;
  v_net_profit numeric;
BEGIN
  -- Revenue (accounts starting with 4)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '4%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to;

  -- Expenses (accounts starting with 5)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '5%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to;

  v_net_profit := v_revenue - v_expense;
  v_gross_profit := v_revenue;

  -- Return rows
  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$

-- ===== report_trial_balance =====

CREATE OR REPLACE FUNCTION public.report_trial_balance(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_code text, account_id uuid, account_name text, account_type text, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.code,
    a.id,
    a.name_ar,
    a.type,
    COALESCE(jel.balance, 0) as balance,
    COALESCE(jel.debit_amount, 0) as total_debit,
    COALESCE(jel.credit_amount, 0) as total_credit
  FROM public.accounts a
  LEFT JOIN (
     SELECT 
        l.account_id, 
        SUM(l.debit_amount) as debit_amount, 
        SUM(l.credit_amount) as credit_amount,
        SUM(l.debit_amount) - SUM(l.credit_amount) as balance
     FROM public.journal_entry_lines l
     JOIN public.journal_entries j ON j.id = l.journal_entry_id
     WHERE j.status = 'posted' AND j.deleted_at IS NULL AND l.deleted_at IS NULL
       AND j.entry_date BETWEEN p_from AND p_to
       AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
     GROUP BY l.account_id
  ) jel ON jel.account_id = a.id
  WHERE a.company_id = p_company_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
  ORDER BY a.code;
END;
$function$

-- ===== resolve_vehicle_from_vin =====

CREATE OR REPLACE FUNCTION public.resolve_vehicle_from_vin(p_vin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_normalized TEXT;
    v_vehicle    jsonb;
    v_len        INTEGER;
BEGIN
    v_normalized := upper(regexp_replace(COALESCE(p_vin, ''), '[^A-HJ-NPR-Z0-9]', '', 'g'));

    IF length(v_normalized) < 3 THEN
        RETURN jsonb_build_object('found', false, 'vin', v_normalized, 'vehicle', NULL::jsonb);
    END IF;

    -- Longest-prefix match from full VIN length down to WMI (3 chars)
    FOR v_len IN REVERSE length(v_normalized) .. 3 LOOP
        SELECT row_to_json(v)::jsonb INTO v_vehicle
        FROM public.vehicles v
        WHERE v.vin_prefix = left(v_normalized, v_len)
          AND v.deleted_at IS NULL
        LIMIT 1;

        EXIT WHEN v_vehicle IS NOT NULL;
    END LOOP;

    RETURN jsonb_build_object(
        'found', v_vehicle IS NOT NULL,
        'vin', v_normalized,
        'vehicle', v_vehicle
    );
END;
$function$

-- ===== restrict_journal_entry_update =====

CREATE OR REPLACE FUNCTION public.restrict_journal_entry_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.status = 'posted' and new.status not in ('posted','reversed') then
    raise exception 'لا يمكن تعديل حالة قيد مرحّل إلا إلى reversed (عبر قيد عكسي)، لا تعديل مباشر آخر';
  end if;
  if old.status = 'posted' then
    if new.entry_date is distinct from old.entry_date
       or new.company_id is distinct from old.company_id then
      raise exception 'لا يمكن تعديل تاريخ أو شركة قيد مرحّل - استخدم قيد عكسي';
    end if;
  end if;
  if old.status = 'reversed' and new.status is distinct from old.status then
    raise exception 'لا يمكن تعديل قيد مُعكوس بالفعل';
  end if;
  return new;
end;
$function$

-- ===== reverse_audit_session =====

CREATE OR REPLACE FUNCTION public.reverse_audit_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
  v_item RECORD;
  v_count int := 0;
BEGIN
  SELECT * INTO v_session FROM audit_sessions WHERE id = p_session_id;
  IF v_session IS NULL THEN RAISE EXCEPTION 'audit_session_not_found: %', p_session_id; END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_session.company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF v_session.status <> 'completed' THEN
    RAISE EXCEPTION 'لا يمكن عكس جلسة جرد غير منجزة (الحالة: %)', v_session.status;
  END IF;

  -- عكس كل حركة تسوية أُنشئت من هذه الجلسة تحديداً، عبر نفس المصدر الموحد
  FOR v_item IN
    SELECT product_id, quantity, transaction_type, unit_cost
    FROM inventory_transactions
    WHERE reference_type = 'audit' AND reference_id = p_session_id
  LOOP
    PERFORM public.fn_post_inventory_movement(
      v_session.company_id, v_item.product_id, v_session.warehouse_id, v_item.quantity,
      CASE WHEN v_item.transaction_type = 'adj_in' THEN 'adj_out' ELSE 'adj_in' END,
      'audit_reversal', p_session_id, auth.uid(), v_item.unit_cost
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE audit_sessions SET status='cancelled', updated_at=now() WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'movements_reversed', v_count);
END;
$function$

-- ===== reverse_stock_transfer =====

CREATE OR REPLACE FUNCTION public.reverse_stock_transfer(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
  v_item     RECORD;
BEGIN
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;
  IF v_transfer IS NULL THEN RAISE EXCEPTION 'التحويل غير موجود: %', p_transfer_id; END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_transfer.company_id
        AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لهذه الشركة';
  END IF;

  IF v_transfer.status <> 'completed' THEN
    RAISE EXCEPTION 'لا يمكن عكس تحويل غير منفَّذ (الحالة الحالية: %)', v_transfer.status;
  END IF;

  FOR v_item IN
    SELECT it.product_id, it.quantity, it.unit_cost
    FROM inventory_transactions it
    WHERE it.reference_type = 'stock_transfer' AND it.reference_id = p_transfer_id
      AND it.transaction_type = 'transfer_out'
  LOOP
    PERFORM public.fn_post_inventory_movement(
      v_transfer.company_id, v_item.product_id, v_transfer.to_warehouse_id, v_item.quantity,
      'transfer_out', 'stock_transfer_reversal', p_transfer_id, auth.uid(), v_item.unit_cost
    );
    PERFORM public.fn_post_inventory_movement(
      v_transfer.company_id, v_item.product_id, v_transfer.from_warehouse_id, v_item.quantity,
      'transfer_in', 'stock_transfer_reversal', p_transfer_id, auth.uid(), v_item.unit_cost
    );
  END LOOP;

  UPDATE public.stock_transfers SET status='cancelled', updated_at=now() WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'note', 'reversed_via_offsetting_movements');
END;
$function$

-- ===== save_product_uoms =====

CREATE OR REPLACE FUNCTION public.save_product_uoms(p_product_id uuid, p_uoms jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uom jsonb;
BEGIN
    -- أ) حذف جميع وحدات القياس الحالية للمنتج
    DELETE FROM public.product_uoms WHERE product_id = p_product_id;
    
    -- ب) إدخال الوحدات الجديدة إذا تم تمريرها
    IF p_uoms IS NOT NULL AND jsonb_array_length(p_uoms) > 0 THEN
        FOR v_uom IN SELECT * FROM jsonb_array_elements(p_uoms) LOOP
            INSERT INTO public.product_uoms (product_id, uom_name, conversion_factor)
            VALUES (
                p_product_id,
                (v_uom->>'uom_name')::text,
                (v_uom->>'conversion_factor')::numeric
            );
        END LOOP;
    END IF;
END;
$function$

-- ===== search_by_oem =====

CREATE OR REPLACE FUNCTION public.search_by_oem(p_company_id uuid, p_search_term text, p_limit integer DEFAULT 20)
 RETURNS TABLE(product_id uuid, product_name text, product_name_ar text, product_sku text, match_quality text, source_number text, target_number text, brand text, stock_quantity numeric, sale_price numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term TEXT;
BEGIN
    v_term := TRIM(p_search_term);

    IF v_term = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    -- 1. Direct match on part_number
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'exact'::TEXT,
        v_term,
        p.part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND (p.part_number ILIKE '%' || v_term || '%'
        OR p.sku ILIKE '%' || v_term || '%'
        OR p.barcode = v_term)
    GROUP BY p.id

    UNION ALL

    -- 2. Cross-reference matches
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        pcr.match_quality::TEXT,
        v_term,
        p.part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM product_cross_references pcr
    JOIN products p ON p.id = pcr.base_product_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE pcr.company_id = p_company_id
      AND p.status = 'active'
      AND EXISTS (
          SELECT 1 FROM products alt
          WHERE alt.id = pcr.alternative_product_id
            AND (alt.part_number ILIKE '%' || v_term || '%'
              OR alt.sku ILIKE '%' || v_term || '%'
              OR alt.barcode = v_term)
      )
    GROUP BY p.id, pcr.match_quality

    UNION ALL

    -- 3. Alternative numbers match
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'partial'::TEXT,
        v_term,
        p.alternative_numbers,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND p.alternative_numbers ILIKE '%' || v_term || '%'
    GROUP BY p.id

    -- 4. Supplier part number match
    UNION ALL
    SELECT
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'partial'::TEXT,
        v_term,
        sp.supplier_part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM supplier_prices sp
    JOIN products p ON p.id = sp.product_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE sp.company_id = p_company_id
      AND p.status = 'active'
      AND sp.supplier_part_number ILIKE '%' || v_term || '%'
    GROUP BY p.id, sp.supplier_part_number

    ORDER BY match_quality ASC, stock_quantity DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
END;
$function$

-- ===== search_cached_parts =====

CREATE OR REPLACE FUNCTION public.search_cached_parts(p_provider text, p_normalized_number text)
 RETURNS TABLE(normalized_number text, display_number text, manufacturer text, manufacturer_id integer, description text, cached_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT c.normalized_number, c.display_number, c.manufacturer,
           c.manufacturer_id, c.description, c.cached_at
    FROM public.part_catalog_cache c
    WHERE c.provider = p_provider AND c.normalized_number = p_normalized_number
      AND (c.expires_at IS NULL OR c.expires_at > now());
$function$

-- ===== search_cached_xrefs =====

CREATE OR REPLACE FUNCTION public.search_cached_xrefs(p_provider text, p_source_number text)
 RETURNS TABLE(target_number text, target_brand text, confidence integer, match_quality text, evidence text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT x.target_number, x.target_brand, x.confidence, x.match_quality, x.evidence
    FROM public.external_cross_references x
    WHERE x.provider = p_provider AND x.source_number = p_source_number
    ORDER BY x.confidence DESC NULLS LAST LIMIT 50;
$function$

-- ===== search_inventory =====

CREATE OR REPLACE FUNCTION public.search_inventory(p_term text, p_company_id uuid)
 RETURNS TABLE(id uuid, name_ar text, sku text, part_number text, brand text, sale_price numeric, cost_price numeric, stock_quantity numeric, alternative_numbers text, size text, category_name text, image_url text, location text, barcode text, status text, search_score real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_words text[];
    v_word text;
    v_fragment_condition text := '';
BEGIN
    -- Handle exact barcode match quickly
    IF EXISTS (SELECT 1 FROM products AS pb WHERE pb.company_id = p_company_id AND pb.barcode = p_term LIMIT 1) THEN
        RETURN QUERY
        SELECT
            p.id, p.name_ar::text, p.sku::text, p.part_number::text, p.brand::text,
            p.sale_price, p.purchase_price AS cost_price, COALESCE(SUM(ps.quantity), 0) AS stock_quantity,
            p.alternative_numbers::text, p.size::text, pc.name::text AS category_name,
            p.image_url::text, p.location::text, p.barcode::text, p.status::text,
            100.0::real AS search_score
        FROM products p
        LEFT JOIN product_stock ps ON ps.product_id = p.id
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.company_id = p_company_id AND p.barcode = p_term AND p.deleted_at IS NULL
        GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.purchase_price, p.alternative_numbers, p.size, pc.name, p.image_url, p.location, p.barcode, p.status;
        RETURN;
    END IF;

    -- Standard Fuzzy & Fragmented Search
    RETURN QUERY
    SELECT
        p.id, p.name_ar::text, p.sku::text, p.part_number::text, p.brand::text,
        p.sale_price, p.purchase_price AS cost_price, COALESCE(SUM(ps.quantity), 0) AS stock_quantity,
        p.alternative_numbers::text, p.size::text, pc.name::text AS category_name,
        p.image_url::text, p.location::text, p.barcode::text, p.status::text,
        (
            -- Boost exact/prefix matches
            CASE 
                WHEN p.sku ILIKE p_term THEN 5.0
                WHEN p.part_number ILIKE p_term THEN 5.0
                WHEN p.name_ar ILIKE p_term || '%' THEN 3.0
                ELSE 0.0
            END
            +
            -- Add similarity score (0.0 to 1.0)
            similarity(p.global_search_text, p_term)
        )::real AS search_score
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      -- Word similarity allows fragmented searches
      -- (Each word in the term should be found somewhere in the global_search_text)
      AND (
          -- If the term is very short, use ILIKE instead of similarity to avoid discarding it
          (length(p_term) < 3 AND p.global_search_text ILIKE '%' || p_term || '%')
          OR
          (p_term <% p.global_search_text) -- word similarity
          OR
          (p.global_search_text % p_term)  -- standard trigram similarity
          OR
          -- Simple fallback for fragmented words
          (p.global_search_text ILIKE '%' || replace(p_term, ' ', '%') || '%')
      )
    GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.purchase_price, p.alternative_numbers, p.size, pc.name, p.image_url, p.location, p.barcode, p.status, p.global_search_text
    ORDER BY search_score DESC
    LIMIT 200;
END;
$function$

-- ===== search_inventory_paginated =====

CREATE OR REPLACE FUNCTION public.search_inventory_paginated(p_company_id uuid, p_term text, p_limit integer, p_offset integer, p_sort_key text, p_sort_dir text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, company_id uuid, name_ar text, sku text, part_number text, brand text, size text, description text, purchase_price numeric, sale_price numeric, min_stock_level numeric, unit text, image_url text, alternative_numbers text, barcode text, updated_at timestamp with time zone, created_at timestamp with time zone, status text, category_id uuid, category jsonb, stock jsonb, total_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_tokens text[]; v_total integer;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  IF p_term IS NULL OR trim(p_term)='' THEN v_tokens := ARRAY[]::text[];
  ELSE v_tokens := regexp_split_to_array(public.normalize_arabic(trim(p_term)), E'\\s+'); END IF;

  SELECT count(*)::integer INTO v_total FROM public.products p
  WHERE p.company_id=p_company_id AND p.status='active'
    AND (p_branch_id IS NULL OR EXISTS (
      SELECT 1 FROM public.product_stock ps2
      JOIN public.warehouses w2 ON w2.id = ps2.warehouse_id
      WHERE ps2.product_id = p.id AND w2.branch_id = p_branch_id
    ))
    AND (v_tokens = ARRAY[]::text[] OR NOT EXISTS (
      SELECT 1 FROM unnest(v_tokens) AS token WHERE NOT (
        public.normalize_arabic(p.name_ar) LIKE concat('%',token,'%') OR public.normalize_arabic(p.sku) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.part_number) LIKE concat('%',token,'%') OR public.normalize_arabic(p.brand) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.description) LIKE concat('%',token,'%') OR public.normalize_arabic(p.size) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.alternative_numbers) LIKE concat('%',token,'%'))));

  RETURN QUERY
  SELECT p.id, p.company_id, p.name_ar, p.sku, p.part_number, p.brand, p.size, p.description,
    p.purchase_price::numeric, p.sale_price::numeric, p.min_stock_level::numeric, p.unit, p.image_url,
    p.alternative_numbers, p.barcode, p.updated_at, p.created_at, p.status, p.category_id,
    CASE WHEN p.category_id IS NOT NULL THEN jsonb_build_object('id', p.category_id, 'name', pc.name) ELSE NULL END,
    COALESCE(jsonb_agg(jsonb_build_object('quantity', ps.quantity, 'warehouse_id', ps.warehouse_id,
        'warehouses', jsonb_build_object('name_ar', w.name_ar))) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb),
    v_total
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id=p.category_id
  LEFT JOIN public.product_stock ps ON ps.product_id=p.id
  LEFT JOIN public.warehouses w ON w.id=ps.warehouse_id
  WHERE p.company_id=p_company_id AND p.status='active'
    AND (p_branch_id IS NULL OR EXISTS (
      SELECT 1 FROM public.product_stock ps3
      JOIN public.warehouses w3 ON w3.id = ps3.warehouse_id
      WHERE ps3.product_id = p.id AND w3.branch_id = p_branch_id
    ))
    AND (v_tokens = ARRAY[]::text[] OR NOT EXISTS (
      SELECT 1 FROM unnest(v_tokens) AS token WHERE NOT (
        public.normalize_arabic(p.name_ar) LIKE concat('%',token,'%') OR public.normalize_arabic(p.sku) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.part_number) LIKE concat('%',token,'%') OR public.normalize_arabic(p.brand) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.description) LIKE concat('%',token,'%') OR public.normalize_arabic(p.size) LIKE concat('%',token,'%') OR
        public.normalize_arabic(p.alternative_numbers) LIKE concat('%',token,'%'))))
  GROUP BY p.id, pc.name
  ORDER BY
    CASE WHEN p_sort_key='name_ar' AND p_sort_dir='asc' THEN p.name_ar END ASC,
    CASE WHEN p_sort_key='name_ar' AND p_sort_dir='desc' THEN p.name_ar END DESC,
    CASE WHEN p_sort_key='sku' AND p_sort_dir='asc' THEN p.sku END ASC,
    CASE WHEN p_sort_key='sku' AND p_sort_dir='desc' THEN p.sku END DESC,
    CASE WHEN p_sort_key='updated_at' AND p_sort_dir='asc' THEN p.updated_at END ASC,
    CASE WHEN p_sort_key='updated_at' AND p_sort_dir='desc' THEN p.updated_at END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$

-- ===== search_parties =====

CREATE OR REPLACE FUNCTION public.search_parties(p_company_id uuid, p_query text, p_type text DEFAULT 'all'::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, type text, phone text, email text, tax_number text, status text, balance numeric, category_id uuid, category_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.name, p.type, p.phone, p.email, p.tax_number, p.status,
    COALESCE(pb.balance, 0)::numeric AS balance,
    p.category_id,
    pc.name AS category_name
  FROM parties p
  LEFT JOIN party_balances   pb ON pb.party_id   = p.id
  LEFT JOIN party_categories pc ON pc.id         = p.category_id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status     = 'active'
    AND (p_type = 'all' OR p.type = p_type OR p.type = 'both')
    AND (
      p.name        ILIKE '%' || p_query || '%'  OR
      p.phone       ILIKE '%' || p_query || '%'  OR
      p.email       ILIKE '%' || p_query || '%'  OR
      p.tax_number  ILIKE '%' || p_query || '%'  OR
      p.search_vector @@ plainto_tsquery('simple', p_query)
    )
  ORDER BY
    CASE WHEN p.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
    p.name
  LIMIT p_limit;
END;
$function$

-- ===== send_webhook_event =====

CREATE OR REPLACE FUNCTION public.send_webhook_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  webhook_url        text;
  target_company_id  uuid;
  payload            jsonb;
  row_company_id     text;
BEGIN
  -- جلب الإعدادات من متغيرات البيئة بدلاً من تضمينها في الكود
  webhook_url       := current_setting('app.webhook_url', true);
  target_company_id := (current_setting('app.webhook_company_id', true))::uuid;

  -- إذا لم يُعدّ webhook_url فلا ترسل شيئاً
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- فلترة حسب الشركة المحددة إن وُجدت
  row_company_id := row_to_json(NEW)->>'company_id';
  IF row_company_id IS NOT NULL AND target_company_id IS NOT NULL THEN
    IF row_company_id::uuid != target_company_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- إرسال payload مختصر بدون بيانات مالية حساسة
  payload := jsonb_build_object(
    'table',      TG_TABLE_NAME,
    'type',       TG_OP,
    'id',         row_to_json(NEW)->>'id',
    'company_id', row_company_id,
    'timestamp',  now()
  );

  PERFORM net.http_post(
    url     := webhook_url,
    body    := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- لا تُفشل العملية الأصلية بسبب خطأ في الـ webhook
  RETURN NEW;
END;
$function$

-- ===== set_current_timestamp_updated_at =====

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$function$

-- ===== set_updated_by =====

CREATE OR REPLACE FUNCTION public.set_updated_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$

-- ===== set_vin_analyses_updated_at =====

CREATE OR REPLACE FUNCTION public.set_vin_analyses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$function$

-- ===== setup_new_company =====

CREATE OR REPLACE FUNCTION public.setup_new_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id   uuid;
  v_company_name text;
  v_branch_id    uuid;
  v_invitation   record;
  -- معرفات الحسابات الجذرية
  v_id_assets     uuid;
  v_id_liab       uuid;
  v_id_equity     uuid;
  v_id_revenue    uuid;
  v_id_expense    uuid;
BEGIN
  -- 1. Check for pending invitations
  SELECT * INTO v_invitation 
  FROM public.invitations 
  WHERE email = NEW.email AND status = 'pending' 
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    -- Invitation found. Link user to company instead of creating a new one.
    
    -- Update invitation status
    UPDATE public.invitations SET status = 'accepted', updated_at = now() WHERE id = v_invitation.id;

    -- Create profile
    INSERT INTO profiles(id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;

    -- Assign role and branch
    INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
    VALUES (NEW.id, v_invitation.company_id, v_invitation.role, v_invitation.branch_id);

    RETURN NEW;
  END IF;

  -- 2. No invitation found. Create a new company (Existing Logic)
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'شركتي');

  -- إنشاء الشركة
  INSERT INTO companies(name_ar, owner_id, base_currency)
  VALUES (v_company_name, NEW.id, 'SAR')
  RETURNING id INTO v_company_id;

  -- إنشاء الفرع الرئيسي
  INSERT INTO branches(company_id, name, status)
  VALUES (v_company_id, 'الفرع الرئيسي', 'active')
  RETURNING id INTO v_branch_id;

  -- ربط المالك (صاحب الشركة لا يتم ربطه بفرع محدد ليرى كل الفروع، branch_id = null)
  INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
  VALUES (NEW.id, v_company_id, 'owner', null);

  -- إنشاء profile إن لم يكن موجوداً
  INSERT INTO profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  -- مستودع رئيسي مرتبط بالفرع
  INSERT INTO warehouses(company_id, branch_id, name_ar, location, is_primary)
  VALUES (v_company_id, v_branch_id, 'المستودع الرئيسي', 'الرئيسي', true);

  -- ============================================================
  -- شجرة الحسابات مع parent_id صحيح
  -- ============================================================

  -- جذور خمسة
  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'1000','الأصول',        'asset',    true) RETURNING id INTO v_id_assets;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'2000','الخصوم',        'liability',true) RETURNING id INTO v_id_liab;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'3000','حقوق الملكية',  'equity',   true) RETURNING id INTO v_id_equity;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'4000','الإيرادات',     'revenue',  true) RETURNING id INTO v_id_revenue;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'5000','المصروفات',     'expense',  true) RETURNING id INTO v_id_expense;

  -- أصول فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'1010','الصندوق (كاش)',          'asset',false, v_id_assets),
    (v_company_id,'1020','البنك',                   'asset',false, v_id_assets),
    (v_company_id,'1100','المدينون (ذمم العملاء)',  'asset',true,  v_id_assets),
    (v_company_id,'1200','المخزون',                 'asset',true,  v_id_assets),
    (v_company_id,'1300','أصول ثابتة',              'asset',false, v_id_assets);

  -- خصوم فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'2100','الدائنون (ذمم الموردين)',       'liability',true, v_id_liab),
    (v_company_id,'2200','ضريبة القيمة المضافة المستحقة','liability',true, v_id_liab),
    (v_company_id,'2300','قروض وتسهيلات',                 'liability',false,v_id_liab);

  -- حقوق ملكية فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'3100','رأس المال',   'equity',true, v_id_equity),
    (v_company_id,'3200','أرباح مبقاة','equity',true, v_id_equity);

  -- إيرادات فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'4100','إيرادات المبيعات', 'revenue',true, v_id_revenue),
    (v_company_id,'4200','إيرادات الخدمات', 'revenue',false,v_id_revenue),
    (v_company_id,'4300','إيرادات أخرى',    'revenue',false,v_id_revenue);

  -- مصروفات فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'5100','تكلفة البضاعة المباعة','expense',true, v_id_expense),
    (v_company_id,'5200','مصروفات إدارية',       'expense',false,v_id_expense),
    (v_company_id,'5300','مصروفات تشغيلية',      'expense',false,v_id_expense),
    (v_company_id,'5400','رواتب وأجور',           'expense',false,v_id_expense),
    (v_company_id,'5500','إيجارات',               'expense',false,v_id_expense),
    (v_company_id,'5600','مصروفات متنوعة',        'expense',false,v_id_expense);

  -- فئات المصروفات
  INSERT INTO expense_categories(company_id, name, color, is_system) VALUES
    (v_company_id,'رواتب وأجور',      '#ef4444',true),
    (v_company_id,'إيجارات',          '#f97316',true),
    (v_company_id,'كهرباء ومياه',     '#eab308',true),
    (v_company_id,'اتصالات',          '#22c55e',true),
    (v_company_id,'صيانة',            '#3b82f6',true),
    (v_company_id,'نقل ومواصلات',     '#8b5cf6',true),
    (v_company_id,'مصروفات متنوعة',   '#6b7280',true);

  -- سنة مالية افتراضية
  INSERT INTO fiscal_years(company_id, name, start_date, end_date)
  VALUES (
    v_company_id,
    'السنة المالية ' || EXTRACT(YEAR FROM now())::text,
    date_trunc('year', now())::date,
    (date_trunc('year', now()) + interval '1 year' - interval '1 day')::date
  );

  -- معدل ضريبة افتراضي (0% — غير مفعّل حتى يختار المستخدم)
  INSERT INTO tax_rates(company_id, name_ar, name_en, percentage, is_default, is_active)
  VALUES
    (v_company_id, 'بدون ضريبة', 'No Tax',  0,  true,  true),
    (v_company_id, 'ضريبة القيمة المضافة', 'VAT 15%', 15, false, false);

  -- إعدادات الإشعارات الافتراضية
  INSERT INTO messaging_config(
    company_id,
    notify_on_sale, notify_on_purchase,
    notify_on_payment_bond, notify_on_expense,
    notify_on_stock_transfer, notify_on_low_stock
  ) VALUES (
    v_company_id,
    false, false, false, false, false, false
  );

  RETURN NEW;
END;
$function$

-- ===== sync_allow_posting_on_parent_change =====

CREATE OR REPLACE FUNCTION public.sync_allow_posting_on_parent_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.parent_id is not null then
    update public.accounts set allow_posting = false where id = new.parent_id and allow_posting = true;
  end if;
  return new;
end;
$function$

-- ===== sync_journal_entry_lines_soft_delete =====

CREATE OR REPLACE FUNCTION public.sync_journal_entry_lines_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- فقط عند تغيير deleted_at
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    -- Propagate soft-delete to all lines
    UPDATE public.journal_entry_lines
    SET deleted_at = NEW.deleted_at
    WHERE journal_entry_id = NEW.id
      AND deleted_at IS NULL;
      
  ELSIF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    -- Restore all lines
    UPDATE public.journal_entry_lines
    SET deleted_at = NULL
    WHERE journal_entry_id = NEW.id;
  ELSE
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$

-- ===== sync_party_stats_on_invoice_change =====

CREATE OR REPLACE FUNCTION public.sync_party_stats_on_invoice_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_party_id uuid;
BEGIN
  v_party_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.party_id ELSE NEW.party_id END;
  IF v_party_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE public.parties SET
    -- إحصائيات العملاء (فواتير البيع)
    total_invoices_count = (
      SELECT COUNT(*) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'sale'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    total_paid_amount = (
      SELECT COALESCE(SUM(paid_amount), 0) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'sale'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    last_invoice_date = (
      SELECT MAX(issue_date) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'sale'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    -- إحصائيات الموردين (فواتير الشراء)
    total_orders_count = (
      SELECT COUNT(*) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'purchase'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    total_purchases_amount = (
      SELECT COALESCE(SUM(total_amount), 0) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'purchase'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    last_purchase_date = (
      SELECT MAX(issue_date) FROM public.invoices
      WHERE party_id = v_party_id AND type = 'purchase'
        AND status NOT IN ('cancelled','void') AND deleted_at IS NULL
    ),
    updated_at = now()
  WHERE id = v_party_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$

-- ===== sync_product_search_numbers =====

CREATE OR REPLACE FUNCTION public.sync_product_search_numbers(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_prod RECORD;
    v_alt_num TEXT;
BEGIN
    -- Get product
    SELECT * INTO v_prod FROM public.products WHERE id = p_product_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    DELETE FROM public.product_search_numbers WHERE product_id = p_product_id;

    -- Insert PRIMARY part_number
    IF v_prod.part_number IS NOT NULL AND TRIM(v_prod.part_number) <> '' THEN
        INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
        VALUES (v_prod.company_id, v_prod.id, TRIM(v_prod.part_number), public.normalize_oem_v1(v_prod.part_number), 'PRIMARY')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert SKU
    IF v_prod.sku IS NOT NULL AND TRIM(v_prod.sku) <> '' THEN
        INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
        VALUES (v_prod.company_id, v_prod.id, TRIM(v_prod.sku), public.normalize_oem_v1(v_prod.sku), 'SKU')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert BARCODE
    IF v_prod.barcode IS NOT NULL AND TRIM(v_prod.barcode) <> '' THEN
        INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
        VALUES (v_prod.company_id, v_prod.id, TRIM(v_prod.barcode), public.normalize_oem_v1(v_prod.barcode), 'BARCODE')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert ALTERNATIVE_NUMBERS (comma separated)
    IF v_prod.alternative_numbers IS NOT NULL AND TRIM(v_prod.alternative_numbers) <> '' THEN
        FOR v_alt_num IN SELECT unnest(string_to_array(v_prod.alternative_numbers, ',')) LOOP
            v_alt_num := TRIM(v_alt_num);
            IF v_alt_num <> '' THEN
                INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
                VALUES (v_prod.company_id, v_prod.id, v_alt_num, public.normalize_oem_v1(v_alt_num), 'ALTERNATIVE')
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Insert CROSS_REF from product_cross_references (where this product is the alternative)
    INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
    SELECT pcr.company_id, pcr.base_product_id, alt.part_number, public.normalize_oem_v1(alt.part_number), 'CROSS_REF'
    FROM public.product_cross_references pcr
    JOIN public.products alt ON alt.id = pcr.alternative_product_id
    WHERE pcr.base_product_id = p_product_id
      AND alt.part_number IS NOT NULL AND TRIM(alt.part_number) <> ''
    ON CONFLICT DO NOTHING;

END;
$function$

-- ===== test_active_accounts =====

CREATE OR REPLACE FUNCTION public.test_active_accounts(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE res json;
BEGIN
  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT json_agg(row_to_json(a)) INTO res FROM active_accounts a WHERE company_id = p_company_id;
  RETURN res;
END;
$function$

-- ===== trg_incentive_calc_guard =====

CREATE OR REPLACE FUNCTION public.trg_incentive_calc_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_state text;
  v_new_state text;
BEGIN
  SELECT p.state INTO v_period_state
    FROM incentive_periods p WHERE p.id = NEW.period_id;

  -- بعد lock: منع كل التعديلات على السجلات المحمية
  IF v_period_state = 'locked' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'calc_immutable_locked: calculations of locked periods cannot be deleted';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.base_commission IS DISTINCT FROM NEW.base_commission
        OR OLD.bonus_amount IS DISTINCT FROM NEW.bonus_amount
        OR OLD.adjustment_amount IS DISTINCT FROM NEW.adjustment_amount
        OR OLD.deduction_amount IS DISTINCT FROM NEW.deduction_amount
        OR OLD.total_commission IS DISTINCT FROM NEW.total_commission
        OR OLD.gross_sales IS DISTINCT FROM NEW.gross_sales
        OR OLD.net_sales IS DISTINCT FROM NEW.net_sales
        OR OLD.gross_profit IS DISTINCT FROM NEW.gross_profit
        OR OLD.collected_amount IS DISTINCT FROM NEW.collected_amount THEN
        RAISE EXCEPTION 'calc_immutable_locked: result columns of locked-period calculations cannot be modified';
      END IF;
    END IF;
  END IF;

  -- بعد approved/paid/cancelled: منع تعديل النتائج
  IF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_new_state FROM incentive_calculations WHERE id = NEW.id;
    IF v_new_state IN ('approved','paid','cancelled','reversed') THEN
      IF OLD.base_commission IS DISTINCT FROM NEW.base_commission
        OR OLD.bonus_amount IS DISTINCT FROM NEW.bonus_amount
        OR OLD.adjustment_amount IS DISTINCT FROM NEW.adjustment_amount
        OR OLD.deduction_amount IS DISTINCT FROM NEW.deduction_amount
        OR OLD.total_commission IS DISTINCT FROM NEW.total_commission THEN
        RAISE EXCEPTION 'calc_immutable_after_approval: approved results can only change via adjustments';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

-- ===== trg_incentive_lines_period_guard =====

CREATE OR REPLACE FUNCTION public.trg_incentive_lines_period_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_state text;
  v_calc RECORD;
BEGIN
  SELECT c.period_id, p.state INTO v_calc
    FROM incentive_calculations c JOIN incentive_periods p ON p.id = c.period_id
   WHERE c.id = COALESCE(NEW.calculation_id, OLD.calculation_id);

  IF v_calc.state = 'locked' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'lines_immutable_locked: calculation lines of locked periods cannot be deleted';
    END IF;
    RAISE EXCEPTION 'lines_immutable_locked: calculation lines of locked periods cannot be modified';
  END IF;
  RETURN NEW;
END;
$function$

-- ===== trg_incentive_links_period_guard =====

CREATE OR REPLACE FUNCTION public.trg_incentive_links_period_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_state text;
BEGIN
  -- إذا كانت الفاتورة مرتبطة بحساب داخل فترة locked: منع التعديل/الحذف
  SELECT p.state INTO v_period_state
    FROM incentive_calculation_lines l
    JOIN incentive_calculations c ON c.id = l.calculation_id
    JOIN incentive_periods p ON p.id = c.period_id
   WHERE l.invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
   LIMIT 1;
  IF FOUND AND v_period_state = 'locked' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'links_immutable_locked: engineer links for invoices in locked periods cannot be deleted';
    END IF;
    RAISE EXCEPTION 'links_immutable_locked: engineer links for invoices in locked periods cannot be modified';
  END IF;
  RETURN NEW;
END;
$function$

-- ===== trg_incentive_set_updated_at =====

CREATE OR REPLACE FUNCTION public.trg_incentive_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_RELID::regclass::text IN (
    SELECT table_schema||'.'||table_name FROM information_schema.columns WHERE column_name='updated_at'
  ) THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$

-- ===== trg_invoice_soft_delete_propagation =====

CREATE OR REPLACE FUNCTION public.trg_invoice_soft_delete_propagation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        -- Propagate to journal_entries
        UPDATE public.journal_entries
        SET deleted_at = NEW.deleted_at
        WHERE reference_id = NEW.id
          OR (description LIKE '%' || NEW.invoice_number || '%');

        -- Propagate to inventory_transactions
        UPDATE public.inventory_transactions
        SET deleted_at = NEW.deleted_at
        WHERE reference_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$function$

-- ===== trg_set_journal_entry_number =====

CREATE OR REPLACE FUNCTION public.trg_set_journal_entry_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.entry_number IS NULL OR NEW.entry_number = 0 THEN
        NEW.entry_number = get_next_journal_entry_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$function$

-- ===== trg_sync_inventory_stock_on_delete =====

CREATE OR REPLACE FUNCTION public.trg_sync_inventory_stock_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        -- Reverse the stock movement using CORRECT transaction type names
        IF NEW.transaction_type IN ('sales', 'purchase_return') THEN
            -- Was a reduction, ADD back
            UPDATE public.product_stock
            SET quantity = quantity + ABS(NEW.quantity)
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        ELSIF NEW.transaction_type IN ('purchase', 'sales_return') THEN
            -- Was an addition, SUBTRACT back
            UPDATE public.product_stock
            SET quantity = quantity - ABS(NEW.quantity)
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        ELSIF NEW.transaction_type IN ('transfer_out', 'adj_out') THEN
            UPDATE public.product_stock
            SET quantity = quantity + ABS(NEW.quantity)
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        ELSIF NEW.transaction_type IN ('transfer_in', 'adj_in', 'initial') THEN
            UPDATE public.product_stock
            SET quantity = quantity - ABS(NEW.quantity)
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$

-- ===== trg_sync_product_search_numbers =====

CREATE OR REPLACE FUNCTION public.trg_sync_product_search_numbers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_alt_num TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- Clear existing search numbers for this product
    DELETE FROM public.product_search_numbers WHERE product_id = NEW.id;

    -- Insert PRIMARY part_number
    IF NEW.part_number IS NOT NULL AND TRIM(NEW.part_number) <> '' THEN
        INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
        VALUES (NEW.company_id, NEW.id, TRIM(NEW.part_number), public.normalize_oem_v1(NEW.part_number), 'PRIMARY')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert SKU
    IF NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' THEN
        INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
        VALUES (NEW.company_id, NEW.id, TRIM(NEW.sku), public.normalize_oem_v1(NEW.sku), 'SKU')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert BARCODE
    IF NEW.barcode IS NOT NULL AND TRIM(NEW.barcode) <> '' THEN
        INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
        VALUES (NEW.company_id, NEW.id, TRIM(NEW.barcode), public.normalize_oem_v1(NEW.barcode), 'BARCODE')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert ALTERNATIVE_NUMBERS (comma separated)
    IF NEW.alternative_numbers IS NOT NULL AND TRIM(NEW.alternative_numbers) <> '' THEN
        FOR v_alt_num IN SELECT unnest(string_to_array(NEW.alternative_numbers, ',')) LOOP
            v_alt_num := TRIM(v_alt_num);
            IF v_alt_num <> '' THEN
                INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
                VALUES (NEW.company_id, NEW.id, v_alt_num, public.normalize_oem_v1(v_alt_num), 'ALTERNATIVE')
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Note: Cross refs are handled elsewhere or asynchronously, but since this is a row trigger on products, 
    -- we can query product_cross_references safely.
    INSERT INTO public.product_search_numbers (company_id, product_id, original_number, normalized_number, number_type)
    SELECT pcr.company_id, pcr.base_product_id, alt.part_number, public.normalize_oem_v1(alt.part_number), 'CROSS_REF'
    FROM public.product_cross_references pcr
    JOIN public.products alt ON alt.id = pcr.alternative_product_id
    WHERE pcr.base_product_id = NEW.id
      AND alt.part_number IS NOT NULL AND TRIM(alt.part_number) <> ''
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$function$

-- ===== trg_update_product_stock =====

CREATE OR REPLACE FUNCTION public.trg_update_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qty_change   numeric;
  v_company_id   uuid;
  v_current_qty  numeric;
BEGIN
  SELECT company_id INTO v_company_id FROM products WHERE id = NEW.product_id;

  v_qty_change := CASE NEW.transaction_type
    WHEN 'purchase'        THEN  ABS(NEW.quantity)
    WHEN 'sales_return'    THEN  ABS(NEW.quantity)
    WHEN 'transfer_in'     THEN  ABS(NEW.quantity)
    WHEN 'adj_in'          THEN  ABS(NEW.quantity)
    WHEN 'initial'         THEN  ABS(NEW.quantity)
    WHEN 'sales'           THEN -ABS(NEW.quantity)
    WHEN 'purchase_return' THEN -ABS(NEW.quantity)
    WHEN 'transfer_out'    THEN -ABS(NEW.quantity)
    WHEN 'adj_out'         THEN -ABS(NEW.quantity)
    WHEN 'adj'             THEN  NEW.quantity
    ELSE 0
  END;

  IF v_qty_change = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(quantity, 0) INTO v_current_qty
  FROM product_stock
  WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

  IF v_qty_change < 0 AND COALESCE(v_current_qty, 0) + v_qty_change < 0 THEN
    RAISE EXCEPTION 'مخزون غير كافٍ للمنتج: المتاح=%, المطلوب=%',
      COALESCE(v_current_qty, 0), ABS(v_qty_change);
  END IF;

  INSERT INTO product_stock(product_id, warehouse_id, quantity, company_id, updated_by)
  VALUES (NEW.product_id, NEW.warehouse_id,
          CASE WHEN v_qty_change >= 0 THEN v_qty_change ELSE 0 END,
          v_company_id, NEW.created_by)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity   = product_stock.quantity + v_qty_change,
    updated_at = now(),
    updated_by = NEW.created_by;

  RETURN NEW;
END;
$function$

-- ===== trigger_set_updated_at =====

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

-- ===== update_invoice_status_on_payment =====

CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- تحديث حالة الفاتورة بعد تغيير paid_amount
  UPDATE invoices
  SET 
    status = CASE
      WHEN paid_amount <= 0 THEN 
        CASE WHEN status IN ('paid','partially_paid') THEN 'unpaid' ELSE status END
      WHEN paid_amount >= total_amount - 0.01 THEN 'paid'
      WHEN paid_amount > 0 THEN 'partially_paid'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id
    AND status NOT IN ('draft','cancelled','void');
  
  RETURN NEW;
END;
$function$

-- ===== update_invoice_totals_from_items =====

CREATE OR REPLACE FUNCTION public.update_invoice_totals_from_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.invoices SET
    subtotal        = (SELECT ROUND(COALESCE(SUM(quantity * unit_price - discount_amount), 0), 2) FROM public.invoice_items WHERE invoice_id = v_invoice_id),
    tax_amount      = (SELECT ROUND(COALESCE(SUM(tax_amount), 0), 2) FROM public.invoice_items WHERE invoice_id = v_invoice_id),
    discount_amount = (SELECT ROUND(COALESCE(SUM(discount_amount), 0), 2) FROM public.invoice_items WHERE invoice_id = v_invoice_id),
    total_amount    = (SELECT ROUND(COALESCE(SUM(total), 0), 2) FROM public.invoice_items WHERE invoice_id = v_invoice_id)
  WHERE id = v_invoice_id;
  RETURN NEW;
END;
$function$

-- ===== update_party_search_vector =====

CREATE OR REPLACE FUNCTION public.update_party_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B');
  RETURN NEW;
END;
$function$

-- ===== update_prc_timestamp =====

CREATE OR REPLACE FUNCTION public.update_prc_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$

-- ===== update_product_search_vector =====

CREATE OR REPLACE FUNCTION public.update_product_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    COALESCE(NEW.name_ar,'') || ' ' ||
    COALESCE(NEW.sku,'') || ' ' ||
    COALESCE(NEW.part_number,'') || ' ' ||
    COALESCE(NEW.brand,'') || ' ' ||
    COALESCE(NEW.barcode,'') || ' ' ||
    COALESCE(NEW.alternative_numbers,'')
  );
  RETURN NEW;
END;
$function$

-- ===== update_quotation_updated_at =====

CREATE OR REPLACE FUNCTION public.update_quotation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$function$

-- ===== update_sys_job_queue_timestamp =====

CREATE OR REPLACE FUNCTION public.update_sys_job_queue_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$

-- ===== update_sys_job_types_timestamp =====

CREATE OR REPLACE FUNCTION public.update_sys_job_types_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$

-- ===== update_updated_at_column =====

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$

-- ===== user_can_manage_debts =====

CREATE OR REPLACE FUNCTION public.user_can_manage_debts()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT public.get_user_role() IN ('admin', 'manager', 'accountant');
$function$

-- ===== user_has_company_access =====

CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
  );
END;
$function$

-- ===== user_is_admin_or_manager =====

CREATE OR REPLACE FUNCTION public.user_is_admin_or_manager()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN public.get_user_role() IN ('admin', 'manager', 'owner');
END;
$function$

-- ===== validate_data_integrity =====

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
END;$function$

-- ===== validate_journal_entry_balance =====

CREATE OR REPLACE FUNCTION public.validate_journal_entry_balance(p_journal_entry_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_debit numeric;
    v_credit numeric;
BEGIN
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO v_debit, v_credit
    FROM public.journal_entry_lines
    WHERE journal_entry_id = p_journal_entry_id;

    IF v_debit != v_credit THEN
        RAISE EXCEPTION 'Journal entry lines are not balanced. Debit: %, Credit: %', v_debit, v_credit;
    END IF;
    
    RETURN TRUE;
END;
$function$

-- ===== validate_payment_allocation_company =====

CREATE OR REPLACE FUNCTION public.validate_payment_allocation_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_company uuid;
  v_invoice_company uuid;
BEGIN
  SELECT company_id INTO v_payment_company FROM public.payments WHERE id = NEW.payment_id;
  SELECT company_id INTO v_invoice_company FROM public.invoices  WHERE id = NEW.invoice_id;

  IF v_payment_company IS DISTINCT FROM v_invoice_company THEN
    RAISE EXCEPTION 'company_id mismatch: payment=% invoice=%', v_payment_company, v_invoice_company;
  END IF;

  NEW.company_id := v_payment_company;
  RETURN NEW;
END;
$function$

-- ===== verify_company_access =====

CREATE OR REPLACE FUNCTION public.verify_company_access(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT company_id INTO v_user_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NOT NULL AND p_company_id != v_user_company_id THEN
    RAISE EXCEPTION 'Access denied: لا تملك صلاحية الوصول لبيانات هذه الشركة' USING ERRCODE = '42501';
  END IF;
  RETURN v_user_company_id;
END;
$function$

-- ===== verify_invoice_item_total =====

CREATE OR REPLACE FUNCTION public.verify_invoice_item_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.total := ROUND(
    (NEW.quantity * NEW.unit_price) - NEW.discount_amount + NEW.tax_amount, 2
  );
  RETURN NEW;
END;
$function$

-- ===== verify_invoice_paid_amount =====

CREATE OR REPLACE FUNCTION public.verify_invoice_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid; v_total_paid numeric; v_invoice_total numeric;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(pa.amount), 0), i.total_amount INTO v_total_paid, v_invoice_total
  FROM public.invoices i
  LEFT JOIN public.payment_allocations pa ON pa.invoice_id = i.id AND pa.deleted_at IS NULL
  WHERE i.id = v_invoice_id GROUP BY i.total_amount;
  IF v_total_paid > v_invoice_total + 0.001 THEN
    RAISE EXCEPTION 'مبلغ التوزيع (%) يتجاوز إجمالي الفاتورة (%)', v_total_paid, v_invoice_total;
  END IF;
  RETURN NEW;
END;
$function$

-- ===== void_bond =====

CREATE OR REPLACE FUNCTION public.void_bond(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  v_entry_id uuid;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  
  IF v_payment IS NULL OR v_payment.status = 'void' THEN
    RAISE EXCEPTION 'Payment not found or already voided';
  END IF;

  -- Void the payment
  UPDATE public.payments SET status = 'void', updated_at = now() WHERE id = p_payment_id;

  -- Void related journal entries
  UPDATE public.journal_entries SET status = 'void', updated_at = now()
  WHERE reference_type = 'payment' AND reference_id = p_payment_id;
END;
$function$

-- ===== void_expense =====

CREATE OR REPLACE FUNCTION public.void_expense(p_expense_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense RECORD;
  v_new_jes uuid[];
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found: %', p_expense_id; END IF;

  IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_expense.company_id
  ) THEN RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لهذه الشركة'; END IF;

  IF v_expense.status = 'void' THEN RAISE EXCEPTION 'Expense is already voided'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = v_expense.company_id AND CURRENT_DATE BETWEEN start_date AND end_date AND is_closed=false
  ) THEN RAISE EXCEPTION 'لا يمكن إلغاء مصروف في سنة مالية مغلقة'; END IF;

  v_new_jes := public.fn_reverse_journal_entries(
    p_expense_id, ARRAY['expense'], 'expense_void', 'عكس مصروف: ' || v_expense.description || ' - ',
    auth.uid(), v_expense.company_id
  );

  UPDATE expenses SET status = 'void', updated_at = now() WHERE id = p_expense_id;

  RETURN jsonb_build_object('success', true, 'expense_id', p_expense_id, 'reversal_journal_ids', v_new_jes);
END;
$function$

-- ===== void_invoice =====

CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_invoice   RECORD;
  v_new_jes   uuid[];
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found: %', p_invoice_id;
  END IF;
  IF v_invoice.status = 'void' THEN
    RAISE EXCEPTION 'already_void: الفاتورة ملغية مسبقاً';
  END IF;
  IF v_invoice.status = 'draft' THEN
    UPDATE invoices SET status='void', updated_at=now() WHERE id=p_invoice_id;
    RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'note','draft_cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = v_invoice.company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = v_invoice.company_id
      AND CURRENT_DATE BETWEEN start_date AND end_date AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'fiscal_year_closed: لا يمكن إلغاء فاتورة في سنة مالية مغلقة';
  END IF;

  -- عكس حركات المخزون: نفس المستودع الأصلي + نفس التكلفة الأصلية (عبر المساعد الموحّد)
  PERFORM public.fn_reverse_inventory_for_reference(p_invoice_id, ARRAY['invoice'], 'void_invoice');

  -- عكس كل القيود المرتبطة (الفاتورة + أي دفع نقدي مباشر) عبر المساعد الموحّد الوحيد
  v_new_jes := public.fn_reverse_journal_entries(
    p_invoice_id,
    ARRAY['sales_invoice','purchase_invoice','sale_return','purchase_return','receipt_bond','payment_bond'],
    'invoice_void',
    'عكس: ' || v_invoice.invoice_number || ' - ',
    auth.uid(), v_invoice.company_id
  );

  UPDATE invoices SET status = 'void', paid_amount = 0, updated_at = now() WHERE id = p_invoice_id;

  -- حذف ناعم لتخصيصات الدفع (حفاظاً على الأثر المحاسبي بدل الحذف الفعلي)
  UPDATE payment_allocations SET deleted_at = now() WHERE invoice_id = p_invoice_id AND deleted_at IS NULL;

  UPDATE payments
  SET status = 'void', updated_at = now()
  WHERE company_id = v_invoice.company_id AND deleted_at IS NULL AND status != 'void'
    AND id IN (SELECT pa.payment_id FROM payment_allocations pa WHERE pa.invoice_id = p_invoice_id);

  RETURN jsonb_build_object(
    'success', true, 'invoice_id', p_invoice_id, 'invoice_number', v_invoice.invoice_number,
    'reversal_journal_ids', v_new_jes
  );
END;
$function$

