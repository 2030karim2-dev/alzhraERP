import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ===== FAST SITES ONLY - 5s timeout, race mode =====
const SEARCH_SITES = [
  { name: 'partsouq', url: (pn: string) => `https://partsouq.com/en/search/all?q=${encodeURIComponent(pn)}` },
  { name: 'autodoc', url: (pn: string) => `https://www.autodoc.co.uk/search?keyword=${encodeURIComponent(pn)}` },
  { name: 'spareto', url: (pn: string) => `https://spareto.com/search?q=${encodeURIComponent(pn)}` },
  { name: 'trodo', url: (pn: string) => `https://trodo.ae/search/?q=${encodeURIComponent(pn)}` },
  { name: 'megazip', url: (pn: string) => `https://megazip.net/zapchasti-dlya-avto/search/${encodeURIComponent(pn)}` },
];

const TIMEOUT_MS = 5000;  // 5 seconds max per site
const CACHE_TTL_DAYS = 30;
const MAX_ALTS = 20;

// ===== GARBAGE FILTER (fast) =====
function isGarbage(t: string): boolean {
  if (t.length < 5 || t.length > 22) return true;
  if (!/\d/.test(t)) return true;           // must have digit
  if (/^\d+$/.test(t) && t.length < 7) return true; // short pure numbers = CSS
  if (/^\d+(\.\d+)?(px|rem|em|vh|vw|%|pt)$/i.test(t)) return true; // CSS units
  if (/^\d+\w*\s+\d/i.test(t)) return true;  // CSS shorthand
  if (/^#?[0-9a-f]{3,8}$/i.test(t) && !/\d{5}/.test(t)) return true; // hex colors
  if (/^(GTM|UA|G|AW|FB)-/i.test(t)) return true; // tracking
  if (/^(alert|btn|col|nav|modal|sr|fa|icon|text|bg|data|aria)-/i.test(t)) return true; // CSS classes
  if (/^(https?:|www\.|mailto:)/i.test(t)) return true;
  if (/^[a-z\-]+$/i.test(t) && !/[A-Z].*\d|\d.*[A-Z]/.test(t)) return true; // only letters
  return false;
}

// ===== EXTRACT PART NUMBERS =====
function extract(html: string, originalPn: string): { pn: string; m: string }[] {
  const found = new Map<string, string>();
  const orig = originalPn.replace(/[\s\-\.]/g, '').toUpperCase();
  
  const add = (pn: string, method: string) => {
    const c = pn.replace(/[\s\-\.]/g, '').toUpperCase();
    if (c === orig || isGarbage(pn) || c.length < 5 || c.length > 20) return;
    if (!/[A-Z]/i.test(c) && c.length < 7) return;
    if (!found.has(c)) found.set(c, method);
  };

  // Strip scripts/styles for clean extraction
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

  // 1. Schema/JSON-LD (best quality)
  let m;
  const schema = /"(?:sku|mpn|gtin|partNumber|productID)"\s*:\s*"([^"]{5,22})"/gi;
  while ((m = schema.exec(html)) !== null) add(m[1], 'schema');

  // 2. Data attributes
  const dattr = /data-(?:part|sku|oem|mpn|article)[-_]?(?:number|no|num|code)?\s*=\s*["']([^"']{5,22})["']/gi;
  while ((m = dattr.exec(html)) !== null) add(m[1], 'data');

  // 3. Cross-reference keywords
  const xref = /(?:OEM|OES|OE|Cross.?Ref|Alternate|Interchange|Replaces|Compatible|\u0628\u062f\u064a\u0644|\u0631\u0642\u0645)[\s:=\-]*([A-Z0-9][A-Z0-9\s\-\.]{3,20}[A-Z0-9])/gi;
  while ((m = xref.exec(clean)) !== null) add(m[1].trim(), 'xref');

  // 4. Table cells with part/sku classes
  const cell = /<(?:td|li|span|a|div)[^>]*(?:part|sku|oem|article|product|number|mpn|ref)[^>]*>\s*([A-Z0-9][A-Z0-9\s\-\.]{3,20}[A-Z0-9])\s*<\//gi;
  while ((m = cell.exec(clean)) !== null) add(m[1].trim(), 'cell');

  // 5. Broad alphanumeric patterns (letter-number combos, common OEM formats)
  const broad = [
    /\b([A-Z]{1,4}[\-\s][A-Z0-9]{4,10}(?:[\-\s][A-Z0-9]{1,5})?)\b/g,
    /\b([A-Z][A-Z0-9]{6,14})\b/g,
    /\b(\d{2,4}[A-Z][A-Z0-9]{4,10})\b/g,
  ];
  for (const p of broad) {
    while ((m = p.exec(clean)) !== null) add(m[1].trim(), 'broad');
  }

  return Array.from(found.entries()).map(([key, method]) => ({ pn: key, m: method })).slice(0, MAX_ALTS);
}

// ===== EXTRACT IMAGES =====
function extractImages(html: string): string[] {
  const imgs: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const s = m[1];
    if (!s.startsWith('http')) continue;
    if (/icon|logo|flag|placeholder|avatar|banner|sprite|pixel|tracker|1x1|spacer/i.test(s)) continue;
    if (/product|part|catalog|img|image|photo|media|cdn|upload/i.test(s)) imgs.push(s);
  }
  return imgs.slice(0, 3);
}

// ===== FAST FETCH (5s timeout) =====
async function fastFetch(url: string): Promise<string | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), TIMEOUT_MS);
    const r = await fetch(url, {
      signal: c.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122', 'Accept': 'text/html' },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

// ===== UPLOAD IMAGE TO SUPABASE STORAGE =====
async function uploadImage(imageUrl: string, partNumber: string, supabase: any): Promise<string | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 5000);
    const res = await fetch(imageUrl, {
      signal: c.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const blob = await res.arrayBuffer();
    
    // Skip if too small (likely a placeholder) or too large
    if (blob.byteLength < 5000 || blob.byteLength > 2000000) return null;
    
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `ai-parts/${partNumber.replace(/[^A-Z0-9]/gi, '_')}_${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, blob, { contentType, upsert: true });
    
    if (error) {
      // If bucket doesn't exist, just return the original URL
      return imageUrl;
    }
    
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return publicUrl;
  } catch {
    // If upload fails, return original URL
    return imageUrl;
  }
}

// ===== MAIN =====
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { part_number, brand } = await req.json();
    if (!part_number || part_number.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Invalid part_number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanPN = part_number.trim().toUpperCase();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // CHECK CACHE
    const { data: cached } = await supabase
      .from('ai_part_lookup_cache').select('*')
      .eq('part_number', cleanPN).gt('expires_at', new Date().toISOString())
      .limit(1).maybeSingle();

    if (cached) {
      await supabase.from('ai_part_lookup_cache').update({ hit_count: (cached.hit_count || 0) + 1 }).eq('id', cached.id);
      return new Response(JSON.stringify({
        alternatives: cached.alternatives || [], image_url: cached.image_url,
        source_sites: cached.source_sites || [], failed_sites: [],
        cached: true, part_number: cleanPN,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // RACE ALL SITES (5s timeout each, all parallel)
    const debug: { site: string; ok: boolean; parts: number; ms: number }[] = [];
    const allParts = new Map<string, { pn: string; sources: string[]; method: string }>();
    let allImages: string[] = [];

    const tasks = SEARCH_SITES.map(async (site) => {
      const start = Date.now();
      const html = await fastFetch(site.url(cleanPN));
      const ms = Date.now() - start;
      
      if (!html || html.length < 500) {
        debug.push({ site: site.name, ok: false, parts: 0, ms });
        return;
      }

      const parts = extract(html, cleanPN);
      const images = extractImages(html);
      debug.push({ site: site.name, ok: true, parts: parts.length, ms });

      for (const p of parts) {
        const key = p.pn;
        if (allParts.has(key)) {
          allParts.get(key)!.sources.push(site.name);
        } else {
          allParts.set(key, { pn: p.pn, sources: [site.name], method: p.m });
        }
      }
      allImages.push(...images);
    });

    // Wait for all with a global 8s ceiling
    await Promise.race([
      Promise.allSettled(tasks),
      new Promise(r => setTimeout(r, 8000)),
    ]);

    // Build alternatives with confidence
    const alternatives = Array.from(allParts.values()).map(a => {
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (a.sources.length >= 2) confidence = 'high';
      else if (['schema', 'data', 'xref'].includes(a.method)) confidence = 'medium';
      return { part_number: a.pn, sources: [...new Set(a.sources)], method: a.method, confidence };
    });
    alternatives.sort((a, b) => {
      const o = { high: 0, medium: 1, low: 2 };
      return (o[a.confidence] || 2) - (o[b.confidence] || 2);
    });

    // Upload best image to Supabase Storage so it loads in browser
    let imageUrl: string | null = null;
    if (allImages.length > 0) {
      imageUrl = await uploadImage(allImages[0], cleanPN, supabase);
    }

    const searched = debug.filter(d => d.ok).map(d => d.site);
    const failed = debug.filter(d => !d.ok).map(d => d.site);

    // CACHE
    await supabase.from('ai_part_lookup_cache').insert({
      part_number: cleanPN, brand: brand || null,
      alternatives, image_url: imageUrl,
      source_sites: searched,
      raw_response: { debug },
      expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 86400000).toISOString(),
    });

    return new Response(JSON.stringify({
      alternatives, image_url: imageUrl,
      source_sites: searched, failed_sites: failed,
      cached: false, part_number: cleanPN, debug,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
