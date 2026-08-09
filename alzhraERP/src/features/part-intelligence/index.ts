/**
 * Phase 5 — Automotive Part Number Intelligence
 * Barrel export for the part-intelligence feature module.
 */

// Types
export type {
  MatchQuality,
  FitmentStatus,
  ProviderSource,
  PartIdentity,
  PartReference,
  VehicleApplication,
  FitmentEvidence,
  PartSearchRequest,
  PartSearchResponse,
  ProviderInfo,
  ProviderHealth,
  PartSearchResultWithInventory,
  IPartCatalogProvider,
} from './types';

// Providers
export {
  FapiProvider,
  fapiProvider,
  InternalOemProvider,
  internalOemProvider,
} from './providers';

// Services
export {
  PartSearchEngine,
  partSearchEngine,
  FitmentEngine,
  fitmentEngine,
} from './services';
export type { FitmentAssessment } from './services';

// Hooks
export { usePartSearch } from './hooks/usePartSearch';
export type { PartSearchState } from './hooks/usePartSearch';

// Components
export { PartSearchPanel, PartResult } from './components';
