-- Migration: 20260922000001_add_employee_party_type.sql
-- Description: Expand parties_type_check to allow 'employee' and migrate employees in Al-Jaafari company

BEGIN;

-- 1. Drop existing parties_type_check and re-add with 'employee'
ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS parties_type_check;
ALTER TABLE public.parties ADD CONSTRAINT parties_type_check 
  CHECK (type IN ('customer', 'supplier', 'both', 'employee'));

-- 2. Drop existing party_categories_type_check and re-add with 'employee'
ALTER TABLE public.party_categories DROP CONSTRAINT IF EXISTS party_categories_type_check;
ALTER TABLE public.party_categories ADD CONSTRAINT party_categories_type_check 
  CHECK (type IN ('customer', 'supplier', 'employee'));

-- 3. Update the 3 employees in Al-Jaafari company to 'employee'
UPDATE public.parties
SET type = 'employee'
WHERE company_id = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c'
  AND name IN ('الخضر صالح', 'محمد عبدالرقيب', 'محمد الحمادي');

COMMIT;
