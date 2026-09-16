-- ==============================================================================
-- PREFLIGHT CHECKS FOR MULTI-TENANT ISOLATION
-- Run this script against Staging/Production BEFORE applying constraint fixes.
-- If any of these queries return rows, the data MUST be cleaned/merged first.
-- ==============================================================================

-- 1. Check for prc_suppliers duplicates across companies
-- Currently UNIQUE(supplier_code). It should be UNIQUE(company_id, supplier_code).
-- This query finds supplier codes that exist in multiple companies.
SELECT 
    supplier_code, 
    COUNT(DISTINCT company_id) as company_count,
    array_agg(company_id) as companies,
    array_agg(id) as supplier_ids
FROM public.prc_suppliers
GROUP BY supplier_code
HAVING COUNT(DISTINCT company_id) > 1;

-- 2. Check for duplicate supplier_code within the SAME company 
-- (This shouldn't happen due to the current strict unique constraint, but good for completeness when we change it)
SELECT 
    company_id, 
    supplier_code, 
    COUNT(*) as duplicate_count,
    array_agg(id) as supplier_ids
FROM public.prc_suppliers
GROUP BY company_id, supplier_code
HAVING COUNT(*) > 1;

-- 3. Check for prc_supplier_contracts duplicates across companies
SELECT 
    contract_number, 
    COUNT(DISTINCT company_id) as company_count
FROM public.prc_supplier_contracts
GROUP BY contract_number
HAVING COUNT(DISTINCT company_id) > 1;

-- 4. Check for duplicate contract_number within the SAME company
SELECT 
    company_id, 
    contract_number, 
    COUNT(*) as duplicate_count
FROM public.prc_supplier_contracts
GROUP BY company_id, contract_number
HAVING COUNT(*) > 1;

-- 5. Check product_stock missing company_id relation
-- product_stock currently has UNIQUE(product_id, warehouse_id).
-- We need to ensure that the warehouse and product actually belong to the same company.
SELECT 
    ps.id as stock_id,
    ps.product_id,
    p.company_id as product_company,
    ps.warehouse_id,
    w.company_id as warehouse_company
FROM public.product_stock ps
JOIN public.products p ON ps.product_id = p.id
JOIN public.warehouses w ON ps.warehouse_id = w.id
WHERE p.company_id != w.company_id;

-- 6. Check product_fitment isolation
SELECT 
    pf.product_id,
    p.company_id as product_company,
    pf.vehicle_id
FROM public.product_fitment pf
JOIN public.products p ON pf.product_id = p.id;
-- If vehicles are company-specific, we would join vehicles and check company_id match.
