/**
 * AI Module - Public API (Barrel Exports)
 * All external consumers should import from this file.
 */

// Core types
export type {
    AIIntent,
    AIEntityItem,
    AIEntities,
    AIParsedResponse,
    ChatMessage,
    ProductMatch,
    LookupResult,
} from './core/types';

// Config
export { AI_MODELS, getActiveModel, setActiveModel, getActiveProvider, getModelProvider, isValidModel, ensureValidModel } from './core/config';

// Provider
export { generateAIContent } from './core/provider';
