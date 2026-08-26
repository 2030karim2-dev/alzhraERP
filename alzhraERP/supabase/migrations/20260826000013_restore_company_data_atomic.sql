-- ============================================================
-- Atomic company data restore (single transaction)
-- ------------------------------------------------------------
-- Problem (found in code review 2026-08-26):
--   settingsService.importSystemData upserted 23 tables ONE REQUEST
--   AT A TIME from the browser. A failure at table N silently kept
--   tables 1..N-1 written — a partial restore masquerading as success.
--
-- Fix:
--   SECURITY DEFINER RPC `restore_company_data(p_company_id,
--   p_payload)` performing the ENTIRE restore inside one implicit
--   transaction: any failure anywhere rolls back EVERYTHING.
--
-- Security model (RLS is bypassed by DEFINER — the gate is explicit):
--   * Caller must be owner/admin of the TARGET company (membership
--     check pattern mirrors validate_data_integrity).
--   * Every row tenant-checked BEFORE any write (company_id / id).
--   * Identifiers quoted (%I); writable columns = catalog columns
--     intersected with payload keys → mirrors supabase-js upsert
--     semantics (absent keys are never nulled; DB defaults apply on
--     INSERT, existing values stay untouched on UPDATE).
--   * Conflict target = each table's PRIMARY KEY, detected generically
--     (composite-safe, e.g. product_stock); PK-less tables plain INSERT.
--   * Hard cap: 500,000 rows total.
--
-- Accepted side effects (documented): per-row triggers fire during
-- restore (e.g. WAC recompute) and converge over restored history.
-- `supported_currencies` stays EXCLUDED (platform-owned reference).
-- Date: 2026-08-26
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.restore_company_data(
    p_company_id uuid,
    p_payload jsonb
)
 RETURNS TABLE(t_name text, rows_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tables text[] := ARRAY[
        'companies', 'branches', 'warehouses', 'product_categories', 'products',
        'product_stock', 'product_cross_references', 'product_supplier_prices', 'product_kit_items',
        'inventory_transactions', 'stock_transfers', 'stock_transfer_items',
        'party_categories', 'parties',
        'fiscal_years', 'exchange_rates',
        'invoices', 'invoice_items',
        'accounts', 'journal_entries', 'journal_entry_lines',
        'expense_categories', 'expenses'
    ];
    v_table       text;
    v_rows        jsonb;
    v_row         jsonb;
    v_company_key text;
    v_total       integer := 0;
    v_written     integer;
    v_cols        text[];
    v_pk_cols     text[];
    v_col_list    text;
    v_update_set  text;
BEGIN
    -- ── Security gate: owner/admin of the TARGET company only ────────
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
          AND ucr.company_id = p_company_id
          AND ucr.role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'access_denied: استعادة البيانات متاحة لمالك الشركة أو مديرها فقط';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'ملف غير صالح أو تالف';
    END IF;

    -- ── Size guard ────────────────────────────────────────────────────
    FOREACH v_table IN ARRAY v_tables LOOP
        v_rows := p_payload -> v_table;
        CONTINUE WHEN v_rows IS NULL OR jsonb_typeof(v_rows) IS DISTINCT FROM 'array';
        v_total := v_total + jsonb_array_length(v_rows);
    END LOOP;
    IF v_total > 500000 THEN
        RAISE EXCEPTION 'حجم ملف الاستيراد يتجاوز الحد المسموح (%) — قسّم العملية أو راجع الدعم', v_total;
    END IF;

    -- ── Pass 1: tenant isolation on EVERY row BEFORE any write ───────
    FOREACH v_table IN ARRAY v_tables LOOP
        v_rows := p_payload -> v_table;
        CONTINUE WHEN v_rows IS NULL OR jsonb_typeof(v_rows) IS DISTINCT FROM 'array';
        v_company_key := CASE WHEN v_table = 'companies' THEN 'id' ELSE 'company_id' END;
        FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
            IF v_row -> v_company_key IS NOT NULL
               AND v_row ->> v_company_key <> p_company_id::text THEN
                RAISE EXCEPTION 'ملف الاستيراد يحتوي على بيانات لشركة أخرى (جدول %) — تم إيقاف الاستيراد حفاظاً على عزل البيانات', v_table;
            END IF;
        END LOOP;
    END LOOP;

    -- ── Pass 2: ordered upserts — single implicit transaction ────────
    FOREACH v_table IN ARRAY v_tables LOOP
        v_rows := p_payload -> v_table;
        CONTINUE WHEN v_rows IS NULL OR jsonb_typeof(v_rows) IS DISTINCT FROM 'array';
        CONTINUE WHEN jsonb_array_length(v_rows) = 0;

        -- Distinct keys present across payload rows…
        SELECT array_agg(DISTINCT k::text)
          INTO v_cols
        FROM jsonb_array_elements(v_rows) el,
             LATERAL jsonb_object_keys(el) AS k;

        -- …intersected with physical writable catalog columns.
        SELECT array_agg(c.column_name ORDER BY c.ordinal_position)
          INTO v_cols
        FROM unnest(v_cols) AS c(column_name)
        JOIN information_schema.columns c2
          ON  c2.table_schema = 'public'
          AND c2.table_name   = v_table
          AND c2.column_name  = c.column_name
          AND c2.is_generated = 'NO'
          AND c2.is_identity  = 'NO';

        CONTINUE WHEN v_cols IS NULL OR array_length(v_cols, 1) = 0;

        SELECT string_agg(quote_ident(col), ', ')
          INTO v_col_list
        FROM unnest(v_cols) AS col;

        -- Primary-key columns (composite-safe, e.g. product_stock).
        SELECT array_agg(a.attname ORDER BY a.attnum)
          INTO v_pk_cols
        FROM pg_index i
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum   = ANY (i.indkey)
        WHERE i.indrelid = format('public.%I', v_table)::regclass
          AND i.indisprimary;

        IF v_pk_cols IS NOT NULL AND array_length(v_pk_cols, 1) > 0 THEN
            SELECT string_agg(quote_ident(col) || ' = EXCLUDED.' || quote_ident(col), ', ')
              INTO v_update_set
            FROM unnest(v_cols) AS col
            WHERE col <> ALL (v_pk_cols);

            EXECUTE format(
                'INSERT INTO public.%I (%s) '
                'SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1) '
                'ON CONFLICT (%s) DO UPDATE SET %s',
                v_table, v_col_list, v_col_list, v_table,
                (SELECT string_agg(quote_ident(pk), ', ') FROM unnest(v_pk_cols) AS pk),
                v_update_set
            ) USING v_rows;
        ELSE
            EXECUTE format(
                'INSERT INTO public.%I (%s) '
                'SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1)',
                v_table, v_col_list, v_col_list, v_table
            ) USING v_rows;
        END IF;

        GET DIAGNOSTICS v_written = ROW_COUNT;
        t_name     := v_table;
        rows_count := v_written;
        RETURN NEXT;
    END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.restore_company_data(uuid, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_company_data(uuid, jsonb) FROM anon, PUBLIC;

COMMIT;
