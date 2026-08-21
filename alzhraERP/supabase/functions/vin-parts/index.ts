import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// ============================================================
// Edge Function: vin-parts — REAL parts lookup (no AI)
// Sources of truth (in priority order):
//   1) ai_part_lookup_cache (Supabase DB) — fastest, no network
//   2) megazip.net — free OEM catalog (server-rendered HTML)
//
// Changes vs. original:
//   - Cache layer: results stored in ai_part_lookup_cache.raw_response
//     keyed by (part_number, brand='megazip', is_global=true)
//   - Retry logic: 2 attempts with 1.5s back-off on megazip failure
//   - Random User-Agent rotation to reduce 403 risk
//   - source field: 'cache' | 'megazip' | 'megazip_empty'
// ============================================================

const ALLOWED_ORIGINS = [
  'https://zzthamxjxnxzzpswllid.supabase.co',
  'https://alzhra-erp.vercel.app',
  'https://alzhra-erp.netlify.app',
  'https://alzhra-2030karim2-devs-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const CACHE_TTL_DAYS = 30;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Max-Age': '86400',
});

function jsonResp(data: unknown, status = 200, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function cleanText(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

interface MegazipPart {
  partNumber: string;
  name: string;
  make: string | null;
  url: string;
}

function parseMegazipResults(html: string, searched: string): MegazipPart[] {
  const seen = new Set<string>();
  const parts: MegazipPart[] = [];
  const re = /<a[^>]+href="(\/zapchasti-dlya\/([^\/]+)\/([^\/"?#]+))[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const make = m[2];
    const name = cleanText(m[4]);
    if (!name || name.length < 3) continue;
    const partNumber = m[3] ? decodeURIComponent(m[3]) : searched;
    const key = `${make}|${name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push({ partNumber, name, make, url });
  }
  return parts;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchMegazip(partNumber: string): Promise<MegazipPart[]> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const url = `https://megazip.net/search?q=${encodeURIComponent(partNumber)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12_000);
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(tid);
      if (!resp.ok) {
        console.warn(`[vin-parts] megazip HTTP ${resp.status} (attempt ${attempt})`);
        if (attempt < 2) { await sleep(1500); continue; }
        return [];
      }
      const html = await resp.text();
      return parseMegazipResults(html, partNumber);
    } catch (e) {
      clearTimeout(tid);
      console.warn(`[vin-parts] megazip fetch error (attempt ${attempt}):`, e);
      if (attempt < 2) await sleep(1500);
    }
  }
  return [];
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    // 1. Config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResp({ error: 'Server configuration missing', code: 'CONFIG_ERROR' }, 500, headers);
    }

    // 2. Auth
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return jsonResp({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401, headers);

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return jsonResp({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401, headers);
    }

    // Service-role client for cache read/write (bypasses RLS)
    const svc = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : anonClient;

    // 3. Body
    let body: { action?: string; partNumber?: string };
    try { body = await req.json(); }
    catch { return jsonResp({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, 400, headers); }

    if (body.action !== 'searchByPart' || !body.partNumber) {
      return jsonResp({ error: 'action=searchByPart + partNumber required', code: 'VALIDATION_ERROR' }, 400, headers);
    }

    const partNumber = String(body.partNumber).trim().toUpperCase();
    if (partNumber.length < 3) {
      return jsonResp({ parts: [], source: 'validation' }, 200, headers);
    }

    // 4. DB cache check
    // We store megazip results keyed by: part_number=<PN>, brand='megazip', is_global=true
    let cachedRow: { id: string; raw_response: unknown; expires_at: string } | null = null;
    try {
      const { data } = await svc
        .from('ai_part_lookup_cache')
        .select('id, raw_response, expires_at')
        .eq('part_number', partNumber)
        .eq('brand', 'megazip')
        .eq('is_global', true)
        .maybeSingle();
      cachedRow = data ?? null;
    } catch {
      console.warn('[vin-parts] cache read failed — continuing without cache');
    }

    if (cachedRow?.raw_response && cachedRow.expires_at && new Date(cachedRow.expires_at) > new Date()) {
      const parts = (cachedRow.raw_response as { parts?: MegazipPart[] }).parts ?? [];
      return jsonResp({ source: 'cache', parts }, 200, headers);
    }

    // 5. Fetch from megazip
    const parts = await fetchMegazip(partNumber);

    // 6. Write / refresh cache (best-effort, non-blocking)
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    (async () => {
      try {
        if (cachedRow) {
          // Update existing stale row
          await svc
            .from('ai_part_lookup_cache')
            .update({ raw_response: { parts }, expires_at: expiresAt, hit_count: 0 })
            .eq('id', cachedRow.id);
        } else {
          // Insert new row
          await svc
            .from('ai_part_lookup_cache')
            .insert({
              part_number: partNumber,
              brand: 'megazip',
              is_global: true,
              company_id: null,
              raw_response: { parts },
              source_sites: ['megazip.net'],
              expires_at: expiresAt,
            });
        }
      } catch (e) {
        console.warn('[vin-parts] cache write failed — non-fatal:', e);
      }
    })();

    const source = parts.length > 0 ? 'megazip' : 'megazip_empty';
    return jsonResp({ source, parts }, 200, headers);

  } catch (err) {
    console.error('vin-parts error:', err);
    return jsonResp({ error: (err as Error).message || 'Internal error', code: 'INTERNAL_ERROR' }, 500, headers);
  }
});
