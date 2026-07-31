/**
 * AI Module - Configuration
 * Model selection, provider settings, and API key management.
 */

export const AI_MODELS = [
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (عالي الجودة)' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (سريع - افتراضي)' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (اقتصادي)' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }
] as const;

// Fallback model if the selected one fails
export const FALLBACK_MODEL = 'google/gemini-2.5-flash';

export function getActiveProvider(): string {
    return 'openrouter';
}

export function getActiveModel(): string {
    return localStorage.getItem('ai_model') || 'google/gemini-2.5-flash';
}

export function setActiveModel(modelId: string) {
    localStorage.setItem('ai_model', modelId);
}

// Validate if a model ID is supported
export function isValidModel(modelId: string): boolean {
    return AI_MODELS.some(m => m.id === modelId);
}

// Reset to default model if current is invalid
export function ensureValidModel(): string {
    const current = getActiveModel();
    if (!isValidModel(current)) {
        const defaultModel = 'google/gemini-2.5-flash';
        setActiveModel(defaultModel);
        return defaultModel;
    }
    return current;
}
