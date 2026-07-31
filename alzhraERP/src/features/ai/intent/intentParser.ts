/**
 * AI Module - Intent Parser
 * Parses raw AI response text into structured AIParsedResponse.
 */
import { AIParsedResponse } from '../core/types';

export function parseAIResponse(aiResponse: string): AIParsedResponse {
    try {
        // Try to find a JSON block
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1].trim() : aiResponse.trim();
        
        // Check if it looks like JSON
        if (jsonText.startsWith('{') && jsonText.endsWith('}')) {
            const parsed = JSON.parse(jsonText);
            return {
                intent: parsed.intent || 'chat',
                entities: parsed.entities || {},
                replyText: parsed.replyText || 'الرجاء مراجعة التفاصيل أدناه وتأكيد الإجراء.'
            };
        }

        // Fallback to chat
        return {
            intent: 'chat',
            replyText: aiResponse
        };
    } catch (e) {
        // Parsing failed, return as standard chat
        return {
            intent: 'unknown',
            replyText: aiResponse
        };
    }
}
