import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// ---- VIN Validation (server-side, no I/O/Q) ----
function validateVin(input: string | null | undefined) {
  if (!input) return { isValid: false, normalizedVin: '', error: 'EMPTY_INPUT' };
  const normalized = input.replace(/[\s\-]/g, '').toUpperCase();
  const validLengths = [11, 12, 13, 17];
  if (!validLengths.includes(normalized.length)) return { isValid: false, normalizedVin: normalized, error: 'INVALID_LENGTH' };
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(normalized)) return { isValid: false, normalizedVin: normalized, error: 'INVALID_CHARACTERS' };
  return { isValid: true, normalizedVin: normalized };
}

// ---- NHTSA Decoder ----
async function decodeVinNhtsa(vin: string) {
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    if (!response.ok) {
      if (response.status === 429) return { status: 'DECODER_RATE_LIMITED', vehicle: null, errorDetail: 'NHTSA Rate Limited.' };
      return { status: 'DECODER_UNAVAILABLE', vehicle: null, errorDetail: `HTTP ${response.status}` };
    }
    const data = await response.json();
    const results = data.Results?.[0];
    if (!results || results.ErrorCode !== '0') {
      return { status: 'VIN_NOT_FOUND', vehicle: null, errorDetail: results?.ErrorText || 'Unknown NHTSA Error' };
    }
    const sanitize = (v: string | null | undefined) =>
      (!v || v.trim() === '' || v.toUpperCase() === 'NOT APPLICABLE') ? null : v.trim();
    const make = sanitize(results.Make);
    const model = sanitize(results.Model);
    const year = parseInt(results.ModelYear, 10) || null;
    if (!make || !model || !year) {
      return { status: 'VIN_NOT_FOUND', vehicle: null, errorDetail: 'Insufficient vehicle data from provider.' };
    }
    return {
      status: 'SUCCESS',
      vehicle: {
        vin, make, model, year,
        engine_size: results.DisplacementL ? `${results.DisplacementL}L` : null,
        cylinder_count: parseInt(results.EngineCylinders, 10) || null,
        fuel_type: sanitize(results.FuelTypePrimary),
        transmission: sanitize(results.TransmissionStyle),
        drive_type: sanitize(results.DriveType),
        body_type: sanitize(results.BodyClass),
        market: 'US/NHTSA',
      }
    };
  } catch (error: any) {
    return { status: 'DECODER_UNAVAILABLE', vehicle: null, errorDetail: error.message || 'Network failure.' };
  }
}

// ---- Main Handler ----
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const startTime = Date.now();

  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData?.user) {
      // 🔍 Detailed auth failure logging for diagnosis (clock skew, invalid key, etc.)
      const authHeader = req.headers.get('Authorization') ?? '';
      const tokenPreview = authHeader.startsWith('Bearer ') ? authHeader.slice(7, 27) + '...' : 'NONE';
      console.error('[vin-analyze] Auth failed:', {
        message: authError?.message,
        status: authError?.status,
        name: authError?.name,
        hasToken: authHeader.startsWith('Bearer '),
        tokenPreview,
      });
      return new Response(JSON.stringify({ 
        status: 'UNAUTHENTICATED', 
        vin: null, 
        vehicle: null, 
        parts: [],
        errorDetail: authError?.message || 'Unknown auth error',
        errorCode: authError?.status || 0,
        errorName: authError?.name || 'UnknownError',
      }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = authData.user.id;

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('company_id').eq('id', userId).single();
    const companyId = profile?.company_id ?? null;

    let rawVin: string | undefined;
    try {
      const body = await req.json();
      rawVin = body?.vin;
    } catch {
      return new Response(JSON.stringify({ status: 'INVALID_REQUEST', vin: null, vehicle: null, parts: [] }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // STEP 1: VIN Validation
    const validation = validateVin(rawVin);
    if (!validation.isValid) {
      return new Response(JSON.stringify({
        status: 'INVALID_VIN', vin: rawVin, vehicle: null, parts: [], error: validation.error,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const vin = validation.normalizedVin;

    // STEP 2: NHTSA Decode
    const decodeResult = await decodeVinNhtsa(vin);
    if (decodeResult.status !== 'SUCCESS' || !decodeResult.vehicle) {
      await supabaseAdmin.from('vin_analysis_history').insert({
        user_id: userId, company_id: companyId, vin,
        result_summary: `Decode Failed: ${decodeResult.status}`,
        analyzed_at: new Date().toISOString(),
      }).catch(() => {});
      return new Response(JSON.stringify({
        status: decodeResult.status, vin, vehicle: null, parts: [],
        errorDetail: decodeResult.errorDetail,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const dv = decodeResult.vehicle;

    // STEP 3: Vehicle Knowledge Base — UPSERT (UNIQUE vin = concurrency-safe, no duplicate records)
    let vkbId: string | null = null;
    let vehicleIsNew = false;
    const { data: existingVkb } = await supabaseAdmin
      .from('vehicle_knowledge_base').select('id').eq('vin', vin).maybeSingle();

    if (existingVkb?.id) {
      vkbId = existingVkb.id;
    } else {
      vehicleIsNew = true;
      const { data: inserted } = await supabaseAdmin
        .from('vehicle_knowledge_base')
        .insert({
          vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
          engine_size: dv.engine_size, cylinder_count: dv.cylinder_count,
          fuel_type: dv.fuel_type, transmission: dv.transmission,
          drive_type: dv.drive_type, body_type: dv.body_type, market: dv.market,
        })
        .select('id').single();
      if (inserted?.id) vkbId = inserted.id;
    }

    // STEP 4: Fetch Core Parts + Fitment Evidence
    const partsResults: any[] = [];
    if (vkbId) {
      const { data: coreParts } = await supabaseAdmin
        .from('vehicle_core_parts')
        .select('id, canonical_part_name, category, position, side, oem_numbers, cross_references, fitment_status, evidence, evidence_source, demand_level, sales_count, vehicle_matches')
        .eq('vehicle_id', vkbId);

      for (const cp of (coreParts || [])) {
        const oemNumbers = Array.isArray(cp.oem_numbers) ? cp.oem_numbers : [];
        const crossRefs = Array.isArray(cp.cross_references) ? cp.cross_references : [];
        const allSearchNums = [...new Set([...oemNumbers, ...crossRefs])];

        // STEP 5: Tenant-isolated inventory via RLS (user-scoped client)
        let inventoryMatches: any[] = [];
        for (const searchNum of allSearchNums.slice(0, 5)) {
          const { data: invData } = await supabaseUser.rpc('search_by_oem', {
            p_company_id: companyId, p_search_term: searchNum, p_limit: 20
          });
          if (invData?.length > 0) {
            inventoryMatches.push(...invData.map((r: any) => ({
              productId: r.product_id,
              sku: r.sku || r.part_number,
              productName: r.product_name,
              productNameAr: r.product_name_ar,
              quantity: r.quantity ?? 0,
              price: r.price ?? null,
              warehouse: r.warehouse_name ?? null,
              location: r.location ?? null,
            })));
          }
        }

        // STRICT FITMENT: Only VERIFIED status produces CONFIRMED. Inventory existence alone ≠ compatible.
        const compatibility = cp.fitment_status === 'VERIFIED' ? 'CONFIRMED' : 'UNKNOWN';

        partsResults.push({
          id: cp.id,
          canonicalPartName: cp.canonical_part_name,
          category: cp.category,
          position: cp.position ?? null,
          side: cp.side ?? null,
          oemNumbers,
          crossReferences: crossRefs,
          fitmentStatus: cp.fitment_status,
          compatibility,
          evidence: compatibility === 'CONFIRMED' ? (cp.evidence || cp.evidence_source || null) : null,
          evidenceSource: cp.evidence_source ?? null,
          demandLevel: cp.demand_level ?? 'UNKNOWN',
          salesCount: cp.sales_count ?? 0,
          vehicleMatches: cp.vehicle_matches ?? 0,
          inventoryMatches,
        });
      }
    }

    // STEP 6: Authoritative Audit Log (non-blocking)
    // Use upsert to handle duplicate VIN analyses gracefully (ON CONFLICT user_id, vin → UPDATE)
    const partsFound = partsResults.length;
    const inStockCount = partsResults.filter(p => p.inventoryMatches.length > 0).length;
    supabaseAdmin.from('vin_analysis_history').upsert({
      user_id: userId, company_id: companyId, vin,
      make: dv.make, model: dv.model, year: dv.year,
      result_summary: `${dv.make} ${dv.model} ${dv.year} — ${partsFound} parts, ${inStockCount} in stock`,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: 'user_id, vin' }).catch((err) => {
      console.error('[vin-analyze] Failed to write audit log:', err.message);
    });

    return new Response(JSON.stringify({
      status: 'SUCCESS', vin,
      vehicle: {
        id: vkbId, vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
        engineSize: dv.engine_size, cylinderCount: dv.cylinder_count, fuelType: dv.fuel_type,
        transmission: dv.transmission, driveType: dv.drive_type, bodyType: dv.body_type, market: dv.market,
      },
      parts: partsResults,
      meta: { partsFound, inStockCount, elapsedMs: Date.now() - startTime, provider: 'NHTSA_vPIC', vehicleIsNew },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[vin-analyze] Error:', error.message);
    return new Response(JSON.stringify({ status: 'INTERNAL_ERROR', vin: null, vehicle: null, parts: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
