-- 1. Relax warehouses RLS for cross-branch visibility
DROP POLICY IF EXISTS "warehouses_select" ON public.warehouses;
CREATE POLICY "warehouses_select" ON public.warehouses FOR SELECT TO public 
USING (
  is_super_admin() 
  OR company_id IN (SELECT get_auth_companies())
);

-- 2. Create the Cross-Branch Sale RPC
CREATE OR REPLACE FUNCTION public.fn_process_cross_branch_sale(
    p_company_id uuid,
    p_seller_branch_id uuid,
    p_source_warehouse_id uuid,
    p_customer_id uuid,
    p_items jsonb, -- Array of objects: {product_id, quantity, sale_price}
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
    v_internal_purchase_id uuid;
    v_customer_sale_id uuid;
    v_total_cost numeric := 0;
    v_total_sale numeric := 0;
    v_inv_num_internal text;
    v_inv_num_customer text;
BEGIN
    -- 1. Identify Source Branch
    SELECT branch_id INTO v_source_branch_id 
    FROM warehouses 
    WHERE id = p_source_warehouse_id AND company_id = p_company_id;
    
    IF v_source_branch_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse does not belong to a specific branch or does not exist.';
    END IF;

    IF v_source_branch_id = p_seller_branch_id THEN
        RAISE EXCEPTION 'Not a cross-branch sale. Source and Seller branches are the same.';
    END IF;

    -- 2. Generate Invoice Numbers
    v_inv_num_internal := public.generate_invoice_number(p_company_id, 'sale', v_source_branch_id);
    v_inv_num_customer := public.generate_invoice_number(p_company_id, 'sale', p_seller_branch_id);

    -- 3. Create Internal Sale Invoice (Source Branch -> Seller Branch @ Cost)
    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, payment_status, created_by, invoice_number, notes
    ) VALUES (
        gen_random_uuid(), p_company_id, v_source_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE,
        0, 'approved', 'unpaid', p_user_id, v_inv_num_internal || '-INT', 'مبيعات داخلية لفرع آخر'
    ) RETURNING id INTO v_internal_sale_id;

    -- 4. Create Customer Sale Invoice (Seller Branch -> Customer @ Sale Price)
    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, payment_status, created_by, invoice_number, notes
    ) VALUES (
        gen_random_uuid(), p_company_id, p_seller_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE,
        0, 'approved', p_payment_type, p_user_id, v_inv_num_customer, 'مبيعات بضاعة من مستودع فرع آخر'
    ) RETURNING id INTO v_customer_sale_id;

    -- 5. Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity numeric, sale_price numeric)
    LOOP
        -- Get Cost Price from Source Warehouse
        SELECT weighted_avg_cost INTO v_cost_price 
        FROM product_stock 
        WHERE product_id = v_item.product_id AND warehouse_id = p_source_warehouse_id;

        IF v_cost_price IS NULL THEN v_cost_price := 0; END IF;

        v_total_cost := v_total_cost + (v_cost_price * v_item.quantity);
        v_total_sale := v_total_sale + (v_item.sale_price * v_item.quantity);

        -- Add to Internal Sale (At Cost)
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal)
        VALUES (v_internal_sale_id, v_item.product_id, v_item.quantity, v_cost_price, v_cost_price * v_item.quantity);

        -- Add to Customer Sale (At Sale Price)
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal)
        VALUES (v_customer_sale_id, v_item.product_id, v_item.quantity, v_item.sale_price, v_item.sale_price * v_item.quantity);

        -- Deduct Inventory from Source Warehouse
        INSERT INTO inventory_transactions (company_id, product_id, warehouse_id, quantity, transaction_type, reference_type, reference_id, unit_cost, created_by)
        VALUES (p_company_id, v_item.product_id, p_source_warehouse_id, -v_item.quantity, 'sale', 'invoice', v_internal_sale_id, v_cost_price, p_user_id);
    END LOOP;

    -- Update Invoice Totals
    UPDATE invoices SET total_amount = v_total_cost WHERE id = v_internal_sale_id;
    UPDATE invoices SET total_amount = v_total_sale WHERE id = v_customer_sale_id;

    -- 6. Emit Notification via pg_notify for Realtime
    PERFORM pg_notify(
        'branch_notifications',
        json_build_object(
            'company_id', p_company_id,
            'target_branch_id', v_source_branch_id,
            'message', 'تم بيع بضاعة من مستودعكم لصالح فرع آخر بقيمة التكلفة: ' || v_total_cost,
            'type', 'cross_branch_sale'
        )::text
    );

    RETURN v_customer_sale_id;
END;
$$;
