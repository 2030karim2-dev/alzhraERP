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
  '/inventory': () => import('../../features/inventory/InventoryPage'),
  '/inventory/quick-audit': () => import('../../features/inventory/pages/QuickAuditPage'),
  '/pos': () => import('../../features/pos/pages/POSPage'),
  '/sales': () => import('../../features/sales/pages/SalesPage'),
  '/accounting': () => import('../../features/accounting/AccountingPage'),
  '/purchases': () => import('../../features/purchases/pages/PurchasesPage'),
  '/expenses': () => import('../../features/expenses/pages/ExpensesPage'),
  '/settings': () => import('../../features/settings/SettingsPage'),
  '/bonds': () => import('../../features/bonds/BondsPage'),
  '/clients': () => import('../../features/parties/PartiesPage'),
  '/suppliers': () => import('../../features/parties/PartiesPage'),
  '/reports': () => import('../../features/reports/ReportsPage'),
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
    requestIdleCallback(
      () => {
        prefetchFn().catch(() => {
          // If prefetch fails, remove from set so it can be retried
          prefetched.delete(path);
        });
      },
      { timeout: 2000 }
    );
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      prefetchFn().catch(() => prefetched.delete(path));
    }, 100);
  }
}

/**
 * Prefetch commonly visited routes after the app is completely loaded and idle.
 */
export function prefetchCriticalRoutes(): void {
  // Only prefetch when browser is completely idle to preserve typing & rendering performance
  const startPrefetch = () => {
    const criticalRoutes = ['/pos', '/sales', '/inventory'];
    criticalRoutes.forEach((path, index) => {
      setTimeout(
        () => {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(() => prefetchRoute(path), { timeout: 4000 });
          } else {
            prefetchRoute(path);
          }
        },
        (index + 1) * 1500
      );
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(startPrefetch, { timeout: 5000 });
  } else {
    setTimeout(startPrefetch, 3000);
  }
}
