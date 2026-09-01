import { useRef } from 'react';
import { useSoundStore } from '../../notifications/store';
import { showDesktopNotification } from '../../notifications/desktopNotificationService';
import { logger } from '../../../core/utils/logger';

/**
 * Hook for playing audio chime and triggering native desktop notifications for incoming chat messages.
 */
export const useChatNotifications = () => {
  const { isSoundEnabled } = useSoundStore();
  const audioContextRef = useRef<AudioContext | null>(null);

  const playIncomingBeep = async () => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      // Soft dual-tone ERP notification chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (err) {
      logger.debug('ChatNotifications', 'Audio chime suppressed by browser policy', err);
    }
  };

  const notifyIncomingMessage = (
    senderName: string,
    messageText: string,
    conversationId?: string
  ) => {
    void playIncomingBeep();

    // If tab is in background or document hidden, dispatch OS desktop notification
    if (typeof document !== 'undefined' && document.hidden) {
      showDesktopNotification({
        title: `💬 رسالة جديدة من: ${senderName}`,
        body: messageText,
        link: conversationId ? `#/chat/${conversationId}` : '#/chat',
        requireInteraction: true,
      });
    }
  };

  return { playIncomingBeep, notifyIncomingMessage };
};
