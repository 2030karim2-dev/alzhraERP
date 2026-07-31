/**
 * AI Module - Command Center (Main Chat Panel)
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAIChat } from '../chat/useAIChat';
import { ActionConfirmationModal } from './ActionConfirmationModal';
import { ProductPickerCard } from '../product-lookup/ProductPickerCard';
import { Send, Bot, User, Loader2, Sparkles, X, Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../chat/useSpeechRecognition';
import { useAIPrefillStore } from '../chat/store';
import { useNavigate } from 'react-router-dom';
import { ProductMatch } from '../core/types';

interface AICommandCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const AICommandCenter: React.FC<AICommandCenterProps> = ({ isOpen, onClose }) => {
    const { 
        messages, 
        isLoading, 
        error, 
        pendingAction, 
        sendMessage, 
        executePendingAction, 
        cancelPendingAction 
    } = useAIChat();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { isListening, toggleListening, isSupported } = useSpeechRecognition((transcript) => {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    });

    const navigate = useNavigate();
    const { productLookupResults, productLookupAction, clearProductLookup, setPendingPrefill } = useAIPrefillStore();

    const handleProductPickerComplete = (selectedProducts: { product: ProductMatch; quantity: number }[]) => {
        if (!productLookupAction) return;
        
        const enrichedAction = { ...productLookupAction };
        enrichedAction.entities = {
            ...enrichedAction.entities,
            items: selectedProducts.map(sp => ({
                productName: sp.product.name,
                productCode: sp.product.part_number,
                manufacturer: sp.product.brand,
                quantity: sp.quantity,
                unitPrice: sp.product.selling_price,
                productId: sp.product.id,
                sku: sp.product.sku,
            }))
        };

        clearProductLookup();
        setPendingPrefill(enrichedAction);

        const intent = enrichedAction.intent;
        if (intent === 'create_sales_invoice' || intent === 'create_return_sale') {
            navigate('/sales');
        } else if (intent === 'create_purchase_invoice' || intent === 'create_return_purchase') {
            navigate('/purchases');
        }
    };

    const handleProductPickerCancel = () => {
        clearProductLookup();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-end pointer-events-none">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
            
            <div className="relative w-full sm:w-[480px] h-[90vh] sm:h-[720px] sm:mr-4 sm:mb-4 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">المساعد الذكي</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">تحليل الأوامر وتنفيذها بذكاء</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                        <Bot className="w-16 h-16 text-gray-400" />
                        <div>
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">كيف يمكنني مساعدتك اليوم؟</p>
                            <p className="text-sm text-gray-500">جرب كتابة: "سجل فاتورة مبيعات لشركة التقدم بمبلغ 1000 ريال"</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`p-2 rounded-full h-fit flex-shrink-0 ${
                                msg.role === 'user' 
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>
                            <div className={`max-w-[75%] rounded-2xl p-4 ${
                                msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                            }`}>
                            {msg.content}
                            </div>
                            {(msg.parsedAction?.intent as string) === 'product_picker' && productLookupResults && (
                                <div className="mt-3 max-w-full">
                                    <ProductPickerCard
                                        lookupResults={productLookupResults}
                                        onComplete={handleProductPickerComplete}
                                        onCancel={handleProductPickerCancel}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
                
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="p-2 rounded-full h-fit flex-shrink-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span className="text-sm text-gray-500">جاري المعالجة...</span>
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-center border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pb-6 rounded-b-3xl">
                <form onSubmit={handleSubmit} className="relative flex items-end bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                    {isSupported && (
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`p-3 m-2 rounded-lg transition-colors flex-shrink-0 ${
                                isListening 
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                            }`}
                            title={isListening ? "إيقاف التسجيل" : "تحدث"}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading || !!pendingAction}
                        className="p-3 m-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex-shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                    <textarea
                        value={input}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="أدخل أمرك هنا (اضغط Shift + Enter لسطر جديد)..."
                        disabled={isLoading || !!pendingAction}
                        rows={1}
                        className="w-full pl-4 pr-4 py-4 bg-transparent text-gray-900 dark:text-white disabled:opacity-50 resize-none outline-none leading-relaxed"
                        style={{ minHeight: '56px', maxHeight: '120px' }}
                    />
                </form>
            </div>

            {/* Confirmation Modal */}
            <ActionConfirmationModal 
                action={pendingAction} 
                onConfirm={executePendingAction} 
                onCancel={cancelPendingAction} 
                isExecuting={isLoading}
            />
            </div>
        </div>
    );
};

export default AICommandCenter;
