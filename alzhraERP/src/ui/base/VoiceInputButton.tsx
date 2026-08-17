import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../../core/utils';

// Web Speech API types (غير متوفرة في lib DOM القياسية)
interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultLike } };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  lang?: 'ar-SA' | 'en-US';
  className?: string;
  disabled?: boolean;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onResult, lang = 'ar-SA', className, disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback((): void => {
    const windowWithSpeech = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
    const SpeechRecognitionAPI = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { setIsSupported(false); return; }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventLike): void => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    recognition.onerror = (): void => {
      setIsListening(false);
    };

    recognition.onend = (): void => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [lang, onResult]);

  const stopListening = useCallback((): void => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleClick = (): void => {
    if (isListening) stopListening();
    else startListening();
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={isListening ? 'إيقاف التسجيل الصوتي' : 'بدء التسجيل الصوتي'}
      className={cn(
        'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90',
        isListening
          ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
          : 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] border border-[var(--app-border)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {isListening ? (
        <>
          <MicOff size={18} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
        </>
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
};

export default VoiceInputButton;
