
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../../core/utils/logger';

export interface AppNotification {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: number;
  isRead: boolean;
  link?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (companyId?: string) => void;
  clearAll: (companyId?: string) => void;
  deleteNotification: (id: string) => void;
  getCompanyNotifications: (companyId: string) => AppNotification[];
  getCompanyUnreadCount: (companyId: string) => number;
  unreadCount: number;
}

// Sound notification system
interface SoundState {
  isSoundEnabled: boolean;
  hasUserInteracted: boolean;
  toggleSound: () => void;
  setUserInteracted: () => void;
  playNotificationSound: () => Promise<void>;
}

// ─── Shared AudioContext (typed — no `any` casts) ────────────────────────
type AudioContextCtor = typeof AudioContext;
interface UserActivationShim {
  userActivation?: { hasBeenActive: boolean };
}
interface WindowWithWebkitAudio {
  AudioContext?: AudioContextCtor;
  webkitAudioContext?: AudioContextCtor;
}

/** Single shared context reused across notifications to avoid leaking audio device handles. */
let sharedAudioContext: AudioContext | null = null;

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithWebkitAudio;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
};

/** Create (or reuse) the shared context and resume it if suspended. */
const ensureAudioContext = async (): Promise<AudioContext | null> => {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }

  if (sharedAudioContext.state === 'suspended') {
    try {
      await sharedAudioContext.resume();
    } catch {
      // Resume failure is almost certainly a user-gesture requirement.
      return null;
    }
  }

  return sharedAudioContext.state === 'running' ? sharedAudioContext : null;
};


export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        if (!notification.companyId) {
          logger.warn('Notifications', 'addNotification called without companyId — skipping');
          return;
        }
        const newNotif: AppNotification = {
          ...notification,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          isRead: false
        };
        set(state => ({
          notifications: [newNotif, ...state.notifications].slice(0, 100), // Keep last 100
          unreadCount: state.notifications.filter(n => !n.isRead).length + 1
        }));

        // Play sound if enabled and user has interacted
        const soundStore = useSoundStore.getState();
        if (soundStore.isSoundEnabled && soundStore.hasUserInteracted) {
          soundStore.playNotificationSound();
        }
      },

      getCompanyNotifications: (companyId: string) => {
        return get().notifications.filter(n => n.companyId === companyId);
      },

      getCompanyUnreadCount: (companyId: string) => {
        return get().notifications.filter(n => n.companyId === companyId && !n.isRead).length;
      },

      markAsRead: (id) => {
        set(state => {
          const newNotifs = state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          );
          return {
            notifications: newNotifs,
            unreadCount: newNotifs.filter(n => !n.isRead).length
          };
        });
      },

      markAllAsRead: (companyId?: string) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            (!companyId || n.companyId === companyId) ? { ...n, isRead: true } : n
          ),
          unreadCount: companyId
            ? state.notifications.filter(n => n.companyId !== companyId && !n.isRead).length
            : 0
        }));
      },

      deleteNotification: (id) => {
        set(state => {
          const newNotifs = state.notifications.filter(n => n.id !== id);
          return {
            notifications: newNotifs,
            unreadCount: newNotifs.filter(n => !n.isRead).length
          };
        });
      },

      clearAll: (companyId?: string) => set(state => ({
        notifications: companyId
          ? state.notifications.filter(n => n.companyId !== companyId)
          : [],
        unreadCount: companyId
          ? state.notifications.filter(n => n.companyId !== companyId && !n.isRead).length
          : 0
      })),
    }),
    { name: 'al-zahra-notifications' }
  )
);

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      isSoundEnabled: true,
      hasUserInteracted: false,

      toggleSound: () => {
        set(state => {
          const newValue = !state.isSoundEnabled;
          // Mark user as interacted when they toggle sound
          if (!state.hasUserInteracted) {
            return { isSoundEnabled: newValue, hasUserInteracted: true };
          }
          return { isSoundEnabled: newValue };
        });
      },

      setUserInteracted: () => set({ hasUserInteracted: true }),

      playNotificationSound: async () => {
        const state = get();
        // Don't even try if sound is disabled or no interaction yet
        if (!state.isSoundEnabled || !state.hasUserInteracted) return;

        // Modern browsers explicit gesture check to prevent harsh console warnings
        if (typeof navigator !== 'undefined' && 'userActivation' in navigator) {
          const nav = navigator as unknown as UserActivationShim;
          if (!nav.userActivation?.hasBeenActive) return;
        }

        try {
          // Reuse a single lazily-initialized context — creating a new
          // AudioContext per notification accumulates undisposed audio
          // contexts and consumes memory/audio-device handles.
          const audioContext = await ensureAudioContext();
          if (!audioContext) return;

          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          // Create a gentle, modern notification sound (two-tone chime)
          const now = audioContext.currentTime;

          // First tone (higher)
          oscillator.frequency.setValueAtTime(987.77, now); // B5
          oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.08);

          // Gentle envelope
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          oscillator.start(now);
          oscillator.stop(now + 0.15);

          // Release the graph resources when the tone finishes.
          oscillator.onended = () => {
            try {
              oscillator.disconnect();
              gainNode.disconnect();
            } catch {
              /* already disconnected */
            }
          };

          // Second tone (lower, slightly delayed for harmony)
          setTimeout(() => {
            try {
              const osc2 = audioContext.createOscillator();
              const gain2 = audioContext.createGain();
              osc2.connect(gain2);
              gain2.connect(audioContext.destination);

              osc2.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
              gain2.gain.setValueAtTime(0, audioContext.currentTime);
              gain2.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.02);
              gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

              osc2.start(audioContext.currentTime);
              osc2.stop(audioContext.currentTime + 0.12);
              osc2.onended = () => {
                try {
                  osc2.disconnect();
                  gain2.disconnect();
                } catch {
                  /* already disconnected */
                }
              };
            } catch {
              // Ignore — the primary tone already played.
            }
          }, 60);

        } catch (error) {
          // Silently fail if audio can't be played
          logger.warn('Notifications', 'Audio playback prevented by browser policy');
        }
      },
    }),
    { name: 'al-zahra-sound-settings' }
  )
);
