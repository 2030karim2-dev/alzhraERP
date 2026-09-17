import React, { useState } from 'react';
import { Mic, MicOff, Loader2, Sparkles, MessageSquare, Send, X } from 'lucide-react';
import { aiService } from '../../../ai/service';
import { formatCurrency } from '../../../../core/utils';

interface ParsedInvoice {
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  paymentMethod: string;
}

const VoiceInvoiceButton: React.FC = () => {
  const [mode, setMode] = useState<'idle' | 'input' | 'loading' | 'preview'>('idle');
  const [textInput, setTextInput] = useState('');
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [isListening, setIsListening] = useState(false);

  const startVoice = () => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMode('input'); // fallback to text
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: Record<string, unknown>) => {
      const results = event.results as SpeechRecognitionResultList;
      const transcript = results[0][0].transcript;
      setTextInput(transcript);
      setIsListening(false);
      handleParse(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setMode('input');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setIsListening(true);
    setMode('input');
    recognition.start();
  };

  const handleParse = async (text: string) => {
    if (!text.trim()) return;
    setMode('loading');
    try {
      const result = await aiService.parseInvoiceCommand(text);
      setParsed(result);
      setMode('preview');
    } catch {
      setMode('input');
    }
  };

  if (mode === 'idle') {
    return (
      <div className="flex gap-2 max-md:gap-2">
        <button
          onClick={startVoice}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:from-violet-500 hover:to-indigo-500 max-md:gap-2"
        >
          <Mic size={14} />
          فاتورة بالصوت
        </button>
        <button
          onClick={() => {
            setMode('input');
          }}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-gray-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 max-md:gap-2"
        >
          <MessageSquare size={14} />
          فاتورة بالنص
        </button>
      </div>
    );
  }

  if (mode === 'input') {
    return (
      <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800/40 dark:bg-violet-950/20 max-md:p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-400 max-md:gap-2">
          {isListening ? (
            <>
              <MicOff size={14} className="animate-pulse text-rose-500" /> جاري الاستماع...
            </>
          ) : (
            <>
              <Sparkles size={14} /> اكتب أمر الفاتورة
            </>
          )}
        </div>
        <div className="flex gap-2 max-md:gap-2">
          <input
            type="text"
            value={textInput}
            onChange={e => {
              setTextInput(e.target.value);
            }}
            onKeyDown={e => e.key === 'Enter' && handleParse(textInput)}
            className="flex-1 rounded-lg border border-violet-200 bg-[var(--app-surface)] p-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-violet-800 max-md:p-2.5"
          />
          <button
            onClick={() => handleParse(textInput)}
            className="rounded-lg bg-violet-600 p-2 text-white transition-all hover:bg-violet-500 max-md:p-2.5"
          >
            <Send size={14} />
          </button>
          <button
            onClick={() => {
              setMode('idle');
              setTextInput('');
            }}
            className="rounded-lg bg-gray-200 p-2 text-gray-600 dark:bg-slate-700 dark:text-slate-400 max-md:p-2.5"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'loading') {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 text-center dark:border-violet-800/40 dark:bg-violet-950/20 max-md:p-3">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin text-violet-600" />
        <p className="text-xs font-bold text-violet-600">جاري تحليل الأمر بالذكاء الاصطناعي...</p>
      </div>
    );
  }

  if (mode === 'preview' && parsed) {
    const total = parsed.items.reduce((s, i) => s + i.quantity * i.price, 0);
    return (
      <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800/40 dark:bg-violet-950/20 max-md:p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-violet-700 dark:text-violet-400">
            ✨ معاينة الفاتورة
          </span>
          <div className="flex gap-1 max-md:gap-1.5">
            <button
              onClick={() => {
                setMode('idle');
                setParsed(null);
                setTextInput('');
              }}
              className="rounded-lg bg-gray-200 p-1 text-gray-500 dark:bg-slate-700 max-md:p-1.5"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {parsed.customerName && (
          <p className="text-xs text-gray-600 dark:text-slate-400">
            👤 العميل: <strong>{parsed.customerName}</strong>
          </p>
        )}

        <div className="space-y-1">
          {parsed.items.map((item, i) => (
            <div
              key={i}
              className="flex justify-between rounded-lg bg-white/70 p-2 text-xs dark:bg-slate-900/50 max-md:p-2"
            >
              <span className="font-bold">{item.name}</span>
              <span className="font-mono">
                {item.quantity} × {formatCurrency(item.price)} ={' '}
                {formatCurrency(item.quantity * item.price)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-violet-200 pt-2 dark:border-violet-800/40">
          <span className="text-xs font-bold text-gray-500">
            {parsed.paymentMethod === 'cash' ? '💵 نقدي' : '📝 آجل'}
          </span>
          <span className="text-sm font-bold text-violet-700 dark:text-violet-400">
            الإجمالي: {formatCurrency(total)}
          </span>
        </div>

        <p className="text-center text-[10px] text-gray-400">
          يمكنك استخدام هذه البيانات لإنشاء فاتورة جديدة
        </p>
      </div>
    );
  }

  return null;
};

export default VoiceInvoiceButton;
