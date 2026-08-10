/**
 * AI Module - Configuration
 * Model selection, provider settings, and API key management.
 */

export const AI_MODELS = [
    { id: 'deepseek-chat', name: 'DeepSeek Chat (سريع - ذكي)', provider: 'deepseek' as const },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (تحليل عميق)', provider: 'deepseek' as const },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (عالي الجودة)', provider: 'openrouter' as const },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (سريع - افتراضي)', provider: 'openrouter' as const },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (اقتصادي)', provider: 'openrouter' as const },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter' as const },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' as const }
] as const;

// Fallback model if the selected one fails
export const FALLBACK_MODEL = 'deepseek-chat';

export function getActiveProvider(): string {
    return getModelProvider(getActiveModel());
}

export function getActiveModel(): string {
    const stored = localStorage.getItem('ai_model');
    const allowedIds = AI_MODELS.map(m => m.id);
    if (stored && allowedIds.includes(stored)) {
        return stored;
    }
    return 'deepseek-chat';
}

export function setActiveModel(modelId: string) {
    localStorage.setItem('ai_model', modelId);
}

/** Get the provider ('openrouter' | 'deepseek') for the active model */
export function getModelProvider(modelId?: string): string {
    const id = modelId || getActiveModel();
    const model = AI_MODELS.find(m => m.id === id);
    return model?.provider || 'openrouter';
}

// Validate if a model ID is supported
export function isValidModel(modelId: string): boolean {
    return AI_MODELS.some(m => m.id === modelId);
}

// Reset to default model if current is invalid
export function ensureValidModel(): string {
    const current = getActiveModel();
    if (!isValidModel(current)) {
        const defaultModel = 'deepseek-chat';
        setActiveModel(defaultModel);
        return defaultModel;
    }
    return current;
}
