# Baseline Migrations (schema snapshot)

These files are a **best-effort schema-only baseline** of the production database,
captured on **2026-08-18** from project `zzthamxjxnxzzpswllid` so version control can
reproduce the current production schema.

| File                                            | Contents                                                           | Size   |
| ----------------------------------------------- | ------------------------------------------------------------------ | ------ |
| `20260818000001_fix_accounting_engine.sql`      | Surgical accounting fixes (matches production signatures)          | 38 KB  |
| `20260818000002_baseline_schema.sql`            | Extensions, enums, sequences, **156 tables**, constraints, indexes | 240 KB |
| `20260818000003_baseline_functions.sql`         | **286 public functions** (exact `pg_get_functiondef`)              | 452 KB |
| `20260818000004_baseline_triggers_policies.sql` | **20 views, 194 triggers, 391 RLS policies**                       | 143 KB |

## How to regenerate

```bash
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."      # Management API token
$env:SUPABASE_REF = "zzthamxjxnxzzpswllid"
node scripts/generate-baseline.mjs
```

## Important notes

- **Schema-only**: no data, no ownership grants beyond what functions/triggers
  reference, no Supabase-managed schemas (`auth`, `storage`, `vault`, `graphql`, …).
- The live database records **593+ migrations**; these baseline files are a snapshot
  _of the final state_, not the incremental history. A fresh deployment should use
  these baselines followed by new feature migrations.
- Production functions contain legacy mojibake in some Arabic messages; the baseline
  reproduces them faithfully.
- Always validate the generated baseline against a staging environment before using
  it to build a fresh database.

## Seeding Super Admins (بذر السوبر أدمن)

لا تحتوي الترحيلات على بذر السوبر أدمن (تمت إزالته من `20260903000002` لأسباب
أمنية — لا يجوز تثبيت عناوين بريد حقيقية تمنح صلاحيات مطلقة في كل البيئات).

بعد أي `supabase db reset` أو نشر نظيف:

```bash
# 1) عدّل قائمة البريد داخل السكربت
# 2) شغّله على قاعدة البيانات:
psql "$SUPABASE_DB_URL" -f supabase/scripts/seed_super_admins.sql
```

أو الصق محتوى السكربت في **SQL Editor** لمشروع Supabase (يعمل بصلاحية
`postgres` ويتجاوز RLS). السكربت آمن للتشغيل المتكرر (Idempotent).
