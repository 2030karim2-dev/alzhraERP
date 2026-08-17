-- ============================================================
-- BASELINE: current live schema (extensions/enums/sequences/tables/constraints/indexes)
-- Generated 2026-08-18 from project zzthamxjxnxzzpswllid (schema-only).
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Enum types
CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');
CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');
CREATE TYPE auth.oauth_authorization_status AS ENUM ('pending', 'approved', 'denied', 'expired');
CREATE TYPE auth.oauth_client_type AS ENUM ('public', 'confidential');
CREATE TYPE auth.oauth_registration_type AS ENUM ('dynamic', 'manual');
CREATE TYPE auth.oauth_response_type AS ENUM ('code');
CREATE TYPE auth.one_time_token_type AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');
CREATE TYPE net.request_status AS ENUM ('PENDING', 'SUCCESS', 'ERROR');
CREATE TYPE public.fin_account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE public.fin_journal_status AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
CREATE TYPE public.inv_audit_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.inv_movement_status AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE public.inv_movement_type AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT');
CREATE TYPE public.invoice_status_enum AS ENUM ('draft', 'confirmed', 'paid', 'partially_paid', 'cancelled', 'void');
CREATE TYPE public.party_type_enum AS ENUM ('customer', 'supplier', 'both');
CREATE TYPE public.payment_status_enum AS ENUM ('draft', 'posted', 'void');
CREATE TYPE public.product_status_enum AS ENUM ('active', 'inactive', 'discontinued');
CREATE TYPE realtime.action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');
CREATE TYPE realtime.equality_op AS ENUM ('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'like', 'ilike', 'is', 'match', 'imatch', 'isdistinct');
CREATE TYPE storage.buckettype AS ENUM ('STANDARD', 'ANALYTICS', 'VECTOR');

-- Sequences
CREATE SEQUENCE auth.refresh_tokens_id_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
;
CREATE SEQUENCE cron.jobid_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
;
CREATE SEQUENCE cron.runid_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
;
CREATE SEQUENCE net.http_request_queue_id_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
;
CREATE SEQUENCE public.journal_entry_number_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
;
CREATE SEQUENCE public.staging_jaafari_import_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    NO CYCLE
;
CREATE SEQUENCE realtime.subscription_id_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
;

-- Tables

CREATE TABLE public.accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    code text NOT NULL,
    name_ar text NOT NULL,
    type text NOT NULL,
    parent_id uuid,
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name_en text,
    is_active boolean NOT NULL DEFAULT true,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    updated_by uuid,
    allow_posting boolean NOT NULL DEFAULT true,
CONSTRAINT accounts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_part_lookup_cache (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    part_number text NOT NULL,
    brand text,
    alternatives jsonb DEFAULT '[]'::jsonb,
    image_url text,
    source_sites text[] DEFAULT '{}'::text[],
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    hit_count integer DEFAULT 0,
    company_id uuid,
    is_global boolean NOT NULL DEFAULT false,
CONSTRAINT ai_part_lookup_cache_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_request_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT ai_request_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_usage_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    user_id uuid,
    model text NOT NULL,
    task_type text NOT NULL,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    latency_ms integer DEFAULT 0,
    cost_estimate numeric(10,6) DEFAULT 0,
    is_success boolean DEFAULT true,
    error_type text,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.api_rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT api_rate_limits_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    product_id uuid NOT NULL,
    expected_quantity numeric NOT NULL DEFAULT 0,
    counted_quantity numeric,
    notes text,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
CONSTRAINT audit_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_logs_archive (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT audit_logs_archive_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'active'::text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_by uuid,
CONSTRAINT audit_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.backup_configs (
    company_id uuid NOT NULL,
    auto_backup_enabled boolean NOT NULL DEFAULT false,
    backup_frequency_hours integer NOT NULL DEFAULT 24,
    google_drive_folder_id text,
    last_backup_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT backup_configs_pkey PRIMARY KEY (company_id)
);

CREATE TABLE public.backup_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid,
    backup_type text NOT NULL,
    file_name text,
    file_size_bytes bigint,
    google_drive_link text,
    status text NOT NULL DEFAULT 'success'::text,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT backup_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.branches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT branches_pkey PRIMARY KEY (id)
);

CREATE TABLE public.cashboxes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    name text NOT NULL,
    account_id uuid,
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    is_active boolean NOT NULL DEFAULT true,
    opening_balance numeric NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT cashboxes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name_ar text NOT NULL,
    name_en text,
    tax_number text,
    base_currency text NOT NULL DEFAULT 'SAR'::text,
    owner_id uuid,
    address text,
    phone text,
    logo_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    is_tax_enabled boolean DEFAULT false,
    plan_id uuid,
    trial_ends_at timestamp with time zone,
    subscription_status text DEFAULT 'trial'::text,
CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE public.customer_activities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    activity_type text NOT NULL,
    subject text NOT NULL,
    description text,
    scheduled_at timestamp with time zone,
    completed_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    assigned_to uuid,
    outcome text,
    duration_minutes integer,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
CONSTRAINT customer_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE public.customer_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    note_type text DEFAULT 'general'::text,
    content text NOT NULL,
    is_important boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
CONSTRAINT customer_notes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.customer_tag_assignments (
    customer_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
CONSTRAINT customer_tag_assignments_pkey PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE public.customer_tags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#3b82f6'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
CONSTRAINT customer_tags_pkey PRIMARY KEY (id)
);

CREATE TABLE public.debt_followup_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    due_soon_days integer NOT NULL DEFAULT 7,
    critical_days integer NOT NULL DEFAULT 30,
    reminder_window_days integer NOT NULL DEFAULT 3,
    whatsapp_enabled boolean NOT NULL DEFAULT true,
    reminder_signature text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT debt_followup_config_pkey PRIMARY KEY (id)
);

CREATE TABLE public.debt_message_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid NOT NULL,
    channel character varying(20) NOT NULL DEFAULT 'whatsapp'::character varying,
    template_id uuid,
    message_text text NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'sent'::character varying,
    recipient character varying(200),
    related_entity_type character varying(30),
    related_entity_id uuid,
    error_info text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    sent_at timestamp with time zone,
CONSTRAINT debt_message_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.debt_message_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    body text NOT NULL,
    channel character varying(20) NOT NULL DEFAULT 'whatsapp'::character varying,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT debt_message_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE public.debt_payment_promises (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid NOT NULL,
    amount numeric(18,4) NOT NULL,
    currency_code character varying(3) NOT NULL DEFAULT 'SAR'::character varying,
    promise_date date NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
    reference_type character varying(20),
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT debt_payment_promises_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exchange_companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    name text NOT NULL,
    account_id uuid,
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    is_active boolean NOT NULL DEFAULT true,
    opening_balance numeric NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT exchange_companies_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exchange_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    currency_code text NOT NULL,
    rate_to_base numeric(12,6) NOT NULL DEFAULT 1,
    effective_date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT exchange_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE public.expense_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1'::text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    account_id uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT expense_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    category_id uuid NOT NULL,
    voucher_number text,
    description text NOT NULL,
    amount numeric(19,4) NOT NULL DEFAULT 0,
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    exchange_rate numeric(19,6) NOT NULL DEFAULT 1,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    status text NOT NULL DEFAULT 'posted'::text,
    payment_method text NOT NULL DEFAULT 'cash'::text,
    is_recurring boolean NOT NULL DEFAULT false,
    frequency text,
    recurring_end_date date,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    updated_by uuid,
    branch_id uuid,
CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

CREATE TABLE public.external_cross_references (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    source_number text NOT NULL,
    target_number text NOT NULL,
    target_brand text,
    target_brand_id integer,
    confidence integer,
    match_quality text NOT NULL DEFAULT 'UNKNOWN'::text,
    evidence text,
    cached_at timestamp with time zone DEFAULT now(),
    company_id uuid,
CONSTRAINT external_cross_references_pkey PRIMARY KEY (id)
);

CREATE TABLE public.external_fitment_evidence (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    normalized_number text NOT NULL,
    vin text,
    make text,
    model text,
    year integer,
    engine_code text,
    status text NOT NULL DEFAULT 'UNKNOWN'::text,
    evidence_text text,
    evidence_source text,
    resolved_at timestamp with time zone DEFAULT now(),
    company_id uuid,
CONSTRAINT external_fitment_evidence_pkey PRIMARY KEY (id)
);

CREATE TABLE public.feature_flags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL,
    name_ar text NOT NULL,
    description_ar text,
    is_enabled_globally boolean DEFAULT false,
    enabled_for_plans jsonb DEFAULT '[]'::jsonb,
    enabled_for_companies jsonb DEFAULT '[]'::jsonb,
    is_beta boolean DEFAULT false,
    category text DEFAULT 'general'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT feature_flags_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fin_account_balances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    account_id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    opening_balance numeric(15,4) DEFAULT 0,
    debit_total numeric(15,4) DEFAULT 0,
    credit_total numeric(15,4) DEFAULT 0,
    closing_balance numeric(15,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT fin_account_balances_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fin_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name_ar character varying(255) NOT NULL,
    name_en character varying(255),
    account_type fin_account_type NOT NULL,
    parent_id uuid,
    is_active boolean DEFAULT true,
    is_group boolean DEFAULT false,
    currency_code character varying(3) DEFAULT 'SAR'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
CONSTRAINT fin_accounts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fin_journal_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    journal_number character varying(50) NOT NULL,
    journal_date date NOT NULL,
    status fin_journal_status DEFAULT 'DRAFT'::fin_journal_status,
    reference_type character varying(50),
    reference_id uuid,
    total_debit numeric(15,4) DEFAULT 0,
    total_credit numeric(15,4) DEFAULT 0,
    description text,
    created_by uuid,
    posted_by uuid,
    posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT fin_journal_entries_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fin_journal_lines (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    journal_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit numeric(15,4) DEFAULT 0,
    credit numeric(15,4) DEFAULT 0,
    description text,
CONSTRAINT fin_journal_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fiscal_years (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_at timestamp with time zone,
CONSTRAINT fiscal_years_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_adjustments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    adjustment_type text NOT NULL,
    amount numeric(14,2) NOT NULL,
    reason text NOT NULL,
    original_calculation_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    created_by uuid NOT NULL,
    approved_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    approved_at timestamp with time zone,
CONSTRAINT incentive_adjustments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    branch_id uuid,
    status text NOT NULL DEFAULT 'active'::text,
    effective_from date NOT NULL,
    effective_to date,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_calculation_lines (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    invoice_id uuid,
    invoice_line_id uuid,
    rule_id uuid,
    tier_id uuid,
    description text,
    base_amount numeric(14,2) NOT NULL,
    rate numeric(7,4),
    calculated_amount numeric(14,2) NOT NULL,
    currency_code text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_calculation_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_calculations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    period_id uuid NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    gross_sales numeric(16,2) NOT NULL DEFAULT 0,
    net_sales numeric(16,2) NOT NULL DEFAULT 0,
    gross_profit numeric(16,2) NOT NULL DEFAULT 0,
    collected_amount numeric(16,2) NOT NULL DEFAULT 0,
    invoice_count integer NOT NULL DEFAULT 0,
    customer_count integer NOT NULL DEFAULT 0,
    target_value numeric(14,2),
    target_achievement_pct numeric(7,2),
    base_commission numeric(16,2) NOT NULL DEFAULT 0,
    bonus_amount numeric(16,2) NOT NULL DEFAULT 0,
    adjustment_amount numeric(16,2) NOT NULL DEFAULT 0,
    deduction_amount numeric(16,2) NOT NULL DEFAULT 0,
    total_commission numeric(16,2) NOT NULL DEFAULT 0,
    currency_code text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    collection_note text,
    calculated_at timestamp with time zone,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    calculated_by uuid,
    approved_by uuid,
CONSTRAINT incentive_calculations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_engineer_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    allocation_pct numeric(5,2) NOT NULL,
    assignment_type text NOT NULL DEFAULT 'direct'::text,
    source text,
    reason text,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'assigned'::text,
    allocation_status text NOT NULL DEFAULT 'draft'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_engineer_links_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method text NOT NULL,
    reference text,
    account_id uuid,
    accounting_transaction_id uuid,
    reference_type text DEFAULT 'incentive_payment'::text,
    notes text,
    currency_code text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_payments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_pending_invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    branch_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    detected_at timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid,
    reason text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_pending_invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_periods (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    period_label text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    state text NOT NULL DEFAULT 'open'::text,
    is_test_period boolean NOT NULL DEFAULT false,
    fiscal_year_id uuid,
    currency_code text NOT NULL,
    calculated_at timestamp with time zone,
    approved_at timestamp with time zone,
    locked_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_by uuid,
    approved_by uuid,
    locked_by uuid,
    paid_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_periods_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    calculation_basis text NOT NULL,
    currency_code text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    effective_from date,
    effective_to date,
    collection_mode text NOT NULL DEFAULT 'on_collected_only'::text,
    tier_method text NOT NULL DEFAULT 'flat'::text,
    tier_currency_code text,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
CONSTRAINT incentive_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    name text NOT NULL,
    rule_type text NOT NULL,
    calculation_method text NOT NULL,
    threshold_min numeric(14,2),
    threshold_max numeric(14,2),
    rate numeric(7,4),
    fixed_amount numeric(14,2),
    tier_currency_code text,
    priority integer NOT NULL DEFAULT 0,
    conditions jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
CONSTRAINT incentive_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_targets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    target_scope text NOT NULL,
    target_owner_type text NOT NULL,
    target_owner_id uuid NOT NULL,
    user_id uuid,
    branch_id uuid,
    target_type text NOT NULL,
    period_type text NOT NULL DEFAULT 'monthly'::text,
    period_start date NOT NULL,
    period_end date NOT NULL,
    target_value numeric(14,2) NOT NULL,
    currency_code text NOT NULL,
    status text NOT NULL DEFAULT 'active'::text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_targets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.incentive_tiers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL,
    rule_id uuid,
    company_id uuid NOT NULL,
    from_amount numeric(14,2) NOT NULL,
    to_amount numeric(14,2),
    rate numeric(7,4),
    fixed_bonus numeric(14,2),
    tier_order integer NOT NULL,
    tier_currency_code text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT incentive_tiers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inv_stock_audit_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    audit_id uuid NOT NULL,
    product_id uuid NOT NULL,
    system_quantity numeric(15,4) NOT NULL DEFAULT 0,
    counted_quantity numeric(15,4),
    variance numeric(15,4) DEFAULT (counted_quantity - system_quantity),
    notes text,
CONSTRAINT inv_stock_audit_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inv_stock_audits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    audit_number character varying(50) NOT NULL,
    warehouse_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    status inv_audit_status DEFAULT 'DRAFT'::inv_audit_status,
    scheduled_date date,
    completed_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT inv_stock_audits_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inv_stock_ledger (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,4) DEFAULT 0,
    average_cost numeric(15,4) DEFAULT 0,
    last_movement_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT inv_stock_ledger_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inv_stock_movement_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    movement_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit_cost numeric(15,4) DEFAULT 0,
    total_cost numeric(15,4) DEFAULT (quantity * unit_cost),
    notes text,
CONSTRAINT inv_stock_movement_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inv_stock_movements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    movement_number character varying(50) NOT NULL,
    movement_type inv_movement_type NOT NULL,
    status inv_movement_status DEFAULT 'DRAFT'::inv_movement_status,
    movement_date timestamp with time zone NOT NULL DEFAULT now(),
    warehouse_id uuid NOT NULL,
    to_warehouse_id uuid,
    reference_type character varying(50),
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT inv_stock_movements_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inv_warehouses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    code character varying(50) NOT NULL,
    name_ar character varying(255) NOT NULL,
    name_en character varying(255),
    location text,
    is_active boolean DEFAULT true,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
CONSTRAINT inv_warehouses_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inventory_session_drafts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    warehouse_id uuid,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT inventory_session_drafts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inventory_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    quantity numeric(19,4) NOT NULL,
    transaction_type text NOT NULL,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    unit_cost numeric(18,4) NOT NULL,
    total_cost numeric(18,4) NOT NULL,
CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'viewer'::text,
    status text NOT NULL DEFAULT 'pending'::text,
    created_by uuid,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    token uuid NOT NULL DEFAULT gen_random_uuid(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    branch_id uuid,
CONSTRAINT invitations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.invoice_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    product_id uuid,
    description text,
    quantity numeric(14,2) NOT NULL DEFAULT 1,
    unit_price numeric(19,4) NOT NULL DEFAULT 0,
    cost_price numeric(19,4) NOT NULL DEFAULT 0,
    tax_amount numeric(19,4) NOT NULL DEFAULT 0,
    total numeric(19,4) NOT NULL DEFAULT 0,
    is_core_return boolean DEFAULT false,
    discount_amount numeric(14,4) NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    tax_rate_id uuid,
CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid,
    invoice_number text,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    total_amount numeric(19,4) NOT NULL DEFAULT 0,
    subtotal numeric(19,4) NOT NULL DEFAULT 0,
    tax_amount numeric(19,4) NOT NULL DEFAULT 0,
    discount_amount numeric(19,4) NOT NULL DEFAULT 0,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date,
    notes text,
    payment_method text DEFAULT 'cash'::text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    exchange_rate numeric(19,6) NOT NULL DEFAULT 1,
    paid_amount numeric NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    reference_invoice_id uuid,
    return_reason text,
    updated_by uuid,
    fiscal_year_id uuid,
    branch_id uuid,
    idempotency_key text,
CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE public.journal_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    entry_number bigint NOT NULL,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    reference_type text,
    reference_id uuid,
    status text NOT NULL DEFAULT 'posted'::text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    fiscal_year_id uuid,
    branch_id uuid,
CONSTRAINT journal_entries_pkey PRIMARY KEY (id)
);

CREATE TABLE public.journal_entry_lines (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit_amount numeric(19,4) NOT NULL DEFAULT 0,
    credit_amount numeric(19,4) NOT NULL DEFAULT 0,
    description text,
    currency_code text DEFAULT 'SAR'::text,
    foreign_amount numeric(15,2) DEFAULT 0,
    exchange_rate numeric(10,6) DEFAULT 1,
    deleted_at timestamp with time zone,
    party_id uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    branch_id uuid,
CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messaging_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    telegram_enabled boolean NOT NULL DEFAULT false,
    telegram_bot_token text NOT NULL DEFAULT ''::text,
    telegram_chat_id text NOT NULL DEFAULT ''::text,
    whatsapp_enabled boolean NOT NULL DEFAULT false,
    whatsapp_api_url text NOT NULL DEFAULT ''::text,
    whatsapp_api_key text NOT NULL DEFAULT ''::text,
    whatsapp_phone text NOT NULL DEFAULT ''::text,
    notify_on_sale boolean NOT NULL DEFAULT true,
    notify_on_purchase boolean NOT NULL DEFAULT true,
    notify_on_expense boolean NOT NULL DEFAULT true,
    notify_on_stock_transfer boolean NOT NULL DEFAULT true,
    notify_on_low_stock boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    notify_on_payment_bond boolean NOT NULL DEFAULT true,
CONSTRAINT messaging_config_pkey PRIMARY KEY (id)
);

CREATE TABLE public.monthly_targets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    year integer NOT NULL,
    month integer NOT NULL,
    sales_target numeric NOT NULL DEFAULT 0,
    collection_target numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT monthly_targets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.notification_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    channel text NOT NULL,
    event_type text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    error_message text,
    reference_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT notification_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.part_catalog_cache (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    normalized_number text NOT NULL,
    display_number text,
    manufacturer text,
    manufacturer_id integer,
    description text,
    response_json jsonb,
    cached_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    company_id uuid,
CONSTRAINT part_catalog_cache_pkey PRIMARY KEY (id)
);

CREATE TABLE public.part_compatibility (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    part_number text NOT NULL,
    manufacturer text,
    vehicle_make text NOT NULL,
    vehicle_model text,
    vehicle_year_from integer,
    vehicle_year_to integer,
    engine_code text,
    compatibility_status text NOT NULL DEFAULT 'UNKNOWN'::text,
    source text NOT NULL DEFAULT 'MANUAL'::text,
    confidence numeric(5,2),
    evidence jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT part_compatibility_pkey PRIMARY KEY (id)
);

CREATE TABLE public.parties (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    phone text,
    email text,
    tax_number text,
    address text,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    category_id uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    customer_type text DEFAULT 'individual'::text,
    lead_source text,
    birth_date date,
    preferred_contact_method text DEFAULT 'phone'::text,
    credit_limit numeric(15,2) DEFAULT 0,
    total_invoices_count integer DEFAULT 0,
    total_paid_amount numeric(15,2) DEFAULT 0,
    last_contact_date timestamp with time zone,
    last_invoice_date timestamp with time zone,
    customer_since date DEFAULT CURRENT_DATE,
    loyalty_points integer DEFAULT 0,
    satisfaction_score integer,
    supplier_type text DEFAULT 'local'::text,
    commercial_registration text,
    payment_terms_days integer DEFAULT 30,
    min_order_amount numeric(15,2) DEFAULT 0,
    delivery_lead_days integer DEFAULT 7,
    is_active_supplier boolean DEFAULT true,
    avg_rating numeric(3,2),
    total_orders_count integer DEFAULT 0,
    total_purchases_amount numeric(15,2) DEFAULT 0,
    last_purchase_date timestamp with time zone,
    search_vector tsvector,
    updated_by uuid,
CONSTRAINT parties_pkey PRIMARY KEY (id)
);

CREATE TABLE public.party_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT party_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.party_opening_balances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid NOT NULL,
    currency_code character varying(3) NOT NULL DEFAULT 'SAR'::character varying,
    amount numeric(18,4) NOT NULL,
    direction character varying(10) NOT NULL DEFAULT 'debit'::character varying,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    reference_number character varying(50),
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT party_opening_balances_pkey PRIMARY KEY (id)
);

CREATE TABLE public.payment_allocations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    amount numeric NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
CONSTRAINT payment_allocations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid,
    payment_number text,
    type text NOT NULL,
    amount numeric NOT NULL,
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    exchange_rate numeric NOT NULL DEFAULT 1,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    payment_method text NOT NULL DEFAULT 'cash'::text,
    account_id uuid,
    reference_type text,
    reference_id uuid,
    notes text,
    status text NOT NULL DEFAULT 'posted'::text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    updated_by uuid,
    branch_id uuid,
CONSTRAINT payments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.prc_contract_items (
    contract_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    agreed_price numeric(15,4) NOT NULL,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_contract_items_pkey PRIMARY KEY (contract_item_id)
);

CREATE TABLE public.prc_goods_receipt_documents (
    document_id uuid NOT NULL DEFAULT gen_random_uuid(),
    grn_id uuid NOT NULL,
    company_id uuid NOT NULL,
    document_type character varying NOT NULL,
    file_url character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_goods_receipt_documents_pkey PRIMARY KEY (document_id)
);

CREATE TABLE public.prc_goods_receipt_items (
    grn_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    grn_id uuid NOT NULL,
    company_id uuid NOT NULL,
    po_item_id uuid NOT NULL,
    product_id uuid,
    delivered_quantity numeric(15,4) NOT NULL DEFAULT 0.00,
    accepted_quantity numeric(15,4) NOT NULL DEFAULT 0.00,
    rejected_quantity numeric(15,4) NOT NULL DEFAULT 0.00,
    unit_of_measure character varying NOT NULL,
    rejection_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_goods_receipt_items_pkey PRIMARY KEY (grn_item_id)
);

CREATE TABLE public.prc_goods_receipts (
    grn_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    grn_number character varying NOT NULL,
    po_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    receipt_date timestamp with time zone NOT NULL DEFAULT now(),
    delivery_note_number character varying,
    warehouse_id uuid,
    received_by uuid NOT NULL,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_goods_receipts_pkey PRIMARY KEY (grn_id)
);

CREATE TABLE public.prc_purchase_invoice_items (
    invoice_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    company_id uuid NOT NULL,
    po_item_id uuid,
    grn_item_id uuid,
    product_id uuid,
    description text NOT NULL,
    invoiced_quantity numeric(15,4) NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    tax_amount numeric(15,4) DEFAULT 0.00,
    total_price numeric(15,4) NOT NULL,
    variance_amount numeric(15,4) DEFAULT 0.00,
    variance_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_invoice_items_pkey PRIMARY KEY (invoice_item_id)
);

CREATE TABLE public.prc_purchase_invoices (
    invoice_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    po_id uuid NOT NULL,
    invoice_number character varying NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    matching_status character varying NOT NULL DEFAULT 'unmatched'::character varying,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    subtotal numeric(15,4) DEFAULT 0.00,
    tax_amount numeric(15,4) DEFAULT 0.00,
    total_amount numeric(15,4) DEFAULT 0.00,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_invoices_pkey PRIMARY KEY (invoice_id)
);

CREATE TABLE public.prc_purchase_order_documents (
    document_id uuid NOT NULL DEFAULT gen_random_uuid(),
    po_id uuid NOT NULL,
    company_id uuid NOT NULL,
    document_type character varying NOT NULL,
    file_url character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_order_documents_pkey PRIMARY KEY (document_id)
);

CREATE TABLE public.prc_purchase_order_items (
    po_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    po_id uuid NOT NULL,
    company_id uuid NOT NULL,
    pr_item_id uuid,
    product_id uuid,
    description text NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit_of_measure character varying NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0.00,
    net_unit_price numeric(15,4) NOT NULL,
    tax_percentage numeric(5,2) DEFAULT 0.00,
    total_price numeric(15,4) NOT NULL,
    received_quantity numeric(15,4) DEFAULT 0.00,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_order_items_pkey PRIMARY KEY (po_item_id)
);

CREATE TABLE public.prc_purchase_orders (
    po_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    po_number character varying NOT NULL,
    supplier_id uuid NOT NULL,
    rfq_id uuid,
    quotation_id uuid,
    contract_id uuid,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    issue_date date,
    expected_delivery_date date,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    subtotal numeric(15,4) DEFAULT 0.00,
    tax_amount numeric(15,4) DEFAULT 0.00,
    total_amount numeric(15,4) DEFAULT 0.00,
    payment_terms character varying,
    shipping_terms character varying,
    shipping_address_id uuid,
    notes text,
    buyer_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_orders_pkey PRIMARY KEY (po_id)
);

CREATE TABLE public.prc_purchase_request_documents (
    document_id uuid NOT NULL DEFAULT gen_random_uuid(),
    pr_id uuid NOT NULL,
    company_id uuid NOT NULL,
    document_type character varying NOT NULL,
    file_url character varying NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_request_documents_pkey PRIMARY KEY (document_id)
);

CREATE TABLE public.prc_purchase_request_items (
    pr_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    pr_id uuid NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid,
    description text NOT NULL,
    quantity numeric(15,4) NOT NULL DEFAULT 1,
    unit_of_measure character varying NOT NULL,
    estimated_unit_price numeric(15,4) DEFAULT 0.00,
    total_estimated_price numeric(15,4) DEFAULT 0.00,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_request_items_pkey PRIMARY KEY (pr_item_id)
);

CREATE TABLE public.prc_purchase_requests (
    pr_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    pr_number character varying NOT NULL,
    requester_id uuid NOT NULL,
    department_id uuid,
    justification text,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    priority character varying NOT NULL DEFAULT 'normal'::character varying,
    required_date date,
    total_estimated_value numeric(15,4) DEFAULT 0.00,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_purchase_requests_pkey PRIMARY KEY (pr_id)
);

CREATE TABLE public.prc_quotation_documents (
    document_id uuid NOT NULL DEFAULT gen_random_uuid(),
    quotation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    document_type character varying NOT NULL,
    file_url character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_quotation_documents_pkey PRIMARY KEY (document_id)
);

CREATE TABLE public.prc_quotation_items (
    quotation_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    quotation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    rfq_item_id uuid NOT NULL,
    product_id uuid,
    offered_quantity numeric(15,4) NOT NULL,
    unit_of_measure character varying NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0.00,
    net_unit_price numeric(15,4) NOT NULL,
    tax_percentage numeric(5,2) DEFAULT 0.00,
    total_price numeric(15,4) NOT NULL,
    remarks text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_quotation_items_pkey PRIMARY KEY (quotation_item_id)
);

CREATE TABLE public.prc_quotations (
    quotation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    rfq_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quotation_number character varying,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    valid_until date,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    total_amount numeric(15,4) DEFAULT 0.00,
    payment_terms character varying,
    delivery_lead_time_days smallint,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_quotations_pkey PRIMARY KEY (quotation_id)
);

CREATE TABLE public.prc_rfq_evaluation_items (
    evaluation_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    rfq_item_id uuid NOT NULL,
    awarded_quotation_item_id uuid NOT NULL,
    awarded_quantity numeric(15,4) NOT NULL,
    reason_for_selection text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_rfq_evaluation_items_pkey PRIMARY KEY (evaluation_item_id)
);

CREATE TABLE public.prc_rfq_evaluation_scores (
    score_id uuid NOT NULL DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL,
    quotation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    price_score numeric(5,2) DEFAULT 0.00,
    technical_score numeric(5,2) DEFAULT 0.00,
    delivery_score numeric(5,2) DEFAULT 0.00,
    total_score numeric(5,2) DEFAULT 0.00,
    rank smallint,
    is_recommended boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_rfq_evaluation_scores_pkey PRIMARY KEY (score_id)
);

CREATE TABLE public.prc_rfq_evaluations (
    evaluation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    rfq_id uuid NOT NULL,
    evaluator_id uuid NOT NULL,
    status character varying NOT NULL DEFAULT 'in_progress'::character varying,
    evaluation_date timestamp with time zone,
    justification text,
    selected_quotation_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_rfq_evaluations_pkey PRIMARY KEY (evaluation_id)
);

CREATE TABLE public.prc_rfq_items (
    rfq_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
    rfq_id uuid NOT NULL,
    company_id uuid NOT NULL,
    pr_item_id uuid,
    product_id uuid,
    description text NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit_of_measure character varying NOT NULL,
    target_unit_price numeric(15,4),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_rfq_items_pkey PRIMARY KEY (rfq_item_id)
);

CREATE TABLE public.prc_rfq_suppliers (
    rfq_supplier_id uuid NOT NULL DEFAULT gen_random_uuid(),
    rfq_id uuid NOT NULL,
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    status character varying NOT NULL DEFAULT 'invited'::character varying,
    invited_at timestamp with time zone NOT NULL DEFAULT now(),
    responded_at timestamp with time zone,
CONSTRAINT prc_rfq_suppliers_pkey PRIMARY KEY (rfq_supplier_id)
);

CREATE TABLE public.prc_rfqs (
    rfq_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    rfq_number character varying NOT NULL,
    title character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    submission_deadline timestamp with time zone NOT NULL,
    delivery_date date,
    terms_and_conditions text,
    buyer_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_rfqs_pkey PRIMARY KEY (rfq_id)
);

CREATE TABLE public.prc_supplier_addresses (
    address_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    address_type character varying NOT NULL,
    address_line_1 character varying NOT NULL,
    address_line_2 character varying,
    city character varying NOT NULL,
    state character varying,
    zip_code character varying,
    country character varying NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_addresses_pkey PRIMARY KEY (address_id)
);

CREATE TABLE public.prc_supplier_bank_accounts (
    bank_account_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    bank_name character varying NOT NULL,
    branch_name character varying,
    account_name character varying NOT NULL,
    account_number character varying NOT NULL,
    iban character varying,
    swift_code character varying,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_bank_accounts_pkey PRIMARY KEY (bank_account_id)
);

CREATE TABLE public.prc_supplier_capabilities (
    capability_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    capability_name character varying NOT NULL,
    description text,
    verified boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_capabilities_pkey PRIMARY KEY (capability_id)
);

CREATE TABLE public.prc_supplier_categories (
    category_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    parent_category_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_categories_pkey PRIMARY KEY (category_id)
);

CREATE TABLE public.prc_supplier_contacts (
    contact_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    title character varying,
    department character varying,
    email character varying,
    phone character varying,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_contacts_pkey PRIMARY KEY (contact_id)
);

CREATE TABLE public.prc_supplier_contracts (
    contract_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    contract_number character varying NOT NULL,
    title character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    start_date date NOT NULL,
    end_date date,
    value numeric(15,4),
    currency character varying DEFAULT 'SAR'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_contracts_pkey PRIMARY KEY (contract_id)
);

CREATE TABLE public.prc_supplier_documents (
    document_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    document_type character varying NOT NULL,
    title character varying NOT NULL,
    file_url character varying NOT NULL,
    issue_date date,
    expiry_date date,
    reminder_days smallint[] DEFAULT '{30,15,7}'::smallint[],
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_documents_pkey PRIMARY KEY (document_id)
);

CREATE TABLE public.prc_supplier_metrics (
    metric_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    on_time_delivery_rate numeric(5,2) DEFAULT 0.00,
    quality_acceptance_rate numeric(5,2) DEFAULT 0.00,
    rfq_response_rate numeric(5,2) DEFAULT 0.00,
    price_variance_avg numeric(5,2) DEFAULT 0.00,
    calculated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_metrics_pkey PRIMARY KEY (metric_id)
);

CREATE TABLE public.prc_supplier_prices (
    price_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_product_id uuid NOT NULL,
    company_id uuid NOT NULL,
    effective_from timestamp with time zone NOT NULL DEFAULT now(),
    effective_to timestamp with time zone,
    minimum_quantity numeric(15,4) NOT NULL DEFAULT 1,
    unit_price numeric(15,4) NOT NULL,
    discount numeric(5,2) DEFAULT 0.00,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    tax_percentage numeric(5,2) DEFAULT 0.00,
    status character varying NOT NULL DEFAULT 'active'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_prices_pkey PRIMARY KEY (price_id)
);

CREATE TABLE public.prc_supplier_products (
    supplier_product_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    supplier_sku character varying,
    supplier_part_number character varying,
    barcode character varying,
    minimum_order_quantity numeric(15,4) NOT NULL DEFAULT 1,
    order_multiple numeric(15,4) NOT NULL DEFAULT 1,
    lead_time_days smallint NOT NULL DEFAULT 0,
    preferred_supplier boolean DEFAULT false,
    priority smallint DEFAULT 100,
    is_active boolean DEFAULT true,
    default_currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    default_tax uuid,
    preferred_warehouse uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_products_pkey PRIMARY KEY (supplier_product_id)
);

CREATE TABLE public.prc_supplier_scores (
    score_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    quality_score numeric(5,2) DEFAULT 0.00,
    delivery_score numeric(5,2) DEFAULT 0.00,
    response_score numeric(5,2) DEFAULT 0.00,
    price_score numeric(5,2) DEFAULT 0.00,
    flexibility_score numeric(5,2) DEFAULT 0.00,
    overall_score numeric(5,2) DEFAULT 0.00,
    last_evaluated_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_scores_pkey PRIMARY KEY (score_id)
);

CREATE TABLE public.prc_supplier_sla_violations (
    violation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    sla_id uuid NOT NULL,
    reference_id uuid NOT NULL,
    reference_type character varying NOT NULL,
    violation_date timestamp with time zone NOT NULL DEFAULT now(),
    actual_value numeric(15,4) NOT NULL,
    penalty_applied boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_sla_violations_pkey PRIMARY KEY (violation_id)
);

CREATE TABLE public.prc_supplier_slas (
    sla_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    sla_name character varying NOT NULL,
    target_value numeric(15,4) NOT NULL,
    warning_threshold numeric(15,4),
    penalty_percentage numeric(5,2) DEFAULT 0.00,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_slas_pkey PRIMARY KEY (sla_id)
);

CREATE TABLE public.prc_supplier_terms (
    terms_id uuid NOT NULL DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    company_id uuid NOT NULL,
    payment_terms character varying NOT NULL,
    credit_limit numeric(15,4) DEFAULT 0,
    credit_days smallint DEFAULT 0,
    incoterm character varying,
    shipping_terms character varying,
    delivery_method character varying,
    return_policy text,
    warranty_terms text,
    penalty_rules text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_supplier_terms_pkey PRIMARY KEY (terms_id)
);

CREATE TABLE public.prc_suppliers (
    supplier_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_code character varying NOT NULL,
    legal_name character varying NOT NULL,
    trade_name character varying,
    supplier_type character varying NOT NULL,
    category_id uuid,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    country character varying NOT NULL,
    city character varying NOT NULL,
    tax_number character varying,
    commercial_registration character varying,
    vat_number character varying,
    currency character varying NOT NULL DEFAULT 'SAR'::character varying,
    language character varying NOT NULL DEFAULT 'ar'::character varying,
    time_zone character varying NOT NULL DEFAULT 'Asia/Riyadh'::character varying,
    website character varying,
    initial_rating smallint,
    is_approved boolean DEFAULT false,
    risk_level character varying DEFAULT 'low'::character varying,
    portal_enabled boolean DEFAULT false,
    api_enabled boolean DEFAULT false,
    edi_enabled boolean DEFAULT false,
    auto_rfq_enabled boolean DEFAULT false,
    auto_po_enabled boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_suppliers_pkey PRIMARY KEY (supplier_id)
);

CREATE TABLE public.prc_three_way_matches (
    match_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    po_id uuid NOT NULL,
    matched_by uuid NOT NULL,
    match_date timestamp with time zone NOT NULL DEFAULT now(),
    is_successful boolean NOT NULL,
    discrepancy_details jsonb,
    resolution_notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT prc_three_way_matches_pkey PRIMARY KEY (match_id)
);

CREATE TABLE public.product_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    parent_id uuid,
    description text,
CONSTRAINT product_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_cross_references (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    base_product_id uuid NOT NULL,
    alternative_product_id uuid NOT NULL,
    match_quality text DEFAULT 'exact'::text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT product_cross_references_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_fitment (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    company_id uuid NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT product_fitment_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_kit_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    kit_product_id uuid NOT NULL,
    component_product_id uuid NOT NULL,
    quantity numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
CONSTRAINT product_kit_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_search_numbers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    original_number text NOT NULL,
    normalized_number text NOT NULL,
    number_type text NOT NULL,
    normalization_version integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT product_search_numbers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_stock (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    quantity numeric(19,4) NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    updated_by uuid,
    weighted_avg_cost numeric(18,4) NOT NULL DEFAULT 0,
CONSTRAINT product_stock_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_supplier_prices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    cost_price numeric(15,2) NOT NULL,
    lead_time_days integer,
    supplier_part_number character varying(100),
    notes text,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    currency_code text DEFAULT 'SAR'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
CONSTRAINT product_supplier_prices_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_uoms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid,
    uom_name text NOT NULL,
    conversion_factor numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT product_uoms_pkey PRIMARY KEY (id)
);

CREATE TABLE public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name_ar text NOT NULL,
    sku text NOT NULL,
    part_number text,
    brand text,
    description text,
    size text,
    specifications text,
    unit text NOT NULL DEFAULT 'piece'::text,
    purchase_price numeric(19,4) NOT NULL DEFAULT 0,
    sale_price numeric(19,4) NOT NULL DEFAULT 0,
    image_url text,
    barcode text,
    alternative_numbers text,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    min_stock_level integer NOT NULL DEFAULT 5,
    category_id uuid,
    is_kit boolean DEFAULT false,
    has_core_charge boolean DEFAULT false,
    core_charge_amount numeric(15,2) DEFAULT 0.00,
    deleted_at timestamp with time zone,
    cost_price numeric NOT NULL DEFAULT 0,
    search_vector tsvector,
    updated_by uuid,
    location text,
    global_search_text text DEFAULT ((((((((((((((((((COALESCE(name_ar, ''::text) || ' '::text) || COALESCE(sku, ''::text)) || ' '::text) || COALESCE(part_number, ''::text)) || ' '::text) || COALESCE(alternative_numbers, ''::text)) || ' '::text) || COALESCE(size, ''::text)) || ' '::text) || COALESCE(brand, ''::text)) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(specifications, ''::text)) || ' '::text) || COALESCE(location, ''::text)) || ' '::text) || COALESCE(barcode, ''::text)),
CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL DEFAULT ''::text,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.quotation_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quotation_id uuid NOT NULL,
    product_id uuid,
    description text NOT NULL,
    quantity numeric(10,2) NOT NULL DEFAULT 1,
    unit_price numeric(15,2) NOT NULL DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0,
    total numeric(15,2) NOT NULL DEFAULT 0,
    notes text,
    sort_order integer DEFAULT 0,
    company_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT quotation_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.quotations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    quotation_number text NOT NULL,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    party_id uuid,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    valid_until date,
    subtotal numeric(15,2) NOT NULL DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) NOT NULL DEFAULT 0,
    currency_code text DEFAULT 'SAR'::text,
    exchange_rate numeric(10,4) DEFAULT 1,
    notes text,
    terms_and_conditions text,
    delivery_terms text,
    payment_terms text,
    converted_invoice_id uuid,
    converted_at timestamp with time zone,
    rfq_group_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    branch_id uuid,
CONSTRAINT quotations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.role_permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    role text NOT NULL,
    permission text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT role_permissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.staging_jaafari_import (
    id integer NOT NULL DEFAULT nextval('staging_jaafari_import_id_seq'::regclass),
    part_number text,
    brand text,
    qty numeric,
    is_strict boolean,
    name text,
    resolved boolean DEFAULT false,
CONSTRAINT staging_jaafari_import_pkey PRIMARY KEY (id)
);

CREATE TABLE public.stock_transfer_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.stock_transfers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    from_warehouse_id uuid NOT NULL,
    to_warehouse_id uuid NOT NULL,
    notes text,
    status text NOT NULL DEFAULT 'completed'::text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    reversed_at timestamp with time zone,
CONSTRAINT stock_transfers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subscription_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name_ar text NOT NULL,
    name_en text NOT NULL,
    price_monthly numeric(10,2) DEFAULT 0,
    price_yearly numeric(10,2) DEFAULT 0,
    max_users integer DEFAULT 5,
    max_products integer DEFAULT 1000,
    max_invoices_monthly integer DEFAULT 500,
    ai_tokens_monthly bigint DEFAULT 100000,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    color text DEFAULT '#3B82F6'::text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE public.super_admins (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT super_admins_pkey PRIMARY KEY (user_id)
);

CREATE TABLE public.supplier_price_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    product_id uuid NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    currency_code text NOT NULL DEFAULT 'SAR'::text,
    effective_date date NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
CONSTRAINT supplier_price_history_pkey PRIMARY KEY (id)
);

CREATE TABLE public.supplier_ratings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    rated_by uuid,
    rating_date timestamp with time zone DEFAULT now(),
    quality_rating integer,
    delivery_rating integer,
    price_rating integer,
    communication_rating integer,
    overall_rating integer,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
CONSTRAINT supplier_ratings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.supported_currencies (
    code text NOT NULL,
    name_ar text NOT NULL,
    symbol text NOT NULL,
    is_base boolean NOT NULL DEFAULT false,
    exchange_operator text NOT NULL DEFAULT 'multiply'::text,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT supported_currencies_pkey PRIMARY KEY (code)
);

CREATE TABLE public.suspended_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    user_id uuid NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    customer jsonb,
    suspended_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT suspended_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sys_activity_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    request_id uuid,
    correlation_id uuid,
    action character varying NOT NULL,
    activity_version smallint DEFAULT 1,
    entity_type character varying,
    entity_id uuid,
    metadata jsonb,
    ip_address character varying,
    user_agent text,
    device_type text,
    occurred_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_activity_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sys_background_workers (
    worker_id character varying NOT NULL,
    version character varying,
    status character varying NOT NULL DEFAULT 'active'::character varying,
    supported_job_types text[],
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    heartbeat_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_background_workers_pkey PRIMARY KEY (worker_id)
);

CREATE TABLE public.sys_business_calendars (
    calendar_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying NOT NULL,
    working_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}'::integer[],
    working_hours_start time without time zone NOT NULL DEFAULT '08:00:00'::time without time zone,
    working_hours_end time without time zone NOT NULL DEFAULT '17:00:00'::time without time zone,
    holidays date[],
    is_default boolean DEFAULT false,
CONSTRAINT sys_business_calendars_pkey PRIMARY KEY (calendar_id)
);

CREATE TABLE public.sys_config_registry (
    key character varying NOT NULL,
    company_id uuid NOT NULL,
    value jsonb NOT NULL,
    value_type character varying NOT NULL DEFAULT 'string'::character varying,
    category character varying NOT NULL DEFAULT 'general'::character varying,
    description text,
    is_secret boolean DEFAULT false,
    is_readonly boolean DEFAULT false,
    validation_rule text,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_config_registry_pkey PRIMARY KEY (key, company_id)
);

CREATE TABLE public.sys_dead_letter_queue (
    dlq_id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_job_id uuid NOT NULL,
    company_id uuid NOT NULL,
    job_type character varying NOT NULL,
    correlation_id uuid,
    payload jsonb NOT NULL,
    dead_letter_reason text NOT NULL,
    last_error text,
    attempt_count smallint NOT NULL,
    first_attempt_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    worker_id character varying,
    moved_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_dead_letter_queue_pkey PRIMARY KEY (dlq_id)
);

CREATE TABLE public.sys_domain_events (
    event_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    aggregate_type character varying NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying NOT NULL,
    event_version smallint NOT NULL DEFAULT 1,
    schema_version smallint NOT NULL DEFAULT 1,
    correlation_id uuid,
    causation_id uuid,
    actor_id uuid,
    actor_type character varying,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status character varying NOT NULL DEFAULT 'pending'::character varying,
    error_message text,
    occurred_at timestamp with time zone NOT NULL DEFAULT now(),
    published_at timestamp with time zone,
    processed_at timestamp with time zone,
CONSTRAINT sys_domain_events_pkey PRIMARY KEY (event_id)
);

CREATE TABLE public.sys_error_codes (
    code character varying NOT NULL,
    domain character varying NOT NULL,
    category character varying NOT NULL,
    severity character varying NOT NULL,
    http_status smallint,
    retryable boolean DEFAULT false,
    is_active boolean DEFAULT true,
    user_message_ar text,
    user_message_en text,
    developer_message text,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT sys_error_codes_pkey PRIMARY KEY (code)
);

CREATE TABLE public.sys_feature_flags (
    flag_name character varying NOT NULL,
    company_id uuid NOT NULL,
    is_enabled boolean NOT NULL DEFAULT false,
    effective_from timestamp with time zone,
    effective_to timestamp with time zone,
    target_users uuid[],
    target_roles character varying[],
    target_companies uuid[],
    rollout_percentage smallint,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_feature_flags_pkey PRIMARY KEY (flag_name, company_id)
);

CREATE TABLE public.sys_job_archive (
    archive_id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_job_id uuid NOT NULL,
    company_id uuid NOT NULL,
    job_type character varying NOT NULL,
    correlation_id uuid,
    payload jsonb,
    status character varying NOT NULL,
    attempt_count smallint,
    archived_at timestamp with time zone NOT NULL DEFAULT now(),
    execution_time_ms integer,
CONSTRAINT sys_job_archive_pkey PRIMARY KEY (archive_id)
);

CREATE TABLE public.sys_job_queue (
    job_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    job_type character varying NOT NULL,
    correlation_id uuid,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    logical_priority character varying NOT NULL DEFAULT 'Normal'::character varying,
    numeric_priority smallint NOT NULL DEFAULT 100,
    status character varying NOT NULL DEFAULT 'pending'::character varying,
    attempt_count smallint NOT NULL DEFAULT 0,
    run_after timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone,
    locked_at timestamp with time zone,
    worker_id character varying,
    heartbeat_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_job_queue_pkey PRIMARY KEY (job_id)
);

CREATE TABLE public.sys_job_types (
    job_type character varying NOT NULL,
    logical_priority character varying NOT NULL DEFAULT 'Normal'::character varying,
    numeric_priority smallint NOT NULL DEFAULT 100,
    max_attempts smallint NOT NULL DEFAULT 3,
    timeout_seconds integer NOT NULL DEFAULT 300,
    retry_strategy character varying NOT NULL DEFAULT 'exponential'::character varying,
    max_concurrency integer DEFAULT 10,
    is_enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_job_types_pkey PRIMARY KEY (job_type)
);

CREATE TABLE public.sys_notification_queue (
    notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    notification_type character varying NOT NULL DEFAULT 'transactional'::character varying,
    template_id uuid,
    channel character varying NOT NULL,
    provider character varying,
    recipient character varying NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status character varying NOT NULL DEFAULT 'pending'::character varying,
    priority smallint NOT NULL DEFAULT 100,
    retry_count smallint NOT NULL DEFAULT 0,
    scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    provider_message_id character varying,
    last_error text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_notification_queue_pkey PRIMARY KEY (notification_id)
);

CREATE TABLE public.sys_notification_templates (
    template_id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    version smallint NOT NULL DEFAULT 1,
    language character varying NOT NULL DEFAULT 'en'::character varying,
    channel character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_notification_templates_pkey PRIMARY KEY (template_id)
);

CREATE TABLE public.sys_workflow_actions (
    action_id uuid NOT NULL DEFAULT gen_random_uuid(),
    action_type character varying NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_actions_pkey PRIMARY KEY (action_id)
);

CREATE TABLE public.sys_workflow_conditions (
    condition_id uuid NOT NULL DEFAULT gen_random_uuid(),
    transition_id uuid NOT NULL,
    rule_type character varying NOT NULL,
    rule_payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_conditions_pkey PRIMARY KEY (condition_id)
);

CREATE TABLE public.sys_workflow_definitions (
    workflow_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    template_id uuid,
    calendar_id uuid,
    name character varying NOT NULL,
    domain character varying NOT NULL,
    workflow_version smallint NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    effective_from timestamp with time zone NOT NULL DEFAULT now(),
    effective_to timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_definitions_pkey PRIMARY KEY (workflow_id)
);

CREATE TABLE public.sys_workflow_history (
    history_id uuid NOT NULL DEFAULT gen_random_uuid(),
    instance_id uuid NOT NULL,
    from_state_id uuid,
    to_state_id uuid,
    transition_id uuid,
    actor_id uuid,
    actor_type character varying,
    transition_type character varying,
    reason text,
    correlation_id uuid,
    duration_in_state_seconds integer,
    occurred_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_history_pkey PRIMARY KEY (history_id)
);

CREATE TABLE public.sys_workflow_instances (
    instance_id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    parent_instance_id uuid,
    aggregate_type character varying NOT NULL,
    aggregate_id uuid NOT NULL,
    current_state_id uuid NOT NULL,
    status character varying NOT NULL DEFAULT 'active'::character varying,
    due_at timestamp with time zone,
    breached_at timestamp with time zone,
    context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_instances_pkey PRIMARY KEY (instance_id)
);

CREATE TABLE public.sys_workflow_states (
    state_id uuid NOT NULL DEFAULT gen_random_uuid(),
    workflow_id uuid NOT NULL,
    name character varying NOT NULL,
    state_type character varying NOT NULL DEFAULT 'normal'::character varying,
    sla_minutes integer,
    escalation_action_id uuid,
    sub_workflow_id uuid,
    compensation_action_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_states_pkey PRIMARY KEY (state_id)
);

CREATE TABLE public.sys_workflow_templates (
    template_id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    domain character varying NOT NULL,
    description text,
    structure jsonb NOT NULL,
CONSTRAINT sys_workflow_templates_pkey PRIMARY KEY (template_id)
);

CREATE TABLE public.sys_workflow_transitions (
    transition_id uuid NOT NULL DEFAULT gen_random_uuid(),
    workflow_id uuid NOT NULL,
    from_state_id uuid NOT NULL,
    to_state_id uuid NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT sys_workflow_transitions_pkey PRIMARY KEY (transition_id)
);

CREATE TABLE public.system_broadcasts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_ar text NOT NULL,
    message_ar text NOT NULL,
    type text DEFAULT 'info'::text,
    is_active boolean DEFAULT true,
    target text DEFAULT 'all'::text,
    target_companies jsonb DEFAULT '[]'::jsonb,
    created_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT system_broadcasts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tax_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    percentage numeric NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
CONSTRAINT tax_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_company_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'owner'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    branch_id uuid,
CONSTRAINT user_company_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.vehicle_products (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    product_id uuid NOT NULL,
    fitment_status text NOT NULL DEFAULT 'UNKNOWN'::text,
    source text NOT NULL DEFAULT 'manual'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
CONSTRAINT vehicle_products_pkey PRIMARY KEY (id)
);

CREATE TABLE public.vehicles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    make text NOT NULL,
    model text NOT NULL,
    submodel text,
    year_start integer NOT NULL,
    year_end integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    body_type text,
    engine text,
    fuel_type text,
    transmission text,
    drive_type text,
    vin_prefix text,
    region text,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.vin_analyses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    vin text NOT NULL,
    vehicle_id uuid,
    decoded jsonb,
    source text NOT NULL DEFAULT 'manual'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT vin_analyses_pkey PRIMARY KEY (id)
);

CREATE TABLE public.warehouses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    branch_id uuid,
    name_ar text NOT NULL,
    location text,
    status text NOT NULL DEFAULT 'active'::text,
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at timestamp with time zone,
    updated_by uuid,
CONSTRAINT warehouses_pkey PRIMARY KEY (id)
);

-- Constraints (FK / unique / check)
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check CHECK ((type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text])));
ALTER TABLE public.ai_part_lookup_cache ADD CONSTRAINT chk_global_company CHECK ((((is_global = true) AND (company_id IS NULL)) OR ((is_global = false) AND (company_id IS NOT NULL))));
ALTER TABLE public.audit_sessions ADD CONSTRAINT audit_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE public.backup_logs ADD CONSTRAINT backup_logs_backup_type_check CHECK ((backup_type = ANY (ARRAY['manual'::text, 'auto'::text, 'google_drive'::text])));
ALTER TABLE public.backup_logs ADD CONSTRAINT backup_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text])));
ALTER TABLE public.branches ADD CONSTRAINT branches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.companies ADD CONSTRAINT companies_subscription_status_check CHECK ((subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'past_due'::text, 'cancelled'::text, 'suspended'::text])));
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['call'::text, 'email'::text, 'meeting'::text, 'visit'::text, 'note'::text, 'task'::text, 'invoice_created'::text, 'payment_received'::text, 'complaint'::text, 'follow_up'::text])));
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text, 'overdue'::text])));
ALTER TABLE public.customer_notes ADD CONSTRAINT customer_notes_note_type_check CHECK ((note_type = ANY (ARRAY['general'::text, 'complaint'::text, 'feedback'::text, 'preference'::text, 'warning'::text])));
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_critical_days_check CHECK (((critical_days >= 1) AND (critical_days <= 365)));
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_due_soon_days_check CHECK (((due_soon_days >= 1) AND (due_soon_days <= 90)));
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_reminder_window_days_check CHECK (((reminder_window_days >= 1) AND (reminder_window_days <= 90)));
ALTER TABLE public.debt_message_log ADD CONSTRAINT debt_message_log_channel_check CHECK (((channel)::text = ANY ((ARRAY['whatsapp'::character varying, 'sms'::character varying, 'email'::character varying, 'in_app'::character varying])::text[])));
ALTER TABLE public.debt_message_log ADD CONSTRAINT debt_message_log_status_check CHECK (((status)::text = ANY ((ARRAY['sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])));
ALTER TABLE public.debt_message_templates ADD CONSTRAINT debt_message_templates_channel_check CHECK (((channel)::text = ANY ((ARRAY['whatsapp'::character varying, 'sms'::character varying, 'email'::character varying, 'in_app'::character varying])::text[])));
ALTER TABLE public.debt_payment_promises ADD CONSTRAINT debt_payment_promises_amount_check CHECK ((amount > (0)::numeric));
ALTER TABLE public.debt_payment_promises ADD CONSTRAINT debt_payment_promises_reference_type_check CHECK (((reference_type)::text = ANY ((ARRAY['invoice'::character varying, 'opening_balance'::character varying, 'payment'::character varying, 'manual'::character varying])::text[])));
ALTER TABLE public.debt_payment_promises ADD CONSTRAINT debt_payment_promises_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'broken'::character varying, 'cancelled'::character varying])::text[])));
ALTER TABLE public.exchange_rates ADD CONSTRAINT chk_exchange_rate_reasonable CHECK (((rate_to_base > 0.0000001) AND (rate_to_base < (1000000)::numeric)));
ALTER TABLE public.exchange_rates ADD CONSTRAINT exchange_rates_rate_check CHECK ((rate_to_base > (0)::numeric));
ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK ((amount > (0)::numeric));
ALTER TABLE public.expenses ADD CONSTRAINT chk_recurring_needs_frequency CHECK (((is_recurring = false) OR (frequency IS NOT NULL)));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_check CHECK ((amount >= (0)::numeric));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_exchange_rate_positive CHECK ((exchange_rate > (0)::numeric));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank'::text, 'credit'::text])));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_recurrence_check CHECK (((recurring_end_date IS NULL) OR (recurring_end_date > expense_date)));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'paid'::text, 'void'::text])));
ALTER TABLE public.external_cross_references ADD CONSTRAINT external_cross_references_confidence_check CHECK (((confidence >= 0) AND (confidence <= 5)));
ALTER TABLE public.external_cross_references ADD CONSTRAINT external_cross_references_match_quality_check CHECK ((match_quality = ANY (ARRAY['EXACT'::text, 'EQUIVALENT'::text, 'CROSS_REFERENCE'::text, 'POSSIBLE'::text, 'UNKNOWN'::text])));
ALTER TABLE public.external_fitment_evidence ADD CONSTRAINT external_fitment_evidence_status_check CHECK ((status = ANY (ARRAY['CONFIRMED'::text, 'POSSIBLE'::text, 'UNKNOWN'::text, 'NOT_COMPATIBLE'::text])));
ALTER TABLE public.fin_journal_entries ADD CONSTRAINT check_journal_balanced CHECK (((status <> 'POSTED'::fin_journal_status) OR (total_debit = total_credit)));
ALTER TABLE public.fin_journal_lines ADD CONSTRAINT check_line_amount CHECK ((((debit > (0)::numeric) AND (credit = (0)::numeric)) OR ((credit > (0)::numeric) AND (debit = (0)::numeric)) OR ((debit = (0)::numeric) AND (credit = (0)::numeric))));
ALTER TABLE public.fiscal_years ADD CONSTRAINT chk_fiscal_year_dates CHECK ((start_date < end_date));
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_adjustment_type_check CHECK ((adjustment_type = ANY (ARRAY['bonus'::text, 'deduction'::text, 'correction'::text, 'special_reward'::text, 'reversal'::text])));
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_amount_check CHECK ((amount <> (0)::numeric));
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_source_type_check CHECK ((source_type = ANY (ARRAY['invoice_sale'::text, 'invoice_return'::text, 'payment_collection'::text, 'target_bonus'::text, 'adjustment'::text, 'deduction'::text])));
ALTER TABLE public.incentive_calculations ADD CONSTRAINT calc_total_derived CHECK ((abs((total_commission - (((base_commission + bonus_amount) + adjustment_amount) - deduction_amount))) < 0.005));
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_collected_amount_check CHECK ((collected_amount >= (0)::numeric));
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_deduction_amount_check CHECK ((deduction_amount >= (0)::numeric));
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_gross_sales_check CHECK ((gross_sales >= (0)::numeric));
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_net_sales_check CHECK ((net_sales >= (0)::numeric));
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'calculated'::text, 'eligible'::text, 'approved'::text, 'partially_paid'::text, 'paid'::text, 'cancelled'::text, 'reversed'::text])));
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_allocation_pct_check CHECK (((allocation_pct > (0)::numeric) AND (allocation_pct <= (100)::numeric)));
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_allocation_status_check CHECK ((allocation_status = ANY (ARRAY['draft'::text, 'assigned'::text, 'revoked'::text])));
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['direct'::text, 'historical'::text])));
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'revoked'::text])));
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_amount_check CHECK ((amount > (0)::numeric));
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_reference_type_check CHECK ((reference_type = ANY (ARRAY['incentive_payment'::text, 'incentive_reversal'::text])));
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT incentive_pending_invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'resolved'::text, 'ignored'::text])));
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_check CHECK ((period_end >= period_start));
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_state_check CHECK ((state = ANY (ARRAY['open'::text, 'calculating'::text, 'calculated'::text, 'under_review'::text, 'approved'::text, 'locked'::text, 'paid'::text])));
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_calculation_basis_check CHECK ((calculation_basis = ANY (ARRAY['sales'::text, 'gross_profit'::text, 'collected_amount'::text, 'hybrid'::text])));
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_check CHECK (((effective_to IS NULL) OR (effective_to >= effective_from)));
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_collection_mode_check CHECK ((collection_mode = ANY (ARRAY['on_collected_only'::text, 'pending_until_collected'::text])));
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text])));
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_tier_method_check CHECK ((tier_method = ANY (ARRAY['progressive'::text, 'flat'::text])));
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_calculation_method_check CHECK ((calculation_method = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'tiered'::text])));
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_fixed_amount_check CHECK (((fixed_amount IS NULL) OR (fixed_amount >= (0)::numeric)));
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_rate_check CHECK (((rate IS NULL) OR ((rate >= (0)::numeric) AND (rate <= (100)::numeric))));
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['sales'::text, 'profit'::text, 'collection'::text, 'invoice_count'::text, 'customer_count'::text, 'target_achievement'::text, 'product_category'::text, 'brand'::text, 'branch'::text, 'customer_type'::text])));
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_threshold_max_check CHECK (((threshold_max IS NULL) OR (threshold_max >= (0)::numeric)));
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_threshold_min_check CHECK (((threshold_min IS NULL) OR (threshold_min >= (0)::numeric)));
ALTER TABLE public.incentive_rules ADD CONSTRAINT rules_method_coherent CHECK ((((calculation_method = 'percentage'::text) AND (rate IS NOT NULL)) OR ((calculation_method = 'fixed_amount'::text) AND (fixed_amount IS NOT NULL)) OR (calculation_method = 'tiered'::text)));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_check CHECK ((period_end >= period_start));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_period_type_check CHECK ((period_type = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text, 'custom'::text])));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_target_owner_type_check CHECK ((target_owner_type = ANY (ARRAY['employee'::text, 'branch'::text, 'company'::text])));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_target_scope_check CHECK ((target_scope = ANY (ARRAY['employee'::text, 'branch'::text, 'company'::text])));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_target_type_check CHECK ((target_type = ANY (ARRAY['sales'::text, 'profit'::text, 'collection'::text, 'invoice_count'::text, 'customer_count'::text])));
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_target_value_check CHECK ((target_value > (0)::numeric));
ALTER TABLE public.incentive_targets ADD CONSTRAINT targets_owner_id_valid CHECK ((((target_owner_type = 'employee'::text) AND (user_id IS NOT NULL) AND (target_owner_id = user_id)) OR ((target_owner_type = 'branch'::text) AND (branch_id IS NOT NULL) AND (target_owner_id = branch_id)) OR ((target_owner_type = 'company'::text) AND (target_owner_id = company_id))));
ALTER TABLE public.incentive_targets ADD CONSTRAINT targets_scope_owner_match CHECK ((target_scope = target_owner_type));
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_fixed_bonus_check CHECK (((fixed_bonus IS NULL) OR (fixed_bonus >= (0)::numeric)));
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_from_amount_check CHECK ((from_amount >= (0)::numeric));
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_rate_check CHECK (((rate IS NULL) OR ((rate >= (0)::numeric) AND (rate <= (100)::numeric))));
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_to_amount_check CHECK (((to_amount IS NULL) OR (to_amount >= (0)::numeric)));
ALTER TABLE public.incentive_tiers ADD CONSTRAINT tiers_rate_bonus_xor CHECK ((((rate IS NOT NULL) AND (fixed_bonus IS NULL)) OR ((rate IS NULL) AND (fixed_bonus IS NOT NULL))));
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['purchase'::text, 'sales'::text, 'purchase_return'::text, 'sales_return'::text, 'transfer_in'::text, 'transfer_out'::text, 'adj_in'::text, 'adj_out'::text, 'adj'::text, 'initial'::text])));
ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text, 'cashier'::text, 'viewer'::text])));
ALTER TABLE public.invitations ADD CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])));
ALTER TABLE public.invoice_items ADD CONSTRAINT check_cost_price_valid CHECK ((cost_price >= (0)::numeric));
ALTER TABLE public.invoice_items ADD CONSTRAINT check_invoice_items_amounts_valid CHECK (((quantity >= (0)::numeric) AND (unit_price >= (0)::numeric) AND (COALESCE(tax_amount, (0)::numeric) >= (0)::numeric) AND (total >= (0)::numeric)));
ALTER TABLE public.invoice_items ADD CONSTRAINT check_unit_price_valid CHECK ((unit_price >= (0)::numeric));
ALTER TABLE public.invoice_items ADD CONSTRAINT chk_item_total CHECK ((total = round((((quantity * unit_price) - COALESCE(discount_amount, (0)::numeric)) + COALESCE(tax_amount, (0)::numeric)), 2)));
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_discount_amount_check CHECK ((discount_amount >= (0)::numeric));
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_quantity_check CHECK ((quantity > (0)::numeric));
ALTER TABLE public.invoices ADD CONSTRAINT check_invoice_amounts_valid CHECK (((total_amount >= (0)::numeric) AND (subtotal >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (COALESCE(discount_amount, (0)::numeric) >= (0)::numeric)));
ALTER TABLE public.invoices ADD CONSTRAINT chk_due_after_issue CHECK (((due_date IS NULL) OR (due_date >= issue_date)));
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_paid_not_exceed_total CHECK ((paid_amount <= (total_amount + 0.01)));
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_total_positive CHECK ((total_amount >= (0)::numeric));
ALTER TABLE public.invoices ADD CONSTRAINT chk_return_needs_reason CHECK (((type <> ALL (ARRAY['sale_return'::text, 'purchase_return'::text])) OR (return_reason IS NOT NULL)));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_exchange_rate_positive CHECK ((exchange_rate > (0)::numeric));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_method_check CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['cash'::text, 'credit'::text, 'bank'::text, 'check'::text, 'transfer'::text]))));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'confirmed'::text, 'posted'::text, 'paid'::text, 'partially_paid'::text, 'cancelled'::text, 'void'::text])));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_total_amount_check CHECK ((total_amount >= (0)::numeric));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_type_check CHECK ((type = ANY (ARRAY['sale'::text, 'purchase'::text, 'sale_return'::text, 'purchase_return'::text])));
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text])));
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT chk_jel_debit_or_credit CHECK ((NOT ((debit_amount > (0)::numeric) AND (credit_amount > (0)::numeric))));
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_entry_lines_credit_check CHECK ((credit_amount >= (0)::numeric));
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_entry_lines_debit_check CHECK ((debit_amount >= (0)::numeric));
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_lines_one_side_only CHECK (((debit_amount = (0)::numeric) OR (credit_amount = (0)::numeric)));
ALTER TABLE public.monthly_targets ADD CONSTRAINT monthly_targets_month_check CHECK (((month >= 1) AND (month <= 12)));
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_channel_check CHECK ((channel = ANY (ARRAY['telegram'::text, 'whatsapp'::text])));
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'pending'::text])));
ALTER TABLE public.part_compatibility ADD CONSTRAINT part_compatibility_compatibility_status_check CHECK ((compatibility_status = ANY (ARRAY['CONFIRMED'::text, 'POSSIBLE'::text, 'UNKNOWN'::text, 'NOT_COMPATIBLE'::text])));
ALTER TABLE public.part_compatibility ADD CONSTRAINT part_compatibility_source_check CHECK ((source = ANY (ARRAY['INTERNAL_OEM'::text, 'FAPI'::text, 'TECDOC'::text, 'MANUAL'::text, 'AI'::text, 'MEGAZIP'::text])));
ALTER TABLE public.parties ADD CONSTRAINT parties_customer_type_check CHECK ((customer_type = ANY (ARRAY['individual'::text, 'company'::text, 'government'::text])));
ALTER TABLE public.parties ADD CONSTRAINT parties_preferred_contact_method_check CHECK ((preferred_contact_method = ANY (ARRAY['phone'::text, 'email'::text, 'whatsapp'::text])));
ALTER TABLE public.parties ADD CONSTRAINT parties_satisfaction_score_check CHECK (((satisfaction_score >= 1) AND (satisfaction_score <= 5)));
ALTER TABLE public.parties ADD CONSTRAINT parties_status_check CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text])));
ALTER TABLE public.parties ADD CONSTRAINT parties_supplier_type_check CHECK ((supplier_type = ANY (ARRAY['local'::text, 'import'::text, 'manufacturer'::text, 'distributor'::text])));
ALTER TABLE public.parties ADD CONSTRAINT parties_type_check CHECK ((type = ANY (ARRAY['customer'::text, 'supplier'::text, 'both'::text])));
ALTER TABLE public.party_categories ADD CONSTRAINT party_categories_type_check CHECK ((type = ANY (ARRAY['customer'::text, 'supplier'::text])));
ALTER TABLE public.party_opening_balances ADD CONSTRAINT party_opening_balances_amount_check CHECK ((amount >= (0)::numeric));
ALTER TABLE public.party_opening_balances ADD CONSTRAINT party_opening_balances_direction_check CHECK (((direction)::text = ANY ((ARRAY['debit'::character varying, 'credit'::character varying])::text[])));
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_amount_check CHECK ((amount > (0)::numeric));
ALTER TABLE public.payments ADD CONSTRAINT chk_payments_amount_positive CHECK ((amount > (0)::numeric));
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric));
ALTER TABLE public.payments ADD CONSTRAINT payments_exchange_rate_positive CHECK ((exchange_rate > (0)::numeric));
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank'::text, 'credit'::text, 'check'::text, 'transfer'::text])));
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text])));
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check CHECK ((type = ANY (ARRAY['receipt'::text, 'disbursement'::text, 'transfer'::text])));
ALTER TABLE public.prc_goods_receipts ADD CONSTRAINT prc_goods_receipts_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'inspected'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'partially_accepted'::character varying])::text[])));
ALTER TABLE public.prc_purchase_invoices ADD CONSTRAINT prc_purchase_invoices_matching_status_check CHECK (((matching_status)::text = ANY ((ARRAY['unmatched'::character varying, 'matched'::character varying, 'variance_approved'::character varying])::text[])));
ALTER TABLE public.prc_purchase_invoices ADD CONSTRAINT prc_purchase_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'matched'::character varying, 'discrepancy'::character varying, 'approved'::character varying, 'paid'::character varying, 'void'::character varying])::text[])));
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT prc_purchase_orders_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending_approval'::character varying, 'approved'::character varying, 'issued'::character varying, 'partially_received'::character varying, 'fully_received'::character varying, 'cancelled'::character varying, 'closed'::character varying])::text[])));
ALTER TABLE public.prc_purchase_requests ADD CONSTRAINT prc_purchase_requests_priority_check CHECK (((priority)::text = ANY ((ARRAY['normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])));
ALTER TABLE public.prc_purchase_requests ADD CONSTRAINT prc_purchase_requests_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'in_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'closed'::character varying, 'cancelled'::character varying])::text[])));
ALTER TABLE public.prc_quotations ADD CONSTRAINT prc_quotations_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'under_evaluation'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])));
ALTER TABLE public.prc_rfq_evaluations ADD CONSTRAINT prc_rfq_evaluations_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])));
ALTER TABLE public.prc_rfq_suppliers ADD CONSTRAINT prc_rfq_suppliers_status_check CHECK (((status)::text = ANY ((ARRAY['invited'::character varying, 'viewed'::character varying, 'submitted'::character varying, 'declined'::character varying, 'awarded'::character varying, 'rejected'::character varying])::text[])));
ALTER TABLE public.prc_rfqs ADD CONSTRAINT prc_rfqs_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'closed'::character varying, 'cancelled'::character varying, 'awarded'::character varying])::text[])));
ALTER TABLE public.prc_supplier_addresses ADD CONSTRAINT prc_supplier_addresses_address_type_check CHECK (((address_type)::text = ANY ((ARRAY['hq'::character varying, 'billing'::character varying, 'shipping'::character varying, 'warehouse'::character varying])::text[])));
ALTER TABLE public.prc_supplier_contracts ADD CONSTRAINT prc_supplier_contracts_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'expired'::character varying, 'terminated'::character varying])::text[])));
ALTER TABLE public.prc_supplier_documents ADD CONSTRAINT prc_supplier_documents_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['commercial_registration'::character varying, 'tax_card'::character varying, 'zakat_certificate'::character varying, 'quality_certificate'::character varying, 'contract'::character varying, 'other'::character varying])::text[])));
ALTER TABLE public.prc_supplier_prices ADD CONSTRAINT prc_supplier_prices_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'superseded'::character varying])::text[])));
ALTER TABLE public.prc_suppliers ADD CONSTRAINT prc_suppliers_initial_rating_check CHECK (((initial_rating >= 1) AND (initial_rating <= 5)));
ALTER TABLE public.prc_suppliers ADD CONSTRAINT prc_suppliers_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])));
ALTER TABLE public.prc_suppliers ADD CONSTRAINT prc_suppliers_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'inactive'::character varying, 'blocked'::character varying, 'blacklisted'::character varying])::text[])));
ALTER TABLE public.prc_suppliers ADD CONSTRAINT prc_suppliers_supplier_type_check CHECK (((supplier_type)::text = ANY ((ARRAY['manufacturer'::character varying, 'distributor'::character varying, 'wholesaler'::character varying, 'importer'::character varying, 'service_provider'::character varying])::text[])));
ALTER TABLE public.product_cross_references ADD CONSTRAINT check_cross_reference_not_self CHECK ((base_product_id <> alternative_product_id));
ALTER TABLE public.product_cross_references ADD CONSTRAINT product_cross_references_match_quality_check CHECK ((match_quality = ANY (ARRAY['exact'::text, 'partial'::text, 'interchangeable'::text])));
ALTER TABLE public.product_kit_items ADD CONSTRAINT chk_no_self_kit CHECK ((kit_product_id <> component_product_id));
ALTER TABLE public.product_kit_items ADD CONSTRAINT product_kit_items_quantity_check CHECK ((quantity > (0)::numeric));
ALTER TABLE public.product_search_numbers ADD CONSTRAINT product_search_numbers_number_type_check CHECK ((number_type = ANY (ARRAY['PRIMARY'::text, 'ALTERNATIVE'::text, 'SKU'::text, 'BARCODE'::text, 'CROSS_REF'::text, 'SUPPLIER'::text])));
ALTER TABLE public.product_stock ADD CONSTRAINT product_stock_quantity_check CHECK ((quantity >= (0)::numeric));
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_cost_price_check CHECK ((cost_price >= (0)::numeric));
ALTER TABLE public.products ADD CONSTRAINT chk_products_purchase_price_positive CHECK (((purchase_price IS NULL) OR (purchase_price >= (0)::numeric)));
ALTER TABLE public.products ADD CONSTRAINT chk_products_sale_price_positive CHECK (((sale_price IS NULL) OR (sale_price >= (0)::numeric)));
ALTER TABLE public.products ADD CONSTRAINT products_cost_price_check CHECK ((cost_price >= (0)::numeric));
ALTER TABLE public.products ADD CONSTRAINT products_purchase_price_check CHECK ((purchase_price >= (0)::numeric));
ALTER TABLE public.products ADD CONSTRAINT products_sale_price_check CHECK ((sale_price >= (0)::numeric));
ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])));
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric)));
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_quantity_check CHECK ((quantity > (0)::numeric));
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_total_check CHECK ((total >= (0)::numeric));
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_unit_price_check CHECK ((unit_price >= (0)::numeric));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_discount_amount_check CHECK ((discount_amount >= (0)::numeric));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_exchange_rate_check CHECK ((exchange_rate > (0)::numeric));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'converted'::text])));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_subtotal_check CHECK ((subtotal >= (0)::numeric));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_tax_amount_check CHECK ((tax_amount >= (0)::numeric));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_total_amount_check CHECK ((total_amount >= (0)::numeric));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_type_check CHECK ((type = ANY (ARRAY['sales'::text, 'purchase'::text])));
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'accountant'::text, 'sales'::text, 'viewer'::text, 'finance_manager'::text, 'hr'::text, 'branch_manager'::text, 'engineer'::text])));
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_quantity_check CHECK ((quantity > (0)::numeric));
ALTER TABLE public.stock_transfers ADD CONSTRAINT chk_different_warehouses CHECK ((from_warehouse_id <> to_warehouse_id));
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text, 'reversed'::text])));
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5)));
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_delivery_rating_check CHECK (((delivery_rating >= 1) AND (delivery_rating <= 5)));
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5)));
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_price_rating_check CHECK (((price_rating >= 1) AND (price_rating <= 5)));
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_quality_rating_check CHECK (((quality_rating >= 1) AND (quality_rating <= 5)));
ALTER TABLE public.supported_currencies ADD CONSTRAINT supported_currencies_exchange_operator_check CHECK ((exchange_operator = ANY (ARRAY['multiply'::text, 'divide'::text])));
ALTER TABLE public.sys_background_workers ADD CONSTRAINT sys_background_workers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'idle'::character varying, 'offline'::character varying, 'draining'::character varying])::text[])));
ALTER TABLE public.sys_config_registry ADD CONSTRAINT sys_config_registry_category_check CHECK (((category)::text = ANY ((ARRAY['security'::character varying, 'notification'::character varying, 'ui'::character varying, 'integration'::character varying, 'general'::character varying])::text[])));
ALTER TABLE public.sys_config_registry ADD CONSTRAINT sys_config_registry_value_type_check CHECK (((value_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])));
ALTER TABLE public.sys_domain_events ADD CONSTRAINT sys_domain_events_actor_type_check CHECK (((actor_type)::text = ANY ((ARRAY['system'::character varying, 'user'::character varying, 'external_api'::character varying])::text[])));
ALTER TABLE public.sys_domain_events ADD CONSTRAINT sys_domain_events_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'processed'::character varying, 'failed'::character varying, 'dead_letter'::character varying])::text[])));
ALTER TABLE public.sys_error_codes ADD CONSTRAINT sys_error_codes_category_check CHECK (((category)::text = ANY ((ARRAY['validation'::character varying, 'auth'::character varying, 'not_found'::character varying, 'system'::character varying, 'logic'::character varying, 'integration'::character varying])::text[])));
ALTER TABLE public.sys_error_codes ADD CONSTRAINT sys_error_codes_domain_check CHECK (((domain)::text = ANY ((ARRAY['auth'::character varying, 'sys'::character varying, 'prc'::character varying, 'log'::character varying, 'fin'::character varying, 'inv'::character varying, 'crm'::character varying, 'hr'::character varying, 'ast'::character varying, 'mfg'::character varying])::text[])));
ALTER TABLE public.sys_error_codes ADD CONSTRAINT sys_error_codes_severity_check CHECK (((severity)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'error'::character varying, 'critical'::character varying])::text[])));
ALTER TABLE public.sys_feature_flags ADD CONSTRAINT sys_feature_flags_rollout_percentage_check CHECK (((rollout_percentage >= 0) AND (rollout_percentage <= 100)));
ALTER TABLE public.sys_job_queue ADD CONSTRAINT sys_job_queue_logical_priority_check CHECK (((logical_priority)::text = ANY ((ARRAY['Critical'::character varying, 'High'::character varying, 'Normal'::character varying, 'Low'::character varying])::text[])));
ALTER TABLE public.sys_job_queue ADD CONSTRAINT sys_job_queue_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'pending'::character varying, 'claimed'::character varying, 'processing'::character varying, 'retrying'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'dead_letter'::character varying])::text[])));
ALTER TABLE public.sys_job_types ADD CONSTRAINT sys_job_types_logical_priority_check CHECK (((logical_priority)::text = ANY ((ARRAY['Critical'::character varying, 'High'::character varying, 'Normal'::character varying, 'Low'::character varying])::text[])));
ALTER TABLE public.sys_job_types ADD CONSTRAINT sys_job_types_retry_strategy_check CHECK (((retry_strategy)::text = ANY ((ARRAY['linear'::character varying, 'exponential'::character varying, 'none'::character varying])::text[])));
ALTER TABLE public.sys_notification_queue ADD CONSTRAINT sys_notification_queue_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'push'::character varying, 'in_app'::character varying, 'webhook'::character varying, 'telegram'::character varying, 'whatsapp'::character varying])::text[])));
ALTER TABLE public.sys_notification_queue ADD CONSTRAINT sys_notification_queue_notification_type_check CHECK (((notification_type)::text = ANY ((ARRAY['alert'::character varying, 'marketing'::character varying, 'transactional'::character varying])::text[])));
ALTER TABLE public.sys_notification_queue ADD CONSTRAINT sys_notification_queue_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'sent'::character varying, 'failed'::character varying])::text[])));
ALTER TABLE public.sys_notification_templates ADD CONSTRAINT sys_notification_templates_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'push'::character varying, 'in_app'::character varying, 'webhook'::character varying, 'telegram'::character varying, 'whatsapp'::character varying])::text[])));
ALTER TABLE public.sys_workflow_actions ADD CONSTRAINT sys_workflow_actions_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['send_email'::character varying, 'publish_event'::character varying, 'enqueue_job'::character varying, 'call_rpc'::character varying, 'call_edge_function'::character varying, 'webhook'::character varying, 'create_task'::character varying, 'update_entity'::character varying, 'compensation'::character varying])::text[])));
ALTER TABLE public.sys_workflow_conditions ADD CONSTRAINT sys_workflow_conditions_rule_type_check CHECK (((rule_type)::text = ANY ((ARRAY['sql_condition'::character varying, 'expression'::character varying, 'custom_function'::character varying, 'role_check'::character varying])::text[])));
ALTER TABLE public.sys_workflow_history ADD CONSTRAINT sys_workflow_history_actor_type_check CHECK (((actor_type)::text = ANY ((ARRAY['system'::character varying, 'user'::character varying])::text[])));
ALTER TABLE public.sys_workflow_history ADD CONSTRAINT sys_workflow_history_transition_type_check CHECK (((transition_type)::text = ANY ((ARRAY['manual'::character varying, 'auto'::character varying, 'escalation'::character varying, 'compensation'::character varying])::text[])));
ALTER TABLE public.sys_workflow_instances ADD CONSTRAINT sys_workflow_instances_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'suspended'::character varying, 'compensating'::character varying, 'failed'::character varying, 'in_progress'::character varying, 'cancelled'::character varying])::text[])));
ALTER TABLE public.sys_workflow_states ADD CONSTRAINT sys_workflow_states_state_type_check CHECK (((state_type)::text = ANY ((ARRAY['initial'::character varying, 'normal'::character varying, 'fork'::character varying, 'join'::character varying, 'parallel'::character varying, 'terminal'::character varying])::text[])));
ALTER TABLE public.system_broadcasts ADD CONSTRAINT system_broadcasts_target_check CHECK ((target = ANY (ARRAY['all'::text, 'specific_companies'::text])));
ALTER TABLE public.system_broadcasts ADD CONSTRAINT system_broadcasts_type_check CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'error'::text, 'maintenance'::text])));
ALTER TABLE public.tax_rates ADD CONSTRAINT tax_rates_percentage_check CHECK (((percentage >= (0)::numeric) AND (percentage <= (100)::numeric)));
ALTER TABLE public.user_company_roles ADD CONSTRAINT user_company_roles_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'accountant'::text, 'cashier'::text, 'viewer'::text])));
ALTER TABLE public.vehicle_products ADD CONSTRAINT vehicle_products_fitment_status_check CHECK ((fitment_status = ANY (ARRAY['CONFIRMED'::text, 'POSSIBLE'::text, 'UNKNOWN'::text, 'NOT_COMPATIBLE'::text])));
ALTER TABLE public.vehicle_products ADD CONSTRAINT vehicle_products_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'vin_extract'::text])));
ALTER TABLE public.vehicles ADD CONSTRAINT chk_vehicle_years CHECK ((year_end >= year_start));
ALTER TABLE public.vin_analyses ADD CONSTRAINT vin_analyses_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ai'::text, 'hybrid'::text, 'vpic'::text, 'db'::text])));
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.accounts ADD CONSTRAINT accounts_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.accounts ADD CONSTRAINT accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.ai_part_lookup_cache ADD CONSTRAINT fk_ai_cache_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.api_rate_limits ADD CONSTRAINT api_rate_limits_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.audit_items ADD CONSTRAINT audit_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_items ADD CONSTRAINT audit_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.audit_items ADD CONSTRAINT audit_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.audit_items ADD CONSTRAINT fk_audit_items_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.audit_sessions ADD CONSTRAINT audit_sessions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.audit_sessions ADD CONSTRAINT audit_sessions_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id);
ALTER TABLE public.audit_sessions ADD CONSTRAINT audit_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.audit_sessions ADD CONSTRAINT audit_sessions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
ALTER TABLE public.backup_configs ADD CONSTRAINT backup_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.backup_logs ADD CONSTRAINT backup_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.backup_logs ADD CONSTRAINT backup_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.branches ADD CONSTRAINT branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.cashboxes ADD CONSTRAINT cashboxes_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE public.cashboxes ADD CONSTRAINT cashboxes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.cashboxes ADD CONSTRAINT cashboxes_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.cashboxes ADD CONSTRAINT cashboxes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.cashboxes ADD CONSTRAINT cashboxes_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.companies ADD CONSTRAINT companies_base_currency_fkey FOREIGN KEY (base_currency) REFERENCES supported_currencies(code);
ALTER TABLE public.companies ADD CONSTRAINT companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);
ALTER TABLE public.companies ADD CONSTRAINT companies_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id);
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.customer_activities ADD CONSTRAINT customer_activities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE public.customer_notes ADD CONSTRAINT customer_notes_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.customer_notes ADD CONSTRAINT customer_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.customer_notes ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE public.customer_tag_assignments ADD CONSTRAINT customer_tag_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE public.customer_tag_assignments ADD CONSTRAINT customer_tag_assignments_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES customer_tags(id) ON DELETE CASCADE;
ALTER TABLE public.customer_tags ADD CONSTRAINT customer_tags_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.debt_message_log ADD CONSTRAINT debt_message_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.debt_message_log ADD CONSTRAINT debt_message_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.debt_message_log ADD CONSTRAINT debt_message_log_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT;
ALTER TABLE public.debt_message_log ADD CONSTRAINT debt_message_log_template_id_fkey FOREIGN KEY (template_id) REFERENCES debt_message_templates(id) ON DELETE SET NULL;
ALTER TABLE public.debt_message_templates ADD CONSTRAINT debt_message_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.debt_payment_promises ADD CONSTRAINT debt_payment_promises_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.debt_payment_promises ADD CONSTRAINT debt_payment_promises_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.debt_payment_promises ADD CONSTRAINT debt_payment_promises_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT;
ALTER TABLE public.exchange_companies ADD CONSTRAINT exchange_companies_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE public.exchange_companies ADD CONSTRAINT exchange_companies_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.exchange_companies ADD CONSTRAINT exchange_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.exchange_companies ADD CONSTRAINT exchange_companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.exchange_rates ADD CONSTRAINT exchange_rates_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.exchange_rates ADD CONSTRAINT exchange_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.exchange_rates ADD CONSTRAINT exchange_rates_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES expense_categories(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.external_cross_references ADD CONSTRAINT external_cross_references_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.external_fitment_evidence ADD CONSTRAINT external_fitment_evidence_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.fin_account_balances ADD CONSTRAINT fin_account_balances_account_id_fkey FOREIGN KEY (account_id) REFERENCES fin_accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.fin_accounts ADD CONSTRAINT fin_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES fin_accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.fin_journal_lines ADD CONSTRAINT fin_journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES fin_accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.fin_journal_lines ADD CONSTRAINT fin_journal_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES fin_journal_entries(id) ON DELETE CASCADE;
ALTER TABLE public.fiscal_years ADD CONSTRAINT fiscal_years_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT adjustments_calc_company_fk FOREIGN KEY (company_id, calculation_id) REFERENCES incentive_calculations(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES incentive_calculations(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_adjustments ADD CONSTRAINT incentive_adjustments_original_calculation_id_fkey FOREIGN KEY (original_calculation_id) REFERENCES incentive_calculations(id);
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES incentive_plans(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_assignments ADD CONSTRAINT incentive_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT calc_lines_calc_company_fk FOREIGN KEY (company_id, calculation_id) REFERENCES incentive_calculations(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES incentive_calculations(id) ON DELETE CASCADE;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_invoice_line_id_fkey FOREIGN KEY (invoice_line_id) REFERENCES invoice_items(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES incentive_rules(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculation_lines ADD CONSTRAINT incentive_calculation_lines_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES incentive_tiers(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculations ADD CONSTRAINT calcs_period_company_fk FOREIGN KEY (company_id, period_id) REFERENCES incentive_periods(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_calculated_by_fkey FOREIGN KEY (calculated_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_period_id_fkey FOREIGN KEY (period_id) REFERENCES incentive_periods(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES incentive_plans(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_calculations ADD CONSTRAINT incentive_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT incentive_engineer_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT links_invoice_company_fk FOREIGN KEY (company_id, invoice_id) REFERENCES invoices(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES incentive_calculations(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_payments ADD CONSTRAINT incentive_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_payments ADD CONSTRAINT payments_calc_company_fk FOREIGN KEY (company_id, calculation_id) REFERENCES incentive_calculations(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT incentive_pending_invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT incentive_pending_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT incentive_pending_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT incentive_pending_invoices_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT incentive_pending_invoices_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT pending_invoice_company_fk FOREIGN KEY (company_id, invoice_id) REFERENCES invoices(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id);
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_periods ADD CONSTRAINT incentive_periods_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_tier_currency_code_fkey FOREIGN KEY (tier_currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES incentive_plans(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_tier_currency_code_fkey FOREIGN KEY (tier_currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_rules ADD CONSTRAINT incentive_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id);
ALTER TABLE public.incentive_targets ADD CONSTRAINT incentive_targets_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES incentive_plans(id) ON DELETE RESTRICT;
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES incentive_rules(id) ON DELETE CASCADE;
ALTER TABLE public.incentive_tiers ADD CONSTRAINT incentive_tiers_tier_currency_code_fkey FOREIGN KEY (tier_currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.inv_stock_audit_items ADD CONSTRAINT inv_stock_audit_items_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES inv_stock_audits(id) ON DELETE CASCADE;
ALTER TABLE public.inv_stock_audits ADD CONSTRAINT inv_stock_audits_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES inv_warehouses(id) ON DELETE RESTRICT;
ALTER TABLE public.inv_stock_ledger ADD CONSTRAINT inv_stock_ledger_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.inv_stock_ledger ADD CONSTRAINT inv_stock_ledger_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES inv_warehouses(id) ON DELETE RESTRICT;
ALTER TABLE public.inv_stock_movement_items ADD CONSTRAINT inv_stock_movement_items_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES inv_stock_movements(id) ON DELETE CASCADE;
ALTER TABLE public.inv_stock_movements ADD CONSTRAINT inv_stock_movements_to_warehouse_id_fkey FOREIGN KEY (to_warehouse_id) REFERENCES inv_warehouses(id) ON DELETE RESTRICT;
ALTER TABLE public.inv_stock_movements ADD CONSTRAINT inv_stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES inv_warehouses(id) ON DELETE RESTRICT;
ALTER TABLE public.inventory_session_drafts ADD CONSTRAINT inventory_session_drafts_session_id_fkey FOREIGN KEY (session_id) REFERENCES audit_sessions(id);
ALTER TABLE public.inventory_session_drafts ADD CONSTRAINT inventory_session_drafts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.invoice_items ADD CONSTRAINT fk_invoice_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_tax_rate_id_fkey FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id);
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_fiscal_year FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_reference_invoice_id_fkey FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_created_by_profile_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id);
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT fk_journal_entry_lines_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_entry_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_entry_lines_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_entry_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;
ALTER TABLE public.journal_entry_lines ADD CONSTRAINT journal_entry_lines_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE public.messaging_config ADD CONSTRAINT messaging_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.monthly_targets ADD CONSTRAINT monthly_targets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.monthly_targets ADD CONSTRAINT monthly_targets_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.part_catalog_cache ADD CONSTRAINT part_catalog_cache_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.part_compatibility ADD CONSTRAINT part_compatibility_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.parties ADD CONSTRAINT parties_category_id_fkey FOREIGN KEY (category_id) REFERENCES party_categories(id) ON DELETE SET NULL;
ALTER TABLE public.parties ADD CONSTRAINT parties_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.parties ADD CONSTRAINT parties_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.party_categories ADD CONSTRAINT party_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.party_opening_balances ADD CONSTRAINT party_opening_balances_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.party_opening_balances ADD CONSTRAINT party_opening_balances_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.party_opening_balances ADD CONSTRAINT party_opening_balances_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT;
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT;
ALTER TABLE public.payments ADD CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.payments ADD CONSTRAINT payments_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.prc_contract_items ADD CONSTRAINT prc_contract_items_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES prc_supplier_contracts(contract_id) ON DELETE CASCADE;
ALTER TABLE public.prc_goods_receipt_documents ADD CONSTRAINT prc_goods_receipt_documents_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES prc_goods_receipts(grn_id) ON DELETE CASCADE;
ALTER TABLE public.prc_goods_receipt_items ADD CONSTRAINT prc_goods_receipt_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES prc_goods_receipts(grn_id) ON DELETE CASCADE;
ALTER TABLE public.prc_goods_receipt_items ADD CONSTRAINT prc_goods_receipt_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES prc_purchase_order_items(po_item_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_goods_receipts ADD CONSTRAINT prc_goods_receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES prc_purchase_orders(po_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_goods_receipts ADD CONSTRAINT prc_goods_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_purchase_invoice_items ADD CONSTRAINT prc_purchase_invoice_items_grn_item_id_fkey FOREIGN KEY (grn_item_id) REFERENCES prc_goods_receipt_items(grn_item_id) ON DELETE SET NULL;
ALTER TABLE public.prc_purchase_invoice_items ADD CONSTRAINT prc_purchase_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES prc_purchase_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE public.prc_purchase_invoice_items ADD CONSTRAINT prc_purchase_invoice_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES prc_purchase_order_items(po_item_id) ON DELETE SET NULL;
ALTER TABLE public.prc_purchase_invoices ADD CONSTRAINT prc_purchase_invoices_po_id_fkey FOREIGN KEY (po_id) REFERENCES prc_purchase_orders(po_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_purchase_invoices ADD CONSTRAINT prc_purchase_invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_purchase_order_documents ADD CONSTRAINT prc_purchase_order_documents_po_id_fkey FOREIGN KEY (po_id) REFERENCES prc_purchase_orders(po_id) ON DELETE CASCADE;
ALTER TABLE public.prc_purchase_order_items ADD CONSTRAINT prc_purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES prc_purchase_orders(po_id) ON DELETE CASCADE;
ALTER TABLE public.prc_purchase_order_items ADD CONSTRAINT prc_purchase_order_items_pr_item_id_fkey FOREIGN KEY (pr_item_id) REFERENCES prc_purchase_request_items(pr_item_id) ON DELETE SET NULL;
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT prc_purchase_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES prc_supplier_contracts(contract_id) ON DELETE SET NULL;
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT prc_purchase_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES prc_quotations(quotation_id) ON DELETE SET NULL;
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT prc_purchase_orders_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES prc_rfqs(rfq_id) ON DELETE SET NULL;
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT prc_purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_purchase_request_documents ADD CONSTRAINT prc_purchase_request_documents_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES prc_purchase_requests(pr_id) ON DELETE CASCADE;
ALTER TABLE public.prc_purchase_request_items ADD CONSTRAINT prc_purchase_request_items_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES prc_purchase_requests(pr_id) ON DELETE CASCADE;
ALTER TABLE public.prc_quotation_documents ADD CONSTRAINT prc_quotation_documents_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES prc_quotations(quotation_id) ON DELETE CASCADE;
ALTER TABLE public.prc_quotation_items ADD CONSTRAINT prc_quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES prc_quotations(quotation_id) ON DELETE CASCADE;
ALTER TABLE public.prc_quotation_items ADD CONSTRAINT prc_quotation_items_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES prc_rfq_items(rfq_item_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_quotations ADD CONSTRAINT prc_quotations_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES prc_rfqs(rfq_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_quotations ADD CONSTRAINT prc_quotations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_rfq_evaluation_items ADD CONSTRAINT prc_rfq_evaluation_items_awarded_quotation_item_id_fkey FOREIGN KEY (awarded_quotation_item_id) REFERENCES prc_quotation_items(quotation_item_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_rfq_evaluation_items ADD CONSTRAINT prc_rfq_evaluation_items_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES prc_rfq_evaluations(evaluation_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_evaluation_items ADD CONSTRAINT prc_rfq_evaluation_items_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES prc_rfq_items(rfq_item_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_evaluation_scores ADD CONSTRAINT prc_rfq_evaluation_scores_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES prc_rfq_evaluations(evaluation_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_evaluation_scores ADD CONSTRAINT prc_rfq_evaluation_scores_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES prc_quotations(quotation_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_evaluations ADD CONSTRAINT prc_rfq_evaluations_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES prc_rfqs(rfq_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_evaluations ADD CONSTRAINT prc_rfq_evaluations_selected_quotation_id_fkey FOREIGN KEY (selected_quotation_id) REFERENCES prc_quotations(quotation_id) ON DELETE SET NULL;
ALTER TABLE public.prc_rfq_items ADD CONSTRAINT prc_rfq_items_pr_item_id_fkey FOREIGN KEY (pr_item_id) REFERENCES prc_purchase_request_items(pr_item_id) ON DELETE SET NULL;
ALTER TABLE public.prc_rfq_items ADD CONSTRAINT prc_rfq_items_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES prc_rfqs(rfq_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_suppliers ADD CONSTRAINT prc_rfq_suppliers_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES prc_rfqs(rfq_id) ON DELETE CASCADE;
ALTER TABLE public.prc_rfq_suppliers ADD CONSTRAINT prc_rfq_suppliers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_supplier_addresses ADD CONSTRAINT prc_supplier_addresses_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_bank_accounts ADD CONSTRAINT prc_supplier_bank_accounts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_capabilities ADD CONSTRAINT prc_supplier_capabilities_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_categories ADD CONSTRAINT prc_supplier_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES prc_supplier_categories(category_id);
ALTER TABLE public.prc_supplier_contacts ADD CONSTRAINT prc_supplier_contacts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_contracts ADD CONSTRAINT prc_supplier_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_supplier_documents ADD CONSTRAINT prc_supplier_documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_metrics ADD CONSTRAINT prc_supplier_metrics_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_prices ADD CONSTRAINT prc_supplier_prices_supplier_product_id_fkey FOREIGN KEY (supplier_product_id) REFERENCES prc_supplier_products(supplier_product_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_products ADD CONSTRAINT prc_supplier_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_scores ADD CONSTRAINT prc_supplier_scores_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_sla_violations ADD CONSTRAINT prc_supplier_sla_violations_sla_id_fkey FOREIGN KEY (sla_id) REFERENCES prc_supplier_slas(sla_id) ON DELETE RESTRICT;
ALTER TABLE public.prc_supplier_sla_violations ADD CONSTRAINT prc_supplier_sla_violations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_slas ADD CONSTRAINT prc_supplier_slas_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_supplier_terms ADD CONSTRAINT prc_supplier_terms_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES prc_suppliers(supplier_id) ON DELETE CASCADE;
ALTER TABLE public.prc_suppliers ADD CONSTRAINT prc_suppliers_category_id_fkey FOREIGN KEY (category_id) REFERENCES prc_supplier_categories(category_id);
ALTER TABLE public.prc_three_way_matches ADD CONSTRAINT prc_three_way_matches_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES prc_purchase_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE public.prc_three_way_matches ADD CONSTRAINT prc_three_way_matches_po_id_fkey FOREIGN KEY (po_id) REFERENCES prc_purchase_orders(po_id) ON DELETE CASCADE;
ALTER TABLE public.product_categories ADD CONSTRAINT fk_product_categories_parent FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL;
ALTER TABLE public.product_categories ADD CONSTRAINT product_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_cross_references ADD CONSTRAINT product_cross_references_alternative_product_id_fkey FOREIGN KEY (alternative_product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_cross_references ADD CONSTRAINT product_cross_references_base_product_id_fkey FOREIGN KEY (base_product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_cross_references ADD CONSTRAINT product_cross_references_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_cross_references ADD CONSTRAINT product_cross_references_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.product_fitment ADD CONSTRAINT fk_product_fitment_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_fitment ADD CONSTRAINT product_fitment_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_fitment ADD CONSTRAINT product_fitment_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
ALTER TABLE public.product_kit_items ADD CONSTRAINT fk_product_kit_items_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.product_kit_items ADD CONSTRAINT product_kit_items_component_product_id_fkey FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.product_kit_items ADD CONSTRAINT product_kit_items_kit_product_id_fkey FOREIGN KEY (kit_product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_search_numbers ADD CONSTRAINT product_search_numbers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_search_numbers ADD CONSTRAINT product_search_numbers_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_stock ADD CONSTRAINT fk_product_stock_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_stock ADD CONSTRAINT product_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_stock ADD CONSTRAINT product_stock_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.product_stock ADD CONSTRAINT product_stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE public.product_uoms ADD CONSTRAINT product_uoms_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD CONSTRAINT products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.quotation_items ADD CONSTRAINT fk_quotation_items_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_converted_invoice_id_fkey FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_party_id_fkey FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT fk_sti_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT fk_sti_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE;
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_to_warehouse_id_fkey FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.super_admins ADD CONSTRAINT super_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_price_history ADD CONSTRAINT supplier_price_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_price_history ADD CONSTRAINT supplier_price_history_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES supported_currencies(code);
ALTER TABLE public.supplier_price_history ADD CONSTRAINT supplier_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_price_history ADD CONSTRAINT supplier_price_history_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_rated_by_fkey FOREIGN KEY (rated_by) REFERENCES profiles(id);
ALTER TABLE public.supplier_ratings ADD CONSTRAINT supplier_ratings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE CASCADE;
ALTER TABLE public.suspended_orders ADD CONSTRAINT suspended_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE public.suspended_orders ADD CONSTRAINT suspended_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.suspended_orders ADD CONSTRAINT suspended_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.sys_job_queue ADD CONSTRAINT sys_job_queue_job_type_fkey FOREIGN KEY (job_type) REFERENCES sys_job_types(job_type) ON DELETE RESTRICT;
ALTER TABLE public.sys_job_queue ADD CONSTRAINT sys_job_queue_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES sys_background_workers(worker_id) ON DELETE SET NULL;
ALTER TABLE public.sys_notification_queue ADD CONSTRAINT sys_notification_queue_template_id_fkey FOREIGN KEY (template_id) REFERENCES sys_notification_templates(template_id);
ALTER TABLE public.sys_workflow_conditions ADD CONSTRAINT sys_workflow_conditions_transition_id_fkey FOREIGN KEY (transition_id) REFERENCES sys_workflow_transitions(transition_id) ON DELETE CASCADE;
ALTER TABLE public.sys_workflow_definitions ADD CONSTRAINT sys_workflow_definitions_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES sys_business_calendars(calendar_id);
ALTER TABLE public.sys_workflow_definitions ADD CONSTRAINT sys_workflow_definitions_template_id_fkey FOREIGN KEY (template_id) REFERENCES sys_workflow_templates(template_id);
ALTER TABLE public.sys_workflow_history ADD CONSTRAINT sys_workflow_history_from_state_id_fkey FOREIGN KEY (from_state_id) REFERENCES sys_workflow_states(state_id);
ALTER TABLE public.sys_workflow_history ADD CONSTRAINT sys_workflow_history_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES sys_workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE public.sys_workflow_history ADD CONSTRAINT sys_workflow_history_to_state_id_fkey FOREIGN KEY (to_state_id) REFERENCES sys_workflow_states(state_id);
ALTER TABLE public.sys_workflow_history ADD CONSTRAINT sys_workflow_history_transition_id_fkey FOREIGN KEY (transition_id) REFERENCES sys_workflow_transitions(transition_id);
ALTER TABLE public.sys_workflow_instances ADD CONSTRAINT sys_workflow_instances_current_state_id_fkey FOREIGN KEY (current_state_id) REFERENCES sys_workflow_states(state_id) ON DELETE RESTRICT;
ALTER TABLE public.sys_workflow_instances ADD CONSTRAINT sys_workflow_instances_parent_instance_id_fkey FOREIGN KEY (parent_instance_id) REFERENCES sys_workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE public.sys_workflow_instances ADD CONSTRAINT sys_workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES sys_workflow_definitions(workflow_id) ON DELETE RESTRICT;
ALTER TABLE public.sys_workflow_states ADD CONSTRAINT sys_workflow_states_sub_workflow_id_fkey FOREIGN KEY (sub_workflow_id) REFERENCES sys_workflow_definitions(workflow_id);
ALTER TABLE public.sys_workflow_states ADD CONSTRAINT sys_workflow_states_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES sys_workflow_definitions(workflow_id) ON DELETE CASCADE;
ALTER TABLE public.sys_workflow_transitions ADD CONSTRAINT sys_workflow_transitions_from_state_id_fkey FOREIGN KEY (from_state_id) REFERENCES sys_workflow_states(state_id) ON DELETE CASCADE;
ALTER TABLE public.sys_workflow_transitions ADD CONSTRAINT sys_workflow_transitions_to_state_id_fkey FOREIGN KEY (to_state_id) REFERENCES sys_workflow_states(state_id) ON DELETE CASCADE;
ALTER TABLE public.sys_workflow_transitions ADD CONSTRAINT sys_workflow_transitions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES sys_workflow_definitions(workflow_id) ON DELETE CASCADE;
ALTER TABLE public.system_broadcasts ADD CONSTRAINT system_broadcasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tax_rates ADD CONSTRAINT tax_rates_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE public.user_company_roles ADD CONSTRAINT user_company_roles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.user_company_roles ADD CONSTRAINT user_company_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.user_company_roles ADD CONSTRAINT user_company_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_products ADD CONSTRAINT vehicle_products_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_products ADD CONSTRAINT vehicle_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_products ADD CONSTRAINT vehicle_products_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
ALTER TABLE public.vin_analyses ADD CONSTRAINT vin_analyses_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.vin_analyses ADD CONSTRAINT vin_analyses_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.api_rate_limits ADD CONSTRAINT api_rate_limits_company_id_endpoint_key UNIQUE (company_id, endpoint);
ALTER TABLE public.branches ADD CONSTRAINT branches_unique_name_per_company UNIQUE (company_id, name);
ALTER TABLE public.customer_tags ADD CONSTRAINT customer_tags_company_id_name_key UNIQUE (company_id, name);
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_company_id_key UNIQUE (company_id);
ALTER TABLE public.exchange_rates ADD CONSTRAINT uq_exchange_rate_company_currency_date UNIQUE (company_id, currency_code, effective_date);
ALTER TABLE public.external_cross_references ADD CONSTRAINT uq_ext_xref_provider_pair UNIQUE (provider, source_number, target_number);
ALTER TABLE public.external_fitment_evidence ADD CONSTRAINT uq_ext_fitment_provider_part_vin UNIQUE (provider, normalized_number, vin);
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_key_key UNIQUE (key);
ALTER TABLE public.fin_account_balances ADD CONSTRAINT fin_account_balances_company_id_account_id_fiscal_year_peri_key UNIQUE (company_id, account_id, fiscal_year, period);
ALTER TABLE public.fin_accounts ADD CONSTRAINT fin_accounts_company_id_code_key UNIQUE (company_id, code);
ALTER TABLE public.fin_journal_entries ADD CONSTRAINT fin_journal_entries_company_id_journal_number_key UNIQUE (company_id, journal_number);
ALTER TABLE public.incentive_engineer_links ADD CONSTRAINT links_invoice_user_uq UNIQUE (invoice_id, user_id);
ALTER TABLE public.incentive_pending_invoices ADD CONSTRAINT pending_invoice_uq UNIQUE (company_id, invoice_id);
ALTER TABLE public.inv_stock_audits ADD CONSTRAINT inv_stock_audits_company_id_audit_number_key UNIQUE (company_id, audit_number);
ALTER TABLE public.inv_stock_ledger ADD CONSTRAINT inv_stock_ledger_company_id_warehouse_id_product_id_key UNIQUE (company_id, warehouse_id, product_id);
ALTER TABLE public.inv_stock_movements ADD CONSTRAINT inv_stock_movements_company_id_movement_number_key UNIQUE (company_id, movement_number);
ALTER TABLE public.inv_warehouses ADD CONSTRAINT inv_warehouses_company_id_code_key UNIQUE (company_id, code);
ALTER TABLE public.invoices ADD CONSTRAINT uq_invoice_number_company UNIQUE (company_id, invoice_number) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_unique_number_per_company UNIQUE (company_id, entry_number);
ALTER TABLE public.messaging_config ADD CONSTRAINT messaging_config_company_id_key UNIQUE (company_id);
ALTER TABLE public.monthly_targets ADD CONSTRAINT monthly_targets_unique UNIQUE (company_id, branch_id, year, month);
ALTER TABLE public.part_catalog_cache ADD CONSTRAINT uq_part_cache_provider_number UNIQUE (provider, normalized_number);
ALTER TABLE public.part_compatibility ADD CONSTRAINT uq_part_compat UNIQUE NULLS NOT DISTINCT (company_id, part_number, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to);
ALTER TABLE public.party_categories ADD CONSTRAINT party_categories_unique_name_per_company UNIQUE (company_id, name);
ALTER TABLE public.party_opening_balances ADD CONSTRAINT uq_party_opening_balance UNIQUE (company_id, party_id, currency_code);
ALTER TABLE public.payment_allocations ADD CONSTRAINT uq_allocation_per_payment_invoice UNIQUE (payment_id, invoice_id);
ALTER TABLE public.payments ADD CONSTRAINT payments_company_payment_number_unique UNIQUE (company_id, payment_number);
ALTER TABLE public.prc_goods_receipts ADD CONSTRAINT prc_goods_receipts_company_id_grn_number_key UNIQUE (company_id, grn_number);
ALTER TABLE public.prc_purchase_invoices ADD CONSTRAINT prc_purchase_invoices_company_id_supplier_id_invoice_number_key UNIQUE (company_id, supplier_id, invoice_number);
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT prc_purchase_orders_company_id_po_number_key UNIQUE (company_id, po_number);
ALTER TABLE public.prc_purchase_requests ADD CONSTRAINT prc_purchase_requests_company_id_pr_number_key UNIQUE (company_id, pr_number);
ALTER TABLE public.prc_quotations ADD CONSTRAINT prc_quotations_rfq_id_supplier_id_key UNIQUE (rfq_id, supplier_id);
ALTER TABLE public.prc_rfq_evaluation_scores ADD CONSTRAINT prc_rfq_evaluation_scores_evaluation_id_quotation_id_key UNIQUE (evaluation_id, quotation_id);
ALTER TABLE public.prc_rfq_evaluations ADD CONSTRAINT prc_rfq_evaluations_company_id_rfq_id_key UNIQUE (company_id, rfq_id);
ALTER TABLE public.prc_rfq_suppliers ADD CONSTRAINT prc_rfq_suppliers_rfq_id_supplier_id_key UNIQUE (rfq_id, supplier_id);
ALTER TABLE public.prc_rfqs ADD CONSTRAINT prc_rfqs_company_id_rfq_number_key UNIQUE (company_id, rfq_number);
ALTER TABLE public.prc_supplier_capabilities ADD CONSTRAINT prc_supplier_capabilities_supplier_id_capability_name_key UNIQUE (supplier_id, capability_name);
ALTER TABLE public.prc_supplier_categories ADD CONSTRAINT prc_supplier_categories_company_id_name_key UNIQUE (company_id, name);
ALTER TABLE public.prc_supplier_contracts ADD CONSTRAINT prc_supplier_contracts_contract_number_key UNIQUE (contract_number);
ALTER TABLE public.prc_supplier_metrics ADD CONSTRAINT prc_supplier_metrics_company_id_supplier_id_period_start_pe_key UNIQUE (company_id, supplier_id, period_start, period_end);
ALTER TABLE public.prc_supplier_products ADD CONSTRAINT prc_supplier_products_supplier_id_product_id_key UNIQUE (supplier_id, product_id);
ALTER TABLE public.prc_supplier_scores ADD CONSTRAINT prc_supplier_scores_supplier_id_key UNIQUE (supplier_id);
ALTER TABLE public.prc_supplier_slas ADD CONSTRAINT prc_supplier_slas_company_id_supplier_id_sla_name_key UNIQUE (company_id, supplier_id, sla_name);
ALTER TABLE public.prc_supplier_terms ADD CONSTRAINT prc_supplier_terms_supplier_id_key UNIQUE (supplier_id);
ALTER TABLE public.prc_suppliers ADD CONSTRAINT prc_suppliers_supplier_code_key UNIQUE (supplier_code);
ALTER TABLE public.product_categories ADD CONSTRAINT product_categories_unique_name_per_company UNIQUE (company_id, name);
ALTER TABLE public.product_fitment ADD CONSTRAINT uq_product_fitment UNIQUE (product_id, vehicle_id);
ALTER TABLE public.product_kit_items ADD CONSTRAINT product_kit_items_kit_product_id_component_product_id_key UNIQUE (kit_product_id, component_product_id);
ALTER TABLE public.product_search_numbers ADD CONSTRAINT product_search_numbers_product_id_normalized_number_number__key UNIQUE (product_id, normalized_number, number_type);
ALTER TABLE public.product_stock ADD CONSTRAINT uq_product_stock_per_warehouse UNIQUE (product_id, warehouse_id);
ALTER TABLE public.product_supplier_prices ADD CONSTRAINT product_supplier_prices_product_id_supplier_id_key UNIQUE (product_id, supplier_id);
ALTER TABLE public.products ADD CONSTRAINT uq_products_company_sku UNIQUE (company_id, sku);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);
ALTER TABLE public.sys_notification_templates ADD CONSTRAINT sys_notification_templates_name_version_language_channel_key UNIQUE (name, version, language, channel);
ALTER TABLE public.sys_workflow_definitions ADD CONSTRAINT uq_workflow_name_version UNIQUE (company_id, name, workflow_version);
ALTER TABLE public.user_company_roles ADD CONSTRAINT uq_user_role_per_company UNIQUE (user_id, company_id);
ALTER TABLE public.vehicle_products ADD CONSTRAINT uq_vehicle_product UNIQUE (vehicle_id, product_id);
ALTER TABLE public.vin_analyses ADD CONSTRAINT uq_vin_analyses_company_vin UNIQUE (company_id, vin);

-- Indexes
CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (id);
CREATE UNIQUE INDEX ai_part_lookup_cache_pkey ON public.ai_part_lookup_cache USING btree (id);
CREATE UNIQUE INDEX ai_request_log_pkey ON public.ai_request_log USING btree (id);
CREATE UNIQUE INDEX ai_usage_logs_pkey ON public.ai_usage_logs USING btree (id);
CREATE UNIQUE INDEX api_rate_limits_company_id_endpoint_key ON public.api_rate_limits USING btree (company_id, endpoint);
CREATE UNIQUE INDEX api_rate_limits_pkey ON public.api_rate_limits USING btree (id);
CREATE UNIQUE INDEX audit_items_pkey ON public.audit_items USING btree (id);
CREATE INDEX audit_logs_archive_company_id_created_at_entity_idx ON public.audit_logs_archive USING btree (company_id, created_at, entity);
CREATE INDEX audit_logs_archive_entity_action_idx ON public.audit_logs_archive USING btree (entity, action);
CREATE UNIQUE INDEX audit_logs_archive_pkey ON public.audit_logs_archive USING btree (id);
CREATE INDEX audit_logs_archive_user_id_idx ON public.audit_logs_archive USING btree (user_id);
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
CREATE UNIQUE INDEX audit_sessions_pkey ON public.audit_sessions USING btree (id);
CREATE UNIQUE INDEX backup_configs_pkey ON public.backup_configs USING btree (company_id);
CREATE UNIQUE INDEX backup_logs_pkey ON public.backup_logs USING btree (id);
CREATE UNIQUE INDEX branches_pkey ON public.branches USING btree (id);
CREATE UNIQUE INDEX branches_unique_name_per_company ON public.branches USING btree (company_id, name);
CREATE UNIQUE INDEX calc_active_uq ON public.incentive_calculations USING btree (company_id, period_id, user_id) WHERE (status <> ALL (ARRAY['cancelled'::text, 'reversed'::text]));
CREATE UNIQUE INDEX cashboxes_pkey ON public.cashboxes USING btree (id);
CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id);
CREATE UNIQUE INDEX customer_activities_pkey ON public.customer_activities USING btree (id);
CREATE UNIQUE INDEX customer_notes_pkey ON public.customer_notes USING btree (id);
CREATE UNIQUE INDEX customer_tag_assignments_pkey ON public.customer_tag_assignments USING btree (customer_id, tag_id);
CREATE UNIQUE INDEX customer_tags_company_id_name_key ON public.customer_tags USING btree (company_id, name);
CREATE UNIQUE INDEX customer_tags_pkey ON public.customer_tags USING btree (id);
CREATE UNIQUE INDEX debt_followup_config_company_id_key ON public.debt_followup_config USING btree (company_id);
CREATE UNIQUE INDEX debt_followup_config_pkey ON public.debt_followup_config USING btree (id);
CREATE UNIQUE INDEX debt_message_log_pkey ON public.debt_message_log USING btree (id);
CREATE UNIQUE INDEX debt_message_templates_pkey ON public.debt_message_templates USING btree (id);
CREATE UNIQUE INDEX debt_payment_promises_pkey ON public.debt_payment_promises USING btree (id);
CREATE UNIQUE INDEX exchange_companies_pkey ON public.exchange_companies USING btree (id);
CREATE UNIQUE INDEX exchange_rates_pkey ON public.exchange_rates USING btree (id);
CREATE UNIQUE INDEX expense_categories_pkey ON public.expense_categories USING btree (id);
CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);
CREATE UNIQUE INDEX external_cross_references_pkey ON public.external_cross_references USING btree (id);
CREATE UNIQUE INDEX external_fitment_evidence_pkey ON public.external_fitment_evidence USING btree (id);
CREATE UNIQUE INDEX feature_flags_key_key ON public.feature_flags USING btree (key);
CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id);
CREATE UNIQUE INDEX fin_account_balances_company_id_account_id_fiscal_year_peri_key ON public.fin_account_balances USING btree (company_id, account_id, fiscal_year, period);
CREATE UNIQUE INDEX fin_account_balances_pkey ON public.fin_account_balances USING btree (id);
CREATE UNIQUE INDEX fin_accounts_company_id_code_key ON public.fin_accounts USING btree (company_id, code);
CREATE UNIQUE INDEX fin_accounts_pkey ON public.fin_accounts USING btree (id);
CREATE UNIQUE INDEX fin_journal_entries_company_id_journal_number_key ON public.fin_journal_entries USING btree (company_id, journal_number);
CREATE UNIQUE INDEX fin_journal_entries_pkey ON public.fin_journal_entries USING btree (id);
CREATE UNIQUE INDEX fin_journal_lines_pkey ON public.fin_journal_lines USING btree (id);
CREATE UNIQUE INDEX fiscal_years_pkey ON public.fiscal_years USING btree (id);
CREATE INDEX idx_accounts_company_id ON public.accounts USING btree (company_id);
CREATE INDEX idx_accounts_currency_code ON public.accounts USING btree (currency_code);
CREATE INDEX idx_accounts_parent_id ON public.accounts USING btree (parent_id);
CREATE INDEX idx_accounts_updated_by ON public.accounts USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_ai_cache_company_id ON public.ai_part_lookup_cache USING btree (company_id);
CREATE INDEX idx_ai_cache_expires ON public.ai_part_lookup_cache USING btree (expires_at);
CREATE INDEX idx_ai_cache_part_number ON public.ai_part_lookup_cache USING btree (part_number);
CREATE INDEX idx_ai_request_log_user_time ON public.ai_request_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_company_date ON public.ai_usage_logs USING btree (company_id, created_at DESC);
CREATE INDEX idx_api_rate_limits_company_id ON public.api_rate_limits USING btree (company_id);
CREATE INDEX idx_audit_items_company_fk ON public.audit_items USING btree (company_id);
CREATE INDEX idx_audit_items_created_by ON public.audit_items USING btree (created_by);
CREATE INDEX idx_audit_items_product_id ON public.audit_items USING btree (product_id);
CREATE INDEX idx_audit_items_session_id ON public.audit_items USING btree (session_id);
CREATE INDEX idx_audit_logs_company_date_entity ON public.audit_logs USING btree (company_id, created_at, entity);
CREATE INDEX idx_audit_logs_entity_action ON public.audit_logs USING btree (entity, action);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_sessions_company_id ON public.audit_sessions USING btree (company_id);
CREATE INDEX idx_audit_sessions_created_by ON public.audit_sessions USING btree (created_by);
CREATE INDEX idx_audit_sessions_warehouse_id ON public.audit_sessions USING btree (warehouse_id);
CREATE INDEX idx_branches_company_id ON public.branches USING btree (company_id);
CREATE INDEX idx_catalog_company ON public.part_catalog_cache USING btree (company_id);
CREATE INDEX idx_companies_base_currency_fk ON public.companies USING btree (base_currency);
CREATE INDEX idx_companies_owner_id ON public.companies USING btree (owner_id);
CREATE INDEX idx_cross_ref_alt ON public.product_cross_references USING btree (alternative_product_id);
CREATE INDEX idx_cross_ref_base ON public.product_cross_references USING btree (base_product_id);
CREATE INDEX idx_customer_activities_assigned_to ON public.customer_activities USING btree (assigned_to);
CREATE INDEX idx_customer_activities_company_id ON public.customer_activities USING btree (company_id);
CREATE INDEX idx_customer_activities_created_by ON public.customer_activities USING btree (created_by);
CREATE INDEX idx_customer_activities_customer_id ON public.customer_activities USING btree (customer_id);
CREATE INDEX idx_customer_notes_company_id ON public.customer_notes USING btree (company_id);
CREATE INDEX idx_customer_notes_created_by ON public.customer_notes USING btree (created_by);
CREATE INDEX idx_customer_notes_customer_id ON public.customer_notes USING btree (customer_id);
CREATE INDEX idx_customer_tag_assignments_customer_id ON public.customer_tag_assignments USING btree (customer_id);
CREATE INDEX idx_customer_tag_assignments_tag ON public.customer_tag_assignments USING btree (tag_id);
CREATE INDEX idx_customer_tags_company_id ON public.customer_tags USING btree (company_id);
CREATE INDEX idx_domain_events_aggregate_order ON public.sys_domain_events USING btree (company_id, aggregate_type, aggregate_id, occurred_at);
CREATE INDEX idx_domain_events_correlation ON public.sys_domain_events USING btree (correlation_id);
CREATE INDEX idx_domain_events_queue ON public.sys_domain_events USING btree (status, occurred_at) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]));
CREATE INDEX idx_exchange_rates_created_by_fk ON public.exchange_rates USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE INDEX idx_exchange_rates_currency_fk ON public.exchange_rates USING btree (currency_code);
CREATE INDEX idx_expense_categories_account_fk ON public.expense_categories USING btree (account_id) WHERE (account_id IS NOT NULL);
CREATE INDEX idx_expense_categories_company_id ON public.expense_categories USING btree (company_id);
CREATE INDEX idx_expenses_branch_id ON public.expenses USING btree (branch_id);
CREATE INDEX idx_expenses_category_fk ON public.expenses USING btree (category_id) WHERE (category_id IS NOT NULL);
CREATE INDEX idx_expenses_company_fk ON public.expenses USING btree (company_id);
CREATE INDEX idx_expenses_created_by_fk ON public.expenses USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE INDEX idx_expenses_currency_fk ON public.expenses USING btree (currency_code);
CREATE INDEX idx_expenses_updated_by_fk ON public.expenses USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_ext_fit_company ON public.external_fitment_evidence USING btree (company_id);
CREATE INDEX idx_ext_fit_part ON public.external_fitment_evidence USING btree (normalized_number);
CREATE INDEX idx_ext_fit_prov ON public.external_fitment_evidence USING btree (provider);
CREATE INDEX idx_ext_xref_company ON public.external_cross_references USING btree (company_id);
CREATE INDEX idx_ext_xref_prov ON public.external_cross_references USING btree (provider);
CREATE INDEX idx_ext_xref_qual ON public.external_cross_references USING btree (match_quality);
CREATE INDEX idx_ext_xref_src ON public.external_cross_references USING btree (source_number);
CREATE INDEX idx_fin_accounts_parent ON public.fin_accounts USING btree (parent_id);
CREATE INDEX idx_fin_balances_account ON public.fin_account_balances USING btree (account_id);
CREATE INDEX idx_fin_balances_period ON public.fin_account_balances USING btree (fiscal_year, period);
CREATE INDEX idx_fin_journal_lines_account ON public.fin_journal_lines USING btree (account_id);
CREATE INDEX idx_fin_journal_lines_journal ON public.fin_journal_lines USING btree (journal_id);
CREATE INDEX idx_fin_journals_date ON public.fin_journal_entries USING btree (journal_date);
CREATE INDEX idx_fin_journals_ref ON public.fin_journal_entries USING btree (reference_type, reference_id);
CREATE INDEX idx_fiscal_years_company_id ON public.fiscal_years USING btree (company_id);
CREATE INDEX idx_inv_audit_item_product ON public.inv_stock_audit_items USING btree (product_id);
CREATE INDEX idx_inv_audit_warehouse ON public.inv_stock_audits USING btree (warehouse_id);
CREATE INDEX idx_inv_movement_item_product ON public.inv_stock_movement_items USING btree (product_id);
CREATE INDEX idx_inv_movement_ref ON public.inv_stock_movements USING btree (reference_type, reference_id);
CREATE INDEX idx_inv_movement_warehouse ON public.inv_stock_movements USING btree (warehouse_id);
CREATE INDEX idx_inv_stock_ledger_company ON public.inv_stock_ledger USING btree (company_id);
CREATE INDEX idx_inv_stock_ledger_product ON public.inv_stock_ledger USING btree (product_id);
CREATE INDEX idx_inv_stock_ledger_warehouse ON public.inv_stock_ledger USING btree (warehouse_id);
CREATE INDEX idx_inv_tx_product_warehouse ON public.inventory_transactions USING btree (product_id, warehouse_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inventory_product_wh ON public.inventory_transactions USING btree (product_id, warehouse_id);
CREATE INDEX idx_inventory_transactions_company_id ON public.inventory_transactions USING btree (company_id);
CREATE INDEX idx_inventory_transactions_created_by ON public.inventory_transactions USING btree (created_by);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions USING btree (company_id, created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inventory_transactions_product_id ON public.inventory_transactions USING btree (product_id);
CREATE INDEX idx_inventory_transactions_warehouse_id ON public.inventory_transactions USING btree (warehouse_id);
CREATE INDEX idx_invitations_company_id ON public.invitations USING btree (company_id);
CREATE INDEX idx_invitations_created_by ON public.invitations USING btree (created_by);
CREATE UNIQUE INDEX idx_invitations_token ON public.invitations USING btree (token);
CREATE INDEX idx_invoice_items_company_id_fk ON public.invoice_items USING btree (company_id);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);
CREATE INDEX idx_invoice_items_invoice_product ON public.invoice_items USING btree (invoice_id, product_id);
CREATE INDEX idx_invoice_items_product_company ON public.invoice_items USING btree (product_id, company_id);
CREATE INDEX idx_invoice_items_product_id ON public.invoice_items USING btree (product_id);
CREATE INDEX idx_invoice_items_tax_rate_fk ON public.invoice_items USING btree (tax_rate_id) WHERE (tax_rate_id IS NOT NULL);
CREATE INDEX idx_invoices_branch_id ON public.invoices USING btree (branch_id);
CREATE INDEX idx_invoices_company_id ON public.invoices USING btree (company_id);
CREATE INDEX idx_invoices_company_issue_date ON public.invoices USING btree (company_id, issue_date DESC);
CREATE INDEX idx_invoices_company_status ON public.invoices USING btree (company_id, status);
CREATE INDEX idx_invoices_company_type_status_date ON public.invoices USING btree (company_id, type, status, issue_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_invoices_created_by ON public.invoices USING btree (created_by);
CREATE INDEX idx_invoices_currency_fk ON public.invoices USING btree (currency_code);
CREATE INDEX idx_invoices_fiscal_year_fk ON public.invoices USING btree (fiscal_year_id) WHERE (fiscal_year_id IS NOT NULL);
CREATE UNIQUE INDEX idx_invoices_idempotency_key ON public.invoices USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_invoices_issue_date_company ON public.invoices USING btree (company_id, issue_date DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_invoices_party_id ON public.invoices USING btree (party_id);
CREATE INDEX idx_invoices_party_status_deleted ON public.invoices USING btree (party_id, status, deleted_at) WHERE ((deleted_at IS NULL) AND (party_id IS NOT NULL));
CREATE INDEX idx_invoices_reference_invoice_id ON public.invoices USING btree (reference_invoice_id);
CREATE INDEX idx_invoices_type ON public.invoices USING btree (company_id, type);
CREATE INDEX idx_invoices_type_status ON public.invoices USING btree (type, status);
CREATE INDEX idx_invoices_updated_by_fk ON public.invoices USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_jel_account ON public.journal_entry_lines USING btree (account_id);
CREATE INDEX idx_jel_account_id ON public.journal_entry_lines USING btree (account_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_jel_deleted_at ON public.journal_entry_lines USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_jel_journal_entry ON public.journal_entry_lines USING btree (journal_entry_id);
CREATE INDEX idx_jel_journal_entry_id ON public.journal_entry_lines USING btree (journal_entry_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_jel_party_entry ON public.journal_entry_lines USING btree (party_id, journal_entry_id) WHERE ((party_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE INDEX idx_job_queue_correlation ON public.sys_job_queue USING btree (correlation_id);
CREATE INDEX idx_job_queue_polling ON public.sys_job_queue USING btree (run_after, numeric_priority) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'retrying'::character varying])::text[]));
CREATE INDEX idx_job_queue_stalled ON public.sys_job_queue USING btree (heartbeat_at, expires_at) WHERE ((status)::text = ANY ((ARRAY['claimed'::character varying, 'processing'::character varying])::text[]));
CREATE INDEX idx_journal_entries_branch_id ON public.journal_entries USING btree (branch_id);
CREATE INDEX idx_journal_entries_company_date ON public.journal_entries USING btree (company_id, created_at DESC);
CREATE INDEX idx_journal_entries_company_id ON public.journal_entries USING btree (company_id);
CREATE INDEX idx_journal_entries_created_by_fk ON public.journal_entries USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE INDEX idx_journal_entries_date ON public.journal_entries USING btree (company_id, entry_date DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_journal_entries_fiscal_year_id ON public.journal_entries USING btree (fiscal_year_id) WHERE (fiscal_year_id IS NOT NULL);
CREATE INDEX idx_journal_entries_ref ON public.journal_entries USING btree (reference_type, reference_id);
CREATE INDEX idx_journal_entries_reference_id ON public.journal_entries USING btree (reference_id);
CREATE INDEX idx_journal_entry_lines_company_id_fk ON public.journal_entry_lines USING btree (company_id);
CREATE INDEX idx_journal_entry_lines_party_id ON public.journal_entry_lines USING btree (party_id);
CREATE INDEX idx_kit_items_comp ON public.product_kit_items USING btree (component_product_id);
CREATE INDEX idx_kit_items_kit ON public.product_kit_items USING btree (kit_product_id);
CREATE INDEX idx_msg_log_company ON public.debt_message_log USING btree (company_id);
CREATE INDEX idx_msg_log_created ON public.debt_message_log USING btree (created_at);
CREATE INDEX idx_msg_log_party ON public.debt_message_log USING btree (party_id);
CREATE INDEX idx_msg_log_status ON public.debt_message_log USING btree (status);
CREATE INDEX idx_msg_templates_company ON public.debt_message_templates USING btree (company_id);
CREATE INDEX idx_notification_log_event ON public.notification_log USING btree (company_id, event_type);
CREATE INDEX idx_opening_balances_company ON public.party_opening_balances USING btree (company_id);
CREATE INDEX idx_opening_balances_party ON public.party_opening_balances USING btree (party_id);
CREATE INDEX idx_part_cache_exp ON public.part_catalog_cache USING btree (expires_at);
CREATE INDEX idx_part_cache_num ON public.part_catalog_cache USING btree (normalized_number);
CREATE INDEX idx_part_cache_prov ON public.part_catalog_cache USING btree (provider);
CREATE INDEX idx_part_compat_company ON public.part_compatibility USING btree (company_id);
CREATE INDEX idx_part_compat_part ON public.part_compatibility USING btree (part_number);
CREATE INDEX idx_part_compat_vehicle ON public.part_compatibility USING btree (vehicle_make, vehicle_model);
CREATE INDEX idx_parties_category_id ON public.parties USING btree (category_id);
CREATE INDEX idx_parties_company_id ON public.parties USING btree (company_id);
CREATE INDEX idx_parties_company_name ON public.parties USING btree (company_id, name);
CREATE INDEX idx_parties_company_type ON public.parties USING btree (company_id, type);
CREATE INDEX idx_parties_company_type_name ON public.parties USING btree (company_id, type, name) WHERE (deleted_at IS NULL);
CREATE INDEX idx_parties_name ON public.parties USING btree (name);
CREATE INDEX idx_parties_type_active ON public.parties USING btree (company_id, type, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_parties_updated_by_fk ON public.parties USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_payment_allocations_company_id ON public.payment_allocations USING btree (company_id);
CREATE INDEX idx_payment_allocations_invoice_id ON public.payment_allocations USING btree (invoice_id);
CREATE INDEX idx_payments_account_fk ON public.payments USING btree (account_id) WHERE (account_id IS NOT NULL);
CREATE INDEX idx_payments_branch_id ON public.payments USING btree (branch_id);
CREATE INDEX idx_payments_company_date ON public.payments USING btree (company_id, payment_date);
CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);
CREATE INDEX idx_payments_currency_fk ON public.payments USING btree (currency_code);
CREATE INDEX idx_payments_party_id ON public.payments USING btree (party_id);
CREATE INDEX idx_payments_updated_by_fk ON public.payments USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_product_categories_parent_fk ON public.product_categories USING btree (parent_id) WHERE (parent_id IS NOT NULL);
CREATE INDEX idx_product_cross_refs_created_by ON public.product_cross_references USING btree (created_by);
CREATE INDEX idx_product_fitment_company_id ON public.product_fitment USING btree (company_id);
CREATE INDEX idx_product_fitment_product_id ON public.product_fitment USING btree (product_id);
CREATE INDEX idx_product_fitment_vehicle_id ON public.product_fitment USING btree (vehicle_id);
CREATE INDEX idx_product_kit_items_company_fk ON public.product_kit_items USING btree (company_id);
CREATE INDEX idx_product_search_numbers_norm ON public.product_search_numbers USING btree (company_id, normalized_number);
CREATE INDEX idx_product_search_numbers_prod ON public.product_search_numbers USING btree (product_id);
CREATE INDEX idx_product_stock_company_id ON public.product_stock USING btree (company_id);
CREATE INDEX idx_product_stock_product_id ON public.product_stock USING btree (product_id);
CREATE INDEX idx_product_stock_updated_by_fk ON public.product_stock USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_product_stock_warehouse_id ON public.product_stock USING btree (warehouse_id);
CREATE INDEX idx_product_supplier_prices_company_id ON public.product_supplier_prices USING btree (company_id);
CREATE INDEX idx_product_supplier_prices_created_by_fk ON public.product_supplier_prices USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE INDEX idx_product_supplier_prices_currency_fk ON public.product_supplier_prices USING btree (currency_code);
CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);
CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX idx_products_company_id ON public.products USING btree (company_id);
CREATE INDEX idx_products_company_status ON public.products USING btree (company_id, status);
CREATE INDEX idx_products_company_updated ON public.products USING btree (company_id, updated_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_products_deleted_active ON public.products USING btree (company_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_products_global_search ON public.products USING gin (global_search_text gin_trgm_ops);
CREATE INDEX idx_products_part_number ON public.products USING btree (part_number) WHERE ((deleted_at IS NULL) AND (part_number IS NOT NULL));
CREATE INDEX idx_products_search_vector ON public.products USING gin (search_vector);
CREATE INDEX idx_products_updated_by_fk ON public.products USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE INDEX idx_promises_company ON public.debt_payment_promises USING btree (company_id);
CREATE INDEX idx_promises_date ON public.debt_payment_promises USING btree (promise_date);
CREATE INDEX idx_promises_party ON public.debt_payment_promises USING btree (party_id);
CREATE INDEX idx_promises_status ON public.debt_payment_promises USING btree (status);
CREATE INDEX idx_quotation_items_company_fk ON public.quotation_items USING btree (company_id);
CREATE INDEX idx_quotation_items_product_fk ON public.quotation_items USING btree (product_id);
CREATE INDEX idx_quotation_items_quotation_fk ON public.quotation_items USING btree (quotation_id);
CREATE INDEX idx_quotations_branch_id ON public.quotations USING btree (branch_id);
CREATE INDEX idx_quotations_company_date_status ON public.quotations USING btree (company_id, issue_date DESC, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_quotations_converted_invoice_fk ON public.quotations USING btree (converted_invoice_id) WHERE (converted_invoice_id IS NOT NULL);
CREATE INDEX idx_quotations_party_fk ON public.quotations USING btree (party_id);
CREATE INDEX idx_quotations_type ON public.quotations USING btree (type);
CREATE INDEX idx_role_permissions_perm ON public.role_permissions USING btree (permission);
CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role);
CREATE INDEX idx_sti_company_fk ON public.stock_transfer_items USING btree (company_id);
CREATE INDEX idx_sti_created_by_fk ON public.stock_transfer_items USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE INDEX idx_sti_transfer_fk ON public.stock_transfer_items USING btree (transfer_id);
CREATE INDEX idx_stock_transfer_items_product_id ON public.stock_transfer_items USING btree (product_id);
CREATE INDEX idx_stock_transfers_company_id ON public.stock_transfers USING btree (company_id);
CREATE INDEX idx_stock_transfers_created_by ON public.stock_transfers USING btree (created_by);
CREATE INDEX idx_stock_transfers_from_warehouse ON public.stock_transfers USING btree (from_warehouse_id);
CREATE INDEX idx_stock_transfers_to_warehouse ON public.stock_transfers USING btree (to_warehouse_id);
CREATE INDEX idx_sup_prices_product ON public.product_supplier_prices USING btree (product_id);
CREATE INDEX idx_sup_prices_supplier ON public.product_supplier_prices USING btree (supplier_id);
CREATE INDEX idx_supplier_price_history_company_id ON public.supplier_price_history USING btree (company_id);
CREATE INDEX idx_supplier_price_history_currency_fk ON public.supplier_price_history USING btree (currency_code);
CREATE INDEX idx_supplier_price_history_product_id ON public.supplier_price_history USING btree (product_id);
CREATE INDEX idx_supplier_price_history_supplier_id ON public.supplier_price_history USING btree (supplier_id);
CREATE INDEX idx_supplier_ratings_company_id ON public.supplier_ratings USING btree (company_id);
CREATE INDEX idx_supplier_ratings_rated_by ON public.supplier_ratings USING btree (rated_by);
CREATE INDEX idx_supplier_ratings_supplier_id ON public.supplier_ratings USING btree (supplier_id);
CREATE INDEX idx_sys_activity_log_action_date ON public.sys_activity_log USING btree (action, occurred_at DESC);
CREATE INDEX idx_sys_activity_log_company_action_date ON public.sys_activity_log USING btree (company_id, action, occurred_at DESC);
CREATE INDEX idx_sys_activity_log_company_date ON public.sys_activity_log USING btree (company_id, occurred_at DESC);
CREATE INDEX idx_sys_activity_log_user_date ON public.sys_activity_log USING btree (user_id, occurred_at DESC);
CREATE INDEX idx_ucr_branch_id ON public.user_company_roles USING btree (branch_id);
CREATE INDEX idx_user_company_roles_company_id ON public.user_company_roles USING btree (company_id);
CREATE INDEX idx_user_company_roles_user_company ON public.user_company_roles USING btree (user_id, company_id);
CREATE INDEX idx_user_company_roles_user_id ON public.user_company_roles USING btree (user_id);
CREATE INDEX idx_vehicle_products_company ON public.vehicle_products USING btree (company_id);
CREATE INDEX idx_vehicle_products_product ON public.vehicle_products USING btree (product_id);
CREATE INDEX idx_vehicle_products_vehicle ON public.vehicle_products USING btree (vehicle_id);
CREATE INDEX idx_vehicles_make_model ON public.vehicles USING btree (make, model);
CREATE INDEX idx_vehicles_vin_prefix ON public.vehicles USING btree (vin_prefix);
CREATE INDEX idx_vin_analyses_company ON public.vin_analyses USING btree (company_id);
CREATE INDEX idx_vin_analyses_vin ON public.vin_analyses USING btree (vin);
CREATE INDEX idx_warehouses_branch_fk ON public.warehouses USING btree (branch_id) WHERE (branch_id IS NOT NULL);
CREATE INDEX idx_warehouses_company_id ON public.warehouses USING btree (company_id);
CREATE INDEX idx_warehouses_updated_by_fk ON public.warehouses USING btree (updated_by) WHERE (updated_by IS NOT NULL);
CREATE UNIQUE INDEX incentive_adjustments_pkey ON public.incentive_adjustments USING btree (id);
CREATE UNIQUE INDEX incentive_assignments_pkey ON public.incentive_assignments USING btree (id);
CREATE UNIQUE INDEX incentive_calculation_lines_pkey ON public.incentive_calculation_lines USING btree (id);
CREATE UNIQUE INDEX incentive_calculations_company_id_uq ON public.incentive_calculations USING btree (company_id, id);
CREATE UNIQUE INDEX incentive_calculations_pkey ON public.incentive_calculations USING btree (id);
CREATE UNIQUE INDEX incentive_engineer_links_pkey ON public.incentive_engineer_links USING btree (id);
CREATE UNIQUE INDEX incentive_payments_pkey ON public.incentive_payments USING btree (id);
CREATE UNIQUE INDEX incentive_pending_invoices_pkey ON public.incentive_pending_invoices USING btree (id);
CREATE UNIQUE INDEX incentive_periods_company_id_uq ON public.incentive_periods USING btree (company_id, id);
CREATE UNIQUE INDEX incentive_periods_pkey ON public.incentive_periods USING btree (id);
CREATE UNIQUE INDEX incentive_plans_pkey ON public.incentive_plans USING btree (id);
CREATE UNIQUE INDEX incentive_rules_pkey ON public.incentive_rules USING btree (id);
CREATE UNIQUE INDEX incentive_targets_pkey ON public.incentive_targets USING btree (id);
CREATE UNIQUE INDEX incentive_tiers_pkey ON public.incentive_tiers USING btree (id);
CREATE UNIQUE INDEX inv_stock_audit_items_pkey ON public.inv_stock_audit_items USING btree (id);
CREATE UNIQUE INDEX inv_stock_audits_company_id_audit_number_key ON public.inv_stock_audits USING btree (company_id, audit_number);
CREATE UNIQUE INDEX inv_stock_audits_pkey ON public.inv_stock_audits USING btree (id);
CREATE UNIQUE INDEX inv_stock_ledger_company_id_warehouse_id_product_id_key ON public.inv_stock_ledger USING btree (company_id, warehouse_id, product_id);
CREATE UNIQUE INDEX inv_stock_ledger_pkey ON public.inv_stock_ledger USING btree (id);
CREATE UNIQUE INDEX inv_stock_movement_items_pkey ON public.inv_stock_movement_items USING btree (id);
CREATE UNIQUE INDEX inv_stock_movements_company_id_movement_number_key ON public.inv_stock_movements USING btree (company_id, movement_number);
CREATE UNIQUE INDEX inv_stock_movements_pkey ON public.inv_stock_movements USING btree (id);
CREATE UNIQUE INDEX inv_warehouses_company_id_code_key ON public.inv_warehouses USING btree (company_id, code);
CREATE UNIQUE INDEX inv_warehouses_pkey ON public.inv_warehouses USING btree (id);
CREATE UNIQUE INDEX inventory_session_drafts_pkey ON public.inventory_session_drafts USING btree (id);
CREATE UNIQUE INDEX inventory_session_drafts_session_id_idx ON public.inventory_session_drafts USING btree (session_id);
CREATE UNIQUE INDEX inventory_transactions_pkey ON public.inventory_transactions USING btree (id);
CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);
CREATE UNIQUE INDEX invoice_items_pkey ON public.invoice_items USING btree (id);
CREATE UNIQUE INDEX invoices_company_id_uq ON public.invoices USING btree (company_id, id);
CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);
CREATE UNIQUE INDEX invoices_unique_number_per_company_type ON public.invoices USING btree (company_id, type, invoice_number);
CREATE INDEX ix_assignments_company_plan ON public.incentive_assignments USING btree (company_id, plan_id);
CREATE INDEX ix_assignments_company_user ON public.incentive_assignments USING btree (company_id, user_id, status);
CREATE INDEX ix_assignments_user_from ON public.incentive_assignments USING btree (user_id, effective_from);
CREATE INDEX ix_links_invoice ON public.incentive_engineer_links USING btree (invoice_id, status);
CREATE INDEX ix_links_user_company ON public.incentive_engineer_links USING btree (user_id, company_id);
CREATE INDEX ix_pay_calculation ON public.incentive_payments USING btree (calculation_id);
CREATE INDEX ix_pay_company_date ON public.incentive_payments USING btree (company_id, payment_date);
CREATE INDEX ix_pending_branch ON public.incentive_pending_invoices USING btree (branch_id, status);
CREATE INDEX ix_pending_company_resolved ON public.incentive_pending_invoices USING btree (company_id, status, detected_at);
CREATE INDEX ix_periods_company_range ON public.incentive_periods USING btree (company_id, period_start, period_end);
CREATE INDEX ix_periods_company_state ON public.incentive_periods USING btree (company_id, state);
CREATE INDEX ix_plans_company_status ON public.incentive_plans USING btree (company_id, status, deleted_at);
CREATE INDEX ix_rules_company_plan ON public.incentive_rules USING btree (company_id, plan_id);
CREATE INDEX ix_rules_plan_active ON public.incentive_rules USING btree (plan_id, is_active, priority, deleted_at);
CREATE INDEX ix_tiers_plan_order ON public.incentive_tiers USING btree (plan_id, tier_order);
CREATE INDEX ix_tiers_rule ON public.incentive_tiers USING btree (rule_id);
CREATE UNIQUE INDEX journal_entries_pkey ON public.journal_entries USING btree (id);
CREATE UNIQUE INDEX journal_entries_unique_number_per_company ON public.journal_entries USING btree (company_id, entry_number);
CREATE UNIQUE INDEX journal_entry_lines_pkey ON public.journal_entry_lines USING btree (id);
CREATE UNIQUE INDEX links_invoice_user_uq ON public.incentive_engineer_links USING btree (invoice_id, user_id);
CREATE UNIQUE INDEX messaging_config_company_id_key ON public.messaging_config USING btree (company_id);
CREATE UNIQUE INDEX messaging_config_pkey ON public.messaging_config USING btree (id);
CREATE UNIQUE INDEX monthly_targets_pkey ON public.monthly_targets USING btree (id);
CREATE UNIQUE INDEX monthly_targets_unique ON public.monthly_targets USING btree (company_id, branch_id, year, month);
CREATE UNIQUE INDEX notification_log_pkey ON public.notification_log USING btree (id);
CREATE UNIQUE INDEX part_catalog_cache_pkey ON public.part_catalog_cache USING btree (id);
CREATE UNIQUE INDEX part_compatibility_pkey ON public.part_compatibility USING btree (id);
CREATE UNIQUE INDEX parties_pkey ON public.parties USING btree (id);
CREATE UNIQUE INDEX party_categories_pkey ON public.party_categories USING btree (id);
CREATE UNIQUE INDEX party_categories_unique_name_per_company ON public.party_categories USING btree (company_id, name);
CREATE UNIQUE INDEX party_opening_balances_pkey ON public.party_opening_balances USING btree (id);
CREATE UNIQUE INDEX payment_allocations_pkey ON public.payment_allocations USING btree (id);
CREATE UNIQUE INDEX payments_company_payment_number_unique ON public.payments USING btree (company_id, payment_number);
CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);
CREATE UNIQUE INDEX payments_unique_number_per_company ON public.payments USING btree (company_id, type, payment_number);
CREATE UNIQUE INDEX pending_invoice_uq ON public.incentive_pending_invoices USING btree (company_id, invoice_id);
CREATE UNIQUE INDEX prc_contract_items_pkey ON public.prc_contract_items USING btree (contract_item_id);
CREATE UNIQUE INDEX prc_goods_receipt_documents_pkey ON public.prc_goods_receipt_documents USING btree (document_id);
CREATE UNIQUE INDEX prc_goods_receipt_items_pkey ON public.prc_goods_receipt_items USING btree (grn_item_id);
CREATE UNIQUE INDEX prc_goods_receipts_company_id_grn_number_key ON public.prc_goods_receipts USING btree (company_id, grn_number);
CREATE UNIQUE INDEX prc_goods_receipts_pkey ON public.prc_goods_receipts USING btree (grn_id);
CREATE UNIQUE INDEX prc_purchase_invoice_items_pkey ON public.prc_purchase_invoice_items USING btree (invoice_item_id);
CREATE UNIQUE INDEX prc_purchase_invoices_company_id_supplier_id_invoice_number_key ON public.prc_purchase_invoices USING btree (company_id, supplier_id, invoice_number);
CREATE UNIQUE INDEX prc_purchase_invoices_pkey ON public.prc_purchase_invoices USING btree (invoice_id);
CREATE UNIQUE INDEX prc_purchase_order_documents_pkey ON public.prc_purchase_order_documents USING btree (document_id);
CREATE UNIQUE INDEX prc_purchase_order_items_pkey ON public.prc_purchase_order_items USING btree (po_item_id);
CREATE UNIQUE INDEX prc_purchase_orders_company_id_po_number_key ON public.prc_purchase_orders USING btree (company_id, po_number);
CREATE UNIQUE INDEX prc_purchase_orders_pkey ON public.prc_purchase_orders USING btree (po_id);
CREATE UNIQUE INDEX prc_purchase_request_documents_pkey ON public.prc_purchase_request_documents USING btree (document_id);
CREATE UNIQUE INDEX prc_purchase_request_items_pkey ON public.prc_purchase_request_items USING btree (pr_item_id);
CREATE UNIQUE INDEX prc_purchase_requests_company_id_pr_number_key ON public.prc_purchase_requests USING btree (company_id, pr_number);
CREATE UNIQUE INDEX prc_purchase_requests_pkey ON public.prc_purchase_requests USING btree (pr_id);
CREATE UNIQUE INDEX prc_quotation_documents_pkey ON public.prc_quotation_documents USING btree (document_id);
CREATE UNIQUE INDEX prc_quotation_items_pkey ON public.prc_quotation_items USING btree (quotation_item_id);
CREATE UNIQUE INDEX prc_quotations_pkey ON public.prc_quotations USING btree (quotation_id);
CREATE UNIQUE INDEX prc_quotations_rfq_id_supplier_id_key ON public.prc_quotations USING btree (rfq_id, supplier_id);
CREATE UNIQUE INDEX prc_rfq_evaluation_items_pkey ON public.prc_rfq_evaluation_items USING btree (evaluation_item_id);
CREATE UNIQUE INDEX prc_rfq_evaluation_scores_evaluation_id_quotation_id_key ON public.prc_rfq_evaluation_scores USING btree (evaluation_id, quotation_id);
CREATE UNIQUE INDEX prc_rfq_evaluation_scores_pkey ON public.prc_rfq_evaluation_scores USING btree (score_id);
CREATE UNIQUE INDEX prc_rfq_evaluations_company_id_rfq_id_key ON public.prc_rfq_evaluations USING btree (company_id, rfq_id);
CREATE UNIQUE INDEX prc_rfq_evaluations_pkey ON public.prc_rfq_evaluations USING btree (evaluation_id);
CREATE UNIQUE INDEX prc_rfq_items_pkey ON public.prc_rfq_items USING btree (rfq_item_id);
CREATE UNIQUE INDEX prc_rfq_suppliers_pkey ON public.prc_rfq_suppliers USING btree (rfq_supplier_id);
CREATE UNIQUE INDEX prc_rfq_suppliers_rfq_id_supplier_id_key ON public.prc_rfq_suppliers USING btree (rfq_id, supplier_id);
CREATE UNIQUE INDEX prc_rfqs_company_id_rfq_number_key ON public.prc_rfqs USING btree (company_id, rfq_number);
CREATE UNIQUE INDEX prc_rfqs_pkey ON public.prc_rfqs USING btree (rfq_id);
CREATE UNIQUE INDEX prc_supplier_addresses_pkey ON public.prc_supplier_addresses USING btree (address_id);
CREATE UNIQUE INDEX prc_supplier_bank_accounts_pkey ON public.prc_supplier_bank_accounts USING btree (bank_account_id);
CREATE UNIQUE INDEX prc_supplier_capabilities_pkey ON public.prc_supplier_capabilities USING btree (capability_id);
CREATE UNIQUE INDEX prc_supplier_capabilities_supplier_id_capability_name_key ON public.prc_supplier_capabilities USING btree (supplier_id, capability_name);
CREATE UNIQUE INDEX prc_supplier_categories_company_id_name_key ON public.prc_supplier_categories USING btree (company_id, name);
CREATE UNIQUE INDEX prc_supplier_categories_pkey ON public.prc_supplier_categories USING btree (category_id);
CREATE UNIQUE INDEX prc_supplier_contacts_pkey ON public.prc_supplier_contacts USING btree (contact_id);
CREATE UNIQUE INDEX prc_supplier_contracts_contract_number_key ON public.prc_supplier_contracts USING btree (contract_number);
CREATE UNIQUE INDEX prc_supplier_contracts_pkey ON public.prc_supplier_contracts USING btree (contract_id);
CREATE UNIQUE INDEX prc_supplier_documents_pkey ON public.prc_supplier_documents USING btree (document_id);
CREATE UNIQUE INDEX prc_supplier_metrics_company_id_supplier_id_period_start_pe_key ON public.prc_supplier_metrics USING btree (company_id, supplier_id, period_start, period_end);
CREATE UNIQUE INDEX prc_supplier_metrics_pkey ON public.prc_supplier_metrics USING btree (metric_id);
CREATE UNIQUE INDEX prc_supplier_prices_pkey ON public.prc_supplier_prices USING btree (price_id);
CREATE UNIQUE INDEX prc_supplier_products_pkey ON public.prc_supplier_products USING btree (supplier_product_id);
CREATE UNIQUE INDEX prc_supplier_products_supplier_id_product_id_key ON public.prc_supplier_products USING btree (supplier_id, product_id);
CREATE UNIQUE INDEX prc_supplier_scores_pkey ON public.prc_supplier_scores USING btree (score_id);
CREATE UNIQUE INDEX prc_supplier_scores_supplier_id_key ON public.prc_supplier_scores USING btree (supplier_id);
CREATE UNIQUE INDEX prc_supplier_sla_violations_pkey ON public.prc_supplier_sla_violations USING btree (violation_id);
CREATE UNIQUE INDEX prc_supplier_slas_company_id_supplier_id_sla_name_key ON public.prc_supplier_slas USING btree (company_id, supplier_id, sla_name);
CREATE UNIQUE INDEX prc_supplier_slas_pkey ON public.prc_supplier_slas USING btree (sla_id);
CREATE UNIQUE INDEX prc_supplier_terms_pkey ON public.prc_supplier_terms USING btree (terms_id);
CREATE UNIQUE INDEX prc_supplier_terms_supplier_id_key ON public.prc_supplier_terms USING btree (supplier_id);
CREATE UNIQUE INDEX prc_suppliers_pkey ON public.prc_suppliers USING btree (supplier_id);
CREATE UNIQUE INDEX prc_suppliers_supplier_code_key ON public.prc_suppliers USING btree (supplier_code);
CREATE UNIQUE INDEX prc_three_way_matches_pkey ON public.prc_three_way_matches USING btree (match_id);
CREATE UNIQUE INDEX product_categories_pkey ON public.product_categories USING btree (id);
CREATE UNIQUE INDEX product_categories_unique_name_per_company ON public.product_categories USING btree (company_id, name);
CREATE UNIQUE INDEX product_cross_references_pkey ON public.product_cross_references USING btree (id);
CREATE UNIQUE INDEX product_fitment_pkey ON public.product_fitment USING btree (id);
CREATE UNIQUE INDEX product_kit_items_kit_product_id_component_product_id_key ON public.product_kit_items USING btree (kit_product_id, component_product_id);
CREATE UNIQUE INDEX product_kit_items_pkey ON public.product_kit_items USING btree (id);
CREATE UNIQUE INDEX product_search_numbers_pkey ON public.product_search_numbers USING btree (id);
CREATE UNIQUE INDEX product_search_numbers_product_id_normalized_number_number__key ON public.product_search_numbers USING btree (product_id, normalized_number, number_type);
CREATE UNIQUE INDEX product_stock_pkey ON public.product_stock USING btree (id);
CREATE UNIQUE INDEX product_supplier_prices_pkey ON public.product_supplier_prices USING btree (id);
CREATE UNIQUE INDEX product_supplier_prices_product_id_supplier_id_key ON public.product_supplier_prices USING btree (product_id, supplier_id);
CREATE UNIQUE INDEX product_uoms_pkey ON public.product_uoms USING btree (id);
CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX quotation_items_pkey ON public.quotation_items USING btree (id);
CREATE UNIQUE INDEX quotations_pkey ON public.quotations USING btree (id);
CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id);
CREATE UNIQUE INDEX role_permissions_role_permission_key ON public.role_permissions USING btree (role, permission);
CREATE UNIQUE INDEX staging_jaafari_import_pkey ON public.staging_jaafari_import USING btree (id);
CREATE UNIQUE INDEX stock_transfer_items_pkey ON public.stock_transfer_items USING btree (id);
CREATE UNIQUE INDEX stock_transfers_pkey ON public.stock_transfers USING btree (id);
CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);
CREATE UNIQUE INDEX super_admins_pkey ON public.super_admins USING btree (user_id);
CREATE UNIQUE INDEX supplier_price_history_pkey ON public.supplier_price_history USING btree (id);
CREATE UNIQUE INDEX supplier_ratings_pkey ON public.supplier_ratings USING btree (id);
CREATE UNIQUE INDEX supported_currencies_pkey ON public.supported_currencies USING btree (code);
CREATE UNIQUE INDEX suspended_orders_pkey ON public.suspended_orders USING btree (id);
CREATE UNIQUE INDEX sys_activity_log_pkey ON public.sys_activity_log USING btree (id);
CREATE UNIQUE INDEX sys_background_workers_pkey ON public.sys_background_workers USING btree (worker_id);
CREATE UNIQUE INDEX sys_business_calendars_pkey ON public.sys_business_calendars USING btree (calendar_id);
CREATE UNIQUE INDEX sys_config_registry_pkey ON public.sys_config_registry USING btree (key, company_id);
CREATE UNIQUE INDEX sys_dead_letter_queue_pkey ON public.sys_dead_letter_queue USING btree (dlq_id);
CREATE UNIQUE INDEX sys_domain_events_pkey ON public.sys_domain_events USING btree (event_id);
CREATE UNIQUE INDEX sys_error_codes_pkey ON public.sys_error_codes USING btree (code);
CREATE UNIQUE INDEX sys_feature_flags_pkey ON public.sys_feature_flags USING btree (flag_name, company_id);
CREATE UNIQUE INDEX sys_job_archive_pkey ON public.sys_job_archive USING btree (archive_id);
CREATE UNIQUE INDEX sys_job_queue_pkey ON public.sys_job_queue USING btree (job_id);
CREATE UNIQUE INDEX sys_job_types_pkey ON public.sys_job_types USING btree (job_type);
CREATE UNIQUE INDEX sys_notification_queue_pkey ON public.sys_notification_queue USING btree (notification_id);
CREATE UNIQUE INDEX sys_notification_templates_name_version_language_channel_key ON public.sys_notification_templates USING btree (name, version, language, channel);
CREATE UNIQUE INDEX sys_notification_templates_pkey ON public.sys_notification_templates USING btree (template_id);
CREATE UNIQUE INDEX sys_workflow_actions_pkey ON public.sys_workflow_actions USING btree (action_id);
CREATE UNIQUE INDEX sys_workflow_conditions_pkey ON public.sys_workflow_conditions USING btree (condition_id);
CREATE UNIQUE INDEX sys_workflow_definitions_pkey ON public.sys_workflow_definitions USING btree (workflow_id);
CREATE UNIQUE INDEX sys_workflow_history_pkey ON public.sys_workflow_history USING btree (history_id);
CREATE UNIQUE INDEX sys_workflow_instances_pkey ON public.sys_workflow_instances USING btree (instance_id);
CREATE UNIQUE INDEX sys_workflow_states_pkey ON public.sys_workflow_states USING btree (state_id);
CREATE UNIQUE INDEX sys_workflow_templates_pkey ON public.sys_workflow_templates USING btree (template_id);
CREATE UNIQUE INDEX sys_workflow_transitions_pkey ON public.sys_workflow_transitions USING btree (transition_id);
CREATE UNIQUE INDEX system_broadcasts_pkey ON public.system_broadcasts USING btree (id);
CREATE UNIQUE INDEX tax_rates_pkey ON public.tax_rates USING btree (id);
CREATE UNIQUE INDEX uq_accounts_company_code ON public.accounts USING btree (company_id, code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_allocation_per_payment_invoice ON public.payment_allocations USING btree (payment_id, invoice_id);
CREATE UNIQUE INDEX uq_cross_ref_symmetric ON public.product_cross_references USING btree (company_id, LEAST(base_product_id, alternative_product_id), GREATEST(base_product_id, alternative_product_id));
CREATE UNIQUE INDEX uq_exchange_rate_company_currency_date ON public.exchange_rates USING btree (company_id, currency_code, effective_date);
CREATE UNIQUE INDEX uq_ext_fitment_provider_part_vin ON public.external_fitment_evidence USING btree (provider, normalized_number, vin);
CREATE UNIQUE INDEX uq_ext_xref_provider_pair ON public.external_cross_references USING btree (provider, source_number, target_number);
CREATE UNIQUE INDEX uq_invoice_number_company ON public.invoices USING btree (company_id, invoice_number);
CREATE UNIQUE INDEX uq_invoices_company_number ON public.invoices USING btree (company_id, invoice_number) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_journal_entry_per_document_reference ON public.journal_entries USING btree (reference_id, reference_type) WHERE ((reference_type = ANY (ARRAY['sales_invoice'::text, 'purchase_invoice'::text, 'sales_return'::text, 'receipt_bond'::text, 'payment_bond'::text])) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uq_one_base_currency ON public.supported_currencies USING btree (is_base) WHERE (is_base = true);
CREATE UNIQUE INDEX uq_one_default_tax_rate_per_company ON public.tax_rates USING btree (company_id) WHERE ((is_default = true) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uq_one_primary_warehouse_per_company ON public.warehouses USING btree (company_id) WHERE ((is_primary = true) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uq_part_cache_provider_number ON public.part_catalog_cache USING btree (provider, normalized_number);
CREATE UNIQUE INDEX uq_part_compat ON public.part_compatibility USING btree (company_id, part_number, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX uq_party_opening_balance ON public.party_opening_balances USING btree (company_id, party_id, currency_code);
CREATE UNIQUE INDEX uq_payments_company_number ON public.payments USING btree (company_id, payment_number) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_product_fitment ON public.product_fitment USING btree (product_id, vehicle_id);
CREATE UNIQUE INDEX uq_product_stock_per_warehouse ON public.product_stock USING btree (product_id, warehouse_id);
CREATE UNIQUE INDEX uq_products_company_sku ON public.products USING btree (company_id, sku);
CREATE UNIQUE INDEX uq_user_role_per_company ON public.user_company_roles USING btree (user_id, company_id);
CREATE UNIQUE INDEX uq_vehicle_product ON public.vehicle_products USING btree (vehicle_id, product_id);
CREATE UNIQUE INDEX uq_vin_analyses_company_vin ON public.vin_analyses USING btree (company_id, vin);
CREATE UNIQUE INDEX uq_workflow_name_version ON public.sys_workflow_definitions USING btree (company_id, name, workflow_version);
CREATE UNIQUE INDEX user_company_roles_pkey ON public.user_company_roles USING btree (id);
CREATE UNIQUE INDEX vehicle_products_pkey ON public.vehicle_products USING btree (id);
CREATE UNIQUE INDEX vehicles_pkey ON public.vehicles USING btree (id);
CREATE UNIQUE INDEX vin_analyses_pkey ON public.vin_analyses USING btree (id);
CREATE UNIQUE INDEX warehouses_pkey ON public.warehouses USING btree (id);

