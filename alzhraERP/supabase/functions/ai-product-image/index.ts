import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SEARCH_SITES = [
  { name: 'partsouq', searchUrl: (pn: string) => `https://partsouq.com/en/search/all?q=${encodeURIComponent(pn)}` },
  { name: 'autodoc', searchUrl: (pn: string) => `https://www.autodoc.co.uk/search?keyword=${encodeURIComponent(pn)}` },
  { name: 'spareto', searchUrl: (pn: string) => `https://spareto.com/search?q=${encodeURIComponent(pn)}` },
  { name: 'trodo', searchUrl: (pn: string) => `https://trodo.ae/search/?q=${encodeURIComponent(pn)}` },
  { name: 'fitinpart', searchUrl: (pn: string) => `https://fitinpart.com/search?q=${encodeURIComponent(pn)}` },
];

function extractProductImages(html: string): string[] {
  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  while ((match = imgPattern.exec(html)) !== null) {
    const src = match[1];
    const fullTag = match[0].toLowerCase();
    if (!src.startsWith('http')) continue;
    if (src.includes('icon') || src.includes('logo') || src.includes('flag') || src.includes('placeholder') || src.includes('avatar') || src.includes('banner') || src.includes('sprite')) continue;
    if (src.includes('pixel') || src.includes('tracker') || src.includes('analytics') || src.includes('1x1') || src.includes('spacer')) continue;
    const widthMatch = fullTag.match(/width=["']?(\d+)/);
    const heightMatch = fullTag.match(/height=["']?(\d+)/);
    if (widthMatch && parseInt(widthMatch[1]) < 100) continue;
    if (heightMatch && parseInt(heightMatch[1]) < 100) continue;
    if (src.includes('product') || src.includes('part') || src.includes('img') || src.includes('image') || src.includes('photo') || src.includes('media') || src.includes('cdn') || src.includes('upload')) {
      images.push(src);
    }
  }
  return images.slice(0, 10);
}

function scoreImage(url: string): number {
  let score = 0;
  if (url.startsWith('https://')) score += 5;
  if (url.includes('cdn') || url.includes('cloudinary') || url.includes('imgix') || url.includes('cloudfront')) score += 3;
  if (url.match(/\.(jpg|jpeg|png|webp)/i)) score += 2;
  if (url.includes('large') || url.includes('big') || url.includes('original') || url.includes('full')) score += 4;
  if (url.includes('thumb') || url.includes('small') || url.includes('mini')) score -= 3;
  if (url.includes('watermark') || url.includes('wm')) score -= 10;
  return score;
}

async function fetchSite(url: string, timeoutMs = 8000): Promise<{ html: string; ok: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } });
    clearTimeout(timer);
    if (!res.ok) return { html: '', ok: false };
    return { html: await res.text(), ok: true };
  } catch { return { html: '', ok: false }; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const su = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await su.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { part_number, brand, product_id } = await req.json();
    if (!part_number) return new Response(JSON.stringify({ error: 'part_number required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const searchTerm = brand ? `${brand} ${part_number.trim()}` : part_number.trim();
    const allImages: { url: string; score: number; source: string }[] = [];
    const results = await Promise.allSettled(SEARCH_SITES.map(async (site) => {
      const { html, ok } = await fetchSite(site.searchUrl(searchTerm));
      if (!ok || html.length < 500) return [];
      return extractProductImages(html).map(url => ({ url, score: scoreImage(url), source: site.name }));
    }));
    for (const r of results) { if (r.status === 'fulfilled' && r.value) allImages.push(...r.value); }
    allImages.sort((a, b) => b.score - a.score);
    const candidates = allImages.slice(0, 3);
    const bestImage = candidates[0] || null;
    if (bestImage && product_id) {
      // [SECURITY] Ownership check FIRST through the caller's RLS-scoped
      // session (product must belong to the caller's company). Only after
      // that is confirmed do we write with the service-role client — this
      // prevents cross-tenant writes (a user could previously pass any
      // product_id and update another company's product image).
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: owned, error: ownedErr } = await userClient
        .from('products')
        .select('id')
        .eq('id', product_id)
        .maybeSingle();
      if (ownedErr || !owned) {
        return new Response(JSON.stringify({ error: 'Product not found or you do not have access to it', code: 'FORBIDDEN' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { error: updErr } = await admin.from('products').update({ image_url: bestImage.url }).eq('id', owned.id);
      if (updErr) console.error('Failed to persist image_url:', updErr.message);
    }
    return new Response(JSON.stringify({ image_url: bestImage?.url || null, source: bestImage?.source || null, candidates: candidates.map(c => ({ url: c.url, source: c.source, score: c.score })), total_found: allImages.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
