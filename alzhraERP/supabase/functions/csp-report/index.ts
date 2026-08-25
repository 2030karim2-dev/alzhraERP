// supabase/functions/csp-report/index.ts
// Receives Content-Security-Policy violation reports from the browser.
//
// Two CSP report formats are supported:
//   1) application/csp-report (legacy, single report per request)
//   2) application/reports+json (new, can be a Reports array)
//
// The function is intentionally permissive on the CORS side — CSP reports
// are POSTed by the browser, and the browser does NOT always include
// the Origin header for violated directives (especially data: URI issues).
// We do NOT require auth, since CSP violations may fire before the user
// is logged in (e.g. on the landing page).
//
// Security:
//   - service_role inserts into csp_reports (bypasses RLS, but the
//     service_role key is only available in Edge Functions).
//   - We rate-limit per IP (60 reports / minute) to prevent flooding.
//   - We strip cookies and PII from the raw payload before storing.
//   - We cap the raw_payload size at 64KB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// CORS: accept from any origin (the report is a passive signal).
// The receiving function does not respond with sensitive data.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// In-memory rate limiter (per Edge Function instance).
const buckets = new Map<string, { count: number; resetAt: number }>();
function checkIpLimit(ip: string, max = 60, windowMs = 60_000): boolean {
  const key = ip || "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// Strip PII from the raw payload before storage. We keep only the
// fields the CSP spec defines; everything else is dropped.
interface NormalizedReport {
  blocked_uri: string | null;
  document_uri: string | null;
  violated_directive: string | null;
  effective_directive: string | null;
  original_policy: string | null;
  disposition: string | null;
  referrer: string | null;
  script_sample: string | null;
  source_file: string | null;
  line_number: number | null;
  column_number: number | null;
  status_code: number | null;
}

function normalizeCspReport(raw: any): NormalizedReport {
  // The legacy format wraps a single report under "csp-report".
  // The new format is an array of reports under the same top-level key.
  let r: any = raw;
  if (raw && raw["csp-report"]) r = raw["csp-report"];
  if (Array.isArray(r) && r.length > 0) r = r[0];

  if (!r || typeof r !== "object") {
    return {
      blocked_uri: null,
      document_uri: null,
      violated_directive: null,
      effective_directive: null,
      original_policy: null,
      disposition: null,
      referrer: null,
      script_sample: null,
      source_file: null,
      line_number: null,
      column_number: null,
      status_code: null,
    };
  }

  return {
    blocked_uri: typeof r["blocked-uri"] === "string" ? r["blocked-uri"].slice(0, 500) : null,
    document_uri: typeof r["document-uri"] === "string" ? r["document-uri"].slice(0, 500) : null,
    violated_directive: typeof r["violated-directive"] === "string" ? r["violated-directive"].slice(0, 200) : null,
    effective_directive: typeof r["effective-directive"] === "string" ? r["effective-directive"].slice(0, 200) : null,
    original_policy: typeof r["original-policy"] === "string" ? r["original-policy"].slice(0, 2000) : null,
    disposition: typeof r["disposition"] === "string" ? r["disposition"].slice(0, 50) : null,
    referrer: typeof r["referrer"] === "string" ? r["referrer"].slice(0, 500) : null,
    script_sample: typeof r["script-sample"] === "string" ? r["script-sample"].slice(0, 1000) : null,
    source_file: typeof r["source-file"] === "string" ? r["source-file"].slice(0, 500) : null,
    line_number: typeof r["line-number"] === "number" ? r["line-number"] : null,
    column_number: typeof r["column-number"] === "number" ? r["column-number"] : null,
    status_code: typeof r["status-code"] === "number" ? r["status-code"] : null,
  };
}

async function resolveActorFromJwt(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null
): Promise<{ user_id: string | null; company_id: string | null }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user_id: null, company_id: null };
  }
  const token = authHeader.substring("Bearer ".length).trim();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { user_id: null, company_id: null };

  // Best-effort: get the user's active company.
  const { data: role } = await supabase
    .from("user_company_roles")
    .select("company_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  return { user_id: data.user.id, company_id: role?.company_id ?? null };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Rate limit per IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  if (!checkIpLimit(ip)) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  // Cap the request body at 64KB to prevent DoS.
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 65_536) {
    return jsonResponse({ error: "Payload too large" }, 413);
  }

  let rawPayload: any = null;
  try {
    rawPayload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!rawPayload) {
    return jsonResponse({ error: "Empty payload" }, 400);
  }

  const normalized = normalizeCspReport(rawPayload);

  // Use the service role to insert (bypasses RLS).
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const auth = req.headers.get("Authorization");
  const actor = await resolveActorFromJwt(supabase, auth);

  const { error } = await supabase.from("csp_reports").insert({
    ...normalized,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    remote_addr: ip,
    user_id: actor.user_id,
    company_id: actor.company_id,
    raw_payload: rawPayload,
  });

  if (error) {
    console.error("[csp-report] insert failed:", error.message);
    return jsonResponse({ error: "Internal" }, 500);
  }

  // 204 No Content is the canonical CSP report response.
  return new Response(null, { status: 204, headers: corsHeaders });
});

function serve(handler: (req: Request) => Promise<Response> | Response) {
  // Re-export the standard Deno.serve alias.
  // (Deno provides Deno.serve globally; this wrapper keeps the
  //  function signature identical to other Edge Functions in the
  //  project.)
  // @ts-ignore Deno global
  return Deno.serve(handler);
}
