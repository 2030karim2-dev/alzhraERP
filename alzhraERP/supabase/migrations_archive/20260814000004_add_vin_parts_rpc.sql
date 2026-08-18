-- ============================================================
-- Migration: VIN — Atomic "add parts to inventory" RPC
-- Date: 2026-08-14
--
-- Replaces the non-atomic frontend loop (create product → link →
-- edge, one by one) with a single transactional RPC so a mid-way
-- failure cannot leave partial data. It also find-or-creates the
-- vehicle, so parts decoded from older analyses without a vehicle id
-- still get linked.
--
-- Security: SECURITY DEFINER bypasses RLS, so this must enforce the
-- same checks as products_insert (admin/manager) + tenant isolation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_vin_parts_to_inventory(
    p_company_id UUID,
    p_vehicle    JSONB,
    p_parts      JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company    uuid;
    v_vehicle_id uuid;
    v_make       text;
    v_model      text;
    v_year       integer;
    v_year_from  integer;
    v_year_to    integer;
    v_part       jsonb;
    v_base       text;
    v_sku        text;
    v_suffix     text;
    v_product_id uuid;
    v_source     text;
    v_created    integer := 0;
BEGIN
    -- 1) Tenant isolation + role (mirrors products_insert RLS)
    v_company := public.verify_company_access(p_company_id);
    IF NOT public.user_is_admin_or_manager() THEN
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

    -- 3) Create each part atomically (single transaction)
    FOR v_part IN SELECT value FROM jsonb_array_elements(COALESCE(p_parts, '[]'::jsonb)) LOOP
        v_base := left(upper(regexp_replace(COALESCE(v_part->>'part_number', ''), '[^A-Z0-9]', '', 'g')), 24);
        v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
        v_sku := CASE WHEN v_base <> '' THEN 'VIN-' || v_base || '-' || v_suffix ELSE 'VIN-' || v_suffix END;

        INSERT INTO public.products (
            company_id, name_ar, sku, part_number, brand,
            sale_price, purchase_price, cost_price, min_stock_level, unit, status
        ) VALUES (
            v_company,
            COALESCE(NULLIF(v_part->>'description', ''), NULLIF(v_part->>'part_number', ''), 'قطعة غيار'),
            v_sku,
            NULLIF(v_part->>'part_number', ''),
            COALESCE(NULLIF(v_part->>'manufacturer', ''), v_make),
            0, 0, 0, 0, 'pcs', 'active'
        )
        RETURNING id INTO v_product_id;

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
            COALESCE(NULLIF(v_part->>'part_number', ''), v_sku),
            NULLIF(v_part->>'manufacturer', ''),
            v_make, v_model, v_year_from, v_year_to,
            'POSSIBLE', v_source, 2,
            jsonb_build_object('description', NULLIF(v_part->>'description', ''), 'source', v_part->>'source')
        )
        ON CONFLICT ON CONSTRAINT uq_part_compat DO NOTHING;

        v_created := v_created + 1;
    END LOOP;

    RETURN v_created;
END;
$$;

-- Least privilege
REVOKE EXECUTE ON FUNCTION public.add_vin_parts_to_inventory(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_vin_parts_to_inventory(uuid, jsonb, jsonb) TO authenticated;
