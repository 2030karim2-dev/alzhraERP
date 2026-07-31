/**
 * KeepAliveRoute.tsx
 * 
 * Keeps rendered pages in the DOM (hidden) instead of unmounting them.
 * This means navigating back to a page is INSTANT — no re-mount, no re-fetch.
 * 
 * Technical approach:
 * - Renders all "visited" pages simultaneously using CSS visibility
 * - Only the current route is visible, others are hidden with display:none
 * - React state is fully preserved across navigations
 */

import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface KeepAliveEntry {
  path: string;
  element: React.ReactNode;
  lastVisited: number;
}

interface KeepAliveRouteProps {
  /** The path pattern this cache entry represents (e.g. "/pos", "/sales") */
  path: string;
  /** The page component to render */
  children: React.ReactNode;
  /** Whether this is the currently active route */
  isActive: boolean;
}

/**
 * Single keep-alive route slot.
 * Once mounted, stays in DOM until cache limit is reached.
 */
export const KeepAliveSlot: React.FC<KeepAliveRouteProps> = ({ isActive, children }) => {
  const [hasMounted, setHasMounted] = useState(false);

  // Only render content once it's been active at least once
  useEffect(() => {
    if (isActive && !hasMounted) {
      setHasMounted(true);
    }
  }, [isActive, hasMounted]);

  if (!hasMounted) return null;

  return (
    <div
      style={{
        display: isActive ? 'contents' : 'none',
        // Ensure the hidden pages don't affect layout
      }}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Route Cache Manager
// ─────────────────────────────────────────────────────────────

const MAX_CACHED_ROUTES = 5; // Max pages to keep alive simultaneously

interface RouteCacheManager {
  cache: Map<string, number>; // path -> lastVisited timestamp
  shouldCache: (path: string) => boolean;
  visit: (path: string) => void;
  evict: () => void;
}

// Routes that benefit most from keep-alive (high re-visit frequency)
const CACHEABLE_ROUTES = new Set([
  '/',
  '/pos',
  '/sales',
  '/inventory',
  '/accounting',
  '/expenses',
  '/bonds',
]);

export function useRouteCacheManager(): RouteCacheManager {
  const cacheRef = useRef<Map<string, number>>(new Map());

  const shouldCache = (path: string) => CACHEABLE_ROUTES.has(path);

  const visit = (path: string) => {
    cacheRef.current.set(path, Date.now());
    // Evict oldest if over limit
    if (cacheRef.current.size > MAX_CACHED_ROUTES) {
      const sorted = [...cacheRef.current.entries()].sort((a, b) => a[1] - b[1]);
      cacheRef.current.delete(sorted[0][0]);
    }
  };

  const evict = () => {
    const sorted = [...cacheRef.current.entries()].sort((a, b) => a[1] - b[1]);
    if (sorted.length > 0) {
      cacheRef.current.delete(sorted[0][0]);
    }
  };

  return { cache: cacheRef.current, shouldCache, visit, evict };
}
