import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Trash2, Loader2, Bot, User, Brain } from 'lucide-react';
import { useAIChat } from '../../features/ai/useAIChat';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const AIChatPanel: React.FC<Props> = ({ isOpen, onClose }) => {
    const { messages, isLoading, error, sendMessage, clearChat } = useAIChat({ enabled: isOpen });
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = useCallback(() => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = '44px';
    }, [input, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
        e.target.style.height = '44px';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-end pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full sm:w-[440px] h-[90vh] sm:h-[700px] sm:mr-4 sm:mb-4 bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200/50 dark:border-slate-800 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-4 flex items-center justify-between text-white">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
                    <div className="relative flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <Brain size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm tracking-tight">مساعد الجعفري الذكي</h3>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">قيد التأسيس</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative flex items-center gap-1">
                        <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="مسح المحادثة">
                            <Trash2 size={16} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="text-center space-y-4 pt-6">
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center relative">
                                <Bot size={32} className="text-gray-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-slate-100 text-lg">تحت الإنشاء 🚧</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    يتم حالياً إعادة بناء المساعد الذكي وتدريبه من الصفر.
                                </p>
                            </div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-400 text-white'
                                }`}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed group relative ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-md'
                                : 'bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-slate-200 rounded-tl-md border border-gray-200/50 dark:border-slate-800'
                                }`}>
                                <p className="whitespace-pre-wrap text-[13px] font-medium">{msg.content}</p>
                                <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-between'}`}>
                                    <p className={`text-[9px] font-bold ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-slate-500'}`}>
                                        {msg.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-2">
                            <div className="w-7 h-7 rounded-xl bg-gray-400 text-white flex items-center justify-center flex-shrink-0">
                                <Bot size={14} />
                            </div>
                            <div className="bg-gray-100 dark:bg-slate-900 rounded-2xl rounded-tl-md p-3 border border-gray-200/50 dark:border-slate-800">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-3 text-xs text-rose-600 dark:text-rose-400 font-bold">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder="اكتب رسالتك..."
                            className="flex-1 resize-none rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:text-white placeholder:text-gray-400"
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 disabled:shadow-none flex-shrink-0"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <p className="text-[8px] text-gray-400 dark:text-slate-600 font-bold px-1">
                            مساعد الجعفري — إصدار التأسيس
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;
