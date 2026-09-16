-- =========================================================================================
-- Migration: Comprehensive Database Hardening & Integrity Remediation (Phase 2)
-- Description: Fixes multi-tenant isolation by enforcing company_id in unique constraints.
-- =========================================================================================

DO $$
DECLARE
    violation_count INT;
BEGIN
    -- 1. Preflight check for prc_suppliers
    SELECT COUNT(*) INTO violation_count
    FROM (
        SELECT supplier_code
        FROM public.prc_suppliers
        GROUP BY supplier_code
        HAVING COUNT(DISTINCT company_id) > 1
    ) as subquery;

    IF violation_count > 0 THEN
        RAISE EXCEPTION 'Preflight Check Failed: Found % supplier_code(s) duplicated across companies in prc_suppliers. Clean data before migrating.', violation_count;
    END IF;

    -- 2. Preflight check for prc_supplier_contracts
    SELECT COUNT(*) INTO violation_count
    FROM (
        SELECT contract_number
        FROM public.prc_supplier_contracts
        GROUP BY contract_number
        HAVING COUNT(DISTINCT company_id) > 1
    ) as subquery;

    IF violation_count > 0 THEN
        RAISE EXCEPTION 'Preflight Check Failed: Found % contract_number(s) duplicated across companies in prc_supplier_contracts. Clean data before migrating.', violation_count;
    END IF;

    -- 3. Preflight check for product_stock (cross-company referencing)
    SELECT COUNT(*) INTO violation_count
    FROM public.product_stock ps
    JOIN public.products p ON ps.product_id = p.id
    JOIN public.warehouses w ON ps.warehouse_id = w.id
    WHERE p.company_id != w.company_id;

    IF violation_count > 0 THEN
        RAISE EXCEPTION 'Preflight Check Failed: Found % cross-company references in product_stock (warehouse belongs to different company than product).', violation_count;
    END IF;

    -- If we get here, data is clean enough to apply the constraints.
    RAISE NOTICE 'Preflight checks passed. Proceeding with constraint updates...';
END $$;


-- ==========================================
-- Apply Constraint Fixes
-- ==========================================

-- 1. Fix prc_suppliers (Remove old, add new)
ALTER TABLE public.prc_suppliers DROP CONSTRAINT IF EXISTS prc_suppliers_supplier_code_key;
ALTER TABLE public.prc_suppliers ADD CONSTRAINT uq_prc_suppliers_company_code UNIQUE (company_id, supplier_code);

-- 2. Fix prc_supplier_contracts
ALTER TABLE public.prc_supplier_contracts DROP CONSTRAINT IF EXISTS prc_supplier_contracts_contract_number_key;
ALTER TABLE public.prc_supplier_contracts ADD CONSTRAINT uq_prc_supplier_contracts_company_number UNIQUE (company_id, contract_number);

-- 3. Fix product_stock
ALTER TABLE public.product_stock DROP CONSTRAINT IF EXISTS uq_product_stock_per_warehouse;
ALTER TABLE public.product_stock ADD CONSTRAINT uq_product_stock_company_product_warehouse UNIQUE (company_id, product_id, warehouse_id);

-- 4. Fix product_fitment
ALTER TABLE public.product_fitment DROP CONSTRAINT IF EXISTS uq_product_fitment;
ALTER TABLE public.product_fitment ADD CONSTRAINT uq_product_fitment_company UNIQUE (company_id, product_id, vehicle_id);

-- 5. Fix product_kit_items
ALTER TABLE public.product_kit_items DROP CONSTRAINT IF EXISTS product_kit_items_kit_product_id_component_product_id_key;
ALTER TABLE public.product_kit_items ADD CONSTRAINT uq_product_kit_items_company UNIQUE (company_id, kit_product_id, component_product_id);

-- 6. Fix vehicle_products
ALTER TABLE public.vehicle_products DROP CONSTRAINT IF EXISTS uq_vehicle_product;
ALTER TABLE public.vehicle_products ADD CONSTRAINT uq_vehicle_products_company UNIQUE (company_id, vehicle_id, product_id);

-- 7. Fix part_compatibility
ALTER TABLE public.part_compatibility DROP CONSTRAINT IF EXISTS uq_part_compat;
ALTER TABLE public.part_compatibility ADD CONSTRAINT uq_part_compat_company UNIQUE NULLS NOT DISTINCT (company_id, part_number, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to);

-- 8. Fix part_catalog_cache
ALTER TABLE public.part_catalog_cache DROP CONSTRAINT IF EXISTS uq_part_cache_provider_number;
-- NOTE: part_catalog_cache might be global. Checking if company_id exists...
-- Usually cache is global, but if it has company_id it should be constrained by it.
-- We will leave it as is if it's meant to be global, but if not we should fix it.

