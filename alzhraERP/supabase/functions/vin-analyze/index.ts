import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const ALLOWED_ORIGINS = [
  "https://alzhra-erp.vercel.app",
  Deno.env.get("SITE_URL"),
  Deno.env.get("SUPABASE_URL"),
].filter(Boolean) as string[];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith("http://localhost"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : (ALLOWED_ORIGINS[0] || "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  };
}

function validateVin(input: string | null | undefined) {
  if (!input) return { isValid: false, normalizedVin: "", error: "EMPTY_INPUT" };
  const n = input.replace(/[\s\-]/g, "").toUpperCase();
  if (![11, 12, 13, 17].includes(n.length)) return { isValid: false, normalizedVin: n, error: "INVALID_LENGTH" };
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(n)) return { isValid: false, normalizedVin: n, error: "INVALID_CHARACTERS" };
  return { isValid: true, normalizedVin: n };
}
async function decodeVinNhtsa(vin: string) {
  try {
    // Hard timeout — a hung NHTSA request must not stall the Edge Function
    // until the wall-clock limit. 10s is generous for this API.
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`,
      { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      if (res.status === 429) return { status: "DECODER_RATE_LIMITED", vehicle: null, errorDetail: "NHTSA Rate Limited." };
      return { status: "DECODER_UNAVAILABLE", vehicle: null, errorDetail: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const r = data.Results?.[0];
    if (!r || r.ErrorCode !== "0") return { status: "VIN_NOT_FOUND", vehicle: null, errorDetail: r?.ErrorText || "Unknown NHTSA Error" };
    const s = (v: string | null | undefined) => (!v || v.trim() === "" || v.toUpperCase() === "NOT APPLICABLE") ? null : v.trim();
    const make = s(r.Make), model = s(r.Model);
    const year = parseInt(r.ModelYear, 10) || null;
    if (!make || !model || !year) return { status: "VIN_NOT_FOUND", vehicle: null, errorDetail: "Insufficient vehicle data." };
    return {
      status: "SUCCESS",
      vehicle: {
        vin, make, model, year,
        engine_size: r.DisplacementL ? `${r.DisplacementL}L` : null,
        cylinder_count: parseInt(r.EngineCylinders, 10) || null,
        fuel_type: s(r.FuelTypePrimary),
        transmission: s(r.TransmissionStyle),
        drive_type: s(r.DriveType),
        body_type: s(r.BodyClass),
        market: "US/NHTSA",
      },
    };
  } catch (e: any) {
    const isTimeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    return { status: isTimeout ? "DECODER_TIMEOUT" : "DECODER_UNAVAILABLE", vehicle: null,
      errorDetail: isTimeout ? "NHTSA decoder timed out (>10s)." : (e?.message || "Network failure.") };
  }
}

async function upsertVehicleKB(admin: any, dv: any) {
  const { data: ex } = await admin.from("vehicle_knowledge_base").select("id").eq("vin", dv.vin).maybeSingle();
  if (ex?.id) return { vkbId: ex.id, vehicleIsNew: false };
  const { data: ins } = await admin.from("vehicle_knowledge_base").insert({
    vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
    engine_size: dv.engine_size, cylinder_count: dv.cylinder_count,
    fuel_type: dv.fuel_type, transmission: dv.transmission,
    drive_type: dv.drive_type, body_type: dv.body_type, market: dv.market,
  }).select("id").single();
  return { vkbId: ins?.id || null, vehicleIsNew: true };
}

/** Cache-first lookup: returns the KB row for a known VIN, or null. */
async function getCachedVehicle(admin: any, vin: string) {
  const { data } = await admin.from("vehicle_knowledge_base")
    .select("id, vin, make, model, year, engine_size, cylinder_count, fuel_type, transmission, drive_type, body_type, market")
    .eq("vin", vin)
    .maybeSingle();
  return data ?? null;
}

/** Map a KB row (snake_case) to the client vehicle shape (camelCase). */
function kbToVehicle(row: any) {
  return {
    vin: row.vin, make: row.make, model: row.model, year: row.year,
    engineSize: row.engine_size, cylinderCount: row.cylinder_count,
    fuelType: row.fuel_type, transmission: row.transmission,
    driveType: row.drive_type, bodyType: row.body_type, market: row.market,
  };
}

async function fetchCoreParts(admin: any, vkbId: string) {
  const { data } = await admin.from("vehicle_core_parts")
    .select("id, canonical_part_name, category, position, side, oem_numbers, cross_references, fitment_status, evidence, evidence_source, demand_level, sales_count, vehicle_matches")
    .eq("vehicle_id", vkbId);
  return (data || []).map((cp: any) => ({
    id: cp.id, canonicalPartName: cp.canonical_part_name, category: cp.category,
    position: cp.position ?? null, side: cp.side ?? null,
    oemNumbers: Array.isArray(cp.oem_numbers) ? cp.oem_numbers : [],
    crossReferences: Array.isArray(cp.cross_references) ? cp.cross_references : [],
    fitmentStatus: cp.fitment_status,
    // Show evidence for every fitment status — the ExplainabilityDrawer displays it for all
    evidence: cp.evidence || cp.evidence_source || null,
    evidenceSource: cp.evidence_source ?? null,
    demandLevel: cp.demand_level ?? "UNKNOWN", salesCount: cp.sales_count ?? 0,
    vehicleMatches: cp.vehicle_matches ?? 0,
  }));
}

async function matchInventory(user: any, companyId: string, parts: any[]) {
  const results: any[] = [];
  for (const p of parts) {
    const nums = [...new Set([...(p.oemNumbers || []), ...(p.crossReferences || [])])];
    let m: any[] = [];
    for (const n of nums.slice(0, 5)) {
      const { data, error: rpcErr } = await user.rpc("search_by_oem", { p_company_id: companyId, p_search_term: n, p_limit: 20 });
      if (rpcErr) console.error(`[vin-analyze] search_by_oem failed for term "${n}":`, rpcErr.message);
      if (data?.length) m.push(...data.map((r: any) => ({
        // RPC returns product_sku / stock_quantity / sale_price — map them correctly
        productId: r.product_id,
        sku: r.product_sku ?? r.sku ?? null,
        productName: r.product_name, productNameAr: r.product_name_ar,
        quantity: r.stock_quantity ?? r.quantity ?? 0,
        price: r.sale_price ?? r.price ?? null,
        warehouse: r.warehouse_name ?? null, location: r.location ?? null,
      })));
    }
    // Dedupe by productId — multiple OEM numbers can match the same product
    const seen = new Set<string>();
    const unique = m.filter((r: any) => r.productId && !seen.has(r.productId) && seen.add(r.productId));
    results.push({ partId: p.id, inventoryMatches: unique });
  }
  return results;
}

/**
 * AI fallback: when the knowledge base has no core parts for a vehicle,
 * ask an LLM for the commonly replaced parts (Gulf market) and store them
 * flagged as INFERRED / AI_GENERATED_UNVERIFIED pending human review.
 * Never throws — returns the number of parts inserted (0 on any failure).
 */
async function generateCorePartsWithAI(admin: any, vkbId: string, dv: any): Promise<number> {
  try {
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const deepSeekKey = Deno.env.get("DEEPSEEK_API_KEY");
    const apiKey = openRouterKey ?? deepSeekKey;
    if (!apiKey) { console.warn("[vin-analyze] No AI key configured — skipping parts generation."); return 0; }
    const baseURL = openRouterKey ? "https://openrouter.ai/api/v1" : "https://api.deepseek.com/v1";
    const model = openRouterKey ? "google/gemini-2.5-flash" : "deepseek-chat";

    const prompt = `You are an automotive parts catalog expert for the Gulf market (Saudi Arabia, UAE, Kuwait).
Vehicle: ${dv.year ?? "unknown year"} ${dv.make} ${dv.model}, engine: ${dv.engine_size ?? "unknown"}, fuel: ${dv.fuel_type ?? "unknown"}.
List the 15 most commonly replaced spare parts for this exact vehicle.
Rules:
- Only include parts you are confident fit this vehicle/generation.
- oem_numbers: real OEM part numbers used by the manufacturer. Only include numbers you are confident about; use an empty array if unsure. NEVER invent plausible-looking numbers.
- category must be one of: engine, transmission, brakes, suspension, steering, electrical, filters, cooling, body, other.
- demand_level: HIGH, MEDIUM, or LOW (Gulf aftermarket demand).
Respond with valid JSON only, no markdown fences:
{ "parts": [ { "canonical_part_name": "...", "category": "...", "oem_numbers": ["..."], "demand_level": "HIGH" } ] }`;

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) { console.error("[vin-analyze] AI parts generation HTTP", res.status); return 0; }

    const payload = await res.json();
    const content: string | undefined = payload?.choices?.[0]?.message?.content;
    if (!content) return 0;

    let parsed: any;
    try {
      parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    } catch { console.error("[vin-analyze] AI parts generation returned invalid JSON"); return 0; }

    const rows = (Array.isArray(parsed?.parts) ? parsed.parts : [])
      .filter((p: any) => p && typeof p.canonical_part_name === "string" && typeof p.category === "string")
      .slice(0, 20)
      .map((p: any) => ({
        vehicle_id: vkbId,
        canonical_part_name: String(p.canonical_part_name).slice(0, 200),
        category: String(p.category).slice(0, 50),
        oem_numbers: Array.isArray(p.oem_numbers)
          ? p.oem_numbers.filter((n: any) => typeof n === "string" && n.trim()).map((n: string) => n.trim().toUpperCase()).slice(0, 5)
          : [],
        cross_references: [],
        fitment_status: "INFERRED",
        evidence: "AI-suggested part — pending human verification.",
        evidence_source: "AI_GENERATED_UNVERIFIED",
        demand_level: ["HIGH", "MEDIUM", "LOW"].includes(p.demand_level) ? p.demand_level : "UNKNOWN",
        sales_count: 0,
        vehicle_matches: 0,
      }));
    if (rows.length === 0) return 0;

    const { error: insErr, data: inserted } = await admin.from("vehicle_core_parts").insert(rows).select("id");
    if (insErr) { console.error("[vin-analyze] AI parts insert failed:", insErr.message); return 0; }
    return inserted?.length ?? rows.length;
  } catch (e: any) {
    console.error("[vin-analyze] AI parts generation failed:", e?.message || e);
    return 0;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const t0 = Date.now();

  try {
    const su = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const sa = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: auth, error: ae } = await su.auth.getUser();
    if (ae) {
      console.error("[vin-analyze] getUser() error:", ae.message, ae.status);
    }
    if (ae || !auth?.user) {
      return new Response(JSON.stringify({ status: "UNAUTHENTICATED", vin: null, vehicle: null, parts: [],
        errorDetail: ae?.message || "Unknown auth error" }),
        { status: 401, headers: { ...cors(req), "Content-Type": "application/json" } });
    }
    const uid = auth.user.id;
    const { data: pf } = await sa.from("profiles").select("company_id").eq("id", uid).single();
    const cid = pf?.company_id ?? null;
    if (!cid) {
      // Fail fast — inventory matching with a null company would silently return zero rows
      return new Response(JSON.stringify({ status: "NO_COMPANY", vin: null, vehicle: null, parts: [],
        errorDetail: "User profile has no company assigned." }),
        { status: 400, headers: { ...cors(req), "Content-Type": "application/json" } });
    }

    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ status: "INVALID_REQUEST", vin: null, vehicle: null, parts: [] }),
        { status: 400, headers: { ...cors(req), "Content-Type": "application/json" } });
    }

    const rawVin = body?.vin;
    const step: string = body?.step || "full";
    const prev = body?.previousResults || {};
    const ok = (d: object, s = 200) =>
      new Response(JSON.stringify(d), { status: s, headers: { ...cors(req), "Content-Type": "application/json" } });
    // --- STEP: validate ---
    if (step === "validate") {
      const v = validateVin(rawVin);
      if (!v.isValid) return ok({ status: "INVALID_VIN", vin: rawVin, step: "validate", error: v.error });
      return ok({ status: "SUCCESS", step: "validate", vin: v.normalizedVin, isValid: true, normalizedVin: v.normalizedVin });
    }

    // --- STEP: validate-decode ---
    if (step === "validate-decode") {
      const v = validateVin(rawVin);
      if (!v.isValid) return ok({ status: "INVALID_VIN", vin: rawVin, step: "validate-decode", error: v.error });
      // Cache-first: known VINs skip the external NHTSA call entirely
      const cached = await getCachedVehicle(sa, v.normalizedVin);
      if (cached) {
        return ok({ status: "SUCCESS", step: "validate-decode", vin: cached.vin,
          vehicle: kbToVehicle(cached),
          meta: { elapsedMs: Date.now() - t0, provider: "knowledge_base_cache" } });
      }
      const d = await decodeVinNhtsa(v.normalizedVin);
      if (d.status !== "SUCCESS" || !d.vehicle)
        return ok({ status: d.status, vin: v.normalizedVin, step: "validate-decode", vehicle: null, errorDetail: d.errorDetail });
      return ok({ status: "SUCCESS", step: "validate-decode", vin: v.normalizedVin,
        vehicle: { vin: d.vehicle.vin, make: d.vehicle.make, model: d.vehicle.model, year: d.vehicle.year,
          engineSize: d.vehicle.engine_size, cylinderCount: d.vehicle.cylinder_count,
          fuelType: d.vehicle.fuel_type, transmission: d.vehicle.transmission,
          driveType: d.vehicle.drive_type, bodyType: d.vehicle.body_type, market: d.vehicle.market },
        meta: { elapsedMs: Date.now() - t0, provider: "NHTSA_vPIC" } });
    }

    // --- STEP: knowledge ---
    if (step === "knowledge") {
      if (!prev.vehicle) return ok({ status: "MISSING_DATA", step: "knowledge", errorDetail: "vehicle data required" }, 400);
      const pv = prev.vehicle;
      const dv = { vin: pv.vin, make: pv.make, model: pv.model, year: pv.year,
        engine_size: pv.engineSize, cylinder_count: pv.cylinderCount,
        fuel_type: pv.fuelType, transmission: pv.transmission,
        drive_type: pv.driveType, body_type: pv.bodyType, market: pv.market };
      const kb = await upsertVehicleKB(sa, dv);
      return ok({ status: "SUCCESS", step: "knowledge", vin: pv.vin, vkbId: kb.vkbId, vehicleIsNew: kb.vehicleIsNew,
        meta: { elapsedMs: Date.now() - t0 } });
    }

    // --- STEP: parts ---
    if (step === "parts") {
      const vkbId = prev.vkbId || body?.vkbId;
      if (!vkbId) return ok({ status: "MISSING_DATA", step: "parts", errorDetail: "vkbId required" }, 400);
      let parts = await fetchCoreParts(sa, vkbId);
      let aiGenerated = 0;
      if (parts.length === 0) {
        // Empty knowledge base → AI fallback (flagged INFERRED / AI_GENERATED_UNVERIFIED)
        const { data: kbRow } = await sa.from("vehicle_knowledge_base")
          .select("vin, make, model, year, engine_size, fuel_type").eq("id", vkbId).single();
        if (kbRow) {
          aiGenerated = await generateCorePartsWithAI(sa, vkbId, kbRow);
          if (aiGenerated > 0) parts = await fetchCoreParts(sa, vkbId);
        }
      }
      return ok({ status: "SUCCESS", step: "parts", coreParts: parts, partsFound: parts.length,
        meta: { elapsedMs: Date.now() - t0, aiGenerated } });
    }

    // --- STEP: inventory ---
    if (step === "inventory") {
      const parts = prev.coreParts || body?.coreParts;
      if (!parts || !Array.isArray(parts)) return ok({ status: "MISSING_DATA", step: "inventory", errorDetail: "coreParts required" }, 400);
      const inv = await matchInventory(su, cid, parts);
      const withInv: any[] = [], missing: any[] = [];
      for (const p of parts) {
        const ir = inv.find(r => r.partId === p.id);
        if (ir?.inventoryMatches?.length) withInv.push({ ...p, inventoryMatches: ir.inventoryMatches });
        else missing.push(p);
      }
      return ok({ status: "SUCCESS", step: "inventory",
        matches: withInv.flatMap(p => p.inventoryMatches),
        missingParts: missing,
        demandInsights: parts.filter((p: any) => p.demandLevel === "HIGH" || p.demandLevel === "MEDIUM")
          .map((p: any) => ({ partId: p.id, partName: p.canonicalPartName, demandLevel: p.demandLevel,
            salesCount: p.salesCount ?? 0, vehicleMatches: p.vehicleMatches ?? 0, isCorePart: true,
            isFastMoving: (p.salesCount ?? 0) > 300 })),
        meta: { elapsedMs: Date.now() - t0, inStockCount: withInv.length, missingCount: missing.length } });
    }

    // --- STEP: audit ---
    if (step === "audit") {
      const pv = prev.vehicle || {}, pi = prev.inventory || {};
      sa.from("vin_analysis_history").upsert({
        user_id: uid, company_id: cid, vin: prev.vin || body?.vin,
        make: pv.make, model: pv.model, year: pv.year,
        result_summary: `${pv.make || ""} ${pv.model || ""} ${pv.year || ""} - ${pi.partsFound || 0} parts, ${pi.inStockCount || 0} in stock`,
        analyzed_at: new Date().toISOString(),
      }, { onConflict: "user_id, vin" }).catch((err: any) => console.error("[vin-analyze] Audit failed:", err.message));
      return ok({ status: "SUCCESS", step: "audit", meta: { elapsedMs: Date.now() - t0 } });
    }
    // ============ FULL MODE (backward compatible) ============
    const v = validateVin(rawVin);
    if (!v.isValid) return ok({ status: "INVALID_VIN", vin: rawVin, vehicle: null, parts: [], error: v.error });
    const vin = v.normalizedVin;
    // Cache-first: known VINs skip the external NHTSA call entirely
    const cachedFull = await getCachedVehicle(sa, vin);
    if (cachedFull) {
      let parts0 = await fetchCoreParts(sa, cachedFull.id);
      if (parts0.length === 0) {
        const gen0 = await generateCorePartsWithAI(sa, cachedFull.id, cachedFull);
        if (gen0 > 0) parts0 = await fetchCoreParts(sa, cachedFull.id);
      }
      if (parts0.length > 0) {
        const inv0 = await matchInventory(su, cid, parts0);
        for (const p of parts0) { const ir = inv0.find(r => r.partId === p.id); (p as any).inventoryMatches = ir?.inventoryMatches || []; }
      }
      const isc0 = parts0.filter((p: any) => (p.inventoryMatches || []).length > 0).length;
      sa.from("vin_analysis_history").upsert({ user_id: uid, company_id: cid, vin,
        make: cachedFull.make, model: cachedFull.model, year: cachedFull.year,
        result_summary: `${cachedFull.make} ${cachedFull.model} ${cachedFull.year} - ${parts0.length} parts, ${isc0} in stock`,
        analyzed_at: new Date().toISOString() }, { onConflict: "user_id, vin" })
        .catch((err: any) => console.error("[vin-analyze] Audit failed:", err.message));
      return ok({ status: "SUCCESS", step: "full", vin,
        vehicle: { id: cachedFull.id, ...kbToVehicle(cachedFull) },
        parts: parts0.map((p: any) => ({ ...p, inventoryMatches: p.inventoryMatches || [] })),
        meta: { partsFound: parts0.length, inStockCount: isc0, elapsedMs: Date.now() - t0, provider: "knowledge_base_cache", vehicleIsNew: false } });
    }
    const d = await decodeVinNhtsa(vin);
    if (d.status !== "SUCCESS" || !d.vehicle) {
      sa.from("vin_analysis_history").insert({ user_id: uid, company_id: cid, vin,
        result_summary: `Decode Failed: ${d.status}`, analyzed_at: new Date().toISOString() }).catch(() => {});
      return ok({ status: d.status, vin, vehicle: null, parts: [], errorDetail: d.errorDetail });
    }
    const dv = d.vehicle;
    const { vkbId, vehicleIsNew } = await upsertVehicleKB(sa, dv);
    let parts = vkbId ? await fetchCoreParts(sa, vkbId) : [];
    if (vkbId && parts.length === 0) {
      const gen = await generateCorePartsWithAI(sa, vkbId, dv);
      if (gen > 0) parts = await fetchCoreParts(sa, vkbId);
    }
    if (parts.length > 0) {
      const inv = await matchInventory(su, cid, parts);
      for (const p of parts) { const ir = inv.find(r => r.partId === p.id); (p as any).inventoryMatches = ir?.inventoryMatches || []; }
    }
    const pf2 = parts.length, isc = parts.filter((p: any) => (p.inventoryMatches || []).length > 0).length;
    sa.from("vin_analysis_history").upsert({ user_id: uid, company_id: cid, vin,
      make: dv.make, model: dv.model, year: dv.year,
      result_summary: `${dv.make} ${dv.model} ${dv.year} - ${pf2} parts, ${isc} in stock`,
      analyzed_at: new Date().toISOString() }, { onConflict: "user_id, vin" })
      .catch((err: any) => console.error("[vin-analyze] Audit failed:", err.message));

    return ok({ status: "SUCCESS", step: "full", vin,
      vehicle: { id: vkbId, vin: dv.vin, make: dv.make, model: dv.model, year: dv.year,
        engineSize: dv.engine_size, cylinderCount: dv.cylinder_count, fuelType: dv.fuel_type,
        transmission: dv.transmission, driveType: dv.drive_type, bodyType: dv.body_type, market: dv.market },
      parts: parts.map((p: any) => ({ ...p, inventoryMatches: p.inventoryMatches || [] })),
      meta: { partsFound: pf2, inStockCount: isc, elapsedMs: Date.now() - t0, provider: "NHTSA_vPIC", vehicleIsNew } });

  } catch (e: any) {
    console.error("[vin-analyze] Error:", e.message);
    return new Response(JSON.stringify({ status: "INTERNAL_ERROR", vin: null, vehicle: null, parts: [] }),
      { status: 500, headers: { ...cors(req), "Content-Type": "application/json" } });
  }
});

