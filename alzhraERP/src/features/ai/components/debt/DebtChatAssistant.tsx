import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { useDebtChat } from '../../hooks/useDebtChat';

interface Props {
    debtContext: any;
}

export const DebtChatAssistant: React.FC<Props> = ({ debtContext }) => {
    const { messages, isLoading, error, sendMessage } = useDebtChat();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const text = inputValue;
        setInputValue('');
        await sendMessage(text, debtContext);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">مساعد الجعفري</h2>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">اسألني عن العملاء، الرصيد، أو كتابة رسائل</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[300px] max-h-[500px]">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
                        <MessageSquare size={48} className="text-gray-300 dark:text-slate-700" />
                        <div className="space-y-1">
                            <p className="text-gray-500 dark:text-slate-400 font-medium">مرحباً! أنا هنا لمساعدتك.</p>
                            <p className="text-sm text-gray-400 dark:text-slate-500 max-w-xs">
                                يمكنك سؤالي: "من هم العملاء ذوي الخطورة العالية؟" أو "اكتب رسالة تذكير للعميل أحمد"
                            </p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'user' 
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' 
                                    : 'bg-blue-600 text-white'
                            }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                                msg.role === 'user'
                                    ? 'bg-indigo-500 text-white rounded-tr-sm'
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                            }`}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
                
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800 rounded-tl-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Error Area */}
            {error && (
                <div className="mx-4 mb-2 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">
                    {error}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="اطرح سؤالاً عن الديون..."
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl pr-4 pl-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};
