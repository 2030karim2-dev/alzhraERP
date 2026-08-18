-- ============================================================
-- 20260819000005_file_attachments_storage.sql
--
-- Fixes two production readiness gaps found in the 2026-08-18 audit:
--   G1: `file_attachments` table missing from the live DB while
--       src/core/services/storage.service.ts writes to it (PGRST 404).
--   G2: storage buckets `invoices` + `company-assets` referenced by the
--       app (BucketName type / storage policies) are missing — only
--       `avatars` and `product-images` exist. Policies for
--       `company-assets` already exist in `storage.objects`, only the
--       bucket row is missing.
--
-- Tenant isolation follows the established RLS pattern used across the
-- schema: `is_super_admin() OR (company_id IN (SELECT get_auth_companies()))`.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1) file_attachments table (metadata for files in Supabase Storage)
-- ────────────────────────────────────────────────────────────
create table if not exists public.file_attachments (
    id            uuid primary key default gen_random_uuid(),
    company_id    uuid not null references public.companies(id) on delete cascade,
    entity_type   text not null
                  constraint file_attachments_entity_type_check
                  check (entity_type in ('product', 'invoice', 'party', 'expense', 'journal_entry')),
    entity_id     uuid not null,
    storage_path  text not null,
    file_name     text not null,
    file_size     bigint not null default 0,
    mime_type     text not null default 'application/octet-stream',
    created_by    uuid references auth.users(id) on delete set null,
    created_at    timestamptz not null default now()
);

comment on table public.file_attachments is
    'Metadata for files uploaded to Supabase Storage, scoped per company (tenant isolation via RLS).';

create index if not exists file_attachments_company_idx on public.file_attachments (company_id);
create index if not exists file_attachments_entity_idx  on public.file_attachments (entity_type, entity_id);
create index if not exists file_attachments_created_idx on public.file_attachments (created_at desc);

alter table public.file_attachments enable row level security;

drop policy if exists "file_attachments_delete" on public.file_attachments;
create policy "file_attachments_delete"
    on public.file_attachments for delete to public
    using (is_super_admin() OR (company_id IN (SELECT get_auth_companies())));

drop policy if exists "file_attachments_insert" on public.file_attachments;
create policy "file_attachments_insert"
    on public.file_attachments for insert to public
    with check (is_super_admin() OR (company_id IN (SELECT get_auth_companies())));

drop policy if exists "file_attachments_select" on public.file_attachments;
create policy "file_attachments_select"
    on public.file_attachments for select to public
    using (is_super_admin() OR (company_id IN (SELECT get_auth_companies())));

drop policy if exists "file_attachments_update" on public.file_attachments;
create policy "file_attachments_update"
    on public.file_attachments for update to public
    using (is_super_admin() OR (company_id IN (SELECT get_auth_companies())))
    with check (is_super_admin() OR (company_id IN (SELECT get_auth_companies())));

-- Expose to the Data API for the roles the app runs with.
grant select, insert, update, delete on public.file_attachments to authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- 2) Missing storage buckets
--    `invoices`   → public read (like product-images) so
--                   storageService.getPublicUrl() works for receipts.
--    `company-assets` → policies already exist; only the bucket row is missing.
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true),
       ('invoices',       'invoices',       true)
on conflict (id) do nothing;

-- invoices storage policies (mirror the existing product-images pattern)
drop policy if exists "Authenticated users insert invoices" on storage.objects;
create policy "Authenticated users insert invoices"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'invoices');

drop policy if exists "Authenticated users select invoices" on storage.objects;
create policy "Authenticated users select invoices"
    on storage.objects for select to authenticated
    using (bucket_id = 'invoices');

drop policy if exists "Authenticated users update invoices" on storage.objects;
create policy "Authenticated users update invoices"
    on storage.objects for update to authenticated
    using (bucket_id = 'invoices');

drop policy if exists "Authenticated users delete invoices" on storage.objects;
create policy "Authenticated users delete invoices"
    on storage.objects for delete to authenticated
    using (bucket_id = 'invoices');
