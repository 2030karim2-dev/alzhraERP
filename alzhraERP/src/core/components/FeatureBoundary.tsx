/**
 * FeatureBoundary
 * ===============
 * A thin Suspense + ErrorBoundary wrapper for each lazy-loaded route.
 *
 * Benefits:
 *  - A crash in ONE feature never takes down the whole app.
 *  - The `inline` ErrorBoundary fallback stays within the content area (not full-screen).
 *  - The `resetKeys` prop accepts [pathname] so navigating away & back auto-resets the error.
 *
 * Usage:
 *   <FeatureBoundary name="inventory">
 *     <InventoryPage />
 *   </FeatureBoundary>
 */

import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import PageLoader from '../../ui/base/PageLoader';
import { useLocation } from 'react-router-dom';

interface FeatureBoundaryProps {
  children: ReactNode;
  /** Feature name for logging context (e.g. "inventory", "sales") */
  name: string;
}

export const FeatureBoundary: React.FC<FeatureBoundaryProps> = ({ children, name }) => {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary
      inline
      resetKeys={[pathname]}
      onError={(err, info) => {
        // In production this is where you'd forward to Sentry / analytics
        console.error(`[FeatureBoundary:${name}]`, err, info);
      }}
    >
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default FeatureBoundary;
