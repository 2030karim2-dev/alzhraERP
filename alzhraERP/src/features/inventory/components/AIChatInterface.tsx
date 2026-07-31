import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useCarAI } from '../hooks/useCarAI';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'مرحباً! أنا مساعد الزهراء الذكي للسيارات. كيف يمكنني مساعدتك في البحث عن قطع الغيار أو التوافق اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const chatMutation = useCarAI();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await chatMutation.mutateAsync(newMessages as any);
      if (response && response.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.' }]);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'مرحباً! أنا مساعد الزهراء الذكي للسيارات. كيف يمكنني مساعدتك في البحث عن قطع الغيار أو التوافق اليوم؟' }]);
  };

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">المساعد الذكي</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-500 font-medium">متصل بـ Gemini</span>
            </div>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
          title="مسح المحادثة"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span className="text-xs text-slate-500 font-medium">جاري التفكير...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسألني عن توافق أي قطعة..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all text-sm dark:text-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:bg-slate-300"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
          <Sparkles size={10} className="text-amber-400" /> يعمل بتقنية الذكاء الاصطناعي لمساعدتك بشكل أسرع
        </p>
      </form>
    </div>
  );
};
