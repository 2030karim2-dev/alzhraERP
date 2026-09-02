# ADR-001: PostgreSQL + Supabase as Single Source of Truth

## Status

Accepted

## Date

2026-08-10

## Context

Al-Zahra Smart ERP needs a reliable, secure, multi-tenant database. The system handles financial transactions (sales, purchases, accounting), inventory management, customer relationships, and AI-powered automotive parts intelligence.

## Decision

Use **PostgreSQL via Supabase** as the single source of truth with:

- **Row Level Security (RLS)** for tenant isolation (every table has `company_id`-based policies)
- **SECURITY DEFINER** functions for complex business logic (atomic transactions, financial validations)
- **Supabase Auth** for user authentication (JWT tokens)
- **Supabase Edge Functions** for external API calls and AI proxy
- **PostgREST** auto-generated REST API (typed via `database.types.ts`)

## Alternatives Considered

### MongoDB / NoSQL

- Rejected: Financial data is inherently relational (invoices → items → products → stock). Document databases create complex join logic and duplicate data.

### Direct PostgreSQL (without Supabase)

- Rejected: Supabase provides managed auth, RLS, realtime, and auto-generated types — significantly reducing infrastructure overhead.

### MySQL

- Rejected: PostgreSQL's RLS, superior JSON support, and Supabase integration make it the better choice for multi-tenant SaaS.

## Consequences

### Positive

- Auto-generated TypeScript types keep frontend in sync with schema
- RLS eliminates need for middleware authorization checks
- Edge Functions isolate third-party API keys from browser
- Single database simplifies backups and disaster recovery

### Negative

- database.types.ts becomes very large (22K+ lines for 143 tables)
- All business logic must be in PostgreSQL functions or Edge Functions
- Schema changes require coordinated migrations
