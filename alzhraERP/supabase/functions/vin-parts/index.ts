import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// ============================================================
// Edge Function: vin-parts — REAL parts lookup (no AI)
// Sources of truth: free public parts catalogs (server-rendered):
//   1) megazip.net — part number search → real part name + make
// AI is NOT used here. This returns catalog data only.
// ============================================================

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

function json(data: unknown, status = 200, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
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
  // Captures the part's OEM number from the URL path:
  //   /zapchasti-dlya/{make}/{part-number}
  const re = /<a[^>]+href="(\/zapchasti-dlya\/([^\/]+)\/([^\/"?#]+))[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const make = m[2];
    const name = cleanText(m[4]);
    if (!name) continue;
    const partNumber = m[3] ? decodeURIComponent(m[3]) : searched;
    const key = `${make}|${name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push({ partNumber, name, make, url });
  }
  return parts;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    // 1. Auth — require a valid authenticated user (prevents abuse of this
    // read-only catalog proxy as a free scraping relay).
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: 'Server Error: Supabase configuration missing', code: 'CONFIG_ERROR' }, 500, headers);
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401, headers);
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401, headers);
    }

    // 2. Body
    let body: { action?: string; partNumber?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, 400, headers);
    }

    if (body.action !== 'searchByPart' || !body.partNumber) {
      return json({ error: 'action=searchByPart + partNumber required', code: 'VALIDATION_ERROR' }, 400, headers);
    }

    const partNumber = String(body.partNumber).trim();
    if (partNumber.length < 3) {
      return json({ parts: [] }, 200, headers);
    }

    // 3. megazip.net part search (server-rendered, free)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let html = '';
    try {
      const resp = await fetch(
        `https://megazip.net/search?q=${encodeURIComponent(partNumber)}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlZhraERP/1.0)', 'Accept': 'text/html' },
        },
      );
      if (resp.ok) html = await resp.text();
    } catch {
      html = '';
    } finally {
      clearTimeout(timeoutId);
    }

    const parts = html ? parseMegazipResults(html, partNumber) : [];
    return json({ source: 'megazip', parts }, 200, headers);
  } catch (err) {
    console.error('vin-parts error:', err);
    return json({ error: (err as Error).message || 'Internal error', code: 'INTERNAL_ERROR' }, 500, headers);
  }
});
