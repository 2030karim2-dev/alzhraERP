-- ============================================================
-- VIN Intelligence (M1): normalize vehicle makes/models language
--
-- PROBLEM: two entry points stored DIFFERENT languages for the same
-- vehicle. VinDecodeTab's manual form stored Arabic brands/models
-- ('تويوتا' / 'كورولا') while ManualVinModal stored canonical English
-- ('Toyota' / 'Corolla'). Inventory matching compares
--   lower(pc.vehicle_make) = lower(p_vehicle_make)
-- so parts saved under «تويوتا» never matched a «Toyota» vehicle,
-- catalog rows fragmented per spelling, and shared-tenant analytics
-- split.
--
-- FIX: map every known Arabic/transliterated variant to the canonical
-- English identifier across:
--   1) public.vehicles               (catalog: make + model)
--   2) public.part_compatibility     (graph edges: vehicle_make +
--                                     vehicle_model) — collisions that
--                                     appear once spellings merge are
--                                     MERGED (newest duplicate dropped),
--     mirroring constraints checked row-by-row because the unique key
--     uq_part_compat spans five nullable columns.
--   3) public.vin_analyses.decoded   (JSONB snapshot: make + model)
--
-- Idempotent: re-running matches nothing (all variants normalized).
-- Products.brand intentionally left alone ("brand" ≠ vehicle make).
-- Date: 2026-08-26
-- ============================================================

-- ============================================================
-- 0) Temporary alias maps (dropped at the end of the migration)
-- ============================================================
CREATE TEMP TABLE _vin_make_map (
    variant   text PRIMARY KEY,
    canonical text NOT NULL
) ON COMMIT DROP;

INSERT INTO _vin_make_map (variant, canonical) VALUES
    ('تويوتا',      'Toyota'),
    ('لكزس',        'Lexus'),
    ('نيسان',       'Nissan'),
    ('إنفينيتي',    'Infiniti'),
    ('هيونداي',     'Hyundai'),
    ('كيا',         'Kia'),
    ('هوندا',       'Honda'),
    ('ميتسوبيشي',   'Mitsubishi'),
    ('مازدا',       'Mazda'),
    ('إيسوزو',      'Isuzu'),
    ('ايسوزو',      'Isuzu'),
    ('سوزوكي',      'Suzuki'),
    ('فورد',        'Ford'),
    ('شفروليه',     'Chevrolet'),
    ('شيفروليه',    'Chevrolet'),
    ('جمس',         'GMC'),
    ('مرسيدس',      'Mercedes-Benz'),
    ('مرسيدس بنز',  'Mercedes-Benz'),
    ('بي ام دبليو', 'BMW'),
    ('فولكس فاجن',  'Volkswagen'),
    ('أودي',        'Audi');

CREATE TEMP TABLE _vin_model_map (
    variant   text PRIMARY KEY,
    canonical text NOT NULL
) ON COMMIT DROP;

INSERT INTO _vin_model_map (variant, canonical) VALUES
    ('كورولا', 'Corolla'),          ('كامري', 'Camry'),
    ('يارس', 'Yaris'),              ('فيتز', 'Vitz'),
    ('باسو', 'Passo'),              ('راف فور', 'RAV4'),
    ('هايلوكس', 'Hilux'),           ('شاص', 'Land Cruiser 70'),
    ('لاندكروزر', 'Land Cruiser'),  ('برادو', 'Prado'),
    ('راش', 'Rush'),                ('بريوس', 'Prius'),
    ('هايس', 'Hiace'),              ('باترول', 'Patrol'),
    ('صني', 'Sunny'),               ('ألتيما', 'Altima'),
    ('مكسيما', 'Maxima'),           ('أكسنت', 'Accent'),
    ('إلنترا', 'Elantra'),          ('سوناتا', 'Sonata'),
    ('توسان', 'Tucson'),            ('سنتافي', 'Santa Fe'),
    ('سيراتو', 'Cerato'),           ('سبورتاج', 'Sportage'),
    ('سورينتو', 'Sorento'),         ('بيجاس', 'Pegas'),
    ('سيفيك', 'Civic'),             ('أكورد', 'Accord'),
    ('ديماكس', 'D-Max'),            ('باجيرو', 'Pajero'),
    ('لانسر', 'Lancer'),            ('كانتر', 'Canter'),
    ('جراند فيتارا', 'Grand Vitara'),('فيترا', 'Vitara');

-- ────────────────────────────────────────────────────────────────
-- 1) public.vehicles catalog — plain UPDATE (no unique constraint;
--    ensure_vehicle does find-or-create by SELECT, so normalized rows
--    simply converge on their English twin going forward).
-- ────────────────────────────────────────────────────────────────
UPDATE public.vehicles v
SET    make = m.canonical
FROM   _vin_make_map m
WHERE  lower(btrim(v.make)) = m.variant;

UPDATE public.vehicles v
SET    model = mm.canonical
FROM   _vin_model_map mm
WHERE  v.model IS NOT NULL
  AND  lower(btrim(v.model)) = mm.variant;

-- ────────────────────────────────────────────────────────────────
-- 2) public.part_compatibility graph edges — row-by-row so that edges
--    whose key COLLIDES once spellings merge are consolidated instead
--    of aborting the migration on uq_part_compat.
--    Policy: oldest edge survives (oldest-first processing); a newer
--    duplicate falling onto an existing canonical key is dropped.
--    Unique-null semantics of uq_part_compat (NULLS NOT DISTINCT per
--    ADR-004) are enforced by the constraint check itself.
-- ────────────────────────────────────────────────────────────────
DO $block$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT pc.ctid AS tid,
               pc.company_id,
               m.canonical   AS can_make,
               mm.canonical  AS can_model,
               pc.vehicle_model
        FROM   public.part_compatibility pc
        JOIN   _vin_make_map  m  ON lower(btrim(pc.vehicle_make)) = m.variant
        LEFT JOIN _vin_model_map mm ON pc.vehicle_model IS NOT NULL
                                  AND lower(btrim(pc.vehicle_model)) = mm.variant
        ORDER BY pc.created_at ASC NULLS FIRST, pc.id ASC
    LOOP
        BEGIN
            UPDATE public.part_compatibility pc
            SET    vehicle_make  = r.can_make,
                   vehicle_model = COALESCE(r.can_model, r.vehicle_model)
            WHERE  pc.ctid = r.tid;
        EXCEPTION WHEN unique_violation THEN
            -- A canonical twin already holds this exact compatibility
            -- evidence-key; drop THIS newer arabic-named duplicate.
            DELETE FROM public.part_compatibility WHERE ctid = r.tid;
        END;
    END LOOP;
END;
$block$;

-- ────────────────────────────────────────────────────────────────
-- 3) public.vin_analyses.decoded — JSONB snapshots (make + model).
--    jsonb || merge keeps unrelated keys intact and only touches
--    'model' when its Arabic variant is actually known.
-- ────────────────────────────────────────────────────────────────
UPDATE public.vin_analyses va
SET    decoded = jsonb_set(va.decoded, '{make}', to_jsonb(m.canonical))
                || CASE WHEN mm.canonical IS NOT NULL
                        THEN jsonb_build_object('model', mm.canonical)
                        ELSE '{}'::jsonb END
FROM   _vin_make_map m
LEFT JOIN _vin_model_map mm
       ON va.decoded->>'model' IS NOT NULL
      AND lower(btrim(va.decoded->>'model')) = mm.variant
WHERE  jsonb_typeof(va.decoded) = 'object'
  AND  lower(btrim(COALESCE(va.decoded->>'make', ''))) = m.variant;

-- ────────────────────────────────────────────────────────────────
-- 4) Ops visibility: log what remains UN-normalized so the operator
--    can decide whether dictionary extensions are needed.
-- ────────────────────────────────────────────────────────────────
DO $audit$
DECLARE
    n_vehicles    integer;
    n_vehicle_mdl integer;
    n_edges       integer;
    n_snapshots   integer;
BEGIN
    SELECT count(*) INTO n_vehicles    FROM public.vehicles v JOIN _vin_make_map m  ON lower(btrim(v.make))              = m.variant;
    SELECT count(*) INTO n_vehicle_mdl FROM public.vehicles v JOIN _vin_model_map m ON v.model IS NOT NULL AND lower(btrim(v.model)) = m.variant;
    SELECT count(*) INTO n_edges       FROM public.part_compatibility pc JOIN _vin_make_map m ON lower(btrim(pc.vehicle_make))     = m.variant;
    SELECT count(*) INTO n_snapshots   FROM public.vin_analyses va WHERE jsonb_typeof(va.decoded) = 'object'
                                       AND EXISTS (SELECT 1 FROM _vin_make_map x WHERE lower(btrim(COALESCE(va.decoded->>'make',''))) = x.variant);

    RAISE NOTICE '[20260826000002] normalization done. Remaining unmatched variants -> vehicles.make=% / vehicles.model=% / part_compatibility.vehicle_make=% / vin_analyses.decoded=%',
        n_vehicles, n_vehicle_mdl, n_edges, n_snapshots;
END;
$audit$;

NOTIFY pgrst, 'reload schema';