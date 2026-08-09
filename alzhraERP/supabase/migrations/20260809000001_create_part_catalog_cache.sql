-- ============================================================
-- Migration: Part Intelligence — Catalog Cache Tables
-- Date: 2026-08-09
-- Phase 5 — Provider-independent Part Search Infrastructure
-- ============================================================

-- Table 1: part_catalog_cache
CREATE TABLE IF NOT EXISTS public.part_catalog_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider            TEXT NOT NULL,
    normalized_number   TEXT NOT NULL,
    display_number      TEXT,
    manufacturer        TEXT,
    manufacturer_id     INTEGER,
    description         TEXT,
    response_json       JSONB,
    cached_at           TIMESTAMPTZ DEFAULT now(),
    expires_at          TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    CONSTRAINT uq_part_cache_provider_number UNIQUE (provider, normalized_number)
);

-- Table 2: external_cross_references
CREATE TABLE IF NOT EXISTS public.external_cross_references (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider          TEXT NOT NULL,
    source_number     TEXT NOT NULL,
    target_number     TEXT NOT NULL,
    target_brand      TEXT,
    target_brand_id   INTEGER,
    confidence        INTEGER CHECK (confidence >= 0 AND confidence <= 5),
    match_quality     TEXT NOT NULL DEFAULT 'UNKNOWN'
                      CHECK (match_quality IN ('EXACT','EQUIVALENT','CROSS_REFERENCE','POSSIBLE','UNKNOWN')),
    evidence          TEXT,
    cached_at         TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_ext_xref_provider_pair UNIQUE (provider, source_number, target_number)
);

-- Table 3: external_fitment_evidence
CREATE TABLE IF NOT EXISTS public.external_fitment_evidence (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider          TEXT NOT NULL,
    normalized_number TEXT NOT NULL,
    vin               TEXT,
    make              TEXT,
    model             TEXT,
    year              INTEGER,
    engine_code       TEXT,
    status            TEXT NOT NULL DEFAULT 'UNKNOWN'
                      CHECK (status IN ('CONFIRMED','POSSIBLE','UNKNOWN','NOT_COMPATIBLE')),
    evidence_text     TEXT,
    evidence_source   TEXT,
    resolved_at       TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_ext_fitment_provider_part_vin UNIQUE (provider, normalized_number, vin)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_part_cache_prov ON public.part_catalog_cache(provider);
CREATE INDEX IF NOT EXISTS idx_part_cache_num ON public.part_catalog_cache(normalized_number);
CREATE INDEX IF NOT EXISTS idx_part_cache_exp ON public.part_catalog_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ext_xref_prov ON public.external_cross_references(provider);
CREATE INDEX IF NOT EXISTS idx_ext_xref_src ON public.external_cross_references(source_number);
CREATE INDEX IF NOT EXISTS idx_ext_xref_qual ON public.external_cross_references(match_quality);
CREATE INDEX IF NOT EXISTS idx_ext_fit_prov ON public.external_fitment_evidence(provider);
CREATE INDEX IF NOT EXISTS idx_ext_fit_part ON public.external_fitment_evidence(normalized_number);
