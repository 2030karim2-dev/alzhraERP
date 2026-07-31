---
name: supabase-architecture
description: Validates Supabase schema design, migrations, and TypeScript types consistency. Use when creating migrations, updating database schema, or syncing types with src/core/database.types.ts.
---

# Supabase Architecture Skill

Ensures robust, scalable Supabase backend without contradictions or errors.

## When to Use

- Creating new database migrations
- Modifying existing tables or relationships
- Syncing TypeScript types with database schema
- Reviewing RLS policies
- Designing database relationships

## Validation Checklist

### 1. Migration Quality & Architecture
- [ ] Migration has descriptive name with date prefix (YYYYMMDD_description.sql)
- [ ] Uses `IF EXISTS` / `IF NOT EXISTS` for idempotency
- [ ] Includes both "up" and "down" migrations when possible
- [ ] **STRICT ERP RULE**: Uses Unified Party Management. Never create separate `customers` or `suppliers` tables. Use a single `parties` table with a `party_type` enum (customer, supplier, employee).
- [ ] No raw DELETE without WHERE clause
- [ ] Properly handles foreign key constraints. **STRICT ERP RULE**: NEVER use `ON DELETE CASCADE` for core financial records (invoices, journal entries, payments). Always use `ON DELETE RESTRICT` to preserve accounting integrity.
- [ ] Implements strict `CHECK` constraints on financial fields (e.g., `CHECK (debit_amount >= 0)`, `CHECK (balance >= 0)`).

### 2. Type Consistency
- [ ] All database tables have corresponding TypeScript types in src/core/database.types.ts
- [ ] Enum values match between database and TypeScript
- [ ] Nullable fields are properly marked with `| null`
- [ ] Arrays use correct syntax `type[]`

### 3. RLS Policies & Tenant Isolation
- [ ] All tables have RLS enabled. No exceptions.
- [ ] Policies follow naming convention: `allow_[action]_[condition]`
- [ ] No overly permissive policies (e.g., `true` without authentication)
- [ ] **STRICT ERP RULE**: Every table with `company_id` MUST have a `tenant_isolation` policy ensuring the user belongs to that company via `company_members` table. Use Security Definer functions for performance if queries are complex.
- [ ] Separate policies for `SELECT` (read access) vs `INSERT/UPDATE/DELETE` (write access, requiring specific accounting/admin roles).

### 4. Relationships
- [ ] Foreign keys use `on delete` and `on update` actions explicitly
- [ ] No circular foreign key dependencies
- [ ] Junction tables for many-to-many relationships are properly indexed

## Best Practices

### Naming Conventions
- Tables: plural, strict **snake_case** (e.g., `invoice_items`). NO camelCase in the database.
- Columns: strict **snake_case** (e.g., `created_at`, `customer_type`). NO camelCase.
- Enums: singular, snake_case or PascalCase (be consistent).
- Functions: snake_case with action prefix (e.g., `get_customer_balance`)

### Performance
- Add indexes on foreign keys automatically
- Add indexes on frequently queried fields
- Use partial indexes for filtered queries
- Consider `generated` columns for computed values

### Example Migration Template

```sql
-- ============================================
-- Migration: YYYYMMDD_feature_description
-- ============================================

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create table with proper constraints
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- business fields
    
    -- relationships
    related_id UUID REFERENCES other_table(id) ON DELETE CASCADE,
    
    -- constraints
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_related ON table_name(related_id);
CREATE INDEX IF NOT EXISTS idx_table_created ON table_name(created_at);

-- RLS Policies
CREATE POLICY "allow_select_own" ON table_name
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "allow_insert_own" ON table_name
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_table_updated_at
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Common Patterns

### Soft Delete
```sql
ALTER TABLE table_name ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE POLICY "hide_deleted" ON table_name
    FOR SELECT USING (deleted_at IS NULL);
```

### Multi-tenancy
```sql
-- Add business_id to all tables
ALTER TABLE table_name ADD COLUMN business_id UUID REFERENCES businesses(id);
CREATE POLICY "tenant_isolation" ON table_name
    USING (business_id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    ));
```

## Anti-patterns to Avoid

1. ❌ Using `text` for IDs (use UUID)
2. ❌ Storing money as FLOAT (use DECIMAL/Numeric)
3. ❌ Missing `NOT NULL` on required fields
4. ❌ No indexes on foreign keys
5. ❌ Overly complex RLS policies without Security Definer wrappers (causes performance drops)
6. ❌ Missing `on delete` action on foreign keys
7. ❌ Creating redundant entity tables instead of unified inheritance structures (e.g., separate customer/supplier tables).
8. ❌ Using camelCase for database column names (Always use snake_case).
