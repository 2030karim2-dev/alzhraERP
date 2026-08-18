-- ============================================================
-- Migration: Part Catalog RLS + RPCs
-- Date: 2026-08-09
-- ============================================================

-- RLS: read for all authenticated, write for service_role only
ALTER TABLE public.part_catalog_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_cross_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_fitment_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "part_cache_select_auth" ON public.part_catalog_cache
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ext_xref_select_auth" ON public.external_cross_references
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ext_fitment_select_auth" ON public.external_fitment_evidence
    FOR SELECT TO authenticated USING (true);

-- RPC: search_cached_parts
CREATE OR REPLACE FUNCTION public.search_cached_parts(
    p_provider TEXT, p_normalized_number TEXT
) RETURNS TABLE (
    normalized_number TEXT, display_number TEXT, manufacturer TEXT,
    manufacturer_id INTEGER, description TEXT, cached_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT c.normalized_number, c.display_number, c.manufacturer,
           c.manufacturer_id, c.description, c.cached_at
    FROM public.part_catalog_cache c
    WHERE c.provider = p_provider AND c.normalized_number = p_normalized_number
      AND (c.expires_at IS NULL OR c.expires_at > now());
$$;

-- RPC: search_cached_xrefs
CREATE OR REPLACE FUNCTION public.search_cached_xrefs(
    p_provider TEXT, p_source_number TEXT
) RETURNS TABLE (
    target_number TEXT, target_brand TEXT, confidence INTEGER,
    match_quality TEXT, evidence TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT x.target_number, x.target_brand, x.confidence, x.match_quality, x.evidence
    FROM public.external_cross_references x
    WHERE x.provider = p_provider AND x.source_number = p_source_number
    ORDER BY x.confidence DESC NULLS LAST LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_cached_parts(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_cached_xrefs(TEXT, TEXT) TO authenticated;
