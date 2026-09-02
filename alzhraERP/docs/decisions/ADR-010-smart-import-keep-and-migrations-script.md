# ADR-010: Keep smart-import (live feature) + generalize the migration-apply script

## Status

Accepted (2026-08-21)

## Date

2026-08-21

## Context

Two pending decisions from `tasks/plan.md` needed resolution:

1. **Task 13 (smart-import).** The module (`src/features/smart-import/`, two
   components: `SmartImportView` / `SmartImportModal`) was flagged in an old QA
   audit as "not connected to routes" and therefore suspected dead code. An
   attempt to remove it was immediately **reverted** after a full grep revealed it
   IS live:
   - `InventoryPage.tsx` imports and renders `SmartImportView` (`mode="inventory"`);
   - `PurchasesPage.tsx` imports and renders it (`mode="invoice"`, tab `smart_import`);
   - it consumes the live `documentAiService` for AI-based document extraction.
     The earlier conclusion came from **truncated search output** that hid these
     imports — a false "dead code" verdict.

2. **Task 14 (migrations reconciliation).** The local migrations folder was
   re-baselined on 2026-08-19 (26 files: baseline schema/functions/triggers +
   privileges + follow-on patches through 2026-08-21), while the remote
   `supabase_migrations.schema_migrations` records a much larger history (647
   rows). The one-off helper `scripts/apply-migrations.mjs` had a hardcoded
   `FILES` array pointing at **deleted** 2026-08-14 migrations, so it was broken.

## Decision

1. **Keep `smart-import`.** It is an active, integrated feature (inventory import +
   invoice import). The correct remaining work is limited to reviewing the two AI
   core gaps (`ai/core/config.ts:22`, `ai/core/provider.ts:109`) noted in plan.md
   the next time the AI features are touched. No removal.

2. **Generalize `scripts/apply-migrations.mjs`.** Replace the hardcoded file list
   with a scan of `supabase/migrations/*.sql` (sorted by version), apply **only**
   files whose version is absent from `supabase_migrations.schema_migrations`,
   and record each successful apply (`INSERT ... ON CONFLICT (version) DO NOTHING`).
   The script is now idempotent and forward-compatible. Executing it against the
   live project still requires a `SUPABASE_ACCESS_TOKEN` and is a separate ops step.

## Consequences

- **Positive:** no functional removal; the AI import feature stays reachable from
  both pages; the migration helper no longer references deleted files and will
  never re-apply an already-recorded version.
- **Negative:** none identified. The remote `schema_migrations` still records the
  old history; reconciling it (db pull / re-baseline sync) is a deliberate ops
  step documented in `tasks/plan.md` Task 14.
- **Process lesson:** never remove a module based on truncated search output —
  always run a full-repo grep for every import site and read the complete results
  before a destructive change.
