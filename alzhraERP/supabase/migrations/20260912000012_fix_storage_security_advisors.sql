-- Migration: 20260912000012_fix_storage_security_advisors.sql
-- Description: Fix Supabase Security Advisor warnings:
-- 1. Alter v_storage_policies_by_bucket view to enforce security_invoker = true
-- 2. Alter storage_path_company_id function to set search_path = public, pg_temp

-- 1. Fix Security Definer View
ALTER VIEW IF EXISTS public.v_storage_policies_by_bucket SET (security_invoker = true);

-- 2. Fix Mutable Search Path on storage_path_company_id
ALTER FUNCTION IF EXISTS public.storage_path_company_id(text) SET search_path = public, pg_temp;
