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
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
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
    return { status: "DECODER_UNAVAILABLE", vehicle: null, errorDetail: e.message || "Network failure." };
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
    evidence: cp.fitment_status === "VERIFIED" ? (cp.evidence || cp.evidence_source || null) : null,
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
      const { data } = await user.rpc("search_by_oem", { p_company_id: companyId, p_search_term: n, p_limit: 20 });
      if (data?.length) m.push(...data.map((r: any) => ({
        productId: r.product_id, sku: r.sku || r.part_number,
        productName: r.product_name, productNameAr: r.product_name_ar,
        quantity: r.quantity ?? 0, price: r.price ?? null,
        warehouse: r.warehouse_name ?? null, location: r.location ?? null,
      })));
    }
    results.push({ partId: p.id, inventoryMatches: m });
  }
  return results;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const t0 = Date.now();

  try {
    const su = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const sa = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // ---- AUTH DIAGNOSTICS ----
    const authHeader = req.headers.get("Authorization") ?? "MISSING";
    console.error("[vin-analyze] Auth header present:", authHeader !== "MISSING");
    console.error("[vin-analyze] Auth header preview:", authHeader.substring(0, 30) + "...");
    console.error("[vin-analyze] Step:", step);
    console.error("[vin-analyze] Has rawVin:", !!rawVin);

    const { data: auth, error: ae } = await su.auth.getUser();
    if (ae) {
      console.error("[vin-analyze] getUser() ERROR:", JSON.stringify({ message: ae.message, status: ae.status, name: ae.name }));
    }
    console.error("[vin-analyze] getUser() result:", JSON.stringify({ hasUser: !!auth?.user, userId: auth?.user?.id?.substring(0, 8) + "..." }));
    if (ae || !auth?.user) {
      return new Response(JSON.stringify({ status: "UNAUTHENTICATED", vin: null, vehicle: null, parts: [],
        errorDetail: ae?.message || "Unknown auth error" }),
        { status: 401, headers: { ...cors(req), "Content-Type": "application/json" } });
    }
    const uid = auth.user.id;
    const { data: pf } = await sa.from("profiles").select("company_id").eq("id", uid).single();
    const cid = pf?.company_id ?? null;

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
      const parts = await fetchCoreParts(sa, vkbId);
      return ok({ status: "SUCCESS", step: "parts", coreParts: parts, partsFound: parts.length, meta: { elapsedMs: Date.now() - t0 } });
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
    const d = await decodeVinNhtsa(vin);
    if (d.status !== "SUCCESS" || !d.vehicle) {
      sa.from("vin_analysis_history").insert({ user_id: uid, company_id: cid, vin,
        result_summary: `Decode Failed: ${d.status}`, analyzed_at: new Date().toISOString() }).catch(() => {});
      return ok({ status: d.status, vin, vehicle: null, parts: [], errorDetail: d.errorDetail });
    }
    const dv = d.vehicle;
    const { vkbId, vehicleIsNew } = await upsertVehicleKB(sa, dv);
    const parts = vkbId ? await fetchCoreParts(sa, vkbId) : [];
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

