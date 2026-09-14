import React from 'react';
import { Trash2, Send } from 'lucide-react';

interface Props {
  isRecording: boolean;
  formattedDuration: string;
  volumeLevel: number;
  onCancel: () => void;
  onSend: () => void;
}

export const AudioRecorder: React.FC<Props> = ({
  isRecording,
  formattedDuration,
  volumeLevel,
  onCancel,
  onSend,
}) => {
  if (!isRecording) return null;

  return (
    <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 dark:bg-rose-950/20">
      {/* Delete / Cancel Button */}
      <button
        type="button"
        onClick={onCancel}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-all hover:bg-rose-500/15 active:scale-95"
        title="إلغاء التسجيل وحذفه"
      >
        <Trash2 size={16} />
      </button>

      {/* Recording Indicator & Live Timer */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
        </span>
        <span className="font-mono text-xs font-bold text-rose-500">{formattedDuration}</span>
      </div>

      {/* Animated Waveform Visualizer */}
      <div className="flex flex-1 items-center justify-center gap-1 px-2">
        {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.3, 0.7, 0.4].map((bar, i) => {
          const height = Math.max(4, Math.min(20, bar * (volumeLevel * 24 + 6)));
          return (
            <span
              key={i}
              className="w-1 rounded-full bg-rose-500/70 transition-all duration-75"
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      {/* Send Voice Note Button */}
      <button
        type="button"
        onClick={onSend}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-md transition-all hover:opacity-90 active:scale-95"
        title="إرسال التسجيل الصوتي"
      >
        <Send size={15} />
      </button>
    </div>
  );
};
