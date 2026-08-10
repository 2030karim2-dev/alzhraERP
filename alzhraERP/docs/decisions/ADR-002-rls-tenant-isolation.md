# ADR-002: RLS Tenant Isolation + Role-Based Access

## Status
Accepted

## Date
2026-08-10

## Context
Al-Zahra ERP serves multiple companies (tenants) each with multiple users playing different roles (admin, manager, accountant, sales, viewer). Data must never leak between companies, and users must only perform actions authorized by their role.

## Decision
Use **PostgreSQL Row Level Security** for tenant isolation combined with a **server-side role_permissions table**:

1. **Tenant Isolation**: Every business table has `company_id` + RLS policy:
   ```sql
   USING (company_id = public.get_user_company_id())
   ```
2. **Role Permissions**: Stored in `public.role_permissions` table, checked via `has_permission()` RPC
3. **Client-side** uses `usePermission()` hook (React Query) that calls the RPC — UI hides unauthorized actions but RLS is the real enforcement

## Alternatives Considered

### Client-side only permissions (previous approach)
- Rejected after QA-2026-003: Users could modify localStorage to change their role. Moved to server-side enforcement.

### Middleware-based authorization
- Rejected: Adds latency and complexity. RLS at the database level is the most secure — even if the API layer is compromised, data remains protected.

## Consequences

### Positive
- Defense in depth: RLS (database) + usePermission hook (UI)
- Zero trust: every query is scoped to the authenticated user's company
- Audit trail: `audit_logs` + `prevent_posted_journal_modification()`

### Negative
- RLS policies must be maintained for every new table
- Complex queries may need SECURITY DEFINER functions to bypass RLS performance issues
