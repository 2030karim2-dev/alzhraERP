import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.26.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// ============================================================
// Edge Function: vin-decode  (vPIC + DB + AI hybrid)
// Source of truth priority:
//   1) vPIC (NHTSA — free US government API) — authoritative
//   2) resolve_vehicle_from_vin RPC (internal vin_prefix, GCC/JDM)
//   3) AI fallback (OpenRouter / DeepSeek) — LAST resort ONLY
// ============================================================

const ALLOWED_ORIGINS = [
  'https://zzthamxjxnxzzpswllid.supabase.co',
  'https://alzhra-erp.vercel.app',
  'https://alzhra-erp.netlify.app',
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

function normalizeVin(vin: unknown): string {
  return String(vin ?? '').replace(/[\s-]/g, '').toUpperCase();
}

function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin);
}

const VIN_SYSTEM_PROMPT = `You are an automotive VIN (Vehicle Identification Number) decoder for an ERP system.
A standard 17-char VIN only reliably encodes:
  - WMI (chars 1-3): manufacturer & world region
  - VDS (chars 4-8): vehicle attributes (platform, body, engine family — manufacturer-specific)
  - VIS (chars 9-17): check digit, model year, plant, serial

GCC/JDM VINs can be 11-17 chars and may NOT fully decode.
Respond with STRICT JSON only, no markdown, matching this shape:
{
  "make": string | null,
  "model": string | null,
  "year": number | null,
  "engine": string | null,
  "displacement": string | null,
  "cylinders": string | null,
  "body_type": string | null,
  "drive_type": string | null,
  "fuel_type": string | null,
  "transmission": string | null,
  "region": string | null,
  "market": string | null,
  "confidence": "high" | "medium" | "low",
  "notes": string
}
Do NOT invent a model/year you are not confident about — prefer null and lower confidence.`;

// ------------------------------------------------------------
// vPIC lookup — free, authoritative US government VIN decoder
// (NHTSA). Primary source of truth — NO API key required.
// ------------------------------------------------------------
interface VpicVehicle {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  engine?: string | null;
  displacement?: string | null;
  cylinders?: string | null;
  body_type?: string | null;
  drive_type?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  region?: string | null;
  market?: string | null;
}

/** Classify the import market from the WMI (first 3 chars of the VIN). */
function marketFromWmi(vin: string): string {
  const c = (vin[0] || '').toUpperCase();
  if ('145'.includes(c)) return 'أمريكي';
  if (c === '2') return 'كندي';
  if (c === '3') return 'مكسيكي';
  if (c === 'J') return 'ياباني';
  if (c === 'K') return 'كوري';
  if (c === 'L') return 'صيني';
  if ('STUVWXYZ'.includes(c)) return 'أوروبي';
  if ('67'.includes(c)) return 'أسترالي';
  if ('89'.includes(c)) return 'أمريكي جنوبي';
  if ('ABCDEFGH'.includes(c)) return 'أفريقي';
  return 'آسيوي';
}

async function fetchVinFromVpic(vin: string): Promise<VpicVehicle | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const resp = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`,
      { signal: controller.signal },
    );
    if (!resp.ok) return null;

    const data = await resp.json() as { Results?: Array<{ Variable: string; Value: string | null }> };
    const get = (name: string): string | null => {
      const row = data.Results?.find((r) => r.Variable === name);
      return row?.Value && String(row.Value).trim() !== '' ? String(row.Value).trim() : null;
    };

    const make = get('Make');
    if (!make) return null;

    const year = parseInt(get('Model Year') || '', 10) || null;
    const cylinders = get('Engine Number of Cylinders');
    const engineModel = get('Engine Model');
    const displacementL = get('Displacement (L)');
    const displacementCC = get('Displacement (CC)');
    let displacement: string | null = null;
    if (displacementL) {
      displacement = parseFloat(displacementL).toFixed(1);
    } else if (displacementCC) {
      displacement = (parseFloat(displacementCC) / 1000).toFixed(1);
    }

    return {
      make,
      model: get('Model'),
      year,
      engine: engineModel,
      displacement,
      cylinders,
      body_type: get('Body Class'),
      drive_type: get('Drive Type'),
      fuel_type: get('Fuel Type - Primary'),
      transmission: get('Transmission Style'),
      region: get('Plant Country'),
      market: marketFromWmi(vin),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function ensureVehicleId(
  supabase: ReturnType<typeof createClient>,
  v: Record<string, unknown>,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('ensure_vehicle', {
      p_make: (v.make as string | null) ?? null,
      p_model: (v.model as string | null) ?? null,
      p_year: (v.year as number | null) ?? null,
      p_engine: (v.engine as string | null) ?? null,
      p_body_type: (v.body_type as string | null) ?? null,
      p_drive_type: (v.drive_type as string | null) ?? null,
      p_fuel_type: (v.fuel_type as string | null) ?? null,
      p_transmission: (v.transmission as string | null) ?? null,
      p_region: (v.region as string | null) ?? null,
    });
    if (error || !data) return null;
    return data as string;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    // 1. Config — service role for DB ops (NO user session required).
    // VIN decode is a read-only public operation (vPIC + global vehicles
    // catalog); company-specific data (vin_analyses, vehicle_products) stays
    // RLS-protected on the frontend. This removes the session-dependent 401.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return json({ error: 'Server Error: Supabase configuration missing', code: 'CONFIG_ERROR' }, 500, headers);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 2. Body
    let body: { vin?: string; mode?: 'hybrid' | 'db' | 'ai'; provider?: 'deepseek' | 'openrouter'; model?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, 400, headers);
    }

    const vin = normalizeVin(body.vin);
    if (!isValidVin(vin)) {
      return json({ error: 'Invalid VIN: must be 11-17 chars, alphanumeric, excluding I/O/Q', code: 'INVALID_VIN' }, 400, headers);
    }
    const mode = body.mode ?? 'hybrid';

    // 3. Decode by mode: hybrid = vPIC→DB→AI, db = DB only, ai = AI only
    const useVpic = mode === 'hybrid';
    const useDb = mode === 'hybrid' || mode === 'db';
    const useAi = mode === 'hybrid' || mode === 'ai';

    let vpicVehicle: VpicVehicle | null = null;
    let dbVehicle: Record<string, unknown> | null = null;

    if (useVpic) vpicVehicle = await fetchVinFromVpic(vin);

    if (useDb) {
      const { data: resolved, error: rpcError } = await supabase.rpc('resolve_vehicle_from_vin', { p_vin: vin });
      dbVehicle = !rpcError && resolved && resolved.found === true ? resolved.vehicle : null;
    }

    let resultVehicle: Record<string, unknown> | null = null;
    let resultSource: 'vpic' | 'db' | 'ai' = 'ai';
    let resultConfidence: 'high' | 'medium' | 'low' | null = null;

    // vPIC full decode (make + model or year) → authoritative
    if (vpicVehicle && vpicVehicle.make && (vpicVehicle.model || vpicVehicle.year)) {
      resultVehicle = vpicVehicle as unknown as Record<string, unknown>;
      resultSource = 'vpic';
      resultConfidence = 'high';
    }
    // Internal DB match (merged with vPIC partial if any)
    else if (dbVehicle) {
      resultVehicle = { ...(vpicVehicle ?? {}), ...dbVehicle } as Record<string, unknown>;
      resultSource = 'db';
      resultConfidence = 'high';
    }
    // vPIC partial decode (make only — e.g. non-NHTSA VIN)
    else if (vpicVehicle && vpicVehicle.make) {
      resultVehicle = vpicVehicle as unknown as Record<string, unknown>;
      resultSource = 'vpic';
      resultConfidence = 'medium';
    }

    // Ensure a stable vehicles.id for linking (find-or-create in catalog)
    if (resultVehicle && resultVehicle.make && !resultVehicle.id) {
      const vehicleId = await ensureVehicleId(supabase, resultVehicle);
      if (vehicleId) resultVehicle = { ...resultVehicle, id: vehicleId };
    }

    if (resultVehicle) {
      return json({ found: true, source: resultSource, vin, vehicle: resultVehicle, confidence: resultConfidence, raw_ai: null }, 200, headers);
    }

    if (!useAi) {
      return json({ found: false, source: resultSource, vin, vehicle: null, confidence: null, raw_ai: null }, 200, headers);
    }

    // 4. AI fallback (LAST resort — never authoritative)
    const ai = await decodeWithAI(vin, body.provider, body.model);

    return json({
      found: !!ai.vehicle,
      source: 'ai',
      vin,
      vehicle: ai.vehicle,
      confidence: ai.vehicle?.confidence ?? 'low',
      raw_ai: ai.raw,
    }, 200, headers);

  } catch (err) {
    console.error('vin-decode error:', err);
    return json({ error: (err as Error).message || 'Internal server error', code: 'INTERNAL_ERROR' }, 500, headers);
  }
});

// ------------------------------------------------------------
// AI decode helper — OpenRouter by default, DeepSeek fallback
// ------------------------------------------------------------
async function decodeWithAI(vin: string, provider?: string, model?: string) {
  let apiKey: string | undefined;
  let baseURL: string;
  let defaultHeaders: Record<string, string> = {};
  let selectedProvider = provider ?? 'openrouter';

  if (selectedProvider === 'deepseek') {
    apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    baseURL = 'https://api.deepseek.com/v1';
  } else {
    apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      // graceful fallback to DeepSeek
      apiKey = Deno.env.get('DEEPSEEK_API_KEY');
      selectedProvider = 'deepseek';
      baseURL = 'https://api.deepseek.com/v1';
    } else {
      baseURL = 'https://openrouter.ai/api/v1';
      defaultHeaders = {
        'HTTP-Referer': 'https://alzhra-erp.vercel.app',
        'X-Title': 'Al Zhra ERP VIN Decoder',
      };
    }
  }

  if (!apiKey) {
    return { vehicle: null, raw: null, unavailable: true };
  }

  const openai = new OpenAI({ apiKey, baseURL, defaultHeaders });
  const modelId = model || (selectedProvider === 'deepseek' ? 'deepseek-chat' : 'google/gemini-2.5-flash');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: VIN_SYSTEM_PROMPT },
        { role: 'user', content: `Decode this VIN: ${vin}` },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }, { signal: controller.signal });

    clearTimeout(timeoutId);
    const content = completion.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { vehicle: null, raw: content, unavailable: false };
    }
    return { vehicle: parsed, raw: parsed, unavailable: false };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('AI decode failed:', err);
    return { vehicle: null, raw: null, unavailable: true, error: (err as Error).message };
  }
}
