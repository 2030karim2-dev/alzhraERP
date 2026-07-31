create extension if not exists "uuid-ossp";

create table if not exists inventory_session_drafts (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references audit_sessions not null,
  warehouse_id uuid references warehouses,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists inventory_session_drafts_session_id_idx on inventory_session_drafts(session_id);

-- auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_inventory_session_drafts_updated_at on inventory_session_drafts;
create trigger update_inventory_session_drafts_updated_at
  before update on inventory_session_drafts
  for each row execute function update_updated_at_column();