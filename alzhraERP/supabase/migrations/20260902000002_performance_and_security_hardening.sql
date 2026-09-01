-- Performance and Security Hardening across Views, Indexes, and Statistics

-- 1. Security Invoker on Public Views
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT c.relname 
            FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE n.nspname = 'public' AND c.relkind = 'v') 
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', r.relname);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 2. High-Performance Composite Indexes for Multi-Tenant ERP Query Paths
CREATE INDEX IF NOT EXISTS idx_products_company_catalog_active 
  ON products (company_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_stock_lookup 
  ON product_stock (product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_parties_company_type_lookup 
  ON parties (company_id, type) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_company_type_date 
  ON invoices (company_id, type, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_bonds_company_type_date 
  ON payments (company_id, type, payment_date DESC);

-- 3. Refresh Query Planner Statistics
ANALYZE products;
ANALYZE product_stock;
ANALYZE warehouses;
ANALYZE branches;
ANALYZE parties;
ANALYZE invoices;
ANALYZE invoice_items;
ANALYZE payments;
ANALYZE journal_entries;
ANALYZE journal_entry_lines;
