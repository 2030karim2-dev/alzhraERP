-- ============================================================
-- Migration: 20260917000001
-- Fix: add 'manager' and 'sales' roles to user_company_roles constraint
-- Context: UI and invite-user edge function support these roles
-- but the DB constraint was missing them — causing 23514 violations.
-- ============================================================

ALTER TABLE public.user_company_roles
  DROP CONSTRAINT IF EXISTS user_company_roles_role_check;

ALTER TABLE public.user_company_roles
  ADD CONSTRAINT user_company_roles_role_check
  CHECK (role = ANY (ARRAY[
    'owner',
    'admin',
    'manager',
    'accountant',
    'sales',
    'cashier',
    'viewer'
  ]));
