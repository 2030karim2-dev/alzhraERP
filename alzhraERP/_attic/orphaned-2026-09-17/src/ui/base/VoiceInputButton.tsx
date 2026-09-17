import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../../core/utils';

// Web Speech API types (غير متوفرة في lib DOM القياسية)
interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike {
  results: Record<number, Record<number, SpeechRecognitionResultLike>>;
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
  onResult,
  lang = 'ar-SA',
  className,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback((): void => {
    const windowWithSpeech = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
    const SpeechRecognitionAPI =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

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
        'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 active:scale-90',
        isListening
          ? 'animate-pulse bg-rose-600 text-white shadow-lg shadow-rose-500/30'
          : 'border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {isListening ? (
        <>
          <MicOff size={18} />
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-rose-500" />
        </>
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
};

export default VoiceInputButton;
