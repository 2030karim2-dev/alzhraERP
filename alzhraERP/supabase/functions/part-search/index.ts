/**
 * Supabase Edge Function: part-search
 *
 * SECURE BACKEND for Part Number Intelligence.
 * All external provider API calls go through this boundary.
 * API keys are stored as Deno env vars — NEVER exposed to browser.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const ALLOWED_ORIGINS = [
  'https://zzthamxjxnxzzpswllid.supabase.co',
  'https://alzhra-erp.vercel.app',
  'https://alzhra-erp.netlify.app',
  'https://alzhra-2030karim2-devs-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Max-Age': '86400',
});

const FAPI_BASE_URL = "https://fapi.iisis.ru/fapi/v2";
function getFapiKey(): string { return Deno.env.get("FAPI_API_KEY") ?? ""; }

interface FapiResponse<T> { t?: string; m?: T[]; e?: unknown; }

async function fapiGet<T>(endpoint: string, params: Record<string, string | number | boolean>): Promise<FapiResponse<T>> {
  const key = getFapiKey();
  if (!key) return { e: "FAPI_API_KEY not configured" };
  const url = new URL(`${FAPI_BASE_URL}/${endpoint}`);
  url.searchParams.set("ui", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const resp = await fetch(url.toString(), { method: "GET", headers: { "Accept": "application/json" } });
    if (resp.status === 429) return { e: "RATE_LIMITED" };
    if (!resp.ok) return { e: `HTTP ${resp.status}` };
    return await resp.json() as FapiResponse<T>;
  } catch (err: unknown) {
    return { e: err instanceof Error ? err.message : "Network error" };
  }
}

function buildJsonResponse(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

async function checkHealth(provider: string): Promise<{ data: unknown; status: number }> {
  if (provider !== "FAPI") return { data: { provider, status: "UNKNOWN" }, status: 200 };
  const key = getFapiKey();
  if (!key) return { data: { provider: "FAPI", status: "UNAVAILABLE", reason: "No API key" }, status: 200 };
  try {
    const r = await fapiGet<unknown>("manufacturerList", {});
    return { data: { provider: "FAPI", status: r.e ? "DEGRADED" : "HEALTHY", reason: r.e ? String(r.e) : undefined }, status: 200 };
  } catch { return { data: { provider: "FAPI", status: "UNAVAILABLE" }, status: 200 }; }
}

type FapiProduct = { n: string; d: string; mfi: number; mfd: string; ns: string };
type FapiAnalog = { n: string; d: string; c: number; mfi: number; mfd: string; ns: string };
type FapiMod = { i: number; d: string; fd: string; cb: number; ce: number; engineType: string; engineCode: string; power: string; capacity: string; driveType: string; bodyType: string };

async function searchPart(p: { partNumber: string; includeCrossReferences: boolean; includeVehicleApplications: boolean; limit: number }): Promise<{ data: unknown; status: number }> {
  const prodResp = await fapiGet<FapiProduct>("productList", { n: p.partNumber });
  let part: unknown = null;
  const prods = prodResp.m ?? [];
  if (prods.length > 0) {
    const r = prods[0];
    part = { normalizedNumber: (r.ns || r.n || "").replace(/[\s\-\/\.]/g, "").toUpperCase(), displayNumber: r.n || r.ns || "", manufacturer: r.mfd || "", manufacturerId: r.mfi, description: r.d || "" };
  }
  let xrefs: unknown[] = [];
  if (p.includeCrossReferences) {
    const ar = await fapiGet<FapiAnalog>("analogList", { n: p.partNumber });
    xrefs = (ar.m ?? []).slice(0, p.limit);
  }
  let vapps: unknown[] = [];
  if (p.includeVehicleApplications && prods.length > 0) {
    try {
      const mfrId = prods[0].mfi;
      const br = await fapiGet<{ i: number; d: string }>("catalogDt", { mfi: mfrId });
      if (br.m?.length) {
        const mr = await fapiGet<{ i: number; d: string }>("catalogDt", { mfi: mfrId, bi: br.m[0].i });
        if (mr.m?.length) {
          const modR = await fapiGet<FapiMod>("catalogDt", { mfi: mfrId, bi: br.m[0].i, mi: mr.m[0].i });
          vapps = (modR.m ?? []).slice(0, p.limit).map(m => ({ ...m, make: br.m[0].d || "", model: mr.m[0].d || "" }));
        }
      }
    } catch { /* best-effort */ }
  }
  return { data: { part, crossReferences: xrefs, vehicleApplications: vapps }, status: 200 };
}

async function getXrefs(partNumber: string, limit: number): Promise<{ data: unknown; status: number }> {
  const r = await fapiGet<FapiAnalog>("analogList", { n: partNumber });
  return { data: { crossReferences: (r.m ?? []).slice(0, limit), error: r.e ? String(r.e) : null }, status: 200 };
}

async function getVehicleApps(partNumber: string): Promise<{ data: unknown; status: number }> {
  const pr = await fapiGet<FapiProduct>("productList", { n: partNumber });
  if (!pr.m?.length) return { data: { vehicleApplications: [] }, status: 200 };
  const mfrId = pr.m[0].mfi;
  const br = await fapiGet<{ i: number; d: string }>("catalogDt", { mfi: mfrId });
  if (!br.m?.length) return { data: { vehicleApplications: [] }, status: 200 };
  const mr = await fapiGet<{ i: number; d: string }>("catalogDt", { mfi: mfrId, bi: br.m[0].i });
  if (!mr.m?.length) return { data: { vehicleApplications: [] }, status: 200 };
  const modR = await fapiGet<FapiMod>("catalogDt", { mfi: mfrId, bi: br.m[0].i, mi: mr.m[0].i });
  return { data: { vehicleApplications: (modR.m ?? []).slice(0, 20).map(m => ({ ...m, make: br.m[0].d || "", model: mr.m[0].d || "" })) }, status: 200 };
}

async function getFitment(partNumber: string, vin: string): Promise<{ data: unknown; status: number }> {
  const ar = await fapiGet<FapiAnalog>("analogList", { n: partNumber });
  const hasHi = (ar.m ?? []).some(r => r.c >= 3);
  return { data: { fitment: { part: { normalizedNumber: partNumber, displayNumber: partNumber }, confidence: hasHi ? 3 : 1, evidence: hasHi ? "High-confidence cross-references exist." : "No high-confidence evidence found.", vehicle: vin ? { vin } : undefined } }, status: 200 };
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsH = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsH });

  try {
    const su = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: ad, error: ae } = await su.auth.getUser();
    if (ae || !ad?.user) return buildJsonResponse({ error: "UNAUTHENTICATED" }, 401, corsH);

    // SECURITY (R-21): per-user rate limit. FAPI charges per call
    // and the cache is global (not per-tenant), so the limit is
    // keyed by user, not company. 30 requests / minute.
    if (!checkRateLimit(ad.user.id, "part-search", 30, 60_000)) {
      return buildJsonResponse(
        { error: "Rate limit exceeded. Please wait and try again." },
        429,
        { ...corsH, "Retry-After": "60" }
      );
    }

    const b = await req.json();
    let res: { data: unknown; status: number };

    switch (b.action) {
      case "health":
        res = await checkHealth(b.provider ?? "FAPI");
        break;
      case "search":
        res = await searchPart({ partNumber: b.partNumber ?? "", includeCrossReferences: b.includeCrossReferences ?? true, includeVehicleApplications: b.includeVehicleApplications ?? false, limit: b.limit ?? 50 });
        break;
      case "details":
        res = await searchPart({ partNumber: b.partNumber ?? "", includeCrossReferences: false, includeVehicleApplications: false, limit: 1 });
        break;
      case "crossReferences":
        res = await getXrefs(b.partNumber ?? "", b.limit ?? 50);
        break;
      case "vehicleApplications":
        res = await getVehicleApps(b.partNumber ?? "");
        break;
      case "fitment":
        res = await getFitment(b.partNumber ?? "", b.vin ?? "");
        break;
      default:
        return buildJsonResponse({ error: `Unknown action: ${b.action}` }, 400, corsH);
    }

    return buildJsonResponse(res.data, res.status, corsH);
  } catch (e: unknown) {
    console.error("[part-search]", e instanceof Error ? e.message : "Internal error");
    return buildJsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500, corsH);
  }
});

// ─────────────────────────────────────────────────────────────────────
// In-memory rate limiter (per Edge Function instance).
//
// Deno isolates are NOT shared across instances, so this is a
// per-instance limit. The real cross-instance cap is the FAPI
// upstream (429 on overflow). 30 req/min × N instances is the
// effective limit. If we need strict global limits we would
// need a shared store (e.g. Upstash Redis) or use the
// check_rate_limit RPC with a synthetic global company_id.
// ─────────────────────────────────────────────────────────────────────
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string, endpoint: string, max: number, windowMs: number): boolean {
  const key = `${endpoint}:${userId}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}
