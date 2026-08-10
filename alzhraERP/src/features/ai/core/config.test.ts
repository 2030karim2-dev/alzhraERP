import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveModel, setActiveModel, AI_MODELS, isValidModel, ensureValidModel } from './config';

describe('AI Config - Model Allowlist', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return default model when nothing is stored', () => {
        expect(getActiveModel()).toBe('deepseek-chat');
    });

    it('should return stored model if it is in the allowlist', () => {
        setActiveModel('google/gemini-2.5-flash');
        expect(getActiveModel()).toBe('google/gemini-2.5-flash');
    });

    it('should fall back to default when stored model is not in allowlist', () => {
        localStorage.setItem('ai_model', 'evil-model');
        expect(getActiveModel()).toBe('deepseek-chat');
    });

    it('should fall back to default when stored model is empty string', () => {
        localStorage.setItem('ai_model', '');
        expect(getActiveModel()).toBe('deepseek-chat');
    });

    it('isValidModel should return true for known models', () => {
        expect(isValidModel('deepseek-chat')).toBe(true);
        expect(isValidModel('google/gemini-2.5-pro')).toBe(true);
        expect(isValidModel('anthropic/claude-3.5-sonnet')).toBe(true);
    });

    it('isValidModel should return false for unknown models', () => {
        expect(isValidModel('evil-model')).toBe(false);
        expect(isValidModel('')).toBe(false);
    });

    it('ensureValidModel should keep valid model unchanged', () => {
        setActiveModel('openai/gpt-4o');
        expect(ensureValidModel()).toBe('openai/gpt-4o');
    });

    it('ensureValidModel should reset invalid model to default', () => {
        localStorage.setItem('ai_model', 'hacked-model');
        expect(ensureValidModel()).toBe('deepseek-chat');
    });

    it('all models in AI_MODELS should have required fields', () => {
        for (const model of AI_MODELS) {
            expect(model.id).toBeTruthy();
            expect(model.name).toBeTruthy();
            expect(model.provider).toBeTruthy();
        }
    });
});
