/**
 * Supabase Edge Function: part-search
 *
 * SECURE BACKEND for Part Number Intelligence.
 * All external provider API calls go through this boundary.
 * API keys are stored as Deno env vars — NEVER exposed to browser.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function checkHealth(provider: string): Promise<Response> {
  if (provider !== "FAPI") return json({ provider, status: "UNKNOWN" });
  const key = getFapiKey();
  if (!key) return json({ provider: "FAPI", status: "UNAVAILABLE", reason: "No API key" });
  try {
    const r = await fapiGet<unknown>("manufacturerList", {});
    return json({ provider: "FAPI", status: r.e ? "DEGRADED" : "HEALTHY", reason: r.e ? String(r.e) : undefined });
  } catch { return json({ provider: "FAPI", status: "UNAVAILABLE" }); }
}

type FapiProduct = { n: string; d: string; mfi: number; mfd: string; ns: string };
type FapiAnalog = { n: string; d: string; c: number; mfi: number; mfd: string; ns: string };
type FapiMod = { i: number; d: string; fd: string; cb: number; ce: number; engineType: string; engineCode: string; power: string; capacity: string; driveType: string; bodyType: string };

async function searchPart(p: { partNumber: string; includeCrossReferences: boolean; includeVehicleApplications: boolean; limit: number }): Promise<Response> {
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
  return json({ part, crossReferences: xrefs, vehicleApplications: vapps });
}

async function getXrefs(partNumber: string, limit: number): Promise<Response> {
  const r = await fapiGet<FapiAnalog>("analogList", { n: partNumber });
  return json({ crossReferences: (r.m ?? []).slice(0, limit), error: r.e ? String(r.e) : null });
}

async function getVehicleApps(partNumber: string): Promise<Response> {
  const pr = await fapiGet<FapiProduct>("productList", { n: partNumber });
  if (!pr.m?.length) return json({ vehicleApplications: [] });
  const mfrId = pr.m[0].mfi;
  const br = await fapiGet<{ i: number; d: string }>("catalogDt", { mfi: mfrId });
  if (!br.m?.length) return json({ vehicleApplications: [] });
  const mr = await fapiGet<{ i: number; d: string }>("catalogDt", { mfi: mfrId, bi: br.m[0].i });
  if (!mr.m?.length) return json({ vehicleApplications: [] });
  const modR = await fapiGet<FapiMod>("catalogDt", { mfi: mfrId, bi: br.m[0].i, mi: mr.m[0].i });
  return json({ vehicleApplications: (modR.m ?? []).slice(0, 20).map(m => ({ ...m, make: br.m[0].d || "", model: mr.m[0].d || "" })) });
}

async function getFitment(partNumber: string, vin: string): Promise<Response> {
  const ar = await fapiGet<FapiAnalog>("analogList", { n: partNumber });
  const hasHi = (ar.m ?? []).some(r => r.c >= 3);
  return json({ fitment: { part: { normalizedNumber: partNumber, displayNumber: partNumber }, confidence: hasHi ? 3 : 1, evidence: hasHi ? "High-confidence cross-references exist." : "No high-confidence evidence found.", vehicle: vin ? { vin } : undefined } });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const su = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: ad, error: ae } = await su.auth.getUser();
    if (ae || !ad?.user) return json({ error: "UNAUTHENTICATED" }, 401);
    const b = await req.json();
    switch (b.action) {
      case "health": return checkHealth(b.provider ?? "FAPI");
      case "search": return searchPart({ partNumber: b.partNumber ?? "", includeCrossReferences: b.includeCrossReferences ?? true, includeVehicleApplications: b.includeVehicleApplications ?? false, limit: b.limit ?? 50 });
      case "details": return searchPart({ partNumber: b.partNumber ?? "", includeCrossReferences: false, includeVehicleApplications: false, limit: 1 });
      case "crossReferences": return getXrefs(b.partNumber ?? "", b.limit ?? 50);
      case "vehicleApplications": return getVehicleApps(b.partNumber ?? "");
      case "fitment": return getFitment(b.partNumber ?? "", b.vin ?? "");
      default: return json({ error: `Unknown action: ${b.action}` }, 400);
    }
  } catch (e: unknown) {
    console.error("[part-search]", e instanceof Error ? e.message : "Internal error");
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

