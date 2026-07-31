/**
 * AI Module - useAIChat Hook
 * Main React hook for AI chat functionality.
 * Handles message sending, intent detection, product lookup, and navigation.
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIParsedResponse, ChatMessage } from '../core/types';
import { parseAIResponse } from '../intent/intentParser';
import { getRouteForIntent, isInvoiceIntent } from '../intent/intentRouter';
import { useAuthStore } from '../../auth/store';
import { sendChatMessage } from './chatService';
import { useAIPrefillStore } from './store';
import { lookupProducts } from '../product-lookup/productLookupService';

export const useAIChat = (_options: { enabled?: boolean } = {}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<AIParsedResponse | null>(null);

    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { setPendingPrefill } = useAIPrefillStore();

    const sendMessage = useCallback(async (text: string) => {
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
        setPendingAction(null);

        try {
            const rawResponse = await sendChatMessage(text.trim(), user?.company_id || '', messages, user?.id || '');
            const parsedResponse = parseAIResponse(rawResponse);

            const hasAction = parsedResponse.intent !== 'chat' && parsedResponse.intent !== 'unknown';
            if (hasAction) {
                setPendingAction(parsedResponse);
                const aiMsg: ChatMessage = {
                    id: `ai-${Date.now()}`,
                    role: 'assistant',
                    content: parsedResponse.replyText || 'تم تحديد إجراء. يرجى تأكيد التنفيذ.',
                    timestamp: new Date(),
                    parsedAction: parsedResponse
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                const assistantMsg: ChatMessage = {
                    id: `ai-${Date.now()}`,
                    role: 'assistant',
                    content: parsedResponse.replyText || "تم الفهم.",
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMsg]);
            }
        } catch (e: unknown) {
            const error = e as Error;
            setError(error.message || 'حدث خطأ في الاتصال بالذكاء الاصطناعي');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, user]);

    const executePendingAction = useCallback(async () => {
        if (!pendingAction) return;

        const hasItems = pendingAction.entities?.items && pendingAction.entities.items.length > 0;

        try {
            setIsLoading(true);

            // For invoice intents with items, search the real product DB first
            if (isInvoiceIntent(pendingAction.intent) && hasItems && user?.company_id) {
                const lookupMsg: ChatMessage = {
                    id: `ai-lookup-${Date.now()}`,
                    role: 'assistant',
                    content: '🔍 جاري البحث عن الأصناف في قاعدة البيانات...',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, lookupMsg]);

                const results = await lookupProducts(pendingAction.entities!.items!, user.company_id);
                const needsUserChoice = results.some(r => r.matches.length > 1);
                const notFoundItems = results.filter(r => r.matches.length === 0);
                const allNotFound = results.every(r => r.matches.length === 0);

                // If ALL items not found, block the action
                if (allNotFound) {
                    const notFoundNames = notFoundItems.map(r => `"${r.searchTerm}"`).join('، ');
                    const errorMsg: ChatMessage = {
                        id: `ai-notfound-${Date.now()}`,
                        role: 'assistant',
                        content: `❌ لم يتم العثور على أي من الأصناف المطلوبة في قاعدة البيانات:\n${notFoundNames}\n\nيرجى التأكد من صحة أسماء المنتجات أو أرقام القطع والمحاولة مرة أخرى.`,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, errorMsg]);
                    setIsLoading(false);
                    setPendingAction(null);
                    return;
                }

                // If some items need user choice OR some not found, show picker
                if (needsUserChoice || notFoundItems.length > 0) {
                    const { setProductLookup } = useAIPrefillStore.getState();
                    setProductLookup(results, pendingAction);

                    let pickerContent = '';
                    if (notFoundItems.length > 0) {
                        const names = notFoundItems.map(r => `"${r.searchTerm}"`).join('، ');
                        pickerContent = `⚠️ الأصناف التالية غير موجودة: ${names}\n\n`;
                    }
                    pickerContent += needsUserChoice
                        ? '📦 تم العثور على عدة خيارات لبعض الأصناف. يرجى اختيار المنتج المناسب:'
                        : '📦 يرجى مراجعة النتائج التالية:';

                    const pickerMsg: ChatMessage = {
                        id: `ai-picker-${Date.now()}`,
                        role: 'assistant',
                        content: pickerContent,
                        timestamp: new Date(),
                        parsedAction: { ...pendingAction, intent: 'product_picker' as any },
                    };
                    setMessages(prev => [...prev, pickerMsg]);
                    setIsLoading(false);
                    setPendingAction(null);
                    return;
                }

                // All items auto-matched — enrich with real product data
                const originalItems = pendingAction.entities!.items!;
                const enrichedItems = results.map((r, idx) => {
                    const originalItem = originalItems[idx];
                    // If user specified a price, use it; otherwise use DB price
                    const finalPrice = (originalItem?.unitPrice && originalItem.unitPrice > 0)
                        ? originalItem.unitPrice
                        : r.selectedProduct!.selling_price;

                    return {
                        productName: r.selectedProduct!.name,
                        productCode: r.selectedProduct!.part_number,
                        manufacturer: r.selectedProduct!.brand,
                        quantity: r.requestedQty,
                        unitPrice: finalPrice,
                        productId: r.selectedProduct!.id,
                        sku: r.selectedProduct!.sku,
                    };
                });

                pendingAction.entities!.items = enrichedItems;

                // Show auto-match confirmation
                const matchSummary = enrichedItems.map(item => 
                    `✅ ${item.productName} (${item.productCode}) × ${item.quantity}`
                ).join('\n');
                const autoMatchMsg: ChatMessage = {
                    id: `ai-automatch-${Date.now()}`,
                    role: 'assistant',
                    content: `تم مطابقة الأصناف تلقائياً:\n${matchSummary}`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, autoMatchMsg]);
            }

            setPendingPrefill(pendingAction);

            // Navigate using the intent router
            const route = getRouteForIntent(pendingAction.intent);
            if (route) {
                navigate(route.path);
                const successMsg: ChatMessage = {
                    id: `ai-success-${Date.now()}`,
                    role: 'assistant',
                    content: `✅ تم فتح نموذج ${route.label} مع تعبئة البيانات. يرجى المراجعة والتأكيد قبل الحفظ.`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, successMsg]);
            } else {
                setError('هذا الإجراء غير مدعوم للتعبئة التلقائية.');
                setIsLoading(false);
                return;
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء التوجيه للمعاملة.');
        } finally {
            setIsLoading(false);
            setPendingAction(null);
        }
    }, [pendingAction, navigate, setPendingPrefill, user]);

    const cancelPendingAction = useCallback(() => {
        setPendingAction(null);
    }, []);

    const clearChat = useCallback(async () => {
        setMessages([]);
        setError(null);
        setPendingAction(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        pendingAction,
        sendMessage,
        clearChat,
        executePendingAction,
        cancelPendingAction
    };
};
