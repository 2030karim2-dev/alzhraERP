CREATE TABLE public.branch_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    target_branch_id uuid NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT branch_notifications_pkey PRIMARY KEY (id)
);

ALTER TABLE public.branch_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_notifications_select" ON public.branch_notifications FOR SELECT TO public
USING (
  company_id IN (SELECT get_auth_companies())
  AND (target_branch_id IN (SELECT public.get_auth_branches(company_id)))
);

CREATE POLICY "branch_notifications_update" ON public.branch_notifications FOR UPDATE TO public
USING (
  company_id IN (SELECT get_auth_companies())
  AND (target_branch_id IN (SELECT public.get_auth_branches(company_id)))
)
WITH CHECK (
  company_id IN (SELECT get_auth_companies())
  AND (target_branch_id IN (SELECT public.get_auth_branches(company_id)))
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.branch_notifications;

-- Update the RPC to insert into this table instead of pg_notify
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
BEGIN
    SELECT branch_id INTO v_source_branch_id FROM warehouses WHERE id = p_source_warehouse_id AND company_id = p_company_id;
    IF v_source_branch_id IS NULL THEN RAISE EXCEPTION 'Warehouse does not belong to a specific branch or does not exist.'; END IF;
    IF v_source_branch_id = p_seller_branch_id THEN RAISE EXCEPTION 'Not a cross-branch sale.'; END IF;

    v_inv_num_internal := public.generate_invoice_number(p_company_id, 'sale', v_source_branch_id);
    v_inv_num_customer := public.generate_invoice_number(p_company_id, 'sale', p_seller_branch_id);

    INSERT INTO invoices (id, company_id, branch_id, type, party_id, issue_date, due_date, total_amount, status, payment_status, created_by, invoice_number, notes) 
    VALUES (gen_random_uuid(), p_company_id, v_source_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE, 0, 'approved', 'unpaid', p_user_id, v_inv_num_internal || '-INT', 'مبيعات داخلية لفرع آخر') 
    RETURNING id INTO v_internal_sale_id;

    INSERT INTO invoices (id, company_id, branch_id, type, party_id, issue_date, due_date, total_amount, status, payment_status, created_by, invoice_number, notes) 
    VALUES (gen_random_uuid(), p_company_id, p_seller_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE, 0, 'approved', p_payment_type, p_user_id, v_inv_num_customer, 'مبيعات بضاعة من مستودع فرع آخر') 
    RETURNING id INTO v_customer_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity numeric, sale_price numeric)
    LOOP
        SELECT weighted_avg_cost INTO v_cost_price FROM product_stock WHERE product_id = v_item.product_id AND warehouse_id = p_source_warehouse_id;
        IF v_cost_price IS NULL THEN v_cost_price := 0; END IF;

        v_total_cost := v_total_cost + (v_cost_price * v_item.quantity);
        v_total_sale := v_total_sale + (v_item.sale_price * v_item.quantity);

        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal) VALUES (v_internal_sale_id, v_item.product_id, v_item.quantity, v_cost_price, v_cost_price * v_item.quantity);
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal) VALUES (v_customer_sale_id, v_item.product_id, v_item.quantity, v_item.sale_price, v_item.sale_price * v_item.quantity);
        INSERT INTO inventory_transactions (company_id, product_id, warehouse_id, quantity, transaction_type, reference_type, reference_id, unit_cost, created_by) VALUES (p_company_id, v_item.product_id, p_source_warehouse_id, -v_item.quantity, 'sale', 'invoice', v_internal_sale_id, v_cost_price, p_user_id);
    END LOOP;

    UPDATE invoices SET total_amount = v_total_cost WHERE id = v_internal_sale_id;
    UPDATE invoices SET total_amount = v_total_sale WHERE id = v_customer_sale_id;

    INSERT INTO branch_notifications (company_id, target_branch_id, message, type)
    VALUES (p_company_id, v_source_branch_id, 'قام فرع آخر ببيع بضاعة من مستودعكم بقيمة التكلفة: ' || v_total_cost, 'cross_branch_sale');

    RETURN v_customer_sale_id;
END;
$$;
