/**
 * VIN ↔ Inventory Bridge
 * =======================
 * Connects the VIN Intelligence Engine to the real inventory system.
 *
 * Phase 1: Falls back to mock data when Supabase is unavailable.
 * Phase 2: Replace with direct Supabase / RPC calls.
 */
import type { InventoryMatch } from '../types';
import { MOCK_PARTS } from '../mock/mockParts';

/** Attempt to call the real cross-reference service; fall back to mock */
async function searchRealOem(searchTerm: string): Promise<InventoryMatch[]> {
  try {
    // Dynamic import to avoid bundling Supabase client when feature is disabled
    const { crossReferenceService } = await import(
      '../../inventory/services/crossReferenceService'
    );
    // crossReferenceService.searchByOEM requires companyId — grab from auth
    const { useAuthStore } = await import('../../auth/store');
    const companyId = useAuthStore.getState().user?.company_id;
    if (!companyId) return [];

    const results = await crossReferenceService.searchByOEM(companyId, searchTerm);
    return results.map(r => ({
      productId: r.productId,
      sku: r.productSku,
      productName: r.productName,
      productNameAr: r.productNameAr,
      quantity: r.stockQuantity,
      price: r.salePrice,
    }));
  } catch {
    // Supabase unavailable — fall through to mock
    return [];
  }
}

/** Find mock inventory matches for given OEM numbers */
function findMockMatches(oemNumbers: string[]): InventoryMatch[] {
  const matches: InventoryMatch[] = [];
  for (const part of MOCK_PARTS) {
    for (const oem of oemNumbers) {
      if (part.oemNumbers.some(n => n === oem || oem.includes(n) || n.includes(oem))) {
        matches.push(...part.inventoryMatches);
      }
    }
  }
  return matches;
}

/**
 * Find inventory matches for a list of OEM part numbers.
 * Phase 1: Primarily mock data. Will attempt real Supabase lookup silently.
 * Phase 2: Replace entirely with Supabase RPC.
 */
export async function findInventoryForOem(oemNumbers: string[]): Promise<InventoryMatch[]> {
  if (oemNumbers.length === 0) return [];

  // Try real inventory first, fall back to mock
  const realMatches: InventoryMatch[] = [];
  for (const oem of oemNumbers.slice(0, 3)) {
    // Limit to 3 OEM queries to avoid overloading
    const results = await searchRealOem(oem);
    realMatches.push(...results);
  }

  if (realMatches.length > 0) return realMatches;

  // Fall back to mock data
  return findMockMatches(oemNumbers);
}