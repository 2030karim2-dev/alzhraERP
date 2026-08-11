import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const ALLOWED_ORIGINS = [
  'https://alzhra-erp.vercel.app',
  Deno.env.get('SITE_URL'),
  Deno.env.get('SUPABASE_URL'),
].filter(Boolean) as string[];

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith('http://localhost'));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : (ALLOWED_ORIGINS[0] || '*'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  };
}

function validateVin(input: string | null | undefined) {
  if (!input) return { isValid: false, normalizedVin: '', error: 'EMPTY_INPUT' };
  const normalized = input.replace(/[\s\-]/g, '').toUpperCase();
  const validLengths = [11, 12, 13, 17];
  if (!validLengths.includes(normalized.length)) return { isValid: false, normalizedVin: normalized, error: 'INVALID_LENGTH' };
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(normalized)) return { isValid: false, normalizedVin: normalized, error: 'INVALID_CHARACTERS' };
  return { isValid: true, normalizedVin: normalized };
}

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

// ---- Upsert vehicle knowledge base ----
async function upsertVehicleKB(supabaseAdmin: any, dv: any) {
  let vkbId: string | null = null;
  let vehicleIsNew = false;
  const { data: existing } = await supabaseAdmin
    .from('vehicle_knowledge_base').select('id').eq('vin', dv.vin).maybeSingle();
  if (existing?.id) {
    vkbId = existing.id;
  } else {
    vehicleIsNew = true;
    const { data: inserted } = await supabaseAdmin
      .from('vehicle_knowledge_base').insert({
        vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
        engine_size: dv.engine_size, cylinder_count: dv.cylinder_count,
        fuel_type: dv.fuel_type, transmission: dv.transmission,
        drive_type: dv.drive_type, body_type: dv.body_type, market: dv.market,
      }).select('id').single();
    if (inserted?.id) vkbId = inserted.id;
  }
  return { vkbId, vehicleIsNew };
}

// ---- Fetch core parts for a vehicle ----
async function fetchCoreParts(supabaseAdmin: any, vkbId: string) {
  const { data: coreParts } = await supabaseAdmin
    .from('vehicle_core_parts')
    .select('id, canonical_part_name, category, position, side, oem_numbers, cross_references, fitment_status, evidence, evidence_source, demand_level, sales_count, vehicle_matches')
    .eq('vehicle_id', vkbId);
  return (coreParts || []).map((cp: any) => {
    const oemNumbers = Array.isArray(cp.oem_numbers) ? cp.oem_numbers : [];
    const crossRefs = Array.isArray(cp.cross_references) ? cp.cross_references : [];
    return {
      id: cp.id, canonicalPartName: cp.canonical_part_name, category: cp.category,
      position: cp.position ?? null, side: cp.side ?? null,
      oemNumbers, crossReferences: crossRefs, fitmentStatus: cp.fitment_status,
      evidence: cp.fitment_status === 'VERIFIED' ? (cp.evidence || cp.evidence_source || null) : null,
      evidenceSource: cp.evidence_source ?? null,
      demandLevel: cp.demand_level ?? 'UNKNOWN', salesCount: cp.sales_count ?? 0,
      vehicleMatches: cp.vehicle_matches ?? 0,
    };
  });
}

// ---- Match inventory for parts via OEM numbers ----
async function matchInventory(supabaseUser: any, companyId: string, parts: any[]) {
  const results: any[] = [];
  for (const part of parts) {
    const allSearchNums = [...new Set([...(part.oemNumbers || []), ...(part.crossReferences || [])])];
    let invMatches: any[] = [];
    for (const searchNum of allSearchNums.slice(0, 5)) {
      const { data: invData } = await supabaseUser.rpc('search_by_oem', {
        p_company_id: companyId, p_search_term: searchNum, p_limit: 20
      });
      if (invData?.length > 0) {
        invMatches.push(...invData.map((r: any) => ({
          productId: r.product_id, sku: r.sku || r.part_number,
          productName: r.product_name, productNameAr: r.product_name_ar,
          quantity: r.quantity ?? 0, price: r.price ?? null,
          warehouse: r.warehouse_name ?? null, location: r.location ?? null,
        })));
      }
    }
    results.push({ partId: part.id, inventoryMatches: invMatches });
  }
  return results;
}

// ---- Main Handler (step-based routing) ----
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: buildCorsHeaders(req) });
  const startTime = Date.now();

  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData?.user) {
      console.error('[vin-analyze] Auth failed:', authError?.message);
      return new Response(JSON.stringify({
        status: 'UNAUTHENTICATED', vin: null, vehicle: null, parts: [],
        errorDetail: authError?.message || 'Unknown auth error',
        errorCode: authError?.status || 0, errorName: authError?.name || 'UnknownError',
      }), { status: 401, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
    }
    const userId = authData.user.id;
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('company_id').eq('id', userId).single();
    const companyId = profile?.company_id ?? null;

    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ status: 'INVALID_REQUEST', vin: null, vehicle: null, parts: [] }), {
        status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const rawVin = body?.vin;
    const step: string = body?.step || 'full';
    const prev = body?.previousResults || {};

    const respond = (data: object, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });

    // ============ STEP: validate ============
    if (step === 'validate') {
      const v = validateVin(rawVin);
      if (!v.isValid) return respond({ status: 'INVALID_VIN', vin: rawVin, step: 'validate', error: v.error });
      return respond({ status: 'SUCCESS', step: 'validate', vin: v.normalizedVin, isValid: true, normalizedVin: v.normalizedVin });
    }

    // ============ STEP: validate-decode ============
    if (step === 'validate-decode') {
      const v = validateVin(rawVin);
      if (!v.isValid) return respond({ status: 'INVALID_VIN', vin: rawVin, step: 'validate-decode', error: v.error });
      const vin = v.normalizedVin;
      const d = await decodeVinNhtsa(vin);
      if (d.status !== 'SUCCESS' || !d.vehicle) return respond({ status: d.status, vin, step: 'validate-decode', vehicle: null, errorDetail: d.errorDetail });
      const dv = d.vehicle;
      return respond({ status: 'SUCCESS', step: 'validate-decode', vin,
        vehicle: { vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
          engineSize: dv.engine_size, cylinderCount: dv.cylinder_count,
          fuelType: dv.fuel_type, transmission: dv.transmission,
          driveType: dv.drive_type, bodyType: dv.body_type, market: dv.market },
        meta: { elapsedMs: Date.now() - startTime, provider: 'NHTSA_vPIC' } });
    }

    // ============ STEP: knowledge ============
    if (step === 'knowledge') {
      if (!prev.vehicle) return respond({ status: 'MISSING_DATA', step: 'knowledge', errorDetail: 'previousResults.vehicle required' }, 400);
      const pv = prev.vehicle;
      const dv = { vin: pv.vin, make: pv.make, model: pv.model, year: pv.year,
        engine_size: pv.engineSize, cylinder_count: pv.cylinderCount,
        fuel_type: pv.fuelType, transmission: pv.transmission,
        drive_type: pv.driveType, body_type: pv.bodyType, market: pv.market };
      const kb = await upsertVehicleKB(supabaseAdmin, dv);
      return respond({ status: 'SUCCESS', step: 'knowledge', vin: pv.vin, vkbId: kb.vkbId, vehicleIsNew: kb.vehicleIsNew, meta: { elapsedMs: Date.now() - startTime } });
    }

    // ============ STEP: inventory ============
    if (step === 'inventory') {
      const parts = prev.coreParts || body?.coreParts;
      if (!parts || !Array.isArray(parts)) return respond({ status: 'MISSING_DATA', step: 'inventory', errorDetail: 'coreParts required' }, 400);
      const invResults = await matchInventory(supabaseUser, companyId, parts);
      const withInv: any[] = [];
      const missing: any[] = [];
      for (const p of parts) {
        const ir = invResults.find(r => r.partId === p.id);
        if (ir?.inventoryMatches?.length) withInv.push({ ...p, inventoryMatches: ir.inventoryMatches });
        else missing.push(p);
      }
      return respond({ status: 'SUCCESS', step: 'inventory',
        matches: withInv.flatMap(p => p.inventoryMatches),
        missingParts: missing,
        demandInsights: parts.filter((p: any) => p.demandLevel === 'HIGH' || p.demandLevel === 'MEDIUM')
          .map((p: any) => ({ partId: p.id, partName: p.canonicalPartName, demandLevel: p.demandLevel,
            salesCount: p.salesCount ?? 0, vehicleMatches: p.vehicleMatches ?? 0, isCorePart: true,
            isFastMoving: (p.salesCount ?? 0) > 300 })),
        meta: { elapsedMs: Date.now() - startTime, inStockCount: withInv.length, missingCount: missing.length } });
    }

    // ============ STEP: audit ============
    if (step === 'audit') {
      const pv = prev.vehicle || {};
      const pinv = prev.inventory || {};
      supabaseAdmin.from('vin_analysis_history').upsert({
        user_id: userId, company_id: companyId, vin: prev.vin || body?.vin,
        make: pv.make, model: pv.model, year: pv.year,
        result_summary: `${pv.make || ''} ${pv.model || ''} ${pv.year || ''} - ${pinv.partsFound || 0} parts, ${pinv.inStockCount || 0} in stock`,
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'user_id, vin' }).catch((err: any) => console.error('[vin-analyze] Audit log failed:', err.message));
      return respond({ status: 'SUCCESS', step: 'audit', meta: { elapsedMs: Date.now() - startTime } });
    }

    // ============ STEP: full (backward compatible) ============
    const validation = validateVin(rawVin);
    if (!validation.isValid) return respond({ status: 'INVALID_VIN', vin: rawVin, vehicle: null, parts: [], error: validation.error });
    const vin = validation.normalizedVin;

    const decodeResult = await decodeVinNhtsa(vin);
    if (decodeResult.status !== 'SUCCESS' || !decodeResult.vehicle) {
      supabaseAdmin.from('vin_analysis_history').insert({
        user_id: userId, company_id: companyId, vin,
        result_summary: `Decode Failed: ${decodeResult.status}`, analyzed_at: new Date().toISOString(),
      }).catch(() => {});
      return respond({ status: decodeResult.status, vin, vehicle: null, parts: [], errorDetail: decodeResult.errorDetail });
    }
    const dv = decodeResult.vehicle;
    const { vkbId, vehicleIsNew } = await upsertVehicleKB(supabaseAdmin, dv);

    const partsResults = vkbId ? await fetchCoreParts(supabaseAdmin, vkbId) : [];
    if (partsResults.length > 0) {
      const invResults = await matchInventory(supabaseUser, companyId, partsResults);
      for (const p of partsResults) {
        const ir = invResults.find(r => r.partId === p.id);
        (p as any).inventoryMatches = ir?.inventoryMatches || [];
      }
    }

    const partsFound = partsResults.length;
    const inStockCount = partsResults.filter((p: any) => (p.inventoryMatches || []).length > 0).length;
    supabaseAdmin.from('vin_analysis_history').upsert({
      user_id: userId, company_id: companyId, vin,
      make: dv.make, model: dv.model, year: dv.year,
      result_summary: `${dv.make} ${dv.model} ${dv.year} - ${partsFound} parts, ${inStockCount} in stock`,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: 'user_id, vin' }).catch((err: any) => console.error('[vin-analyze] Audit log failed:', err.message));

    return respond({ status: 'SUCCESS', step: 'full', vin,
      vehicle: { id: vkbId, vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
        engineSize: dv.engine_size, cylinderCount: dv.cylinder_count, fuelType: dv.fuel_type,
        transmission: dv.transmission, driveType: dv.drive_type, bodyType: dv.body_type, market: dv.market },
      parts: partsResults.map((p: any) => ({ ...p, inventoryMatches: p.inventoryMatches || [] })),
      meta: { partsFound, inStockCount, elapsedMs: Date.now() - startTime, provider: 'NHTSA_vPIC', vehicleIsNew } });

  } catch (error: any) {
    console.error('[vin-analyze] Error:', error.message);
    return new Response(JSON.stringify({ status: 'INTERNAL_ERROR', vin: null, vehicle: null, parts: [] }), {
      status: 500, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }
});


    // ============ STEP: parts ============
    if (step === 'parts') {
      const vkbId = prev.vkbId || body?.vkbId;
      if (!vkbId) return respond({ status: 'MISSING_DATA', step: 'parts', errorDetail: 'vkbId required' }, 400);
      const parts = await fetchCoreParts(supabaseAdmin, vkbId);
      return respond({ status: 'SUCCESS', step: 'parts', coreParts: parts, partsFound: parts.length, meta: { elapsedMs: Date.now() - startTime } });
    }


    return { status: 'SUCCESS', vehicle: { vin, make, model, year,
        engine_size: results.DisplacementL ? `${results.DisplacementL}L` : null,
        cylinder_count: parseInt(results.EngineCylinders, 10) || null,
        fuel_type: sanitize(results.FuelTypePrimary),
        transmission: sanitize(results.TransmissionStyle),
        drive_type: sanitize(results.DriveType),
        body_type: sanitize(results.BodyClass), market: 'US/NHTSA' } };
  } catch (error: any) {
    return { status: 'DECODER_UNAVAILABLE', vehicle: null, errorDetail: error.message || 'Network failure.' };
  }
}