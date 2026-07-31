/**
 * routePrefetcher.ts
 * 
 * Professional route prefetching strategy:
 * - Preloads route code chunks BEFORE the user clicks
 * - Maps each route path to its dynamic import function
 * - Called on hover/focus of sidebar nav items
 */

type PrefetchFn = () => Promise<unknown>;

// Map each route path to its dynamic import
// Must match the lazy() imports in routes.tsx exactly
const ROUTE_PREFETCH_MAP: Record<string, PrefetchFn> = {
  '/inventory':            () => import('../../features/inventory/InventoryPage'),
  '/pos':                  () => import('../../features/pos/pages/POSPage'),
  '/sales':                () => import('../../features/sales/pages/SalesPage'),
  '/accounting':           () => import('../../features/accounting/AccountingPage'),
  '/purchases':            () => import('../../features/purchases/pages/PurchasesPage'),
  '/expenses':             () => import('../../features/expenses/pages/ExpensesPage'),
  '/settings':             () => import('../../features/settings/SettingsPage'),
  '/bonds':                () => import('../../features/bonds/BondsPage'),
  '/parties':              () => import('../../features/parties/PartiesPage'),
  '/parties/customers':    () => import('../../features/parties/PartiesPage'),
  '/parties/suppliers':    () => import('../../features/parties/PartiesPage'),
  '/reports':              () => import('../../features/reports/ReportsPage'),
  '/ai-brain':             () => import('../../features/ai/AIBrainPage'),
  '/vehicles':             () => import('../../features/vehicles/VehiclesPage'),
};

// Track which routes have already been prefetched to avoid duplicate fetches
const prefetched = new Set<string>();

/**
 * Prefetch a route's JS chunk immediately.
 * Safe to call multiple times — deduplicates automatically.
 */
export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;

  const prefetchFn = ROUTE_PREFETCH_MAP[path];
  if (!prefetchFn) return;

  prefetched.add(path);

  // Use requestIdleCallback to avoid competing with user interactions
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      prefetchFn().catch(() => {
        // If prefetch fails, remove from set so it can be retried
        prefetched.delete(path);
      });
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      prefetchFn().catch(() => prefetched.delete(path));
    }, 100);
  }
}

/**
 * Prefetch all critical routes immediately after app load.
 * Call this once the app is interactive (after first paint).
 */
export function prefetchCriticalRoutes(): void {
  // Prefetch the most commonly visited pages first
  const criticalRoutes = ['/pos', '/sales', '/inventory', '/accounting'];
  
  // Stagger prefetching to avoid network congestion
  criticalRoutes.forEach((path, index) => {
    setTimeout(() => prefetchRoute(path), index * 300);
  });
}
