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
export { AI_MODELS, getActiveModel, setActiveModel, getActiveProvider } from './core/config';

// Provider
export { generateAIContent } from './core/provider';

// Intent
export { parseAIResponse } from './intent/intentParser';
export { getRouteForIntent, isInvoiceIntent } from './intent/intentRouter';

// Chat
export { useAIChat } from './chat/useAIChat';
export { useAIPrefillStore } from './chat/store';
export { sendChatMessage } from './chat/chatService';
export { useSpeechRecognition } from './chat/useSpeechRecognition';

// Product Lookup
export { lookupProducts } from './product-lookup/productLookupService';
export { ProductPickerCard } from './product-lookup/ProductPickerCard';
