# ADR-003: Server-Side Permissions Model (C-2 Migration)

## Status
Accepted

## Date
2026-08-10

## Context
Prior to this decision, role permissions were hardcoded in `src/core/permissions/index.tsx` (client-side). A user could modify localStorage to gain admin access (QA-2026-003). The system needed a secure, server-side permissions model without sacrificing developer experience.

## Decision
Implement a **database-backed permissions system**:

1. **`public.role_permissions` table**: Maps roles to specific permissions (e.g., `admin` → `sales:delete`)
2. **`has_permission(p_permission TEXT)` RPC**: SECURITY DEFINER function that checks if `auth.uid()` has the specified permission
3. **`usePermission(perm)` React hook**: Uses React Query to call the RPC with 5-minute stale time
4. **Backward compatibility**: Old `hasPermission()` exported as `@deprecated` with re-export of new hooks

## Migration Path
- Phase 1 (done): Create `role_permissions` table + seed data + `has_permission()` RPC
- Phase 2 (in progress): Replace `hasPermission(user.role, 'sales:delete')` with `usePermission('sales:delete')` across the codebase
- Phase 3 (future): Remove deprecated client-side map entirely

## Consequences

### Positive
- Permissions enforced at database level — cannot be bypassed
- Single source of truth for role definitions
- Easy to extend: add new roles/permissions via SQL
- Cached client-side for performance (5-min TTL)

### Negative
- Requires network call for initial permission check
- Migration across 25+ features takes time
