-- ============================================================
-- BASELINE: views + triggers + RLS policies
-- Generated 2026-08-18 from project zzthamxjxnxzzpswllid (schema-only).
-- ============================================================

-- Views

CREATE OR REPLACE VIEW public.account_balances AS
SELECT jel.account_id,
    jel.company_id,
    COALESCE(sum(jel.debit_amount) - sum(jel.credit_amount), 0::numeric)::numeric(14,2) AS balance
   FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.deleted_at IS NULL AND je.deleted_at IS NULL AND je.status = 'posted'::text
  GROUP BY jel.account_id, jel.company_id;;

CREATE OR REPLACE VIEW public.active_accounts AS
SELECT a.id,
    a.company_id,
    a.code,
    a.name_ar,
    a.name_en,
    a.type AS account_type,
    a.parent_id,
    a.is_active,
    a.is_system,
    a.currency_code,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    COALESCE(b.balance, 0::numeric)::numeric(14,2) AS balance,
    1 AS level
   FROM accounts a
     LEFT JOIN account_balances b ON b.account_id = a.id AND b.company_id = a.company_id
  WHERE a.deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.active_expenses AS
SELECT id,
    company_id,
    category_id,
    voucher_number,
    description,
    amount,
    currency_code,
    exchange_rate,
    expense_date,
    status,
    payment_method,
    is_recurring,
    frequency,
    recurring_end_date,
    created_by,
    created_at,
    updated_at,
    deleted_at
   FROM expenses
  WHERE deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.active_invoices AS
SELECT id,
    company_id,
    party_id,
    invoice_number,
    type,
    status,
    total_amount,
    subtotal,
    tax_amount,
    discount_amount,
    issue_date,
    due_date,
    notes,
    payment_method,
    created_by,
    created_at,
    currency_code,
    exchange_rate,
    paid_amount,
    updated_at,
    deleted_at,
    reference_invoice_id,
    return_reason,
    updated_by,
    fiscal_year_id
   FROM invoices
  WHERE deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.active_journal_entries AS
SELECT id,
    company_id,
    entry_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_by,
    created_at,
    updated_at,
    deleted_at
   FROM journal_entries
  WHERE deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.active_parties AS
SELECT id,
    company_id,
    name,
    type,
    phone,
    email,
    tax_number,
    address,
    status,
    created_at,
    category_id,
    updated_at,
    deleted_at,
    customer_type,
    lead_source,
    birth_date,
    preferred_contact_method,
    credit_limit,
    total_invoices_count,
    total_paid_amount,
    last_contact_date,
    last_invoice_date,
    customer_since,
    loyalty_points,
    satisfaction_score,
    supplier_type,
    commercial_registration,
    payment_terms_days,
    min_order_amount,
    delivery_lead_days,
    is_active_supplier,
    avg_rating,
    total_orders_count,
    total_purchases_amount,
    last_purchase_date,
    search_vector,
    updated_by
   FROM parties
  WHERE deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.active_payments AS
SELECT id,
    company_id,
    party_id,
    payment_number,
    type,
    amount,
    currency_code,
    exchange_rate,
    payment_date,
    payment_method,
    account_id,
    reference_type,
    reference_id,
    notes,
    status,
    created_by,
    created_at,
    updated_at,
    deleted_at
   FROM payments
  WHERE deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.active_products AS
SELECT id,
    company_id,
    name_ar,
    sku,
    part_number,
    brand,
    description,
    size,
    specifications,
    unit,
    purchase_price,
    sale_price,
    cost_price,
    image_url,
    barcode,
    alternative_numbers,
    status,
    created_at,
    updated_at,
    min_stock_level,
    category_id,
    is_kit,
    has_core_charge,
    core_charge_amount,
    deleted_at,
    location,
    updated_by
   FROM products
  WHERE deleted_at IS NULL;;

CREATE OR REPLACE VIEW public.low_stock_alert AS
SELECT ps.company_id,
    ps.product_id,
    p.name_ar AS product_name,
    p.sku,
    p.part_number,
    p.brand,
    p.min_stock_level,
    ps.warehouse_id,
    w.name_ar AS warehouse_name,
    ps.quantity AS current_quantity,
    p.min_stock_level::numeric - ps.quantity AS shortage,
    p.purchase_price,
    p.category_id,
    pc.name AS category_name,
    p.status
   FROM product_stock ps
     JOIN products p ON p.id = ps.product_id
     JOIN warehouses w ON w.id = ps.warehouse_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
  WHERE ps.quantity < p.min_stock_level::numeric AND p.deleted_at IS NULL AND p.status = 'active'::text AND w.deleted_at IS NULL AND w.status = 'active'::text;;

CREATE OR REPLACE VIEW public.party_balances AS
SELECT p.id AS party_id,
    p.company_id,
    p.type,
    COALESCE(sum(
        CASE
            WHEN p.type = 'customer'::text THEN jel.debit_amount - jel.credit_amount
            WHEN p.type = 'supplier'::text THEN jel.credit_amount - jel.debit_amount
            ELSE jel.debit_amount - jel.credit_amount
        END), 0::numeric)::numeric(14,2) AS balance
   FROM parties p
     LEFT JOIN ( SELECT jel2.id,
            jel2.journal_entry_id,
            jel2.account_id,
            jel2.debit_amount,
            jel2.credit_amount,
            jel2.description,
            jel2.currency_code,
            jel2.foreign_amount,
            jel2.exchange_rate,
            jel2.deleted_at,
            jel2.party_id,
            jel2.updated_at,
            jel2.company_id,
            jel2.created_at
           FROM journal_entry_lines jel2
             JOIN journal_entries je ON je.id = jel2.journal_entry_id AND je.status = 'posted'::text AND je.deleted_at IS NULL
             JOIN accounts a ON a.id = jel2.account_id
          WHERE jel2.deleted_at IS NULL AND (a.code = ANY (ARRAY['1100'::text, '2100'::text]))) jel ON jel.party_id = p.id
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, p.company_id, p.type;;

CREATE OR REPLACE VIEW public.party_balances_by_currency AS
SELECT jel.party_id,
    jel.company_id,
    jel.currency_code,
    sum(COALESCE(jel.debit_amount, 0::numeric)) - sum(COALESCE(jel.credit_amount, 0::numeric)) AS balance,
    count(DISTINCT jel.journal_entry_id) AS transaction_count,
    max(je.entry_date) AS last_activity_date
   FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL AND je.status = 'posted'::text
  WHERE jel.deleted_at IS NULL AND jel.party_id IS NOT NULL AND jel.currency_code IS NOT NULL
  GROUP BY jel.party_id, jel.company_id, jel.currency_code;;

CREATE OR REPLACE VIEW public.user_profiles AS
SELECT p.id,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    COALESCE(ucr.role, 'viewer'::text) AS role,
    ucr.company_id,
    ucr.branch_id
   FROM profiles p
     LEFT JOIN user_company_roles ucr ON p.id = ucr.user_id;;

CREATE OR REPLACE VIEW public.vw_income_statement AS
WITH ledger AS (
         SELECT jel.company_id,
            a.type AS account_type,
            a.code AS account_code,
            jel.debit_amount,
            jel.credit_amount
           FROM journal_entry_lines jel
             JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'::text AND je.deleted_at IS NULL
             JOIN accounts a ON a.id = jel.account_id
          WHERE jel.deleted_at IS NULL
        ), agg AS (
         SELECT ledger.company_id,
            sum(
                CASE
                    WHEN ledger.account_type = 'revenue'::text THEN ledger.credit_amount - ledger.debit_amount
                    ELSE 0::numeric
                END) AS total_revenue,
            sum(
                CASE
                    WHEN ledger.account_type = 'expense'::text THEN ledger.debit_amount - ledger.credit_amount
                    ELSE 0::numeric
                END) AS total_expenses,
            sum(
                CASE
                    WHEN ledger.account_type = 'expense'::text AND ledger.account_code = '5100'::text THEN ledger.debit_amount - ledger.credit_amount
                    ELSE 0::numeric
                END) AS total_cogs
           FROM ledger
          GROUP BY ledger.company_id
        )
 SELECT company_id,
    round(total_revenue, 2) AS total_revenue,
    round(total_cogs, 2) AS cogs,
    round(total_revenue - total_cogs, 2) AS gross_profit,
    round(total_expenses - total_cogs, 2) AS operating_expenses,
    round(total_expenses, 2) AS total_expenses_including_cogs,
    round(total_revenue - total_expenses, 2) AS net_profit,
        CASE
            WHEN total_revenue <> 0::numeric THEN round((total_revenue - total_expenses) / total_revenue * 100::numeric, 2)
            ELSE NULL::numeric
        END AS net_margin_pct
   FROM agg;;

CREATE OR REPLACE VIEW public.vw_inventory_summary AS
SELECT ps.company_id,
    p.id AS product_id,
    p.name_ar,
    p.sku,
    sum(ps.quantity) AS total_qty,
    round(
        CASE
            WHEN sum(ps.quantity) > 0::numeric THEN sum(ps.quantity * ps.weighted_avg_cost) / sum(ps.quantity)
            ELSE 0::numeric
        END, 4) AS unit_cost,
    p.sale_price AS unit_price,
    round(sum(ps.quantity * ps.weighted_avg_cost), 2) AS cost_value,
    round(sum(ps.quantity) * p.sale_price, 2) AS sale_value,
    round(
        CASE
            WHEN sum(ps.quantity * ps.weighted_avg_cost) > 0::numeric THEN (sum(ps.quantity) * p.sale_price - sum(ps.quantity * ps.weighted_avg_cost)) / sum(ps.quantity * ps.weighted_avg_cost) * 100::numeric
            ELSE NULL::numeric
        END, 2) AS margin_pct,
    count(DISTINCT ps.warehouse_id) AS warehouse_count
   FROM product_stock ps
     JOIN products p ON p.id = ps.product_id
  WHERE ps.quantity > 0::numeric
  GROUP BY ps.company_id, p.id, p.name_ar, p.sku, p.sale_price;;

CREATE OR REPLACE VIEW public.vw_inventory_valuation AS
SELECT p.id AS product_id,
    p.company_id,
    p.name_ar,
    p.part_number,
    p.cost_price,
    COALESCE(sum(ps.quantity), 0::numeric) AS total_quantity,
    COALESCE(sum(ps.quantity), 0::numeric) * p.cost_price AS total_value
   FROM products p
     LEFT JOIN product_stock ps ON p.id = ps.product_id
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, p.company_id, p.name_ar, p.part_number, p.cost_price;;

CREATE OR REPLACE VIEW public.vw_sys_event_bus_health AS
SELECT company_id,
    count(*) FILTER (WHERE status::text = 'pending'::text) AS pending_events,
    count(*) FILTER (WHERE status::text = 'processing'::text) AS processing_events,
    count(*) FILTER (WHERE status::text = 'failed'::text) AS failed_events,
    count(*) FILTER (WHERE status::text = 'dead_letter'::text) AS dead_letter_events,
    count(*) FILTER (WHERE status::text = 'processed'::text AND occurred_at >= (now() - '24:00:00'::interval)) AS processed_last_24h,
    avg(EXTRACT(epoch FROM processed_at - occurred_at)) FILTER (WHERE status::text = 'processed'::text AND occurred_at >= (now() - '24:00:00'::interval)) AS avg_processing_time_seconds_24h
   FROM sys_domain_events
  GROUP BY company_id;;

CREATE OR REPLACE VIEW public.vw_sys_infrastructure_metrics AS
SELECT ( SELECT count(*) AS count
           FROM sys_job_queue
          WHERE sys_job_queue.status::text = 'pending'::text) AS pending_jobs_queue_depth,
    ( SELECT count(*) AS count
           FROM sys_job_queue
          WHERE sys_job_queue.status::text = 'failed'::text) AS failed_jobs,
    ( SELECT count(*) AS count
           FROM sys_dead_letter_queue) AS dlq_count,
    ( SELECT count(*) AS count
           FROM sys_domain_events
          WHERE sys_domain_events.status::text = 'pending'::text) AS event_lag,
    ( SELECT count(*) AS count
           FROM sys_background_workers
          WHERE sys_background_workers.status::text = 'active'::text AND sys_background_workers.heartbeat_at > (now() - '00:05:00'::interval)) AS active_workers,
    ( SELECT count(*) AS count
           FROM sys_notification_queue
          WHERE sys_notification_queue.status::text = 'failed'::text) AS notification_failures,
    ( SELECT avg(EXTRACT(epoch FROM sys_workflow_instances.updated_at - sys_workflow_instances.created_at)) AS avg
           FROM sys_workflow_instances
          WHERE sys_workflow_instances.status::text = 'completed'::text) AS avg_workflow_duration_seconds;;

CREATE OR REPLACE VIEW public.vw_sys_queue_metrics AS
SELECT job_type,
    count(*) FILTER (WHERE status::text = 'pending'::text) AS pending_jobs,
    count(*) FILTER (WHERE status::text = 'processing'::text) AS processing_jobs,
    count(*) FILTER (WHERE status::text = 'retrying'::text) AS retrying_jobs,
    count(*) FILTER (WHERE status::text = 'failed'::text) AS failed_jobs,
    count(*) FILTER (WHERE status::text = 'dead_letter'::text) AS dead_letter_jobs,
    count(*) FILTER (WHERE status::text = 'completed'::text AND updated_at >= (now() - '24:00:00'::interval)) AS completed_last_24h
   FROM sys_job_queue
  GROUP BY job_type;;

CREATE OR REPLACE VIEW public.vw_sys_workflow_metrics AS
SELECT d.company_id,
    d.name AS workflow_name,
    count(i.instance_id) FILTER (WHERE i.status::text = 'active'::text) AS active_instances,
    count(i.instance_id) FILTER (WHERE i.status::text = 'completed'::text) AS completed_instances,
    count(i.instance_id) FILTER (WHERE i.status::text = 'failed'::text) AS failed_instances,
    count(i.instance_id) FILTER (WHERE i.breached_at IS NOT NULL) AS sla_breaches,
    avg(EXTRACT(epoch FROM i.updated_at - i.created_at)) FILTER (WHERE i.status::text = 'completed'::text) AS avg_duration_seconds
   FROM sys_workflow_definitions d
     LEFT JOIN sys_workflow_instances i ON d.workflow_id = i.workflow_id
  GROUP BY d.company_id, d.name;;

CREATE OR REPLACE VIEW public.vw_trial_balance AS
SELECT a.code,
    a.name_ar,
    a.type AS account_type,
    COALESCE(sum(jel.debit_amount), 0::numeric) AS total_debit,
    COALESCE(sum(jel.credit_amount), 0::numeric) AS total_credit,
    COALESCE(sum(jel.debit_amount), 0::numeric) - COALESCE(sum(jel.credit_amount), 0::numeric) AS net_balance,
    a.company_id
   FROM accounts a
     LEFT JOIN (journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'::text AND je.deleted_at IS NULL) ON jel.account_id = a.id AND jel.deleted_at IS NULL
  WHERE a.deleted_at IS NULL
  GROUP BY a.id, a.code, a.name_ar, a.type, a.company_id
 HAVING COALESCE(sum(jel.debit_amount), 0::numeric) > 0::numeric OR COALESCE(sum(jel.credit_amount), 0::numeric) > 0::numeric;;

-- Triggers

CREATE TRIGGER auto_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION auto_fill_invoice_number();

CREATE TRIGGER auto_payment_number BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION auto_fill_payment_number();

CREATE TRIGGER ensure_invoice_item_total BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION verify_invoice_item_total();

CREATE CONSTRAINT TRIGGER ensure_journal_balance AFTER INSERT OR DELETE OR UPDATE ON public.journal_entry_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();

CREATE TRIGGER on_invoice_change AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION send_webhook_event();

CREATE TRIGGER on_party_change AFTER INSERT OR UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION send_webhook_event();

CREATE TRIGGER on_payment_change AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION send_webhook_event();

CREATE TRIGGER on_product_change AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION send_webhook_event();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_cross_references FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_fitment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.party_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_kit_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.audit_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stock_transfer_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.supported_currencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fiscal_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_company_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.api_rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_supplier_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.messaging_config FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.audit_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notification_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ai_cache BEFORE UPDATE ON public.ai_part_lookup_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_customer_activities BEFORE UPDATE ON public.customer_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_customer_notes BEFORE UPDATE ON public.customer_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_customer_tag_assignments BEFORE UPDATE ON public.customer_tag_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_customer_tags BEFORE UPDATE ON public.customer_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_journal_entries BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_parties BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_product_stock BEFORE UPDATE ON public.product_stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_quotation_items BEFORE UPDATE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_supplier_price_history BEFORE UPDATE ON public.supplier_price_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_supplier_ratings BEFORE UPDATE ON public.supplier_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_tax_rates BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_warehouses BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_after_product_change AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION trg_sync_product_search_numbers();

CREATE TRIGGER trg_archive_supplier_price AFTER UPDATE ON public.product_supplier_prices FOR EACH ROW EXECUTE FUNCTION fn_archive_supplier_price();

CREATE TRIGGER trg_audit_expenses AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_inventory_transactions AFTER INSERT OR DELETE OR UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER trg_audit_invoice_items AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER trg_audit_invoices AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_journal_entries AFTER INSERT OR DELETE OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_parties AFTER INSERT OR DELETE OR UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_prc_purchase_orders AFTER INSERT OR DELETE OR UPDATE ON public.prc_purchase_orders FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_products AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_auto_fiscal_year_invoice BEFORE INSERT OR UPDATE OF issue_date ON public.invoices FOR EACH ROW EXECUTE FUNCTION auto_assign_fiscal_year_to_invoice();

CREATE TRIGGER trg_auto_mark_invoice_paid BEFORE UPDATE ON public.invoices FOR EACH ROW WHEN (((old.paid_amount IS DISTINCT FROM new.paid_amount) OR (old.total_amount IS DISTINCT FROM new.total_amount) OR (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION check_invoice_paid_status();

CREATE TRIGGER trg_auto_post_invoice_journal AFTER INSERT OR UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION fn_auto_post_invoice_journal();

CREATE TRIGGER trg_auto_post_payment_journal AFTER INSERT OR UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_auto_post_payment_journal();

CREATE TRIGGER trg_check_account_circular BEFORE INSERT OR UPDATE OF parent_id ON public.accounts FOR EACH ROW EXECUTE FUNCTION check_account_circular_reference();

CREATE TRIGGER trg_check_account_postable BEFORE INSERT OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION fn_check_journal_line_account_postable();

CREATE TRIGGER trg_check_account_tenant BEFORE INSERT OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION fn_check_journal_line_account_tenant();

CREATE TRIGGER trg_check_entry_tenant BEFORE INSERT OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION fn_check_journal_line_entry_tenant();

CREATE TRIGGER trg_check_fiscal_year_overlap BEFORE INSERT OR UPDATE ON public.fiscal_years FOR EACH ROW EXECUTE FUNCTION fn_check_fiscal_year_overlap();

CREATE TRIGGER trg_check_inventory_transaction_tenant BEFORE INSERT OR UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION fn_check_inventory_transaction_tenant();

CREATE TRIGGER trg_check_invoice_item_product_tenant BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION fn_check_invoice_item_product_tenant();

CREATE TRIGGER trg_check_invoice_party_tenant BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION fn_check_invoice_party_tenant();

CREATE TRIGGER trg_check_party_tenant BEFORE INSERT OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION fn_check_journal_line_party_tenant();

CREATE TRIGGER trg_check_payment_account_tenant BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_check_payment_account_tenant();

CREATE TRIGGER trg_check_payment_party_tenant BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_check_payment_party_tenant();

CREATE TRIGGER trg_generate_entry_number BEFORE INSERT ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION generate_journal_entry_number();

CREATE TRIGGER trg_incentive_calc_guard BEFORE INSERT OR DELETE OR UPDATE ON public.incentive_calculations FOR EACH ROW EXECUTE FUNCTION trg_incentive_calc_guard();

CREATE TRIGGER trg_incentive_lines_period_guard BEFORE INSERT OR DELETE OR UPDATE ON public.incentive_calculation_lines FOR EACH ROW EXECUTE FUNCTION trg_incentive_lines_period_guard();

CREATE TRIGGER trg_incentive_links_period_guard BEFORE DELETE OR UPDATE ON public.incentive_engineer_links FOR EACH ROW EXECUTE FUNCTION trg_incentive_links_period_guard();

CREATE TRIGGER trg_incentive_updated_at_assignments BEFORE UPDATE ON public.incentive_assignments FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_calculations BEFORE UPDATE ON public.incentive_calculations FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_links BEFORE UPDATE ON public.incentive_engineer_links FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_pending BEFORE UPDATE ON public.incentive_pending_invoices FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_periods BEFORE UPDATE ON public.incentive_periods FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_plans BEFORE UPDATE ON public.incentive_plans FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_rules BEFORE UPDATE ON public.incentive_rules FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE TRIGGER trg_incentive_updated_at_targets BEFORE UPDATE ON public.incentive_targets FOR EACH ROW EXECUTE FUNCTION trg_incentive_set_updated_at();

CREATE CONSTRAINT TRIGGER trg_invoice_auto_post_journal AFTER INSERT OR UPDATE OF status ON public.invoices DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_auto_post_invoice_journal();

CREATE TRIGGER trg_invoice_soft_delete_propagation_trigger AFTER UPDATE OF deleted_at ON public.invoices FOR EACH ROW WHEN (((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL))) EXECUTE FUNCTION trg_invoice_soft_delete_propagation();

CREATE TRIGGER trg_journal_entries_immutability BEFORE DELETE OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_modification();

CREATE TRIGGER trg_journal_entry_lines_immutability BEFORE INSERT OR DELETE OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_line_modification();

CREATE TRIGGER trg_prc_evaluation_status_changed_event AFTER UPDATE ON public.prc_rfq_evaluations FOR EACH ROW EXECUTE FUNCTION prc_publish_evaluation_status_changed_event();

CREATE TRIGGER trg_prc_goods_receipt_items_timestamp BEFORE UPDATE ON public.prc_goods_receipt_items FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_goods_receipts_timestamp BEFORE UPDATE ON public.prc_goods_receipts FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_grn_status_changed_event AFTER UPDATE ON public.prc_goods_receipts FOR EACH ROW EXECUTE FUNCTION prc_publish_grn_status_changed_event();

CREATE TRIGGER trg_prc_invoice_status_changed_event AFTER UPDATE ON public.prc_purchase_invoices FOR EACH ROW EXECUTE FUNCTION prc_publish_invoice_status_changed_event();

CREATE TRIGGER trg_prc_po_created_event AFTER INSERT ON public.prc_purchase_orders FOR EACH ROW EXECUTE FUNCTION prc_publish_po_created_event();

CREATE TRIGGER trg_prc_po_status_changed_event AFTER UPDATE ON public.prc_purchase_orders FOR EACH ROW EXECUTE FUNCTION prc_publish_po_status_changed_event();

CREATE TRIGGER trg_prc_pr_created_event AFTER INSERT ON public.prc_purchase_requests FOR EACH ROW EXECUTE FUNCTION prc_publish_pr_created_event();

CREATE TRIGGER trg_prc_pr_status_changed_event AFTER UPDATE ON public.prc_purchase_requests FOR EACH ROW EXECUTE FUNCTION prc_publish_pr_status_changed_event();

CREATE TRIGGER trg_prc_purchase_invoice_items_timestamp BEFORE UPDATE ON public.prc_purchase_invoice_items FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_purchase_invoices_timestamp BEFORE UPDATE ON public.prc_purchase_invoices FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_purchase_order_items_timestamp BEFORE UPDATE ON public.prc_purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_purchase_orders_timestamp BEFORE UPDATE ON public.prc_purchase_orders FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_purchase_request_items_timestamp BEFORE UPDATE ON public.prc_purchase_request_items FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_purchase_requests_timestamp BEFORE UPDATE ON public.prc_purchase_requests FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_quotation_items_timestamp BEFORE UPDATE ON public.prc_quotation_items FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_quotation_status_changed_event AFTER UPDATE ON public.prc_quotations FOR EACH ROW EXECUTE FUNCTION prc_publish_quotation_status_changed_event();

CREATE TRIGGER trg_prc_quotations_timestamp BEFORE UPDATE ON public.prc_quotations FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_rfq_eval_scores_timestamp BEFORE UPDATE ON public.prc_rfq_evaluation_scores FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_rfq_evaluations_timestamp BEFORE UPDATE ON public.prc_rfq_evaluations FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_rfq_items_timestamp BEFORE UPDATE ON public.prc_rfq_items FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_rfq_status_changed_event AFTER UPDATE ON public.prc_rfqs FOR EACH ROW EXECUTE FUNCTION prc_publish_rfq_status_changed_event();

CREATE TRIGGER trg_prc_rfqs_timestamp BEFORE UPDATE ON public.prc_rfqs FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_sla_violation_recorded_event AFTER INSERT ON public.prc_supplier_sla_violations FOR EACH ROW EXECUTE FUNCTION prc_publish_sla_violation_event();

CREATE TRIGGER trg_prc_supplier_contracts_timestamp BEFORE UPDATE ON public.prc_supplier_contracts FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_supplier_created_event AFTER INSERT ON public.prc_suppliers FOR EACH ROW EXECUTE FUNCTION prc_publish_supplier_created_event();

CREATE TRIGGER trg_prc_supplier_products_timestamp BEFORE UPDATE ON public.prc_supplier_products FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_supplier_scores_timestamp BEFORE UPDATE ON public.prc_supplier_scores FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_supplier_slas_timestamp BEFORE UPDATE ON public.prc_supplier_slas FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_supplier_terms_timestamp BEFORE UPDATE ON public.prc_supplier_terms FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prc_suppliers_timestamp BEFORE UPDATE ON public.prc_suppliers FOR EACH ROW EXECUTE FUNCTION update_prc_timestamp();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.product_stock FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.product_kit_items FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.party_categories FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.product_supplier_prices FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.audit_sessions FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.product_fitment FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_company_id_change BEFORE UPDATE ON public.product_cross_references FOR EACH ROW EXECUTE FUNCTION prevent_company_id_change();

CREATE TRIGGER trg_prevent_delete_domain_events BEFORE DELETE ON public.sys_domain_events FOR EACH ROW EXECUTE FUNCTION prevent_sys_domain_events_deletion();

CREATE TRIGGER trg_prevent_delete_sys_activity_log BEFORE DELETE ON public.sys_activity_log FOR EACH ROW EXECUTE FUNCTION prevent_sys_activity_log_modification();

CREATE TRIGGER trg_prevent_inventory_hard_delete BEFORE DELETE ON public.inventory_transactions FOR EACH ROW WHEN ((old.deleted_at IS NULL)) EXECUTE FUNCTION prevent_inventory_hard_delete();

CREATE TRIGGER trg_prevent_invoice_closed_fiscal BEFORE INSERT OR UPDATE OF fiscal_year_id ON public.invoices FOR EACH ROW EXECUTE FUNCTION prevent_invoice_in_closed_fiscal_year();

CREATE TRIGGER trg_prevent_journal_closed_fiscal BEFORE INSERT OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_journal_entry_in_closed_fiscal_year();

CREATE TRIGGER trg_prevent_negative_stock BEFORE UPDATE ON public.product_stock FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock_on_sale();

CREATE TRIGGER trg_prevent_payload_update BEFORE UPDATE ON public.sys_domain_events FOR EACH ROW EXECUTE FUNCTION prevent_sys_domain_events_payload_update();

CREATE TRIGGER trg_prevent_posted_journal_edit BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_edit();

CREATE TRIGGER trg_prevent_system_account_modification BEFORE DELETE OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION prevent_system_account_modification();

CREATE TRIGGER trg_prevent_update_sys_activity_log BEFORE UPDATE ON public.sys_activity_log FOR EACH ROW EXECUTE FUNCTION prevent_sys_activity_log_modification();

CREATE TRIGGER trg_require_inventory_cost BEFORE INSERT OR UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION fn_require_inventory_cost();

CREATE TRIGGER trg_restrict_journal_entry_update BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION restrict_journal_entry_update();

CREATE TRIGGER trg_set_updated_at_accounts BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_set_updated_at_companies BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trg_set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trg_set_updated_at_stock_transfers BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.product_stock FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER trg_sync_allow_posting AFTER INSERT OR UPDATE OF parent_id ON public.accounts FOR EACH ROW EXECUTE FUNCTION sync_allow_posting_on_parent_change();

CREATE TRIGGER trg_sync_journal_lines_delete AFTER UPDATE OF deleted_at ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION sync_journal_entry_lines_soft_delete();

CREATE TRIGGER trg_sync_paid_amount AFTER INSERT OR DELETE OR UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_paid_amount();

CREATE TRIGGER trg_sync_party_stats_invoice AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION sync_party_stats_on_invoice_change();

CREATE TRIGGER trg_update_followup_config BEFORE UPDATE ON public.debt_followup_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_invoice_status AFTER INSERT OR UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION update_invoice_status_on_payment();

CREATE TRIGGER trg_update_invoice_totals AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION update_invoice_totals_from_items();

CREATE TRIGGER trg_update_msg_templates BEFORE UPDATE ON public.debt_message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_opening_balances BEFORE UPDATE ON public.party_opening_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_party_search_vector BEFORE INSERT OR UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION update_party_search_vector();

CREATE TRIGGER trg_update_product_search_vector BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

CREATE TRIGGER trg_update_promises BEFORE UPDATE ON public.debt_payment_promises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_sys_job_queue_timestamp BEFORE UPDATE ON public.sys_job_queue FOR EACH ROW EXECUTE FUNCTION update_sys_job_queue_timestamp();

CREATE TRIGGER trg_update_sys_job_types_timestamp BEFORE UPDATE ON public.sys_job_types FOR EACH ROW EXECUTE FUNCTION update_sys_job_types_timestamp();

CREATE TRIGGER trg_update_weighted_avg_cost AFTER INSERT ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION fn_update_weighted_avg_cost();

CREATE TRIGGER trg_validate_invoice_business_rules BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION fn_validate_invoice_business_rules();

CREATE TRIGGER trg_validate_payment_allocation_company BEFORE INSERT OR UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION validate_payment_allocation_company();

CREATE TRIGGER trg_verify_invoice_paid_amount AFTER INSERT OR DELETE OR UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION verify_invoice_paid_amount();

CREATE TRIGGER trg_vin_analyses_updated_at BEFORE UPDATE ON public.vin_analyses FOR EACH ROW EXECUTE FUNCTION set_vin_analyses_updated_at();

CREATE TRIGGER trigger_audit_accounts_changes AFTER INSERT OR DELETE OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER trigger_quotation_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

CREATE TRIGGER update_inventory_session_drafts_updated_at BEFORE UPDATE ON public.inventory_session_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_stock_trigger AFTER INSERT ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION trg_update_product_stock();

-- RLS policies
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.ai_part_lookup_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage ai cache" ON public.ai_part_lookup_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ai_cache_delete" ON public.ai_part_lookup_cache FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "ai_cache_insert" ON public.ai_part_lookup_cache FOR INSERT TO public WITH CHECK ((is_super_admin() OR (is_global = true) OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "ai_cache_select" ON public.ai_part_lookup_cache FOR SELECT TO public USING ((is_super_admin() OR (is_global = true) OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "ai_cache_update" ON public.ai_part_lookup_cache FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_request_log_service_only" ON public.ai_request_log FOR ALL TO service_role USING (true) WITH CHECK (true);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_logs_delete" ON public.ai_usage_logs FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "ai_usage_logs_insert" ON public.ai_usage_logs FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE (ucr.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "ai_usage_logs_select" ON public.ai_usage_logs FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE (ucr.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "ai_usage_logs_update" ON public.ai_usage_logs FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_rate_limits_all" ON public.api_rate_limits FOR ALL TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_items_delete" ON public.audit_items FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND (get_user_role() = 'admin'::text)));
CREATE POLICY "audit_items_insert" ON public.audit_items FOR INSERT TO authenticated WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "audit_items_select" ON public.audit_items FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "audit_items_update" ON public.audit_items FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_delete" ON public.audit_logs FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "audit_logs_update" ON public.audit_logs FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_archive_delete" ON public.audit_logs_archive FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "audit_logs_archive_insert" ON public.audit_logs_archive FOR INSERT TO public WITH CHECK (is_super_admin());
CREATE POLICY "audit_logs_archive_select" ON public.audit_logs_archive FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "audit_logs_archive_update" ON public.audit_logs_archive FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_sessions_delete" ON public.audit_sessions FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND (get_user_role() = 'admin'::text)));
CREATE POLICY "audit_sessions_insert" ON public.audit_sessions FOR INSERT TO authenticated WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "audit_sessions_select" ON public.audit_sessions FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "audit_sessions_update" ON public.audit_sessions FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
ALTER TABLE public.backup_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON public.backup_configs FOR ALL TO public USING (false);
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON public.backup_logs FOR ALL TO public USING (false);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_delete" ON public.branches FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "branches_insert" ON public.branches FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "branches_select" ON public.branches FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "branches_update" ON public.branches FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.cashboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashboxes_insert" ON public.cashboxes FOR INSERT TO public WITH CHECK (((company_id = get_user_company_id()) AND (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))));
CREATE POLICY "cashboxes_select" ON public.cashboxes FOR SELECT TO public USING ((company_id = get_user_company_id()));
CREATE POLICY "cashboxes_update" ON public.cashboxes FOR UPDATE TO public USING ((company_id = get_user_company_id())) WITH CHECK (((company_id = get_user_company_id()) AND (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))));
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO public USING ((is_super_admin() OR (owner_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO public WITH CHECK ((is_super_admin() OR (( SELECT auth.uid() AS uid) IS NOT NULL)));
CREATE POLICY "companies_select" ON public.companies FOR SELECT TO public USING ((is_super_admin() OR (id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_activities_delete" ON public.customer_activities FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_activities_insert" ON public.customer_activities FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_activities_select" ON public.customer_activities FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_activities_update" ON public.customer_activities FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_notes_delete" ON public.customer_notes FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_notes_insert" ON public.customer_notes FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_notes_select" ON public.customer_notes FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_notes_update" ON public.customer_notes FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_tag_assignments_delete" ON public.customer_tag_assignments FOR DELETE TO public USING ((is_super_admin() OR (customer_id IN ( SELECT parties.id
   FROM parties
  WHERE (parties.company_id IN ( SELECT get_auth_companies() AS get_auth_companies))))));
CREATE POLICY "customer_tag_assignments_insert" ON public.customer_tag_assignments FOR INSERT TO public WITH CHECK ((is_super_admin() OR (customer_id IN ( SELECT parties.id
   FROM parties
  WHERE (parties.company_id IN ( SELECT get_auth_companies() AS get_auth_companies))))));
CREATE POLICY "customer_tag_assignments_select" ON public.customer_tag_assignments FOR SELECT TO public USING ((is_super_admin() OR (customer_id IN ( SELECT parties.id
   FROM parties
  WHERE (parties.company_id IN ( SELECT get_auth_companies() AS get_auth_companies))))));
CREATE POLICY "customer_tag_assignments_update" ON public.customer_tag_assignments FOR UPDATE TO public USING ((is_super_admin() OR (tag_id IN ( SELECT ct.id
   FROM customer_tags ct
  WHERE (ct.company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))))) WITH CHECK ((is_super_admin() OR (tag_id IN ( SELECT ct.id
   FROM customer_tags ct
  WHERE (ct.company_id IN ( SELECT get_auth_companies() AS get_auth_companies))))));
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_tags_delete" ON public.customer_tags FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_tags_insert" ON public.customer_tags FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_tags_select" ON public.customer_tags FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "customer_tags_update" ON public.customer_tags FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.debt_followup_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_manage_followup" ON public.debt_followup_config FOR ALL TO authenticated USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "debt_select_followup" ON public.debt_followup_config FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
ALTER TABLE public.debt_message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_delete_msg_log" ON public.debt_message_log FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "debt_insert_msg_log" ON public.debt_message_log FOR INSERT TO authenticated WITH CHECK ((company_id = get_user_company_id()));
CREATE POLICY "debt_select_msg_log" ON public.debt_message_log FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "debt_update_msg_log" ON public.debt_message_log FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.debt_message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_manage_templates" ON public.debt_message_templates FOR ALL TO authenticated USING (((company_id = get_user_company_id()) AND user_can_manage_debts())) WITH CHECK (((company_id = get_user_company_id()) AND user_can_manage_debts()));
CREATE POLICY "debt_select_templates" ON public.debt_message_templates FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
ALTER TABLE public.debt_payment_promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_delete_promises" ON public.debt_payment_promises FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "debt_insert_promises" ON public.debt_payment_promises FOR INSERT TO authenticated WITH CHECK (((company_id = get_user_company_id()) AND user_can_manage_debts()));
CREATE POLICY "debt_select_promises" ON public.debt_payment_promises FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "debt_update_promises" ON public.debt_payment_promises FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK (((company_id = get_user_company_id()) AND user_can_manage_debts()));
ALTER TABLE public.exchange_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchange_companies_insert" ON public.exchange_companies FOR INSERT TO public WITH CHECK (((company_id = get_user_company_id()) AND (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))));
CREATE POLICY "exchange_companies_select" ON public.exchange_companies FOR SELECT TO public USING ((company_id = get_user_company_id()));
CREATE POLICY "exchange_companies_update" ON public.exchange_companies FOR UPDATE TO public USING ((company_id = get_user_company_id())) WITH CHECK (((company_id = get_user_company_id()) AND (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text]))));
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rates_delete" ON public.exchange_rates FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "exchange_rates_insert" ON public.exchange_rates FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "exchange_rates_select" ON public.exchange_rates FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "exchange_rates_update" ON public.exchange_rates FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_cat_delete" ON public.expense_categories FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "expense_cat_insert" ON public.expense_categories FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "expense_cat_select" ON public.expense_categories FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "expense_cat_update" ON public.expense_categories FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO public WITH CHECK (((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND is_valid_branch(company_id, branch_id)));
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK (((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND is_valid_branch(company_id, branch_id)));
ALTER TABLE public.external_cross_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ext_xref_insert" ON public.external_cross_references FOR INSERT TO authenticated WITH CHECK ((company_id = get_user_company_id()));
CREATE POLICY "ext_xref_select" ON public.external_cross_references FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "ext_xref_select_auth" ON public.external_cross_references FOR SELECT TO authenticated USING (true);
ALTER TABLE public.external_fitment_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ext_fit_insert" ON public.external_fitment_evidence FOR INSERT TO authenticated WITH CHECK ((company_id = get_user_company_id()));
CREATE POLICY "ext_fit_select" ON public.external_fitment_evidence FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "ext_fitment_select_auth" ON public.external_fitment_evidence FOR SELECT TO authenticated USING (true);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags_delete" ON public.feature_flags FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "feature_flags_insert" ON public.feature_flags FOR INSERT TO public WITH CHECK (is_super_admin());
CREATE POLICY "feature_flags_select" ON public.feature_flags FOR SELECT TO public USING ((is_super_admin() OR (( SELECT auth.uid() AS uid) IS NOT NULL)));
CREATE POLICY "feature_flags_update" ON public.feature_flags FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.fin_account_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_account_balances_isolation_policy" ON public.fin_account_balances FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_accounts_isolation_policy" ON public.fin_accounts FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.fin_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_journal_entries_isolation_policy" ON public.fin_journal_entries FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.fin_journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_journal_lines_isolation_policy" ON public.fin_journal_lines FOR ALL TO public USING ((journal_id IN ( SELECT fin_journal_entries.id
   FROM fin_journal_entries
  WHERE (fin_journal_entries.company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid))));
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_years_delete" ON public.fiscal_years FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "fiscal_years_insert" ON public.fiscal_years FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "fiscal_years_select" ON public.fiscal_years FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "fiscal_years_update" ON public.fiscal_years FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.incentive_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adjustments_engineer_own" ON public.incentive_adjustments FOR SELECT TO public USING ((has_permission('commission:view_own'::text) AND (EXISTS ( SELECT 1
   FROM incentive_calculations c
  WHERE ((c.id = incentive_adjustments.calculation_id) AND (c.user_id = auth.uid()))))));
CREATE POLICY "adjustments_role_finance" ON public.incentive_adjustments FOR ALL TO public USING (has_permission('commission:review'::text));
CREATE POLICY "adjustments_role_hr" ON public.incentive_adjustments FOR SELECT TO public USING (has_permission('incentive:view_performance'::text));
CREATE POLICY "adjustments_tenant_restrictive" ON public.incentive_adjustments FOR ALL TO public USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_role_finance" ON public.incentive_assignments FOR SELECT TO public USING ((has_permission('incentive:manage_periods'::text) OR has_permission('commission:view'::text)));
CREATE POLICY "assignments_role_hr" ON public.incentive_assignments FOR ALL TO public USING (has_permission('incentive:manage_assignments'::text));
CREATE POLICY "assignments_role_hr_read" ON public.incentive_assignments FOR SELECT TO public USING (has_permission('incentive:view_performance'::text));
CREATE POLICY "assignments_tenant_isolation" ON public.incentive_assignments FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_calculation_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lines_engineer_own" ON public.incentive_calculation_lines FOR SELECT TO public USING ((has_permission('commission:view_own'::text) AND (EXISTS ( SELECT 1
   FROM incentive_calculations c
  WHERE ((c.id = incentive_calculation_lines.calculation_id) AND (c.user_id = auth.uid()))))));
CREATE POLICY "lines_role_finance" ON public.incentive_calculation_lines FOR ALL TO public USING ((has_permission('commission:calculate'::text) OR has_permission('commission:review'::text)));
CREATE POLICY "lines_role_reports" ON public.incentive_calculation_lines FOR SELECT TO public USING ((has_permission('commission:reports'::text) OR has_permission('commission:view'::text)));
CREATE POLICY "lines_tenant_restrictive" ON public.incentive_calculation_lines FOR ALL TO public USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calculations_engineer_own" ON public.incentive_calculations FOR SELECT TO public USING ((has_permission('commission:view_own'::text) AND (user_id = auth.uid())));
CREATE POLICY "calculations_role_finance" ON public.incentive_calculations FOR ALL TO public USING ((has_permission('commission:calculate'::text) OR has_permission('commission:review'::text) OR has_permission('commission:approve'::text) OR has_permission('commission:pay'::text)));
CREATE POLICY "calculations_role_hr" ON public.incentive_calculations FOR SELECT TO public USING (has_permission('incentive:view_performance'::text));
CREATE POLICY "calculations_tenant_restrictive" ON public.incentive_calculations FOR ALL TO public USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_engineer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links_engineer_own" ON public.incentive_engineer_links FOR SELECT TO public USING ((has_permission('commission:view_own'::text) AND (user_id = auth.uid())));
CREATE POLICY "links_role_assign" ON public.incentive_engineer_links FOR ALL TO public USING ((has_permission('incentive:manage_pending'::text) OR has_permission('incentive:assign_branch'::text)));
CREATE POLICY "links_role_finance" ON public.incentive_engineer_links FOR SELECT TO public USING ((has_permission('commission:calculate'::text) OR has_permission('commission:view'::text)));
CREATE POLICY "links_tenant_isolation" ON public.incentive_engineer_links FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_engineer_own" ON public.incentive_payments FOR SELECT TO public USING ((has_permission('incentive:view_own_payments'::text) AND (user_id = auth.uid())));
CREATE POLICY "payments_role_finance" ON public.incentive_payments FOR ALL TO public USING ((has_permission('commission:pay'::text) OR has_permission('commission:record_payment'::text)));
CREATE POLICY "payments_role_hr" ON public.incentive_payments FOR SELECT TO public USING (has_permission('incentive:view_performance'::text));
CREATE POLICY "payments_tenant_restrictive" ON public.incentive_payments FOR ALL TO public USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_pending_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_role_branch" ON public.incentive_pending_invoices FOR SELECT TO public USING (has_permission('incentive:manage_pending_branch'::text));
CREATE POLICY "pending_role_finance" ON public.incentive_pending_invoices FOR ALL TO public USING (has_permission('incentive:manage_pending'::text));
CREATE POLICY "pending_role_hr" ON public.incentive_pending_invoices FOR SELECT TO public USING (has_permission('incentive:manage_pending'::text));
CREATE POLICY "pending_tenant_isolation" ON public.incentive_pending_invoices FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periods_branch_isolation" ON public.incentive_periods FOR SELECT TO public USING (((NOT has_permission('commission:view_branch'::text)) OR (branch_id = ( SELECT r.branch_id
   FROM user_company_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.branch_id IS NOT NULL))
 LIMIT 1))));
CREATE POLICY "periods_role_finance" ON public.incentive_periods FOR ALL TO public USING (has_permission('incentive:manage_periods'::text));
CREATE POLICY "periods_role_hr" ON public.incentive_periods FOR SELECT TO public USING (has_permission('incentive:view_performance'::text));
CREATE POLICY "periods_tenant_isolation" ON public.incentive_periods FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_admin_bypass" ON public.incentive_plans FOR ALL TO public USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "plans_role_finance" ON public.incentive_plans FOR SELECT TO public USING ((has_permission('incentive:manage_plans'::text) OR has_permission('commission:view'::text)));
CREATE POLICY "plans_role_hr" ON public.incentive_plans FOR SELECT TO public USING (has_permission('incentive:manage_plans'::text));
CREATE POLICY "plans_tenant_isolation" ON public.incentive_plans FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_admin_bypass" ON public.incentive_rules FOR ALL TO public USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "rules_role_read" ON public.incentive_rules FOR SELECT TO public USING ((has_permission('incentive:manage_plans'::text) OR has_permission('commission:view'::text)));
CREATE POLICY "rules_tenant_isolation" ON public.incentive_rules FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "targets_branch_manager" ON public.incentive_targets FOR SELECT TO public USING ((has_permission('incentive:view_targets'::text) AND (target_scope = 'branch'::text) AND (branch_id = ( SELECT r.branch_id
   FROM user_company_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.branch_id IS NOT NULL))
 LIMIT 1))));
CREATE POLICY "targets_engineer_own" ON public.incentive_targets FOR SELECT TO public USING ((has_permission('incentive:view_own_targets'::text) AND (target_scope = 'employee'::text) AND (user_id = auth.uid())));
CREATE POLICY "targets_role_finance" ON public.incentive_targets FOR SELECT TO public USING (has_permission('commission:view'::text));
CREATE POLICY "targets_role_hr" ON public.incentive_targets FOR ALL TO public USING (has_permission('incentive:manage_targets'::text));
CREATE POLICY "targets_tenant_restrictive" ON public.incentive_targets FOR ALL TO public USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.incentive_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers_admin_bypass" ON public.incentive_tiers FOR ALL TO public USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "tiers_role_read" ON public.incentive_tiers FOR SELECT TO public USING ((has_permission('incentive:manage_plans'::text) OR has_permission('commission:view'::text)));
CREATE POLICY "tiers_tenant_isolation" ON public.incentive_tiers FOR ALL TO public USING ((company_id = get_user_company_id()));
ALTER TABLE public.inv_stock_audit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_stock_audit_items_isolation_policy" ON public.inv_stock_audit_items FOR ALL TO public USING ((audit_id IN ( SELECT inv_stock_audits.id
   FROM inv_stock_audits
  WHERE (inv_stock_audits.company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid))));
ALTER TABLE public.inv_stock_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_stock_audits_isolation_policy" ON public.inv_stock_audits FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.inv_stock_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_stock_ledger_isolation_policy" ON public.inv_stock_ledger FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.inv_stock_movement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_stock_movement_items_isolation_policy" ON public.inv_stock_movement_items FOR ALL TO public USING ((movement_id IN ( SELECT inv_stock_movements.id
   FROM inv_stock_movements
  WHERE (inv_stock_movements.company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid))));
ALTER TABLE public.inv_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_stock_movements_isolation_policy" ON public.inv_stock_movements FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.inv_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_warehouses_isolation_policy" ON public.inv_warehouses FOR ALL TO public USING ((company_id = (( SELECT (auth.jwt() ->> 'company_id'::text)))::uuid));
ALTER TABLE public.inventory_session_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_session_drafts_delete" ON public.inventory_session_drafts FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM audit_sessions s
  WHERE ((s.id = inventory_session_drafts.session_id) AND (s.company_id = get_user_company_id()) AND (get_user_role() = 'admin'::text)))));
CREATE POLICY "inventory_session_drafts_insert" ON public.inventory_session_drafts FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM audit_sessions s
  WHERE ((s.id = inventory_session_drafts.session_id) AND (s.company_id = get_user_company_id()) AND user_is_admin_or_manager()))));
CREATE POLICY "inventory_session_drafts_select" ON public.inventory_session_drafts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM audit_sessions s
  WHERE ((s.id = inventory_session_drafts.session_id) AND (s.company_id = get_user_company_id())))));
CREATE POLICY "inventory_session_drafts_update" ON public.inventory_session_drafts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM audit_sessions s
  WHERE ((s.id = inventory_session_drafts.session_id) AND (s.company_id = get_user_company_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM audit_sessions s
  WHERE ((s.id = inventory_session_drafts.session_id) AND (s.company_id = get_user_company_id()) AND user_is_admin_or_manager()))));
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_tx_delete" ON public.inventory_transactions FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "inv_tx_insert" ON public.inventory_transactions FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "inv_tx_select" ON public.inventory_transactions FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "inv_tx_update" ON public.inventory_transactions FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_delete" ON public.invitations FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invitations_insert" ON public.invitations FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invitations_select" ON public.invitations FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invitations_update" ON public.invitations FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_delete" ON public.invoice_items FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invoice_items_insert" ON public.invoice_items FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invoice_items_update" ON public.invoice_items FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO public WITH CHECK (((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND is_valid_branch(company_id, branch_id)));
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entries_delete" ON public.journal_entries FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "journal_entries_insert" ON public.journal_entries FOR INSERT TO public WITH CHECK (((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND is_valid_branch(company_id, branch_id)));
CREATE POLICY "journal_entries_select" ON public.journal_entries FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "journal_entries_update_status_only" ON public.journal_entries FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jel_delete" ON public.journal_entry_lines FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "jel_insert" ON public.journal_entry_lines FOR INSERT TO public WITH CHECK ((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)));
CREATE POLICY "jel_select" ON public.journal_entry_lines FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "jel_update" ON public.journal_entry_lines FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.messaging_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messaging_config_delete" ON public.messaging_config FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "messaging_config_insert" ON public.messaging_config FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "messaging_config_select" ON public.messaging_config FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "messaging_config_update" ON public.messaging_config FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON public.monthly_targets FOR ALL TO public USING (false);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_log_delete" ON public.notification_log FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "notification_log_insert" ON public.notification_log FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "notification_log_select" ON public.notification_log FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "notification_log_update" ON public.notification_log FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.part_catalog_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_cache_insert" ON public.part_catalog_cache FOR INSERT TO authenticated WITH CHECK ((company_id = get_user_company_id()));
CREATE POLICY "catalog_cache_select" ON public.part_catalog_cache FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "part_cache_select_auth" ON public.part_catalog_cache FOR SELECT TO authenticated USING (true);
ALTER TABLE public.part_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "part_compatibility_delete" ON public.part_compatibility FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND (get_user_role() = 'admin'::text)));
CREATE POLICY "part_compatibility_insert" ON public.part_compatibility FOR INSERT TO authenticated WITH CHECK ((company_id = get_user_company_id()));
CREATE POLICY "part_compatibility_select" ON public.part_compatibility FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "part_compatibility_update" ON public.part_compatibility FOR UPDATE TO authenticated USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager())) WITH CHECK (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties_delete" ON public.parties FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "parties_insert" ON public.parties FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "parties_select" ON public.parties FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "parties_update" ON public.parties FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.party_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "party_cat_delete" ON public.party_categories FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "party_cat_insert" ON public.party_categories FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "party_cat_select" ON public.party_categories FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "party_cat_update" ON public.party_categories FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.party_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_delete_opening_balances" ON public.party_opening_balances FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND user_is_admin_or_manager()));
CREATE POLICY "debt_insert_opening_balances" ON public.party_opening_balances FOR INSERT TO authenticated WITH CHECK (((company_id = get_user_company_id()) AND user_can_manage_debts()));
CREATE POLICY "debt_select_opening_balances" ON public.party_opening_balances FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "debt_update_opening_balances" ON public.party_opening_balances FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK (((company_id = get_user_company_id()) AND user_can_manage_debts()));
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_allocations_delete" ON public.payment_allocations FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "payment_allocations_insert" ON public.payment_allocations FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "payment_allocations_select" ON public.payment_allocations FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "payment_allocations_update" ON public.payment_allocations FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_delete" ON public.payments FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO public WITH CHECK (((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND is_valid_branch(company_id, branch_id)));
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.prc_contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_contract_items within company" ON public.prc_contract_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_goods_receipt_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access GRN docs within company" ON public.prc_goods_receipt_documents FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_goods_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access GRN items within company" ON public.prc_goods_receipt_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access GRN within company" ON public.prc_goods_receipts FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Invoice items within company" ON public.prc_purchase_invoice_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Invoices within company" ON public.prc_purchase_invoices FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_order_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access PO docs within company" ON public.prc_purchase_order_documents FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access PO items within company" ON public.prc_purchase_order_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access PO within company" ON public.prc_purchase_orders FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_request_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access PR docs within company" ON public.prc_purchase_request_documents FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access PR items within company" ON public.prc_purchase_request_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access PR within company" ON public.prc_purchase_requests FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_quotation_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Quotation docs within company" ON public.prc_quotation_documents FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Quotation items within company" ON public.prc_quotation_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Quotations within company" ON public.prc_quotations FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_rfq_evaluation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access RFQ Eval items within company" ON public.prc_rfq_evaluation_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_rfq_evaluation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access RFQ Eval scores within company" ON public.prc_rfq_evaluation_scores FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_rfq_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access RFQ Eval within company" ON public.prc_rfq_evaluations FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_rfq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access RFQ items within company" ON public.prc_rfq_items FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_rfq_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access RFQ suppliers within company" ON public.prc_rfq_suppliers FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access RFQ within company" ON public.prc_rfqs FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_addresses within company" ON public.prc_supplier_addresses FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_bank_accounts within company" ON public.prc_supplier_bank_accounts FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_capabilities within company" ON public.prc_supplier_capabilities FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_categories within company" ON public.prc_supplier_categories FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_contacts within company" ON public.prc_supplier_contacts FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_contracts within company" ON public.prc_supplier_contracts FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_documents within company" ON public.prc_supplier_documents FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Supplier Metrics within company" ON public.prc_supplier_metrics FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_prices within company" ON public.prc_supplier_prices FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_products within company" ON public.prc_supplier_products FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_scores within company" ON public.prc_supplier_scores FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_sla_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access SLA Violations within company" ON public.prc_supplier_sla_violations FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_slas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access SLAs within company" ON public.prc_supplier_slas FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_supplier_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_supplier_terms within company" ON public.prc_supplier_terms FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access prc_suppliers within company" ON public.prc_suppliers FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.prc_three_way_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access Three-Way Matches within company" ON public.prc_three_way_matches FOR ALL TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_cat_delete" ON public.product_categories FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_cat_insert" ON public.product_categories FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_cat_select" ON public.product_categories FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_cat_update" ON public.product_categories FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_cross_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcr_delete" ON public.product_cross_references FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pcr_insert" ON public.product_cross_references FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pcr_select" ON public.product_cross_references FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pcr_update" ON public.product_cross_references FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_fitment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pf_delete" ON public.product_fitment FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pf_insert" ON public.product_fitment FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pf_select" ON public.product_fitment FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pf_update" ON public.product_fitment FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pki_delete" ON public.product_kit_items FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pki_insert" ON public.product_kit_items FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pki_select" ON public.product_kit_items FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "pki_update" ON public.product_kit_items FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_search_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_search_numbers_delete" ON public.product_search_numbers FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_search_numbers_insert" ON public.product_search_numbers FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_search_numbers_select" ON public.product_search_numbers FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_search_numbers_update" ON public.product_search_numbers FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_stock_delete" ON public.product_stock FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_stock_insert" ON public.product_stock FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_stock_select" ON public.product_stock FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "product_stock_update" ON public.product_stock FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_supplier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psp_delete" ON public.product_supplier_prices FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "psp_insert" ON public.product_supplier_prices FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "psp_select" ON public.product_supplier_prices FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "psp_update" ON public.product_supplier_prices FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.product_uoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uoms_delete" ON public.product_uoms FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_uoms.product_id) AND (p.company_id = get_user_company_id())))) AND user_is_admin_or_manager()));
CREATE POLICY "uoms_insert" ON public.product_uoms FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_uoms.product_id) AND (p.company_id = get_user_company_id())))) AND user_is_admin_or_manager()));
CREATE POLICY "uoms_select" ON public.product_uoms FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_uoms.product_id) AND (p.company_id = get_user_company_id())))));
CREATE POLICY "uoms_update" ON public.product_uoms FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_uoms.product_id) AND (p.company_id = get_user_company_id())))) AND user_is_admin_or_manager())) WITH CHECK (((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_uoms.product_id) AND (p.company_id = get_user_company_id())))) AND user_is_admin_or_manager()));
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_delete" ON public.products FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "products_insert" ON public.products FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "products_select" ON public.products FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO public WITH CHECK ((is_super_admin() OR (id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO public USING ((is_super_admin() OR (id = ( SELECT auth.uid() AS uid)) OR (id IN ( SELECT ucr2.user_id
   FROM (user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ((ucr1.company_id = ucr2.company_id)))
  WHERE (ucr1.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO public USING ((is_super_admin() OR (id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((is_super_admin() OR (id = ( SELECT auth.uid() AS uid))));
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotation_items_delete" ON public.quotation_items FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "quotation_items_insert" ON public.quotation_items FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "quotation_items_select" ON public.quotation_items FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "quotation_items_update" ON public.quotation_items FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotations_delete" ON public.quotations FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "quotations_insert" ON public.quotations FOR INSERT TO public WITH CHECK (((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND is_valid_branch(company_id, branch_id)));
CREATE POLICY "quotations_select" ON public.quotations FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "quotations_update" ON public.quotations FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_select" ON public.role_permissions FOR SELECT TO authenticated USING ((get_user_role() = 'admin'::text));
ALTER TABLE public.staging_jaafari_import ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staging_jaafari_import_super_admin_all" ON public.staging_jaafari_import FOR ALL TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sti_delete" ON public.stock_transfer_items FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "sti_insert" ON public.stock_transfer_items FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "sti_select" ON public.stock_transfer_items FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "sti_update" ON public.stock_transfer_items FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_transfers_delete" ON public.stock_transfers FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "stock_transfers_insert" ON public.stock_transfers FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "stock_transfers_select" ON public.stock_transfers FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "stock_transfers_update" ON public.stock_transfers FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plans_delete" ON public.subscription_plans FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "subscription_plans_insert" ON public.subscription_plans FOR INSERT TO public WITH CHECK (is_super_admin());
CREATE POLICY "subscription_plans_select" ON public.subscription_plans FOR SELECT TO public USING ((is_super_admin() OR (is_active = true)));
CREATE POLICY "subscription_plans_update" ON public.subscription_plans FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_delete" ON public.super_admins FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "super_admins_insert" ON public.super_admins FOR INSERT TO public WITH CHECK (is_super_admin());
CREATE POLICY "super_admins_select" ON public.super_admins FOR SELECT TO public USING ((is_super_admin() OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "super_admins_update" ON public.super_admins FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_price_history_delete" ON public.supplier_price_history FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "supplier_price_history_insert" ON public.supplier_price_history FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "supplier_price_history_select" ON public.supplier_price_history FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "supplier_price_history_update" ON public.supplier_price_history FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_ratings_delete" ON public.supplier_ratings FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "supplier_ratings_insert" ON public.supplier_ratings FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "supplier_ratings_select" ON public.supplier_ratings FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "supplier_ratings_update" ON public.supplier_ratings FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supported_currencies_delete" ON public.supported_currencies FOR DELETE TO public USING ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = 'owner'::text))))));
CREATE POLICY "supported_currencies_insert" ON public.supported_currencies FOR INSERT TO public WITH CHECK ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));
CREATE POLICY "supported_currencies_select" ON public.supported_currencies FOR SELECT TO public USING (true);
CREATE POLICY "supported_currencies_update" ON public.supported_currencies FOR UPDATE TO public USING ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))) WITH CHECK ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));
ALTER TABLE public.suspended_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON public.suspended_orders FOR ALL TO public USING (false);
ALTER TABLE public.sys_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prevent DELETE on sys_activity_log" ON public.sys_activity_log FOR DELETE TO public USING (false);
CREATE POLICY "Prevent UPDATE on sys_activity_log" ON public.sys_activity_log FOR UPDATE TO public USING (false);
CREATE POLICY "Users can insert activity logs for their company" ON public.sys_activity_log FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can read activity logs from their company" ON public.sys_activity_log FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_background_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read background workers" ON public.sys_background_workers FOR SELECT TO public USING (is_super_admin());
ALTER TABLE public.sys_business_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read calendars for their company" ON public.sys_business_calendars FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_config_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read config for their company" ON public.sys_config_registry FOR SELECT TO public USING (((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)) OR (company_id IS NULL)));
ALTER TABLE public.sys_dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read DLQ for their company" ON public.sys_dead_letter_queue FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_domain_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prevent DELETE on sys_domain_events" ON public.sys_domain_events FOR DELETE TO public USING (false);
CREATE POLICY "Users can read events for their company" ON public.sys_domain_events FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_error_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active error codes" ON public.sys_error_codes FOR SELECT TO public USING ((is_active = true));
ALTER TABLE public.sys_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read feature flags for their company" ON public.sys_feature_flags FOR SELECT TO public USING (((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)) OR (company_id IS NULL)));
ALTER TABLE public.sys_job_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read job archive for their company" ON public.sys_job_archive FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read jobs for their company" ON public.sys_job_queue FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_job_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global read for job types" ON public.sys_job_types FOR SELECT TO public USING (true);
ALTER TABLE public.sys_notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read notifications for their company" ON public.sys_notification_queue FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global read for templates" ON public.sys_notification_templates FOR SELECT TO public USING (true);
ALTER TABLE public.sys_workflow_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read workflow actions" ON public.sys_workflow_actions FOR SELECT TO authenticated USING (true);
ALTER TABLE public.sys_workflow_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflow conditions for their company" ON public.sys_workflow_conditions FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (sys_workflow_transitions t
     JOIN sys_workflow_definitions wd ON ((wd.workflow_id = t.workflow_id)))
  WHERE ((t.transition_id = sys_workflow_conditions.transition_id) AND (wd.company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid))))));
ALTER TABLE public.sys_workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflow definitions for their company" ON public.sys_workflow_definitions FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_workflow_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflow history for their company" ON public.sys_workflow_history FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM sys_workflow_instances wi
  WHERE ((wi.instance_id = sys_workflow_history.instance_id) AND (wi.company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid))))));
ALTER TABLE public.sys_workflow_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflow instances for their company" ON public.sys_workflow_instances FOR SELECT TO public USING ((company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid)));
ALTER TABLE public.sys_workflow_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflow states for their company" ON public.sys_workflow_states FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM sys_workflow_definitions wd
  WHERE ((wd.workflow_id = sys_workflow_states.workflow_id) AND (wd.company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid))))));
ALTER TABLE public.sys_workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read workflow templates" ON public.sys_workflow_templates FOR SELECT TO authenticated USING (true);
ALTER TABLE public.sys_workflow_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflow transitions for their company" ON public.sys_workflow_transitions FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM sys_workflow_definitions wd
  WHERE ((wd.workflow_id = sys_workflow_transitions.workflow_id) AND (wd.company_id = ( SELECT ((auth.jwt() ->> 'company_id'::text))::uuid AS uuid))))));
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_broadcasts_delete" ON public.system_broadcasts FOR DELETE TO public USING (is_super_admin());
CREATE POLICY "system_broadcasts_insert" ON public.system_broadcasts FOR INSERT TO public WITH CHECK (is_super_admin());
CREATE POLICY "system_broadcasts_select" ON public.system_broadcasts FOR SELECT TO public USING ((is_super_admin() OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND (is_active = true))));
CREATE POLICY "system_broadcasts_update" ON public.system_broadcasts FOR UPDATE TO public USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_rates_delete" ON public.tax_rates FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "tax_rates_insert" ON public.tax_rates FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "tax_rates_select" ON public.tax_rates FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "tax_rates_update" ON public.tax_rates FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
ALTER TABLE public.user_company_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_company_roles_delete" ON public.user_company_roles FOR DELETE TO public USING ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'owner'::text))))));
CREATE POLICY "user_company_roles_insert" ON public.user_company_roles FOR INSERT TO public WITH CHECK ((is_super_admin() OR (((role <> 'owner'::text) OR (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'owner'::text))))) AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))));
CREATE POLICY "user_company_roles_select" ON public.user_company_roles FOR SELECT TO public USING ((is_super_admin() OR (user_id = ( SELECT auth.uid() AS uid)) OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "user_company_roles_update" ON public.user_company_roles FOR UPDATE TO public USING ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'owner'::text)))))) WITH CHECK ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'owner'::text))))));
ALTER TABLE public.vehicle_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_products_delete" ON public.vehicle_products FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND (get_user_role() = 'admin'::text)));
CREATE POLICY "vehicle_products_insert" ON public.vehicle_products FOR INSERT TO authenticated WITH CHECK (((company_id = get_user_company_id()) AND (EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = vehicle_products.product_id) AND (p.company_id = get_user_company_id()))))));
CREATE POLICY "vehicle_products_select" ON public.vehicle_products FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "vehicle_products_update" ON public.vehicle_products FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_delete" ON public.vehicles FOR DELETE TO public USING ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = 'owner'::text))))));
CREATE POLICY "vehicles_insert" ON public.vehicles FOR INSERT TO public WITH CHECK ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles_update" ON public.vehicles FOR UPDATE TO public USING ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))) WITH CHECK ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM user_company_roles
  WHERE ((user_company_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_company_roles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));
ALTER TABLE public.vin_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vin_analyses_delete" ON public.vin_analyses FOR DELETE TO authenticated USING (((company_id = get_user_company_id()) AND (get_user_role() = 'admin'::text)));
CREATE POLICY "vin_analyses_insert" ON public.vin_analyses FOR INSERT TO authenticated WITH CHECK ((company_id = get_user_company_id()));
CREATE POLICY "vin_analyses_select" ON public.vin_analyses FOR SELECT TO authenticated USING ((company_id = get_user_company_id()));
CREATE POLICY "vin_analyses_update" ON public.vin_analyses FOR UPDATE TO authenticated USING ((company_id = get_user_company_id())) WITH CHECK ((company_id = get_user_company_id()));
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warehouses_delete" ON public.warehouses FOR DELETE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "warehouses_insert" ON public.warehouses FOR INSERT TO public WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "warehouses_select" ON public.warehouses FOR SELECT TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));
CREATE POLICY "warehouses_update" ON public.warehouses FOR UPDATE TO public USING ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies)))) WITH CHECK ((is_super_admin() OR (company_id IN ( SELECT get_auth_companies() AS get_auth_companies))));

