/**
 * VIN ↔ Inventory Bridge
 * =======================
 * Phase 2: Pure Supabase / RPC calls. No mock fallback.
 * Connects the VIN Intelligence Engine to the real inventory system.
 */
import type { InventoryMatch } from '../types';

/** Search the real inventory via cross-reference service */
async function searchRealOem(searchTerm: string): Promise<InventoryMatch[]> {
  try {
    const { crossReferenceService } = await import(
      '../../inventory/services/crossReferenceService'
    );
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
    return [];
  }
}

/**
 * Find inventory matches for a list of OEM part numbers.
 * Phase 2: Real Supabase / RPC only. Returns empty when unavailable.
 */
export async function findInventoryForOem(oemNumbers: string[]): Promise<InventoryMatch[]> {
  if (oemNumbers.length === 0) return [];

  const matches: InventoryMatch[] = [];
  for (const oem of oemNumbers.slice(0, 5)) {
    // Limit to 5 OEM queries to avoid overloading
    const results = await searchRealOem(oem);
    matches.push(...results);
  }

  return matches;
}
