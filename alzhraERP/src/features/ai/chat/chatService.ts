/**
 * AI Module - Chat Service
 * Sends user messages to the AI provider and returns responses.
 */
import { generateAIContent } from '../core/provider';
import { buildRealDataContext } from '../core/prompts';
import { ChatMessage } from '../core/types';

export type { ChatMessage };

export async function sendChatMessage(
    userMessage: string,
    context: string = '',
    _history: ChatMessage[] = [],
    _memoryContext: string = ''
): Promise<string> {
    try {
        const dataContext = buildRealDataContext();
        const fullPrompt = `
${dataContext}
${context ? `\nالسياق الإضافي: ${context}` : ''}

طلب المستخدم: 
${userMessage}
`;

        const assistantResponse = await generateAIContent(fullPrompt, undefined, { jsonMode: false, temperature: 0.1 });
        return assistantResponse;
    } catch (error: any) {
        throw new Error(error.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب بـ AI');
    }
}

export function speakText(_text: string): Promise<void> {
    return new Promise((resolve) => resolve());
}

export function stopSpeaking(): void {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}
