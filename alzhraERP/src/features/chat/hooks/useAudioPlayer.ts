import { useState, useRef, useEffect, useCallback } from 'react';

// Singleton to ensure only one audio message plays at a time (like WhatsApp)
let globalActiveAudio: HTMLAudioElement | null = null;

export const useAudioPlayer = (src?: string | null) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  // Initialize Audio element
  useEffect(() => {
    if (!src) {
      if (audioRef.current) {
        if (globalActiveAudio === audioRef.current) {
          globalActiveAudio = null;
        }
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (globalActiveAudio === audio) {
        globalActiveAudio = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      if (globalActiveAudio === audio) {
        globalActiveAudio = null;
      }
      setIsPlaying(false);
    };

    const handlePlay = () => {
      if (globalActiveAudio && globalActiveAudio !== audio) {
        globalActiveAudio.pause();
      }
      globalActiveAudio = audio;
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      if (globalActiveAudio === audio) {
        globalActiveAudio = null;
      }
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audioRef.current = null;
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (globalActiveAudio && globalActiveAudio !== audio) {
        globalActiveAudio.pause();
      }
      globalActiveAudio = audio;
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const seek = useCallback((percentage: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const target = Math.max(0, Math.min(percentage * audio.duration, audio.duration));
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const nextRate: Record<1 | 1.5 | 2, 1 | 1.5 | 2> = {
      1: 1.5,
      1.5: 2,
      2: 1,
    };
    const rate = nextRate[playbackRate];
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [playbackRate]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    playbackRate,
    formattedCurrentTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    togglePlay,
    seek,
    cyclePlaybackRate,
  };
};
