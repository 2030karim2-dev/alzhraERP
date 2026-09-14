import React, { useState, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { attachmentService } from '../../services/attachmentService';
import type { ChatAttachment } from '../../types';

interface Props {
  attachment?: ChatAttachment | null | undefined;
  directUrl?: string | null | undefined;
  isOwn: boolean;
  duration?: number | null | undefined;
}

export const AudioMessage: React.FC<Props> = ({
  attachment,
  directUrl,
  isOwn,
  duration: fallbackDuration,
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(
    directUrl || attachment?.public_url || null
  );

  useEffect(() => {
    if (audioUrl || !attachment?.storage_path) return;

    let isMounted = true;
    attachmentService.getAttachmentSignedUrl(attachment.storage_path).then(url => {
      if (isMounted && url) {
        setAudioUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [attachment?.storage_path, audioUrl]);

  const {
    isPlaying,
    progress,
    playbackRate,
    formattedCurrentTime,
    formattedDuration,
    togglePlay,
    seek,
    cyclePlaybackRate,
  } = useAudioPlayer(audioUrl);

  const displayDuration =
    formattedDuration !== '0:00'
      ? formattedDuration
      : fallbackDuration
        ? `${Math.floor(fallbackDuration / 60)}:${(fallbackDuration % 60).toString().padStart(2, '0')}`
        : '0:00';

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, pos)));
  };

  return (
    <div
      className={`my-1 flex w-64 max-w-full items-center gap-2.5 rounded-2xl p-2 sm:w-72 ${
        isOwn ? 'text-white' : 'text-[var(--app-text)]'
      }`}
    >
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!audioUrl}
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-md transition-all active:scale-95 ${
          isOwn
            ? 'bg-white text-[var(--accent)] hover:bg-white/90'
            : 'bg-[var(--accent)] text-white hover:opacity-90'
        }`}
        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل المقطع الصوتي'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ms-0.5" />}
      </button>

      {/* Progress & Waveform Area */}
      <div className="flex flex-1 flex-col gap-1.5">
        {/* Interactive Scrub Bar */}
        <div
          onClick={handleSeek}
          className="relative flex h-4 cursor-pointer items-center"
          title="تقديم أو ترجيع"
        >
          {/* Track background */}
          <div
            className={`h-1.5 w-full rounded-full ${
              isOwn ? 'bg-white/30' : 'bg-[var(--app-border)]'
            }`}
          >
            {/* Active progress */}
            <div
              className={`h-full rounded-full transition-all ${
                isOwn ? 'bg-white' : 'bg-[var(--accent)]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Scrubber handle */}
          <div
            className={`absolute h-3 w-3 -translate-x-1/2 rounded-full shadow-sm transition-transform hover:scale-125 ${
              isOwn ? 'bg-white' : 'bg-[var(--accent)]'
            }`}
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Duration & Status */}
        <div
          className={`flex items-center justify-between text-[10px] font-medium ${
            isOwn ? 'text-white/80' : 'text-[var(--app-text-secondary)]'
          }`}
        >
          <span>{isPlaying ? formattedCurrentTime : displayDuration}</span>

          {/* Speed Toggle Pill */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              cyclePlaybackRate();
            }}
            className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold transition-all hover:scale-105 ${
              isOwn
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-[var(--app-surface-hover)] text-[var(--app-text)]'
            }`}
            title="تغيير سرعة التشغيل"
          >
            {playbackRate}x
          </button>
        </div>
      </div>

      {/* Microphone Icon Badge */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isOwn ? 'bg-white/20 text-white' : 'bg-[var(--accent)]/10 text-[var(--accent)]'
        }`}
      >
        <Mic size={15} />
      </div>
    </div>
  );
};
