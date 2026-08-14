-- ============================================================
-- Migration: AI Request Rate-Limit Log
-- Date: 2026-08-14
-- Purpose: DB-backed rate limiter for the ai-proxy edge function.
--          Every proxied AI call is logged; the edge function rejects
--          requests exceeding the per-user window limit.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_request_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the rate-limit counting query
CREATE INDEX IF NOT EXISTS idx_ai_request_log_user_time
    ON public.ai_request_log (user_id, created_at DESC);

-- RLS is ENABLED: only the edge function (via the service-role key) may read or
-- write this table. Direct PostgREST access from anon/authenticated is denied
-- below via REVOKE, so clients cannot read the log.
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;

-- Deny all direct access: only the edge function (service role) touches it.
CREATE POLICY "ai_request_log_service_only" ON public.ai_request_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.ai_request_log FROM anon, authenticated;

COMMENT ON TABLE public.ai_request_log
    IS 'Rate-limit audit log for ai-proxy. Written/read by the edge function via service role; not directly accessible to clients.';
