-- ============================================================
-- VIN Intelligence: idempotent add-to-inventory RPC
-- Fixes audit findings P0-H1 + P0-H2 (+ privilege escalation gap)
--
-- P0-H1  Duplicate products: the RPC inserted a brand-new product
--        on EVERY call (fresh random SKU suffix), so saving the same
--        extracted-parts grid twice duplicated the whole batch.
--        FIX: reuse the company's EXISTING product sharing the same
--        part_number (case-insensitive, mirroring
--        get_matching_inventory_products) and only link it to the
--        vehicle. Returns an honest {added, existing} jsonb so the UI
--        can surface duplicates ("X were already present").
--
-- P0-H2  Contract drift: api/index.ts expected {added, existing}; the
--        function returned a bare integer -> unreachable "already
--        exists" branches and stale docs. FIX: RETURNS jsonb now.
--
-- SECURITY  Privilege escalation: this function called the NO-ARG
--        user_is_admin_or_manager() which picks an ARBITRARY role row
--        across ALL companies (see 20260821000005 C2). An admin in
--        Company A satisfied it while operating on Company B.
--        FIX: use the COMPANY-SCOPED overload (p_company_id).
--
-- Date: 2026-08-26
-- ============================================================

-- 1) Return type change (integer → jsonb) requires DROP first;
--    CREATE OR REPLACE FUNCTION cannot alter RETURNS.
DROP FUNCTION IF EXISTS public.add_vin_parts_to_inventory(uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.add_vin_parts_to_inventory(p_company_id uuid, p_vehicle jsonb, p_parts jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_company        uuid;
    v_vehicle_id     uuid;
    v_make           text;
    v_model          text;
    v_year           integer;
    v_year_from      integer;
    v_year_to        integer;
    v_part           jsonb;
    v_base           text;
    v_sku            text;
    v_suffix         text;
    v_product_id     uuid;
    v_source         text;
    v_part_no        text;
    v_purchase_price numeric;
    v_sale_price     numeric;
    v_added          integer := 0;
    v_existing       integer := 0;
BEGIN
    -- 1) Tenant isolation + COMPANY-SCOPED role check
    --    (20260821000005 overload — the no-arg variant reads an
    --     arbitrary role across tenants and must NOT be used here)
    v_company := public.verify_company_access(p_company_id);
    IF NOT public.user_is_admin_or_manager(p_company_id) THEN
        RAISE EXCEPTION 'Insufficient privileges to add products' USING ERRCODE = '42501';
    END IF;

    -- 2) Vehicle resolution (find-or-create when no catalog id present)
    v_make := COALESCE(NULLIF(TRIM(p_vehicle->>'make'), ''), '');
    IF v_make = '' THEN
        RAISE EXCEPTION 'Vehicle make is required' USING ERRCODE = '22023';
    END IF;
    v_model     := NULLIF(TRIM(p_vehicle->>'model'), '');
    v_year      := NULLIF(p_vehicle->>'year', '')::integer;
    v_year_from := COALESCE(NULLIF(p_vehicle->>'year_start', '')::integer, v_year);
    v_year_to   := COALESCE(NULLIF(p_vehicle->>'year_end', '')::integer, v_year);

    v_vehicle_id := NULLIF(p_vehicle->>'id', '')::uuid;
    IF v_vehicle_id IS NULL THEN
        v_vehicle_id := public.ensure_vehicle(
            v_make, v_model, v_year,
            NULLIF(p_vehicle->>'engine', ''), NULLIF(p_vehicle->>'body_type', ''),
            NULLIF(p_vehicle->>'drive_type', ''), NULLIF(p_vehicle->>'fuel_type', ''),
            NULLIF(p_vehicle->>'transmission', ''), NULLIF(p_vehicle->>'region', '')
        );
    END IF;

    -- 3) Per-part IDEMPOTENT upsert (single transaction)
    FOR v_part IN SELECT value FROM jsonb_array_elements(COALESCE(p_parts, '[]'::jsonb)) LOOP
        v_part_no        := NULLIF(TRIM(COALESCE(v_part->>'part_number', '')), '');
        v_purchase_price := COALESCE(NULLIF(v_part->>'purchase_price', '')::numeric, 0);
        v_sale_price     := COALESCE(NULLIF(v_part->>'sale_price', '')::numeric, 0);

        -- P0-H1: reuse an existing product with the SAME part number
        -- instead of blindly inserting a duplicate. Rows inserted by
        -- earlier iterations of THIS transaction are matched too, so a
        -- repeated part inside one batch is counted honestly as
        -- "existing". Oldest product wins (stable determinism).
        v_product_id := NULL;
        IF v_part_no IS NOT NULL THEN
            SELECT p.id INTO v_product_id
            FROM public.products p
            WHERE p.company_id = v_company
              AND p.deleted_at IS NULL
              AND lower(p.part_number) = lower(v_part_no)
            ORDER BY p.created_at ASC
            LIMIT 1;
            IF v_product_id IS NOT NULL THEN
                v_existing := v_existing + 1;
            END IF;
        END IF;

        IF v_product_id IS NULL THEN
            v_base   := left(upper(regexp_replace(COALESCE(v_part_no, ''), '[^A-Z0-9]', '', 'g')), 24);
            v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
            v_sku := CASE WHEN v_base <> '' THEN 'VIN-' || v_base || '-' || v_suffix ELSE 'VIN-' || v_suffix END;

            INSERT INTO public.products (
                company_id, name_ar, sku, part_number, brand,
                sale_price, purchase_price, cost_price, min_stock_level, unit, status
            ) VALUES (
                v_company,
                COALESCE(NULLIF(v_part->>'description', ''), v_part_no, 'قطعة غيار'),
                v_sku,
                v_part_no,
                COALESCE(NULLIF(v_part->>'manufacturer', ''), v_make),
                v_sale_price,
                v_purchase_price,
                v_purchase_price,
                0, 'pcs', 'active'
            )
            RETURNING id INTO v_product_id;

            v_added := v_added + 1;
        END IF;

        INSERT INTO public.vehicle_products (
            company_id, vehicle_id, product_id, fitment_status, source, created_by
        ) VALUES (
            v_company, v_vehicle_id, v_product_id, 'POSSIBLE', 'vin_extract', auth.uid()
        )
        ON CONFLICT (vehicle_id, product_id) DO NOTHING;

        v_source := CASE upper(COALESCE(v_part->>'source', 'manual'))
            WHEN 'MEGAZIP' THEN 'MEGAZIP'
            WHEN 'AI' THEN 'AI'
            WHEN 'FAPI' THEN 'FAPI'
            ELSE 'MANUAL'
        END;

        INSERT INTO public.part_compatibility (
            company_id, part_number, manufacturer,
            vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to,
            compatibility_status, source, confidence, evidence
        ) VALUES (
            v_company,
            COALESCE(v_part_no, v_sku),
            NULLIF(v_part->>'manufacturer', ''),
            v_make, v_model, v_year_from, v_year_to,
            'POSSIBLE', v_source, 2,
            jsonb_build_object('method', 'add_vin_parts_to_inventory')
        )
        ON CONFLICT (company_id, part_number, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to)
        DO UPDATE SET
            compatibility_status = EXCLUDED.compatibility_status,
            evidence = EXCLUDED.evidence,
            updated_at = now();
    END LOOP;

    RETURN jsonb_build_object('added', v_added, 'existing', v_existing);
END;
$function$;

-- 2) Privileges: a fresh CREATE grants EXECUTE to PUBLIC implicitly —
--    explicit revoke restores least privilege.
REVOKE ALL ON FUNCTION public.add_vin_parts_to_inventory(uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_vin_parts_to_inventory(uuid, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_vin_parts_to_inventory(uuid, jsonb, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────
-- ADVISORY (run manually per environment BEFORE relying on counts):
-- pre-existing duplicates created by the old non-idempotent RPC can be
-- located with the query below (kept AS COMMENT — cleanup needs a
-- business decision about stock/transactions referencing those SKUs):
--
-- SELECT company_id, lower(part_number) AS pn, count(*) AS copies,
--        min(created_at) AS first_created
-- FROM public.products
-- WHERE deleted_at IS NULL AND part_number IS NOT NULL AND part_number <> ''
-- GROUP BY company_id, lower(part_number)
-- HAVING count(*) > 1
-- ORDER BY copies DESC;
--
-- Recommended remediation: soft-delete (deleted_at = now()) the NEWER
-- copies after migrating any stock quantities onto the oldest survivor.
-- Adding a hard UNIQUE partial index was intentionally AVOIDED because
-- existing duplicate rows would make this migration fail.
-- ────────────────────────────────────────────────────────────────