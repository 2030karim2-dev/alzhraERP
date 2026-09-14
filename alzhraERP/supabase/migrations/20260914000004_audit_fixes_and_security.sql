-- 1. Fix report_debt_aging to filter out draft/void/cancelled invoices
CREATE OR REPLACE FUNCTION public.report_debt_aging(p_company_id uuid)
 RETURNS TABLE(customer_name text, total numeric, days_0_30 numeric, days_31_60 numeric, days_61_90 numeric, days_90_plus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT
    COALESCE(pr.name, 'غير محدد') as customer_name,
    SUM(public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)) as total,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_0_30,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_31_60,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_90_plus
  FROM public.invoices i
  LEFT JOIN public.parties pr ON pr.id = i.party_id
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('posted', 'paid', 'partially_paid') -- [BUG FIX] Filter out draft and void/cancelled invoices
  GROUP BY COALESCE(pr.name, 'غير محدد')
  HAVING SUM(public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)) > 0
  ORDER BY customer_name;
END;
$function$;

-- 2. Harden fn_process_cross_branch_sale with deep audit fixes
CREATE OR REPLACE FUNCTION public.fn_process_cross_branch_sale(
    p_company_id uuid,
    p_seller_branch_id uuid,
    p_source_warehouse_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_payment_type text,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source_branch_id uuid;
    v_item record;
    v_cost_price numeric;
    v_internal_sale_id uuid;
    v_customer_sale_id uuid;
    v_total_cost numeric := 0;
    v_total_sale numeric := 0;
    v_inv_num_internal text;
    v_inv_num_customer text;
    v_acc_interbranch uuid;
    v_acc_inventory uuid;
    v_je_out_id uuid;
    v_je_in_id uuid;
    v_real_user_id uuid;
BEGIN
    -- [SECURITY FIX 1] Check User Impersonation
    v_real_user_id := auth.uid();
    IF p_user_id != v_real_user_id THEN
        RAISE EXCEPTION 'Unauthorized: User ID mismatch';
    END IF;

    -- [SECURITY FIX 2] Assert Company Access (Tenant Isolation)
    PERFORM public.fn_assert_company_access(p_company_id);

    -- [SECURITY FIX 3] Verify Seller Branch belongs to the company
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = p_seller_branch_id AND company_id = p_company_id) THEN
        RAISE EXCEPTION 'Unauthorized: Seller branch does not belong to the specified company';
    END IF;

    -- 1. Identify Source Branch
    SELECT branch_id INTO v_source_branch_id 
    FROM public.warehouses 
    WHERE id = p_source_warehouse_id AND company_id = p_company_id;
    
    IF v_source_branch_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse does not belong to a specific branch or does not exist.';
    END IF;

    IF v_source_branch_id = p_seller_branch_id THEN
        RAISE EXCEPTION 'Not a cross-branch sale. Source and Seller branches are the same.';
    END IF;

    -- Get Accounts
    SELECT id INTO v_acc_interbranch FROM public.accounts WHERE company_id = p_company_id AND code = '3300' LIMIT 1;
    SELECT id INTO v_acc_inventory FROM public.accounts WHERE company_id = p_company_id AND code = '1200' LIMIT 1;
    
    IF v_acc_interbranch IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'Required accounts (3300 Inter-branch or 1200 Inventory) are missing.';
    END IF;

    -- 2. Generate Invoice Numbers
    v_inv_num_internal := public.generate_invoice_number(p_company_id, 'sale', v_source_branch_id);
    v_inv_num_customer := public.generate_invoice_number(p_company_id, 'sale', p_seller_branch_id);

    -- 3. Create Internal Sale Invoice (Source Branch -> Seller Branch @ Cost)
    -- [DATA INTEGRITY FIX 4] Set party_id to NULL to decouple from customer debt aging
    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, payment_status, created_by, invoice_number, notes
    ) VALUES (
        gen_random_uuid(), p_company_id, v_source_branch_id, 'sale', NULL, CURRENT_DATE, CURRENT_DATE,
        0, 'approved', 'unpaid', p_user_id, v_inv_num_internal || '-INT', 'مبيعات داخلية لفرع آخر'
    ) RETURNING id INTO v_internal_sale_id;

    -- 4. Create Customer Sale Invoice (Seller Branch -> Customer @ Sale Price)
    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, payment_status, created_by, invoice_number, notes, payment_method
    ) VALUES (
        gen_random_uuid(), p_company_id, p_seller_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE,
        0, 'draft', p_payment_type, p_user_id, v_inv_num_customer, 'مبيعات بضاعة من مستودع فرع آخر', p_payment_type
    ) RETURNING id INTO v_customer_sale_id;

    -- 5. Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity numeric, sale_price numeric)
    LOOP
        SELECT weighted_avg_cost INTO v_cost_price 
        FROM product_stock 
        WHERE product_id = v_item.product_id AND warehouse_id = p_source_warehouse_id;

        IF v_cost_price IS NULL THEN v_cost_price := 0; END IF;

        v_total_cost := v_total_cost + (v_cost_price * v_item.quantity);
        v_total_sale := v_total_sale + (v_item.sale_price * v_item.quantity);

        -- Add to Internal Sale (At Cost)
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price, subtotal, company_id)
        VALUES (v_internal_sale_id, v_item.product_id, v_item.quantity, v_cost_price, v_cost_price, v_cost_price * v_item.quantity, p_company_id);

        -- Add to Customer Sale (At Sale Price, MUST include cost_price for the auto journal trigger)
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price, subtotal, company_id)
        VALUES (v_customer_sale_id, v_item.product_id, v_item.quantity, v_item.sale_price, v_cost_price, v_item.sale_price * v_item.quantity, p_company_id);

        -- Deduct Inventory from Source Warehouse (Physical deduction)
        INSERT INTO inventory_transactions (company_id, product_id, warehouse_id, quantity, transaction_type, reference_type, reference_id, unit_cost, created_by)
        VALUES (p_company_id, v_item.product_id, p_source_warehouse_id, -v_item.quantity, 'sale', 'invoice', v_internal_sale_id, v_cost_price, p_user_id);
    END LOOP;

    -- Update Invoice Totals
    UPDATE invoices SET total_amount = v_total_cost WHERE id = v_internal_sale_id;
    UPDATE invoices SET total_amount = v_total_sale WHERE id = v_customer_sale_id;
    
    -- Now trigger the journal for the customer sale (Status change from draft -> posted/paid)
    UPDATE invoices SET status = CASE WHEN p_payment_type = 'cash' THEN 'paid' ELSE 'posted' END WHERE id = v_customer_sale_id;

    -- 6. Create Manual Journal Entries for the Inter-Branch Transfer
    IF v_total_cost > 0 THEN
        -- A. Transfer Out (Source Branch)
        INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
        VALUES (p_company_id, v_source_branch_id, CURRENT_DATE, 'cross_branch_transfer', v_internal_sale_id, 'نقل داخلي مباع لفرع آخر', 'posted', p_user_id)
        RETURNING id INTO v_je_out_id;
        
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, description)
        VALUES 
        (v_je_out_id, v_acc_interbranch, p_company_id, v_source_branch_id, v_total_cost, 0, 'استحقاق على فرع آخر'),
        (v_je_out_id, v_acc_inventory, p_company_id, v_source_branch_id, 0, v_total_cost, 'إخراج مخزون للفرع الآخر');
        
        -- B. Transfer In (Seller Branch)
        INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
        VALUES (p_company_id, p_seller_branch_id, CURRENT_DATE, 'cross_branch_transfer', v_internal_sale_id, 'استلام نقل داخلي مباع', 'posted', p_user_id)
        RETURNING id INTO v_je_in_id;
        
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, description)
        VALUES 
        (v_je_in_id, v_acc_inventory, p_company_id, p_seller_branch_id, v_total_cost, 0, 'إدخال مخزون من فرع آخر'),
        (v_je_in_id, v_acc_interbranch, p_company_id, p_seller_branch_id, 0, v_total_cost, 'التزام لفرع آخر');
    END IF;

    -- 7. Emit Notification via pg_notify for Realtime
    PERFORM pg_notify(
        'branch_notifications',
        json_build_object(
            'company_id', p_company_id,
            'source_branch_id', v_source_branch_id,
            'seller_branch_id', p_seller_branch_id,
            'invoice_id', v_customer_sale_id,
            'internal_invoice_id', v_internal_sale_id,
            'total_cost', v_total_cost,
            'total_sale', v_total_sale,
            'type', 'cross_branch_sale'
        )::text
    );

    RETURN v_customer_sale_id;
END;
$$;
