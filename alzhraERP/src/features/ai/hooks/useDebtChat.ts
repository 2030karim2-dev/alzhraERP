import { useState, useCallback } from 'react';
import { generateAIContent } from '../core/provider';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const useDebtChat = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (text: string, debtContext: any) => {
        if (!text.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setError(null);

        try {
            // Build the system instructions using the current debt data context
            const systemPrompt = `أنت "عقل الجعفري"، مساعد ذكي متخصص في إدارة ديون العملاء والتنبيهات لشركة تجارية.
            أنت تتحدث العربية بطلاقة وبأسلوب احترافي وودود. مهمتك مساعدة مدير الشركة في فهم حالة الديون واستخراج الرؤى.

            البيانات الحالية للديون في النظام:
            إجمالي الديون: ${debtContext?.metrics?.totalDebt}
            عدد العملاء المدينين: ${debtContext?.metrics?.totalDebtors}
            العملاء ذوو الخطورة العالية (High Risk): ${debtContext?.customers?.filter((c: any) => c.priorityLevel === 'High').length || 0} عملاء

            العملاء ذوو الأولوية العالية للتحصيل:
            ${debtContext?.customers?.filter((c: any) => c.priorityLevel === 'High').slice(0, 5).map((c: any) => `- ${c.name} (المبلغ المتبقي: ${c.total_amount - (c.paid_amount || 0)}، درجة الأولوية: ${c.priorityScore})`).join('\n')}

            إذا سألك المستخدم عن العملاء الخطرين أو ملخص الديون، أجب بناءً على هذه البيانات فقط.
            لا تخترع بيانات من عندك. إذا طُلب منك كتابة رسالة واتساب، اكتبها بأسلوب لبق يحترم العميل.`;

            // Format history
            const historyPrompt = messages.map(m => `${m.role === 'user' ? 'المستخدم' : 'الجعفري'}: ${m.content}`).join('\n');
            const fullPrompt = `${historyPrompt}\nالمستخدم: ${text.trim()}`;

            const responseText = await generateAIContent(
                fullPrompt,
                systemPrompt,
                { jsonMode: false, temperature: 0.3 }
            );

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: responseText || 'عذراً، لم أتمكن من معالجة الطلب.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            setError(e.message || 'حدث خطأ في الاتصال بالمساعد الذكي.');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages]);

    const clearChat = () => {
        setMessages([]);
        setError(null);
    };

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearChat
    };
};
