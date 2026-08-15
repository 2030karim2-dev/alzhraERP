/**
 * Commissions API — barrel entry point.
 *
 * Split by domain to keep each module focused:
 * - api/periods   → period lifecycle, calculations, summaries
 * - api/plans     → plan / rule / tier configuration
 * - api/engineer  → engineer links & pending-invoice resolution
 *
 * Consumers keep importing from '../api' — this barrel preserves that path.
 */
export * from './api/periods';
export * from './api/plans';
export * from './api/engineer';
